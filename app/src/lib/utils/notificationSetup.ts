import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Notification Setup Utility
 * Ensures all users have proper notification preferences set up
 */
export class NotificationSetupService {
  constructor(private supabase: SupabaseClient) { }

  /**
   * Ensure all users have notification preferences
   * This is the core fix for the email notification issue
   */
  async ensureAllUsersHaveNotificationPreferences(): Promise<{
    success: boolean;
    created: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let created = 0;

    try {
      // Get all users
      const { data: allUsers, error: usersError } = await this.supabase
        .from('profiles')
        .select('id, email, full_name');

      if (usersError) {
        errors.push(`Failed to fetch users: ${usersError.message}`);
        return { success: false, created: 0, errors };
      }

      if (!allUsers || allUsers.length === 0) {
        return { success: true, created: 0, errors: ['No users found'] };
      }

      // Get existing notification preferences
      const { data: existingPrefs, error: prefsError } = await this.supabase
        .from('notification_preferences')
        .select('user_id');

      if (prefsError) {
        errors.push(`Failed to fetch existing preferences: ${prefsError.message}`);
        return { success: false, created: 0, errors };
      }

      // Find users without preferences
      const existingUserIds = new Set(existingPrefs?.map(p => p.user_id) || []);
      const usersWithoutPrefs = allUsers.filter(user => !existingUserIds.has(user.id));

      if (usersWithoutPrefs.length === 0) {
        return { success: true, created: 0, errors: [] };
      }

      // Create default preferences for users without them
      const defaultPrefs = usersWithoutPrefs.map(user => ({
        user_id: user.id,
        email_notifications: true,
        meeting_reminders: true,
        resolution_alerts: true,
        document_updates: true,
        system_alerts: true,
        email_frequency: 'immediate' as const
      }));

      const { error: insertError } = await this.supabase
        .from('notification_preferences')
        .insert(defaultPrefs);

      if (insertError) {
        errors.push(`Failed to create preferences: ${insertError.message}`);
        return { success: false, created: 0, errors };
      }

      created = usersWithoutPrefs.length;
      console.log(`✅ Created notification preferences for ${created} users`);

      return { success: true, created, errors: [] };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Setup failed: ${errorMessage}`);
      return { success: false, created: 0, errors };
    }
  }

  /**
   * Validate notification system setup
   */
  async validateNotificationSystem(): Promise<{
    isValid: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      // Check environment variables
      if (!process.env.EMAIL_API_KEY) {
        issues.push('EMAIL_API_KEY environment variable is not set');
        recommendations.push('Set EMAIL_API_KEY in your environment variables');
      }

      if (!process.env.FROM_EMAIL) {
        issues.push('FROM_EMAIL environment variable is not set');
        recommendations.push('Set FROM_EMAIL in your environment variables');
      }

      // Check if notification_preferences table exists
      const { error: tableError } = await this.supabase
        .from('notification_preferences')
        .select('id')
        .limit(1);

      if (tableError) {
        issues.push('notification_preferences table does not exist or is not accessible');
        recommendations.push('Run the notifications schema SQL to create the notification_preferences table');
      }

      // Check if users have notification preferences
      const { data: users } = await this.supabase
        .from('profiles')
        .select('id');

      const { data: prefs } = await this.supabase
        .from('notification_preferences')
        .select('user_id');

      const usersCount = users?.length || 0;
      const prefsCount = prefs?.length || 0;

      if (usersCount > 0 && prefsCount === 0) {
        issues.push('No users have notification preferences set up');
        recommendations.push('Run ensureAllUsersHaveNotificationPreferences() to create default preferences');
      } else if (prefsCount < usersCount) {
        issues.push(`${usersCount - prefsCount} users are missing notification preferences`);
        recommendations.push('Run ensureAllUsersHaveNotificationPreferences() to create missing preferences');
      }

      return {
        isValid: issues.length === 0,
        issues,
        recommendations
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      issues.push(`Validation failed: ${errorMessage}`);
      return { isValid: false, issues, recommendations };
    }
  }

  /**
   * Test the complete notification flow
   */
  async testNotificationFlow(testUserId: string): Promise<{
    success: boolean;
    steps: Array<{ step: string; success: boolean; message: string }>;
  }> {
    const steps: Array<{ step: string; success: boolean; message: string }> = [];

    try {
      // Step 1: Check user exists
      const { data: user, error: userError } = await this.supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('id', testUserId)
        .single();

      steps.push({
        step: 'User lookup',
        success: !userError && !!user,
        message: userError ? userError.message : `Found user: ${user?.email}`
      });

      if (userError || !user) {
        return { success: false, steps };
      }

      // Step 2: Check notification preferences
      const { data: prefs, error: prefsError } = await this.supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', testUserId)
        .single();

      steps.push({
        step: 'Notification preferences',
        success: !prefsError && !!prefs,
        message: prefsError ? prefsError.message : `Preferences found: email_notifications=${prefs?.email_notifications}`
      });

      // Step 3: Test notification creation
      const { error: notifError } = await this.supabase
        .from('notifications')
        .insert({
          user_id: testUserId,
          title: 'Test Notification Flow',
          message: 'This is a test notification to verify the complete flow',
          type: 'system',
          priority: 'normal'
        });

      steps.push({
        step: 'Notification creation',
        success: !notifError,
        message: notifError ? notifError.message : 'Notification created successfully'
      });

      const allStepsSuccessful = steps.every(step => step.success);
      return { success: allStepsSuccessful, steps };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      steps.push({
        step: 'Test execution',
        success: false,
        message: `Test failed: ${errorMessage}`
      });
      return { success: false, steps };
    }
  }
}