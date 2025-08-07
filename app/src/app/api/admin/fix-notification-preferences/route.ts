import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NotificationSetupService } from '@/lib/utils/notificationSetup';
import { getDatabaseServices } from '@/lib/database';

/**
 * POST /api/admin/fix-notification-preferences
 * Comprehensive fix for notification system issues
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

    const setupService = new NotificationSetupService(supabase);
    const { notifications } = getDatabaseServices(supabase);

    // Step 1: Validate current system
    console.log('🔍 Validating notification system...');
    const validation = await setupService.validateNotificationSystem();

    // Step 2: Fix notification preferences
    console.log('🔧 Ensuring all users have notification preferences...');
    const setupResult = await setupService.ensureAllUsersHaveNotificationPreferences();

    // Step 3: Test the notification flow with current user
    console.log('🧪 Testing notification flow...');
    const testResult = await setupService.testNotificationFlow(user.id);

    // Step 4: Send a test notification to all board members
    console.log('📧 Sending test notification to board members...');
    let testNotificationResult = null;
    try {
      const { data: boardMembers } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'board_member');

      if (boardMembers && boardMembers.length > 0) {
        const memberIds = boardMembers.map(m => m.id);
        await notifications.createBulkNotifications(memberIds, {
          title: '✅ Email Notifications Fixed',
          message: 'This test email confirms that the notification system is now working properly. You should receive this email if everything is set up correctly.',
          type: 'system',
          priority: 'normal',
          action_url: '/dashboard',
          action_text: 'View Dashboard'
        });

        testNotificationResult = {
          success: true,
          recipientCount: memberIds.length,
          message: `Test notification sent to ${memberIds.length} board members`
        };
      } else {
        testNotificationResult = {
          success: false,
          message: 'No board members found to send test notification'
        };
      }
    } catch (testError: any) {
      testNotificationResult = {
        success: false,
        message: `Test notification failed: ${testError.message}`
      };
    }

    return NextResponse.json({
      success: true,
      message: 'Notification system fix completed',
      results: {
        validation: {
          isValid: validation.isValid,
          issues: validation.issues,
          recommendations: validation.recommendations
        },
        setup: {
          success: setupResult.success,
          created: setupResult.created,
          errors: setupResult.errors
        },
        test: {
          success: testResult.success,
          steps: testResult.steps
        },
        testNotification: testNotificationResult
      },
      summary: {
        systemValid: validation.isValid,
        preferencesCreated: setupResult.created,
        testPassed: testResult.success,
        emailsSent: testNotificationResult?.success || false
      }
    });

  } catch (error) {
    console.error('Error fixing notification system:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Fix failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}