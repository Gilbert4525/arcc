import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NotificationsService } from '@/lib/database/notifications';

// POST /api/admin/test-notification - Create a test notification (admin only)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { target_user_id } = body;

    // Use current user if no target specified
    const userId = target_user_id || user.id;

    // Create a test notification directly
    const testNotifications = [
      {
        title: 'New Meeting Scheduled',
        message: 'Board meeting scheduled for tomorrow at 2:00 PM',
        type: 'meeting' as const,
        priority: 'normal' as const,
        action_url: '/dashboard/meetings',
        action_text: 'View Meeting',
      },
      {
        title: 'Document Published',
        message: 'New financial report has been published',
        type: 'document' as const,
        priority: 'normal' as const,
        action_url: '/dashboard/documents',
        action_text: 'View Document',
      },
      {
        title: 'Resolution Voting Open',
        message: 'Voting is now open for Resolution #2024-001',
        type: 'resolution' as const,
        priority: 'high' as const,
        action_url: '/dashboard/resolutions',
        action_text: 'Vote Now',
      },
      {
        title: 'System Maintenance',
        message: 'Scheduled maintenance tonight from 11 PM to 1 AM',
        type: 'system' as const,
        priority: 'low' as const,
      },
      {
        title: 'Urgent: Board Meeting',
        message: 'Emergency board meeting called for this afternoon',
        type: 'meeting' as const,
        priority: 'urgent' as const,
        action_url: '/dashboard/meetings',
        action_text: 'Join Meeting',
      },
    ];

    const randomNotification = testNotifications[Math.floor(Math.random() * testNotifications.length)];

    // Use the enhanced notification service to create notification with web push
    const notificationsService = new NotificationsService(supabase);
    const notification = await notificationsService.createNotification({
      user_id: userId,
      ...randomNotification,
    });

    if (!notification) {
      return NextResponse.json({ error: 'Failed to create test notification' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Test notification created successfully (with web push if enabled)',
      notification
    });
  } catch (error) {
    console.error('Error in POST /api/admin/test-notification:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}