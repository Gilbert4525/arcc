import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseServices } from '@/lib/database';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// PATCH /api/notifications/[id] - Mark notification as read
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const { notifications: notificationsService } = getDatabaseServices(supabase);
      const success = await notificationsService.markAsRead(params.id, user.id);

      if (!success) {
        return NextResponse.json({ error: 'Failed to mark notification as read' }, { status: 500 });
      }

      return NextResponse.json({ message: 'Notification marked as read' });
    } catch (serviceError) {
      console.error('Error from notifications service:', serviceError);
      
      // Fallback: Direct database update if service fails
      const { error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', params.id)
        .eq('user_id', user.id);

      if (error) throw error;

      return NextResponse.json({ message: 'Notification marked as read' });
    }
  } catch (error) {
    console.error('Error in PATCH /api/notifications/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/notifications/[id] - Delete notification
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const { notifications: notificationsService } = getDatabaseServices(supabase);
      const success = await notificationsService.deleteNotification(params.id, user.id);

      if (!success) {
        return NextResponse.json({ error: 'Failed to delete notification' }, { status: 500 });
      }

      return NextResponse.json({ message: 'Notification deleted' });
    } catch (serviceError) {
      console.error('Error from notifications service:', serviceError);
      
      // Fallback: Direct database delete if service fails
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', params.id)
        .eq('user_id', user.id);

      if (error) throw error;

      return NextResponse.json({ message: 'Notification deleted' });
    }
  } catch (error) {
    console.error('Error in DELETE /api/notifications/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}