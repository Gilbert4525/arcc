import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseServices } from '@/lib/database';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// GET /api/notifications/preferences - Get user notification preferences
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { notifications: notificationsService } = getDatabaseServices(supabase);
    const preferences = await notificationsService.getNotificationPreferences(user.id);

    return NextResponse.json({ preferences });
  } catch (error) {
    console.error('Error in GET /api/notifications/preferences:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/notifications/preferences - Update user notification preferences
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      email_notifications, 
      meeting_reminders, 
      resolution_alerts, 
      document_updates, 
      system_alerts, 
      email_frequency 
    } = body;

    const { notifications: notificationsService } = getDatabaseServices(supabase);
    
    const preferences = await notificationsService.updateNotificationPreferences(user.id, {
      email_notifications,
      meeting_reminders,
      resolution_alerts,
      document_updates,
      system_alerts,
      email_frequency,
    });

    return NextResponse.json({ preferences });
  } catch (error) {
    console.error('Error in PUT /api/notifications/preferences:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}