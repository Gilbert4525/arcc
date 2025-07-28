import { NextRequest, NextResponse } from 'next/server';
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

    try {
      const { notifications: notificationsService } = getDatabaseServices(supabase);
      const success = await notificationsService.markAllAsRead(user.id);

      if (!success) {
        return NextResponse.json({ error: 'Failed to mark all notifications as read' }, { status: 500 });
      }

      return NextResponse.json({ message: 'All notifications marked as read' });
    } catch (serviceError) {
      console.error('Error from notifications service:', serviceError);
      
      // Fallback: Direct database update if service fails
      const { error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true, 
          updated_at: new Date().toISOString() 
        })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;

      return NextResponse.json({ message: 'All notifications marked as read' });
    }
  } catch (error) {
    console.error('Error in POST /api/notifications/mark-all-read:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}