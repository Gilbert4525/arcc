import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * GET /api/admin/check-notification-setup
 * Check the notification system setup
 */
export async function GET(request: NextRequest) {
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

    const checks: any = {};

    // 1. Check if notification_preferences table exists
    try {
      const { data: prefsTest, error: prefsError } = await supabase
        .from('notification_preferences')
        .select('*')
        .limit(1);
      
      checks.notification_preferences_table = {
        exists: !prefsError,
        error: prefsError?.message
      };
    } catch (error: any) {
      checks.notification_preferences_table = {
        exists: false,
        error: error.message
      };
    }

    // 2. Check all users
    const { data: allUsers, error: usersError } = await supabase
      .from('profiles')
      .select('id, email, full_name, role');

    checks.users = {
      error: usersError?.message,
      count: allUsers?.length || 0,
      users: allUsers?.map(u => ({ 
        id: u.id, 
        email: u.email, 
        role: u.role 
      }))
    };

    // 3. Check notification preferences for all users
    const { data: preferences, error: prefsError } = await supabase
      .from('notification_preferences')
      .select('user_id, email_notifications, resolution_alerts, document_updates');

    checks.notification_preferences = {
      error: prefsError?.message,
      count: preferences?.length || 0,
      preferences: preferences
    };

    // 4. Check recent notifications
    const { data: recentNotifications, error: notifError } = await supabase
      .from('notifications')
      .select('id, user_id, title, message, type, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    checks.recent_notifications = {
      error: notifError?.message,
      count: recentNotifications?.length || 0,
      notifications: recentNotifications
    };

    // 5. Check environment variables
    checks.environment = {
      email_api_key: !!process.env.EMAIL_API_KEY,
      from_email: process.env.FROM_EMAIL,
      vapid_configured: !!process.env.VAPID_PRIVATE_KEY
    };

    // 6. Find users without notification preferences
    if (allUsers && preferences) {
      const usersWithoutPrefs = allUsers.filter(user => 
        !preferences.some(pref => pref.user_id === user.id)
      );

      checks.users_without_preferences = {
        count: usersWithoutPrefs.length,
        users: usersWithoutPrefs.map(u => ({ id: u.id, email: u.email }))
      };
    }

    return NextResponse.json({
      success: true,
      message: 'Notification system check completed',
      checks
    });

  } catch (error) {
    console.error('Error checking notification setup:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Check failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}