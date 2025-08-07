import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getNotificationListener } from '@/lib/services/votingNotificationListener';

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
    const { action } = body;

    if (!action) {
      return NextResponse.json(
        { error: 'Missing required field: action' }, 
        { status: 400 }
      );
    }

    const listener = getNotificationListener();

    switch (action) {
      case 'start':
        try {
          await listener.startListening();
          return NextResponse.json({
            success: true,
            message: 'Voting notification listener started successfully'
          });
        } catch (error) {
          console.error('Error starting listener:', error);
          return NextResponse.json({
            success: false,
            error: 'Failed to start notification listener'
          }, { status: 500 });
        }

      case 'stop':
        try {
          await listener.stopListening();
          return NextResponse.json({
            success: true,
            message: 'Voting notification listener stopped successfully'
          });
        } catch (error) {
          console.error('Error stopping listener:', error);
          return NextResponse.json({
            success: false,
            error: 'Failed to stop notification listener'
          }, { status: 500 });
        }

      case 'status':
        const status = listener.getStatus();
        return NextResponse.json({
          success: true,
          status,
          message: status.isListening ? 'Listener is active' : 'Listener is inactive'
        });

      case 'process_expired':
        try {
          const results = await listener.processExpiredDeadlines();
          return NextResponse.json({
            success: true,
            results,
            message: `Processed ${results.processed} expired items with ${results.errors} errors`
          });
        } catch (error) {
          console.error('Error processing expired deadlines:', error);
          return NextResponse.json({
            success: false,
            error: 'Failed to process expired deadlines'
          }, { status: 500 });
        }

      case 'test_notification':
        // Test the notification system by sending a test notification
        try {
          const { type, id } = body;
          
          if (!type || !id) {
            return NextResponse.json({
              error: 'Missing required fields for test: type and id'
            }, { status: 400 });
          }

          if (type !== 'resolution' && type !== 'minutes') {
            return NextResponse.json({
              error: 'Invalid type. Must be "resolution" or "minutes"'
            }, { status: 400 });
          }

          // For testing, we'll directly call the voting completion API
          const testResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/voting-completion`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
            },
            body: JSON.stringify({
              action: 'trigger_email',
              type,
              id,
              timestamp: new Date().toISOString(),
              source: 'test_notification'
            })
          });

          if (!testResponse.ok) {
            const errorData = await testResponse.json().catch(() => ({ error: 'Unknown error' }));
            console.error('Error sending test notification:', errorData);
            return NextResponse.json({
              success: false,
              error: `Failed to send test notification: ${errorData.error || testResponse.statusText}`
            }, { status: 500 });
          }

          return NextResponse.json({
            success: true,
            message: `Test notification sent for ${type} ${id}`
          });
        } catch (error) {
          console.error('Error sending test notification:', error);
          return NextResponse.json({
            success: false,
            error: 'Failed to send test notification'
          }, { status: 500 });
        }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Must be "start", "stop", "status", "process_expired", or "test_notification"' }, 
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error in voting triggers API:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const listener = getNotificationListener();
    const status = listener.getStatus();

    return NextResponse.json({
      success: true,
      status,
      message: status.isListening ? 'Listener is active' : 'Listener is inactive',
      endpoints: {
        start: 'POST /api/voting-triggers { "action": "start" }',
        stop: 'POST /api/voting-triggers { "action": "stop" }',
        status: 'POST /api/voting-triggers { "action": "status" }',
        processExpired: 'POST /api/voting-triggers { "action": "process_expired" }',
        testNotification: 'POST /api/voting-triggers { "action": "test_notification", "type": "resolution|minutes", "id": "uuid" }'
      }
    });
  } catch (error) {
    console.error('Error in voting triggers status API:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}