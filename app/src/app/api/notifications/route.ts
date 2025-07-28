import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseServices } from '@/lib/database';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// GET /api/notifications - Get user notifications
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const unreadOnly = searchParams.get('unread_only') === 'true';

    const { notifications: notificationsService } = getDatabaseServices(supabase);

    const result = await notificationsService.getUserNotifications(
      user.id,
      page,
      limit,
      unreadOnly
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in GET /api/notifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/notifications - Create a new notification (admin only)
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
    const { user_id, title, message, type, priority, action_url, action_text, metadata, expires_at } = body;

    // Validate required fields
    if (!user_id || !title || !message || !type) {
      return NextResponse.json({
        error: 'user_id, title, message, and type are required'
      }, { status: 400 });
    }

    const { notifications: notificationsService } = getDatabaseServices(supabase);

    const notification = await notificationsService.createNotification({
      user_id,
      title,
      message,
      type,
      priority,
      action_url,
      action_text,
      metadata,
      expires_at,
    });

    return NextResponse.json({ notification });
  } catch (error) {
    console.error('Error in POST /api/notifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}