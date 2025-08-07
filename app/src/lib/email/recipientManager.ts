import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

export interface EmailRecipient {
  id: string;
  full_name: string;
  email: string;
  position?: string;
  role: 'admin' | 'board_member';
  is_active: boolean;
  email_notifications_enabled: boolean;
  voting_email_notifications: boolean;
  last_email_sent?: string;
  email_delivery_status?: 'pending' | 'sent' | 'failed' | 'bounced';
  preferences?: EmailPreferences;
}

export interface EmailPreferences {
  voting_summaries: boolean;
  voting_reminders: boolean;
  system_notifications: boolean;
  digest_frequency: 'immediate' | 'daily' | 'weekly' | 'disabled';
  preferred_format: 'html' | 'text' | 'both';
  timezone?: string;
}

export interface RecipientGroup {
  id: string;
  name: string;
  description: string;
  recipients: EmailRecipient[];
  auto_include_admins: boolean;
  auto_include_board_members: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmailDeliveryResult {
  recipient: EmailRecipient;
  success: boolean;
  error?: string;
  delivery_time: number; // milliseconds
  message_id?: string;
  bounce_reason?: string;
}

export interface BulkEmailResult {
  total_recipients: number;
  successful_deliveries: number;
  failed_deliveries: number;
  delivery_results: EmailDeliveryResult[];
  total_time: number;
  average_delivery_time: number;
  bounce_rate: number;
}

export class RecipientManager {
  private supabase: SupabaseClient<Database>;

  constructor(supabase: SupabaseClient<Database>) {
    this.supabase = supabase;
  }

  /**
   * Get all eligible recipients for voting summary emails
   */
  async getAllVotingEmailRecipients(): Promise<EmailRecipient[]> {
    try {
      const { data: profiles, error } = await this.supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          position,
          role,
          is_active,
          email_notifications_enabled,
          voting_email_notifications,
          notification_preferences
        `)
        .eq('is_active', true)
        .in('role', ['admin', 'board_member'])
        .eq('email_notifications_enabled', true)
        .order('full_name');

      if (error) {
        console.error('Error fetching voting email recipients:', error);
        return [];
      }

      return (profiles || []).map(profile => this.mapProfileToRecipient(profile));
    } catch (error) {
      console.error('Error in getAllVotingEmailRecipients:', error);
      return [];
    }
  }

  /**
   * Get recipients filtered by preferences and status
   */
  async getFilteredRecipients(filters: {
    includeAdmins?: boolean;
    includeBoardMembers?: boolean;
    votingEmailsOnly?: boolean;
    activeOnly?: boolean;
    excludeIds?: string[];
  }): Promise<EmailRecipient[]> {
    try {
      let query = this.supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          position,
          role,
          is_active,
          email_notifications_enabled,
          voting_email_notifications,
          notification_preferences
        `);

      // Apply filters
      if (filters.activeOnly !== false) {
        query = query.eq('is_active', true);
      }

      if (filters.includeAdmins === false && filters.includeBoardMembers === false) {
        // No recipients if both are excluded
        return [];
      } else if (filters.includeAdmins === false) {
        query = query.eq('role', 'board_member');
      } else if (filters.includeBoardMembers === false) {
        query = query.eq('role', 'admin');
      } else {
        query = query.in('role', ['admin', 'board_member']);
      }

      if (filters.votingEmailsOnly) {
        query = query.eq('voting_email_notifications', true);
      }

      if (filters.excludeIds && filters.excludeIds.length > 0) {
        query = query.not('id', 'in', `(${filters.excludeIds.join(',')})`);
      }

      const { data: profiles, error } = await query.order('full_name');

      if (error) {
        console.error('Error fetching filtered recipients:', error);
        return [];
      }

      return (profiles || []).map(profile => this.mapProfileToRecipient(profile));
    } catch (error) {
      console.error('Error in getFilteredRecipients:', error);
      return [];
    }
  }

  /**
   * Get recipient by ID with full details
   */
  async getRecipientById(recipientId: string): Promise<EmailRecipient | null> {
    try {
      const { data: profile, error } = await this.supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          position,
          role,
          is_active,
          email_notifications_enabled,
          voting_email_notifications,
          notification_preferences
        `)
        .eq('id', recipientId)
        .single();

      if (error || !profile) {
        console.error('Error fetching recipient by ID:', error);
        return null;
      }

      return this.mapProfileToRecipient(profile);
    } catch (error) {
      console.error('Error in getRecipientById:', error);
      return null;
    }
  }

  /**
   * Update recipient email preferences
   */
  async updateRecipientPreferences(
    recipientId: string, 
    preferences: Partial<EmailPreferences>
  ): Promise<boolean> {
    try {
      // Get current preferences
      const { data: currentProfile, error: fetchError } = await this.supabase
        .from('profiles')
        .select('notification_preferences')
        .eq('id', recipientId)
        .single();

      if (fetchError) {
        console.error('Error fetching current preferences:', fetchError);
        return false;
      }

      // Merge with new preferences
      const currentPrefs = (currentProfile?.notification_preferences && 
                           typeof currentProfile.notification_preferences === 'object' && 
                           currentProfile.notification_preferences !== null) 
                           ? currentProfile.notification_preferences as Record<string, any>
                           : {};
      const updatedPrefs = { ...currentPrefs, ...preferences };

      // Update in database
      const { error: updateError } = await this.supabase
        .from('profiles')
        .update({
          notification_preferences: updatedPrefs,
          updated_at: new Date().toISOString()
        })
        .eq('id', recipientId);

      if (updateError) {
        console.error('Error updating recipient preferences:', updateError);
        return false;
      }

      console.log(`✅ Updated email preferences for recipient: ${recipientId}`);
      return true;
    } catch (error) {
      console.error('Error in updateRecipientPreferences:', error);
      return false;
    }
  }

  /**
   * Check if recipient should receive voting emails based on preferences
   */
  shouldReceiveVotingEmails(recipient: EmailRecipient): boolean {
    // Basic checks
    if (!recipient.is_active || !recipient.email_notifications_enabled) {
      return false;
    }

    // Check voting-specific preference
    if (recipient.voting_email_notifications === false) {
      return false;
    }

    // Check detailed preferences if available
    if (recipient.preferences) {
      if (recipient.preferences.voting_summaries === false) {
        return false;
      }
      
      if (recipient.preferences.digest_frequency === 'disabled') {
        return false;
      }
    }

    return true;
  }

  /**
   * Get recipients who should receive voting emails
   */
  async getVotingEmailRecipients(): Promise<EmailRecipient[]> {
    const allRecipients = await this.getAllVotingEmailRecipients();
    return allRecipients.filter(recipient => this.shouldReceiveVotingEmails(recipient));
  }

  /**
   * Record email delivery attempt
   */
  async recordEmailDelivery(
    recipientId: string,
    emailType: 'voting_summary' | 'voting_reminder' | 'system_notification',
    success: boolean,
    error?: string,
    messageId?: string
  ): Promise<void> {
    try {
      const deliveryRecord = {
        recipient_id: recipientId,
        email_type: emailType,
        success,
        error_message: error,
        message_id: messageId,
        sent_at: new Date().toISOString()
      };

      // In a full implementation, this would be stored in an email_delivery_log table
      console.log('📧 Email delivery recorded:', deliveryRecord);

      // Update recipient's last email sent timestamp
      if (success) {
        await this.supabase
          .from('profiles')
          .update({ 
            last_email_sent: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', recipientId);
      }
    } catch (error) {
      console.error('Error recording email delivery:', error);
    }
  }

  /**
   * Get email delivery statistics for a recipient
   */
  async getRecipientEmailStats(recipientId: string, days: number = 30): Promise<{
    total_emails: number;
    successful_emails: number;
    failed_emails: number;
    bounce_rate: number;
    last_email_sent?: string;
  }> {
    try {
      // In a full implementation, this would query an email_delivery_log table
      // For now, return basic stats from profile
      const { data: profile, error } = await this.supabase
        .from('profiles')
        .select('last_email_sent')
        .eq('id', recipientId)
        .single();

      if (error) {
        console.error('Error fetching recipient email stats:', error);
        return {
          total_emails: 0,
          successful_emails: 0,
          failed_emails: 0,
          bounce_rate: 0
        };
      }

      return {
        total_emails: 0, // Would be calculated from delivery log
        successful_emails: 0,
        failed_emails: 0,
        bounce_rate: 0,
        last_email_sent: profile?.last_email_sent || undefined
      };
    } catch (error) {
      console.error('Error in getRecipientEmailStats:', error);
      return {
        total_emails: 0,
        successful_emails: 0,
        failed_emails: 0,
        bounce_rate: 0
      };
    }
  }

  /**
   * Handle email bounces and update recipient status
   */
  async handleEmailBounce(
    recipientId: string,
    bounceType: 'hard' | 'soft' | 'complaint',
    bounceReason: string
  ): Promise<void> {
    try {
      console.log(`📧 Handling email bounce for recipient ${recipientId}: ${bounceType} - ${bounceReason}`);

      // For hard bounces, disable email notifications
      if (bounceType === 'hard') {
        await this.supabase
          .from('profiles')
          .update({
            email_notifications_enabled: false,
            voting_email_notifications: false,
            bounce_reason: bounceReason,
            bounced_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', recipientId);

        console.log(`❌ Disabled email notifications for recipient ${recipientId} due to hard bounce`);
      } else {
        // For soft bounces, just record the bounce
        await this.supabase
          .from('profiles')
          .update({
            bounce_reason: bounceReason,
            bounced_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', recipientId);
      }
    } catch (error) {
      console.error('Error handling email bounce:', error);
    }
  }

  /**
   * Validate email addresses and check for deliverability
   */
  async validateRecipientEmails(recipients: EmailRecipient[]): Promise<{
    valid: EmailRecipient[];
    invalid: Array<{ recipient: EmailRecipient; reason: string }>;
  }> {
    const valid: EmailRecipient[] = [];
    const invalid: Array<{ recipient: EmailRecipient; reason: string }> = [];

    for (const recipient of recipients) {
      const validation = this.validateEmailAddress(recipient.email);
      
      if (validation.isValid) {
        valid.push(recipient);
      } else {
        invalid.push({
          recipient,
          reason: validation.reason || 'Invalid email format'
        });
      }
    }

    return { valid, invalid };
  }

  /**
   * Basic email validation
   */
  private validateEmailAddress(email: string): { isValid: boolean; reason?: string } {
    if (!email || typeof email !== 'string') {
      return { isValid: false, reason: 'Email is required' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { isValid: false, reason: 'Invalid email format' };
    }

    // Check for common invalid domains
    const invalidDomains = ['example.com', 'test.com', 'localhost'];
    const domain = email.split('@')[1]?.toLowerCase();
    if (invalidDomains.includes(domain)) {
      return { isValid: false, reason: 'Invalid email domain' };
    }

    return { isValid: true };
  }

  /**
   * Map database profile to EmailRecipient
   */
  private mapProfileToRecipient(profile: any): EmailRecipient {
    const preferences = profile.notification_preferences || {};
    
    return {
      id: profile.id,
      full_name: profile.full_name || 'Unknown',
      email: profile.email,
      position: profile.position || undefined,
      role: profile.role,
      is_active: profile.is_active,
      email_notifications_enabled: profile.email_notifications_enabled ?? true,
      voting_email_notifications: profile.voting_email_notifications ?? true,
      last_email_sent: profile.last_email_sent,
      preferences: {
        voting_summaries: preferences.voting_summaries ?? true,
        voting_reminders: preferences.voting_reminders ?? true,
        system_notifications: preferences.system_notifications ?? true,
        digest_frequency: preferences.digest_frequency || 'immediate',
        preferred_format: preferences.preferred_format || 'html',
        timezone: preferences.timezone
      }
    };
  }

  /**
   * Create recipient group for targeted email campaigns
   */
  async createRecipientGroup(
    name: string,
    description: string,
    recipientIds: string[],
    options: {
      auto_include_admins?: boolean;
      auto_include_board_members?: boolean;
    } = {}
  ): Promise<string | null> {
    try {
      // In a full implementation, this would create a recipient_groups table entry
      const groupId = `group_${Date.now()}`;
      
      console.log(`📧 Created recipient group: ${name} (${groupId}) with ${recipientIds.length} recipients`);
      
      return groupId;
    } catch (error) {
      console.error('Error creating recipient group:', error);
      return null;
    }
  }

  /**
   * Get system-wide email delivery statistics
   */
  async getSystemEmailStats(days: number = 30): Promise<{
    total_recipients: number;
    active_recipients: number;
    email_enabled_recipients: number;
    voting_email_enabled: number;
    recent_bounces: number;
    delivery_rate: number;
  }> {
    try {
      const { data: stats, error } = await this.supabase
        .from('profiles')
        .select('is_active, email_notifications_enabled, voting_email_notifications, bounced_at')
        .in('role', ['admin', 'board_member']);

      if (error) {
        console.error('Error fetching system email stats:', error);
        return {
          total_recipients: 0,
          active_recipients: 0,
          email_enabled_recipients: 0,
          voting_email_enabled: 0,
          recent_bounces: 0,
          delivery_rate: 0
        };
      }

      const total_recipients = stats?.length || 0;
      const active_recipients = stats?.filter(s => s.is_active).length || 0;
      const email_enabled_recipients = stats?.filter(s => s.is_active && s.email_notifications_enabled).length || 0;
      const voting_email_enabled = stats?.filter(s => s.is_active && s.email_notifications_enabled && s.voting_email_notifications).length || 0;
      
      // Count recent bounces (within specified days)
      const cutoffDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
      const recent_bounces = stats?.filter(s => 
        s.bounced_at && new Date(s.bounced_at) >= cutoffDate
      ).length || 0;

      const delivery_rate = total_recipients > 0 
        ? Math.round(((total_recipients - recent_bounces) / total_recipients) * 100 * 100) / 100
        : 100;

      return {
        total_recipients,
        active_recipients,
        email_enabled_recipients,
        voting_email_enabled,
        recent_bounces,
        delivery_rate
      };
    } catch (error) {
      console.error('Error in getSystemEmailStats:', error);
      return {
        total_recipients: 0,
        active_recipients: 0,
        email_enabled_recipients: 0,
        voting_email_enabled: 0,
        recent_bounces: 0,
        delivery_rate: 0
      };
    }
  }
}