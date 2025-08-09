import { SupabaseClient } from '@supabase/supabase-js';
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

export class NotificationsService {
  private emailService: any = null;

  constructor(private supabase: SupabaseClient) {
    // Email service will be lazy-loaded when needed
  }

  // Lazy load the Gmail SMTP service only when needed (server-side only)
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

  // Lazy load the email helper function
  private async getEmailHelpers() {
    if (typeof window === 'undefined') {
      try {
        const { createGmailEmailNotificationData } = await import('@/lib/email/gmailSmtp');
        return { createGmailEmailNotificationData };
      } catch (error) {
        console.error('Failed to load Gmail SMTP helpers:', error);
        return null;
      }
    }
    return null;
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

  // Send email notification if user preferences allow it
  private async sendEmailNotificationIfEnabled(notification: Notification): Promise<void> {
    try {
      // Get user preferences
      const preferences = await this.getNotificationPreferences(notification.user_id);
      
      if (!preferences?.email_notifications) {
        return; // User has email notifications disabled
      }

      // Get user profile for email
      const { data: profile, error } = await this.supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', notification.user_id)
        .single();

      if (error || !profile) {
        console.error('Error fetching user profile for email notification:', error);
        return;
      }

      // Create email data
      const emailHelpers = await this.getEmailHelpers();
      if (emailHelpers) {
        const emailData = emailHelpers.createGmailEmailNotificationData(
          { email: profile.email, full_name: profile.full_name },
          {
            title: notification.title,
            message: notification.message,
            type: notification.type,
            action_url: notification.action_url,
            action_text: notification.action_text,
          }
        );

        // Send email
        const emailService = await this.getEmailService();
        if (emailService) {
          await emailService.sendNotificationEmail(emailData);
        }
      }
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

  // Get user notification preferences
  async getNotificationPreferences(userId: string): Promise<NotificationPreferences | null> {
    try {
      const { data, error } = await this.supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        // If no preferences exist, create default ones
        if (error.code === 'PGRST116') {
          return await this.createDefaultPreferences(userId);
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
      throw error;
    }
  }

  // Create default notification preferences
  async createDefaultPreferences(userId: string): Promise<NotificationPreferences | null> {
    try {
      const { data, error } = await this.supabase
        .from('notification_preferences')
        .insert({
          user_id: userId,
          email_notifications: true,
          meeting_reminders: true,
          resolution_alerts: true,
          document_updates: true,
          system_alerts: true,
          email_frequency: 'immediate',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating default notification preferences:', error);
      throw error;
    }
  }

  // Update notification preferences
  async updateNotificationPreferences(
    userId: string,
    updates: UpdateNotificationPreferencesData
  ): Promise<NotificationPreferences | null> {
    try {
      const { data, error } = await this.supabase
        .from('notification_preferences')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw error;
    }
  }

  // Bulk create notifications (for system-wide announcements)
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

      // Send bulk email notifications if users have email notifications enabled
      await this.sendBulkEmailNotificationsIfEnabled(userIds, notificationData);

      // Send bulk web push notifications if configured
      await this.sendBulkWebPushNotifications(userIds, notificationData);

      return true;
    } catch (error) {
      console.error('Error creating bulk notifications:', error);
      throw error;
    }
  }

  // Send bulk email notifications if users have email notifications enabled
  private async sendBulkEmailNotificationsIfEnabled(
    userIds: string[],
    notificationData: Omit<CreateNotificationData, 'user_id'>
  ): Promise<void> {
    try {
      // Get all users first
      const { data: allUsers, error: usersError } = await this.supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds)
        .eq('is_active', true);

      if (usersError || !allUsers) {
        console.error('Error fetching users for bulk email notifications:', usersError);
        return;
      }

      // Filter users who should receive email notifications
      const usersWithEmailEnabled = [];
      for (const user of allUsers) {
        try {
          const preferences = await this.getNotificationPreferences(user.id);
          if (preferences?.email_notifications) {
            usersWithEmailEnabled.push(user);
          }
        } catch (error) {
          console.error(`Error checking preferences for user ${user.id}:`, error);
          // Default to sending email if we can't check preferences
          usersWithEmailEnabled.push(user);
        }
      }

      if (usersWithEmailEnabled.length === 0) {
        console.log('No users with email notifications enabled');
        return;
      }

      // Create email notification data for each user
      const emailHelpers = await this.getEmailHelpers();
      if (emailHelpers) {
        const emailNotifications = usersWithEmailEnabled.map(user => 
          emailHelpers.createGmailEmailNotificationData(
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

        // Send bulk emails
        const emailService = await this.getEmailService();
        const success = emailService ? await emailService.sendBulkNotificationEmails(emailNotifications) : false;
        console.log(`Bulk email send result: ${success ? 'successful' : 'failed'} for ${emailNotifications.length} users`);
      }
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

  // Document notification methods
  async notifyDocumentCreated(document: any, createdBy: string): Promise<void> {
    try {
      const boardMembers = await this.getBoardMembers();
      const recipientIds = boardMembers.filter(id => id !== createdBy);

      if (recipientIds.length === 0) return;

      const template = DOCUMENT_TEMPLATES.CREATED(document);
      await this.createBulkNotifications(recipientIds, {
        ...template,
        metadata: {
          entity_type: 'document',
          entity_id: document.id,
          action_type: 'created',
          created_by: createdBy,
        },
      });
    } catch (error) {
      console.error('Error creating document created notifications:', error);
      // Don't throw - this is a non-critical operation
    }
  }

  async notifyDocumentPublished(document: any, publishedBy: string): Promise<void> {
    try {
      const boardMembers = await this.getBoardMembers();
      const recipientIds = boardMembers.filter(id => id !== publishedBy);

      if (recipientIds.length === 0) return;

      await this.createBulkNotifications(recipientIds, {
        title: 'Document Published',
        message: `Document "${document.title}" is now available for viewing`,
        type: 'document',
        priority: 'normal',
        action_url: `/dashboard/documents`,
        action_text: 'View Document',
        metadata: {
          entity_type: 'document',
          entity_id: document.id,
          action_type: 'published',
          created_by: publishedBy,
        },
      });
    } catch (error) {
      console.error('Error creating document published notifications:', error);
      // Don't throw - this is a non-critical operation
    }
  }

  async notifyDocumentUpdated(document: any, updatedBy: string): Promise<void> {
    try {
      const boardMembers = await this.getBoardMembers();
      const recipientIds = boardMembers.filter(id => id !== updatedBy);

      if (recipientIds.length === 0) return;

      await this.createBulkNotifications(recipientIds, {
        title: 'Document Updated',
        message: `Document "${document.title}" has been updated`,
        type: 'document',
        priority: 'normal',
        action_url: `/dashboard/documents`,
        action_text: 'View Document',
        metadata: {
          entity_type: 'document',
          entity_id: document.id,
          action_type: 'updated',
          created_by: updatedBy,
        },
      });
    } catch (error) {
      console.error('Error creating document updated notifications:', error);
      // Don't throw - this is a non-critical operation
    }
  }

  // Meeting notification methods
  async notifyMeetingCreated(meeting: any, createdBy: string): Promise<void> {
    try {
      const participants = await this.getMeetingParticipants(meeting.id);
      const recipientIds = participants.filter(id => id !== createdBy);

      if (recipientIds.length === 0) return;

      const meetingDate = new Date(meeting.meeting_date).toLocaleDateString();
      const meetingTime = new Date(meeting.meeting_date).toLocaleTimeString();

      await this.createBulkNotifications(recipientIds, {
        title: 'Meeting Scheduled',
        message: `You have been invited to "${meeting.title}" on ${meetingDate} at ${meetingTime}`,
        type: 'meeting',
        priority: 'high',
        action_url: `/dashboard/meetings`,
        action_text: 'View Meeting',
        metadata: {
          entity_type: 'meeting',
          entity_id: meeting.id,
          action_type: 'created',
          created_by: createdBy,
          additional_data: {
            meeting_date: meeting.meeting_date,
            location: meeting.location,
          },
        },
      });
    } catch (error) {
      console.error('Error creating meeting created notifications:', error);
      // Don't throw - this is a non-critical operation
    }
  }

  async notifyMeetingUpdated(meeting: any, updatedBy: string): Promise<void> {
    try {
      const participants = await this.getMeetingParticipants(meeting.id);
      const recipientIds = participants.filter(id => id !== updatedBy);

      if (recipientIds.length === 0) return;

      const meetingDate = new Date(meeting.meeting_date).toLocaleDateString();
      const meetingTime = new Date(meeting.meeting_date).toLocaleTimeString();

      await this.createBulkNotifications(recipientIds, {
        title: 'Meeting Updated',
        message: `Meeting "${meeting.title}" scheduled for ${meetingDate} at ${meetingTime} has been updated`,
        type: 'meeting',
        priority: 'high',
        action_url: `/dashboard/meetings`,
        action_text: 'View Meeting',
        metadata: {
          entity_type: 'meeting',
          entity_id: meeting.id,
          action_type: 'updated',
          created_by: updatedBy,
          additional_data: {
            meeting_date: meeting.meeting_date,
            location: meeting.location,
          },
        },
      });
    } catch (error) {
      console.error('Error creating meeting updated notifications:', error);
      // Don't throw - this is a non-critical operation
    }
  }

  async notifyMeetingCancelled(meeting: any, cancelledBy: string): Promise<void> {
    try {
      const participants = await this.getMeetingParticipants(meeting.id);
      const recipientIds = participants.filter(id => id !== cancelledBy);

      if (recipientIds.length === 0) return;

      const meetingDate = new Date(meeting.meeting_date).toLocaleDateString();

      await this.createBulkNotifications(recipientIds, {
        title: 'Meeting Cancelled',
        message: `Meeting "${meeting.title}" scheduled for ${meetingDate} has been cancelled`,
        type: 'meeting',
        priority: 'urgent',
        action_url: `/dashboard/meetings`,
        action_text: 'View Meetings',
        metadata: {
          entity_type: 'meeting',
          entity_id: meeting.id,
          action_type: 'cancelled',
          created_by: cancelledBy,
        },
      });
    } catch (error) {
      console.error('Error creating meeting cancelled notifications:', error);
      // Don't throw - this is a non-critical operation
    }
  }

  // Resolution notification methods
  async notifyResolutionCreated(resolution: any, createdBy: string): Promise<void> {
    try {
      const boardMembers = await this.getBoardMembers();
      const recipientIds = boardMembers.filter(id => id !== createdBy);

      if (recipientIds.length === 0) return;

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
    } catch (error) {
      console.error('Error creating resolution created notifications:', error);
      // Don't throw - this is a non-critical operation
    }
  }

  async notifyResolutionPublished(resolution: any, publishedBy: string): Promise<void> {
    try {
      const eligibleVoters = await this.getEligibleVoters(resolution.id);
      const recipientIds = eligibleVoters.filter(id => id !== publishedBy);

      if (recipientIds.length === 0) return;

      const votingDeadline = resolution.voting_deadline 
        ? new Date(resolution.voting_deadline).toLocaleDateString()
        : 'No deadline set';

      await this.createBulkNotifications(recipientIds, {
        title: 'New Resolution for Voting',
        message: `Resolution "${resolution.title}" is now open for voting. Deadline: ${votingDeadline}`,
        type: 'resolution',
        priority: 'high',
        action_url: `/dashboard/resolutions`,
        action_text: 'Vote Now',
        metadata: {
          entity_type: 'resolution',
          entity_id: resolution.id,
          action_type: 'published',
          created_by: publishedBy,
          additional_data: {
            voting_deadline: resolution.voting_deadline,
          },
        },
      });
    } catch (error) {
      console.error('Error creating resolution published notifications:', error);
      // Don't throw - this is a non-critical operation
    }
  }

  async notifyVotingDeadlineApproaching(resolution: any): Promise<void> {
    try {
      const eligibleVoters = await this.getEligibleVoters(resolution.id);
      
      if (eligibleVoters.length === 0) return;

      const votingDeadline = new Date(resolution.voting_deadline).toLocaleDateString();

      await this.createBulkNotifications(eligibleVoters, {
        title: 'Voting Deadline Approaching',
        message: `Reminder: Voting for resolution "${resolution.title}" ends on ${votingDeadline}`,
        type: 'reminder',
        priority: 'high',
        action_url: `/dashboard/resolutions`,
        action_text: 'Vote Now',
        metadata: {
          entity_type: 'resolution',
          entity_id: resolution.id,
          action_type: 'reminder',
          additional_data: {
            voting_deadline: resolution.voting_deadline,
          },
        },
      });
    } catch (error) {
      console.error('Error creating voting deadline reminder notifications:', error);
      // Don't throw - this is a non-critical operation
    }
  }

  // Minutes notification methods
  async notifyMinutesCreated(minutes: any, createdBy: string): Promise<void> {
    try {
      const boardMembers = await this.getBoardMembers();
      const recipientIds = boardMembers.filter(id => id !== createdBy);

      if (recipientIds.length === 0) return;

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
    } catch (error) {
      console.error('Error creating minutes created notifications:', error);
      // Don't throw - this is a non-critical operation
    }
  }

  async notifyMinutesPublishedForVoting(minutes: any, publishedBy: string): Promise<void> {
    try {
      const boardMembers = await this.getBoardMembers();
      const recipientIds = boardMembers.filter(id => id !== publishedBy);

      if (recipientIds.length === 0) return;

      const votingDeadline = minutes.voting_deadline 
        ? new Date(minutes.voting_deadline).toLocaleDateString()
        : 'No deadline set';

      await this.createBulkNotifications(recipientIds, {
        title: 'Minutes Ready for Voting',
        message: `Meeting minutes "${minutes.title}" are now open for voting. Deadline: ${votingDeadline}`,
        type: 'resolution',
        priority: 'high',
        action_url: `/dashboard/minutes`,
        action_text: 'Vote on Minutes',
        metadata: {
          entity_type: 'minutes',
          entity_id: minutes.id,
          action_type: 'published_for_voting',
          created_by: publishedBy,
          additional_data: {
            voting_deadline: minutes.voting_deadline,
          },
        },
      });
    } catch (error) {
      console.error('Error creating minutes voting notifications:', error);
      // Don't throw - this is a non-critical operation
    }
  }

  async notifyMinutesVoteSubmitted(minutes: any, voterId: string, vote: string): Promise<void> {
    try {
      // Only notify admins about vote submissions
      const admins = await this.getAdminUsers();
      const recipientIds = admins.filter(id => id !== voterId);

      if (recipientIds.length === 0) return;

      await this.createBulkNotifications(recipientIds, {
        title: 'Vote Submitted on Minutes',
        message: `A board member has voted "${vote}" on minutes "${minutes.title}"`,
        type: 'system',
        priority: 'low',
        action_url: `/admin/minutes`,
        action_text: 'View Voting Results',
        metadata: {
          entity_type: 'minutes',
          entity_id: minutes.id,
          action_type: 'vote_submitted',
          created_by: voterId,
          additional_data: {
            vote: vote,
          },
        },
      });
    } catch (error) {
      console.error('Error creating minutes vote notifications:', error);
      // Don't throw - this is a non-critical operation
    }
  }

  async notifyMinutesApproved(minutes: any): Promise<void> {
    try {
      const boardMembers = await this.getBoardMembers();

      if (boardMembers.length === 0) return;

      await this.createBulkNotifications(boardMembers, {
        title: 'Minutes Approved',
        message: `Meeting minutes "${minutes.title}" have been approved by the board`,
        type: 'resolution',
        priority: 'normal',
        action_url: `/dashboard/minutes`,
        action_text: 'View Minutes',
        metadata: {
          entity_type: 'minutes',
          entity_id: minutes.id,
          action_type: 'approved',
        },
      });
    } catch (error) {
      console.error('Error creating minutes approved notifications:', error);
      // Don't throw - this is a non-critical operation
    }
  }

  async notifyMinutesRejected(minutes: any): Promise<void> {
    try {
      const boardMembers = await this.getBoardMembers();

      if (boardMembers.length === 0) return;

      await this.createBulkNotifications(boardMembers, {
        title: 'Minutes Rejected',
        message: `Meeting minutes "${minutes.title}" have been rejected by the board`,
        type: 'resolution',
        priority: 'normal',
        action_url: `/dashboard/minutes`,
        action_text: 'View Minutes',
        metadata: {
          entity_type: 'minutes',
          entity_id: minutes.id,
          action_type: 'rejected',
        },
      });
    } catch (error) {
      console.error('Error creating minutes rejected notifications:', error);
      // Don't throw - this is a non-critical operation
    }
  }

  // Helper methods for getting user lists
  private async getBoardMembers(): Promise<string[]> {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('id')
        .in('role', ['admin', 'board_member'])
        .eq('is_active', true);

      if (error) throw error;
      return data?.map(profile => profile.id) || [];
    } catch (error) {
      console.error('Error fetching board members:', error);
      return [];
    }
  }

  private async getAdminUsers(): Promise<string[]> {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin');

      if (error) throw error;
      return data?.map(profile => profile.id) || [];
    } catch (error) {
      console.error('Error fetching admin users:', error);
      return [];
    }
  }

  private async getMeetingParticipants(meetingId: string): Promise<string[]> {
    try {
      const { data, error } = await this.supabase
        .from('meeting_participants')
        .select('user_id')
        .eq('meeting_id', meetingId);

      if (error) throw error;
      return data?.map(participant => participant.user_id) || [];
    } catch (error) {
      console.error('Error fetching meeting participants:', error);
      // Fallback to all board members if participants query fails
      return await this.getBoardMembers();
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async getEligibleVoters(_resolutionId: string): Promise<string[]> {
    try {
      // For now, all board members and admins are eligible voters
      // This can be enhanced later with specific voter eligibility rules
      const { data, error } = await this.supabase
        .from('profiles')
        .select('id')
        .in('role', ['admin', 'board_member'])
        .eq('is_active', true);

      if (error) throw error;
      return data?.map(profile => profile.id) || [];
    } catch (error) {
      console.error('Error fetching eligible voters:', error);
      return [];
    }
  }
}