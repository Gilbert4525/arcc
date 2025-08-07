import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getDatabaseServices } from '@/lib/database';

/**
 * POST /api/admin/test-notification-debug
 * Comprehensive debug test for notification system
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

    // Step 1: Check environment variables
    const environment = {
      emailApiKey: !!process.env.EMAIL_API_KEY,
      fromEmail: process.env.FROM_EMAIL || '',
      configured: !!process.env.EMAIL_API_KEY && !!process.env.FROM_EMAIL
    };

    // Step 2: Check database accessibility
    let database = {
      profilesAccessible: false,
      notificationsAccessible: false,
      userCount: 0
    };

    try {
      // Test profiles table access
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id')
        .limit(10);

      database.profilesAccessible = !profilesError;
      database.userCount = profiles?.length || 0;

      // Test notifications table access
      const { error: notificationsError } = await supabase
        .from('notifications')
        .select('id')
        .limit(1);

      database.notificationsAccessible = !notificationsError;
    } catch (error) {
      console.error('Database access test failed:', error);
    }

    // Step 3: Test email sending
    let testEmail = {
      success: false,
      message: 'Not tested',
      recipientCount: 0
    };

    try {
      // Get board members for test
      const { data: boardMembers } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('role', 'board_member')
        .limit(3); // Limit to 3 for debug test

      if (boardMembers && boardMembers.length > 0) {
        const memberIds = boardMembers.map(m => m.id);
        
        await notifications.createBulkNotifications(memberIds, {
          title: '🔧 Debug Test Email',
          message: 'This is a debug test email to verify the notification system is working properly.',
          type: 'system',
          priority: 'normal',
          action_url: '/dashboard',
          action_text: 'View Dashboard'
        });

        testEmail = {
          success: true,
          message: `Debug test email sent successfully`,
          recipientCount: memberIds.length
        };
      } else {
        testEmail = {
          success: false,
          message: 'No board members found for testing',
          recipientCount: 0
        };
      }
    } catch (error: any) {
      testEmail = {
        success: false,
        message: `Email test failed: ${error.message}`,
        recipientCount: 0
      };
    }

    // Determine overall success
    const overallSuccess = environment.configured && 
                          database.profilesAccessible && 
                          database.notificationsAccessible && 
                          testEmail.success;

    return NextResponse.json({
      success: overallSuccess,
      message: overallSuccess 
        ? 'All debug tests passed successfully!' 
        : 'Some debug tests failed - check details below',
      environment,
      database,
      testEmail
    });

  } catch (error) {
    console.error('Debug test error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Debug test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}