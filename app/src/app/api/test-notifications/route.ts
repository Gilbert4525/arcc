import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NotificationsService } from '@/lib/database/notifications';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Check authentication
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

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { testType } = body;

    const notificationsService = new NotificationsService(supabase);

    let result: any = {};

    switch (testType) {
      case 'getBoardMembers':
        // Test the getBoardMembers method
        const boardMembers = await (notificationsService as any).getBoardMembers();
        result = { boardMembers };
        break;

      case 'getNotificationPreferences':
        // Test notification preferences for all users
        const { data: allUsers } = await supabase
          .from('profiles')
          .select('id, email, full_name, role')
          .in('role', ['admin', 'board_member']);

        const preferencesResults = [];
        for (const user of allUsers || []) {
          try {
            const preferences = await notificationsService.getNotificationPreferences(user.id);
            preferencesResults.push({
              user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role },
              preferences
            });
          } catch (error) {
            preferencesResults.push({
              user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role },
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
        result = { preferencesResults };
        break;

      case 'testResolutionNotification':
        // Create a test resolution notification
        const testResolution = {
          id: 'test-resolution-id',
          title: 'Test Resolution for Email Debugging',
          content: 'This is a test resolution to debug email notifications'
        };
        
        try {
          await notificationsService.notifyResolutionCreated(testResolution, user.id);
          result = { success: true, message: 'Test resolution notification sent' };
        } catch (error) {
          result = { 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          };
        }
        break;

      case 'testMinutesNotification':
        // Create a test minutes notification
        const testMinutes = {
          id: 'test-minutes-id',
          title: 'Test Minutes for Email Debugging',
          content: 'This is test minutes to debug email notifications'
        };
        
        try {
          await notificationsService.notifyMinutesCreated(testMinutes, user.id);
          result = { success: true, message: 'Test minutes notification sent' };
        } catch (error) {
          result = { 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          };
        }
        break;

      default:
        return NextResponse.json({ error: 'Invalid test type' }, { status: 400 });
    }

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('Error in test notifications API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }, 
      { status: 500 }
    );
  }
}