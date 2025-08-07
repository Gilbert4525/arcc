import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getDatabaseServices } from '@/lib/database';

/**
 * POST /api/admin/test-notification-debug
 * Debug endpoint to check notification system
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { notifications } = getDatabaseServices(supabase);

    // Debug information
    const debugInfo: any = {
      timestamp: new Date().toISOString(),
      checks: {}
    };

    // 1. Check all users and their profiles
    const { data: allUsers, error: usersError } = await supabase
      .from('profiles')
      .select('id, email, full_name, role');

    debugInfo.checks.users = {
      error: usersError?.message,
      count: allUsers?.length || 0,
      users: allUsers?.map(u => ({ id: u.id, email: u.email, role: u.role }))
    };

    // 2. Check notification preferences for all users
    const { data: preferences, error: prefsError } = await supabase
      .from('notification_preferences')
      .select('user_id, email_notifications, resolution_alerts');

    debugInfo.checks.preferences = {
      error: prefsError?.message,
      count: preferences?.length || 0,
      preferences: preferences
    };

    // 3. Check recent notifications
    const { data: recentNotifications, error: notifError } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    debugInfo.checks.recentNotifications = {
      error: notifError?.message,
      count: recentNotifications?.length || 0,
      notifications: recentNotifications
    };

    // 4. Check environment variables
    debugInfo.checks.environment = {
      emailApiKey: !!process.env.EMAIL_API_KEY,
      fromEmail: process.env.FROM_EMAIL,
      vapidConfigured: !!process.env.VAPID_PRIVATE_KEY
    };

    // 5. Test creating default preferences for users without them
    if (allUsers) {
      const usersWithoutPrefs = allUsers.filter(user => 
        !preferences?.some(pref => pref.user_id === user.id)
      );

      debugInfo.checks.usersWithoutPreferences = {
        count: usersWithoutPrefs.length,
        users: usersWithoutPrefs.map(u => ({ id: u.id, email: u.email }))
      };

      // Create default preferences for users without them
      if (usersWithoutPrefs.length > 0) {
        const defaultPrefs = usersWithoutPrefs.map(user => ({
          user_id: user.id,
          email_notifications: true,
          meeting_reminders: true,
          resolution_alerts: true,
          document_updates: true,
          system_alerts: true,
          email_frequency: 'immediate'
        }));

        const { error: createPrefsError } = await supabase
          .from('notification_preferences')
          .insert(defaultPrefs);

        debugInfo.checks.createdDefaultPreferences = {
          error: createPrefsError?.message,
          created: !createPrefsError
        };
      }
    }

    // 6. Test sending a notification
    try {
      const testNotification = {
        title: 'Test Notification Debug',
        message: 'This is a test notification to debug the email system',
        type: 'system' as const,
        priority: 'normal' as const,
        action_url: '/dashboard',
        action_text: 'View Dashboard'
      };

      const boardMembers = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'board_member');

      if (boardMembers.data && boardMembers.data.length > 0) {
        const memberIds = boardMembers.data.map(m => m.id);
        await notifications.createBulkNotifications(memberIds, testNotification);
        
        debugInfo.checks.testNotificationSent = {
          success: true,
          recipientCount: memberIds.length
        };
      } else {
        debugInfo.checks.testNotificationSent = {
          success: false,
          reason: 'No board members found'
        };
      }
    } catch (testError: any) {
      debugInfo.checks.testNotificationSent = {
        success: false,
        error: testError.message
      };
    }

    return NextResponse.json({
      success: true,
      message: 'Notification system debug completed',
      debug: debugInfo
    });

  } catch (error) {
    console.error('Error in notification debug:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Debug failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}