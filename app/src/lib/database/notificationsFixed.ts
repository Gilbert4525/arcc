import { SupabaseClient } from '@supabase/supabase-js';
import { EmailNotificationService, createEmailNotificationData } from '@/lib/email/notifications';
import { DOCUMENT_TEMPLATES } from '@/lib/notifications/templates';
import { getSafeWebPushService, WebPushNotificationData } from '@/lib/notifications/webPushServerSafe';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'meeting' | 'resolution' | 'document' | 'system' | 'reminder';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  is_read: boolean;
  action_url?: string;
  action_text?: string;
  metadata?: Record<string, any>;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationPreferences {
  id: string;
  user_id: string;
  email_notifications: boolean;
  meeting_reminders: boolean;
  resolution_alerts: boolean;
  document_updates: boolean;
  system_alerts: boolean;
  email_frequency: 'immediate' | 'daily' | 'weekly' | 'never';
  created_at: string;
  updated_at: string;
}

export interface CreateNotificationData {
  user_id: string;
  title: string;
  message: string;
  type: Notification['type'];
  priority?: Notification['priority'];
  action_url?: string;
  action_text?: string;
  metadata?: Record<string, any>;
  expires_at?: string;
}

export interface UpdateNotificationPreferencesData {
  email_notifications?: boolean;
  meeting_reminders?: boolean;
  resolution_alerts?: boolean;
  document_updates?: boolean;
  system_alerts?: boolean;
  email_frequency?: NotificationPreferences['email_frequency'];
}

export class NotificationsServiceFixed {
  private emailService: any = null;

  constructor(private supabase: SupabaseClient) {
    this.emailService = null; // Will be lazy-loaded
  }

  // Lazy load Gmail SMTP service
  private async getEmailService() {
    if (!this.emailService && typeof window === 'undefined') {
      try {
        const { GmailSMTPService } = await import('@/lib/email/gmailSmtp');
        this.emailService = new GmailSMTPService();
      } catch (error) {
        console.error('Failed to load Gmail SMTP service:', error);
        this.emailService = null;
      }
    }
    return this.emailService;
  }

  // Get user notifications with pagination
  async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20,
    unreadOnly: boolean = false
  ): Promise<{ notifications: Notification[]; total: number; hasMore: boolean }> {
    try {
      let query = this.supabase
        .from('notifications')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (unreadOnly) {
        query = query.eq('is_read', false);
      }

      const { data, error, count } = await query
        .range((page - 1) * limit, page * limit - 1);

      if (error) throw error;

      const total = count || 0;
      const hasMore = total > page * limit;

      return {
        notifications: data || [],
        total,
        hasMore,
      };
    } catch (error) {
      console.error('Error fetching user notifications:', error);
      throw error;
    }
  }

  // Get unread notification count
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await this.supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      throw error;
    }
  }

  // Create a new notification
  async createNotification(data: CreateNotificationData): Promise<Notification | null> {
    try {
      const { data: notification, error } = await this.supabase
        .from('notifications')
        .insert({
          ...data,
          priority: data.priority || 'normal',
        })
        .select()
        .single();

      if (error) throw error;

      // Send email notification if user has email notifications enabled
      await this.sendEmailNotificationIfEnabled(notification);

      // Send web push notification if configured and user has subscription
      await this.sendWebPushNotificationIfEnabled(notification);

      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Send email notification if user preferences allow it - FIXED VERSION
  private async sendEmailNotificationIfEnabled(notification: Notification): Promise<void> {
    try {
      // Get user profile with email preferences from profiles table
      const { data: profile, error } = await this.supabase
        .from('profiles')
        .select('email, full_name, email_notifications_enabled, voting_email_notifications, notification_preferences')
        .eq('id', notification.user_id)
        .single();

      if (error || !profile) {
        console.error('Error fetching user profile for email notification:', error);
        return;
      }

      // Check if user has email notifications enabled
      const emailEnabled = profile.email_notifications_enabled ?? true;
      if (!emailEnabled) {
        console.log(`Email notifications disabled for user ${notification.user_id}`);
        return;
      }

      // Check specific notification type preferences
      if (notification.type === 'resolution' && profile.voting_email_notifications === false) {
        console.log(`Resolution email notifications disabled for user ${notification.user_id}`);
        return;
      }

      // Create email data
      const emailData = createEmailNotificationData(
        { email: profile.email, full_name: profile.full_name },
        {
          title: notification.title,
          message: notification.message,
          type: notification.type,
          action_url: notification.action_url,
          action_text: notification.action_text,
        }
      );

      // Send email using Gmail SMTP
      const emailService = await this.getEmailService();
      if (!emailService) {
        console.error('Gmail SMTP service not available');
        return;
      }

      const success = await emailService.sendNotificationEmail(emailData);
      console.log(`📧 Email notification ${success ? 'sent successfully' : 'failed'} to ${profile.email}`);
    } catch (error) {
      console.error('Error sending email notification:', error);
      // Don't throw error - email failure shouldn't break notification creation
    }
  }

  // Send web push notification if user has subscription
  private async sendWebPushNotificationIfEnabled(notification: Notification): Promise<void> {
    try {
      const webPushService = getSafeWebPushService();
      if (!webPushService.isServiceConfigured()) {
        return; // Web push not configured
      }

      const webPushData: WebPushNotificationData = {
        title: notification.title,
        message: notification.message,
        url: notification.action_url,
        tag: `${notification.type}-${notification.id}`,
        requireInteraction: notification.priority === 'urgent',
      };

      await webPushService.sendNotificationsToUsers([notification.user_id], webPushData);
    } catch (error) {
      console.error('Error sending web push notification:', error);
      // Don't throw error - web push failure shouldn't break notification creation
    }
  }

  // Mark notification as read
  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('notifications')
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq('id', notificationId)
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Mark all notifications as read for a user
  async markAllAsRead(userId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('notifications')
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  // Delete a notification
  async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  // Bulk create notifications (for system-wide announcements) - FIXED VERSION
  async createBulkNotifications(
    userIds: string[],
    notificationData: Omit<CreateNotificationData, 'user_id'>
  ): Promise<boolean> {
    try {
      const notifications = userIds.map(userId => ({
        ...notificationData,
        user_id: userId,
        priority: notificationData.priority || 'normal',
      }));

      const { error } = await this.supabase
        .from('notifications')
        .insert(notifications);

      if (error) throw error;

      // Send bulk email notifications using the fixed method
      await this.sendBulkEmailNotificationsIfEnabledFixed(userIds, notificationData);

      // Send bulk web push notifications if configured
      await this.sendBulkWebPushNotifications(userIds, notificationData);

      return true;
    } catch (error) {
      console.error('Error creating bulk notifications:', error);
      throw error;
    }
  }

  // FIXED: Send bulk email notifications using profiles table
  private async sendBulkEmailNotificationsIfEnabledFixed(
    userIds: string[],
    notificationData: Omit<CreateNotificationData, 'user_id'>
  ): Promise<void> {
    try {
      console.log(`📧 Starting bulk email notifications for ${userIds.length} users`);

      // Get users with email preferences from profiles table
      const { data: usersWithProfiles, error } = await this.supabase
        .from('profiles')
        .select('id, email, full_name, email_notifications_enabled, voting_email_notifications, notification_preferences')
        .in('id', userIds)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching users for bulk email notifications:', error);
        return;
      }

      if (!usersWithProfiles || usersWithProfiles.length === 0) {
        console.log('No active users found for bulk email notifications');
        return;
      }

      // Filter users who should receive email notifications
      const usersWithEmailEnabled = usersWithProfiles.filter(user => {
        const emailEnabled = user.email_notifications_enabled ?? true;
        
        // Check specific notification type preferences
        if (notificationData.type === 'resolution') {
          const votingEmailEnabled = user.voting_email_notifications ?? true;
          return emailEnabled && votingEmailEnabled;
        }
        
        return emailEnabled;
      });

      console.log(`📧 ${usersWithEmailEnabled.length} users have email notifications enabled`);

      if (usersWithEmailEnabled.length === 0) {
        console.log('No users with email notifications enabled');
        return;
      }

      // Create email notification data for each user
      const emailNotifications = usersWithEmailEnabled.map(user => 
        createEmailNotificationData(
          { email: user.email, full_name: user.full_name },
          {
            title: notificationData.title,
            message: notificationData.message,
            type: notificationData.type,
            action_url: notificationData.action_url,
            action_text: notificationData.action_text,
          }
        )
      );

      // Send bulk emails using Gmail SMTP
      const emailService = await this.getEmailService();
      if (!emailService) {
        console.error('Gmail SMTP service not available');
        return;
      }

      const success = await emailService.sendBulkNotificationEmails(emailNotifications);
      console.log(`📧 Bulk email send result: ${success ? 'successful' : 'failed'} for ${emailNotifications.length} users`);
      
      // Log individual recipients for debugging
      emailNotifications.forEach(email => {
        console.log(`📧 Email queued for: ${email.userEmail} (${email.userName})`);
      });
    } catch (error) {
      console.error('Error sending bulk email notifications:', error);
      // Don't throw error - email failure shouldn't break notification creation
    }
  }

  // Send bulk web push notifications
  private async sendBulkWebPushNotifications(
    userIds: string[],
    notificationData: Omit<CreateNotificationData, 'user_id'>
  ): Promise<void> {
    try {
      const webPushService = getSafeWebPushService();
      if (!webPushService.isServiceConfigured()) {
        return; // Web push not configured
      }

      const webPushData: WebPushNotificationData = {
        title: notificationData.title,
        message: notificationData.message,
        url: notificationData.action_url,
        tag: `${notificationData.type}-${Date.now()}`,
        requireInteraction: notificationData.priority === 'urgent',
      };

      const result = await webPushService.sendNotificationsToUsers(userIds, webPushData);
      console.log(`Web push bulk send result: ${result.successful} successful, ${result.failed} failed`);
    } catch (error) {
      console.error('Error sending bulk web push notifications:', error);
      // Don't throw error - web push failure shouldn't break notification creation
    }
  }

  // Resolution notification methods
  async notifyResolutionCreated(resolution: any, createdBy: string): Promise<void> {
    try {
      console.log(`📧 Creating resolution notification for: ${resolution.title}`);
      
      const boardMembers = await this.getBoardMembersFixed();
      const recipientIds = boardMembers.filter(id => id !== createdBy);

      console.log(`📧 Found ${boardMembers.length} board members, ${recipientIds.length} will receive notifications`);

      if (recipientIds.length === 0) {
        console.log('No recipients for resolution notification');
        return;
      }

      await this.createBulkNotifications(recipientIds, {
        title: 'New Resolution Created',
        message: `A new resolution "${resolution.title}" has been created`,
        type: 'resolution',
        priority: 'normal',
        action_url: `/dashboard/resolutions`,
        action_text: 'View Resolution',
        metadata: {
          entity_type: 'resolution',
          entity_id: resolution.id,
          action_type: 'created',
          created_by: createdBy,
        },
      });

      console.log(`📧 Resolution notification created successfully`);
    } catch (error) {
      console.error('Error creating resolution created notifications:', error);
      // Don't throw - this is a non-critical operation
    }
  }

  // Minutes notification methods
  async notifyMinutesCreated(minutes: any, createdBy: string): Promise<void> {
    try {
      console.log(`📧 Creating minutes notification for: ${minutes.title}`);
      
      const boardMembers = await this.getBoardMembersFixed();
      const recipientIds = boardMembers.filter(id => id !== createdBy);

      console.log(`📧 Found ${boardMembers.length} board members, ${recipientIds.length} will receive notifications`);

      if (recipientIds.length === 0) {
        console.log('No recipients for minutes notification');
        return;
      }

      await this.createBulkNotifications(recipientIds, {
        title: 'New Minutes Created',
        message: `New meeting minutes "${minutes.title}" have been created`,
        type: 'document',
        priority: 'normal',
        action_url: `/dashboard/minutes`,
        action_text: 'View Minutes',
        metadata: {
          entity_type: 'minutes',
          entity_id: minutes.id,
          action_type: 'created',
          created_by: createdBy,
        },
      });

      console.log(`📧 Minutes notification created successfully`);
    } catch (error) {
      console.error('Error creating minutes created notifications:', error);
      // Don't throw - this is a non-critical operation
    }
  }

  // FIXED: Helper method to get board members (includes both admin and board_member roles)
  private async getBoardMembersFixed(): Promise<string[]> {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('id')
        .in('role', ['admin', 'board_member'])
        .eq('is_active', true);

      if (error) throw error;
      
      const memberIds = data?.map(profile => profile.id) || [];
      console.log(`📧 Found ${memberIds.length} active board members and admins`);
      
      return memberIds;
    } catch (error) {
      console.error('Error fetching board members:', error);
      return [];
    }
  }
}