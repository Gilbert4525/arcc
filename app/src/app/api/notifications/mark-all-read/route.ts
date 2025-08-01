import { NextResponse } from 'next/server';
import { getDatabaseServices } from '@/lib/database';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// POST /api/notifications/mark-all-read - Mark all notifications as read
export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { notifications: notificationsService } = getDatabaseServices(supabase);
    const success = await notificationsService.markAllAsRead(user.id);

    if (!success) {
      return NextResponse.json({ error: 'Failed to mark all notifications as read' }, { status: 500 });
    }

    return NextResponse.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error in POST /api/notifications/mark-all-read:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}