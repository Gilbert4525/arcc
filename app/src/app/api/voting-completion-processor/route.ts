import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { VotingSummaryEmailService } from '@/lib/email/votingSummaryService';

// POST /api/voting-completion-processor - Process pending voting completion events
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Processing pending voting completion events...');
    
    const supabase = await createServerSupabaseClient();
    
    // Get pending completion events
    const { data: pendingEvents, error: fetchError } = await supabase
      .from('voting_completion_events')
      .select('*')
      .eq('email_sent', false)
      .order('completed_at', { ascending: true });

    if (fetchError) {
      console.error('Error fetching pending events:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch pending events' }, { status: 500 });
    }

    if (!pendingEvents || pendingEvents.length === 0) {
      console.log('✅ No pending voting completion events found');
      return NextResponse.json({ 
        success: true, 
        message: 'No pending events to process',
        processed: 0 
      });
    }

    console.log(`📧 Found ${pendingEvents.length} pending voting completion events`);

    const emailService = new VotingSummaryEmailService(supabase);
    const results = [];

    for (const event of pendingEvents) {
      try {
        console.log(`Processing ${event.item_type} ${event.item_id} - ${event.completion_reason}`);
        
        let emailSent = false;
        let errorMessage = null;

        // Send appropriate email based on item type
        if (event.item_type === 'resolution') {
          emailSent = await emailService.sendResolutionVotingSummary(event.item_id);
        } else if (event.item_type === 'minutes') {
          emailSent = await emailService.sendMinutesVotingSummary(event.item_id);
        }

        // Update the event record
        const { error: updateError } = await supabase
          .from('voting_completion_events')
          .update({
            email_sent: emailSent,
            email_sent_at: emailSent ? new Date().toISOString() : null,
            email_error: emailSent ? null : 'Email sending failed',
            updated_at: new Date().toISOString()
          })
          .eq('id', event.id);

        if (updateError) {
          console.error(`Error updating event ${event.id}:`, updateError);
          errorMessage = updateError.message;
        }

        results.push({
          id: event.id,
          item_type: event.item_type,
          item_id: event.item_id,
          completion_reason: event.completion_reason,
          email_sent: emailSent,
          error: errorMessage
        });

        if (emailSent) {
          console.log(`✅ Email sent successfully for ${event.item_type} ${event.item_id}`);
        } else {
          console.error(`❌ Failed to send email for ${event.item_type} ${event.item_id}`);
        }

      } catch (eventError) {
        console.error(`Error processing event ${event.id}:`, eventError);
        
        // Mark as failed
        await supabase
          .from('voting_completion_events')
          .update({
            email_sent: false,
            email_error: eventError instanceof Error ? eventError.message : 'Unknown error',
            updated_at: new Date().toISOString()
          })
          .eq('id', event.id);

        results.push({
          id: event.id,
          item_type: event.item_type,
          item_id: event.item_id,
          completion_reason: event.completion_reason,
          email_sent: false,
          error: eventError instanceof Error ? eventError.message : 'Unknown error'
        });
      }
    }

    const successCount = results.filter(r => r.email_sent).length;
    const failureCount = results.filter(r => !r.email_sent).length;

    console.log(`📊 Processing complete: ${successCount} successful, ${failureCount} failed`);

    return NextResponse.json({
      success: true,
      message: `Processed ${results.length} voting completion events`,
      processed: results.length,
      successful: successCount,
      failed: failureCount,
      results
    });

  } catch (error) {
    console.error('Error in voting completion processor:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET /api/voting-completion-processor - Get status of pending events
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Get pending events count
    const { data: pendingEvents, error: pendingError } = await supabase
      .from('voting_completion_events')
      .select('id, item_type, item_id, completion_reason, completed_at')
      .eq('email_sent', false)
      .order('completed_at', { ascending: true });

    if (pendingError) {
      console.error('Error fetching pending events:', pendingError);
      return NextResponse.json({ error: 'Failed to fetch pending events' }, { status: 500 });
    }

    // Get recent processed events
    const { data: recentEvents, error: recentError } = await supabase
      .from('voting_completion_events')
      .select('id, item_type, item_id, completion_reason, email_sent, email_sent_at, email_error')
      .eq('email_sent', true)
      .order('email_sent_at', { ascending: false })
      .limit(10);

    if (recentError) {
      console.error('Error fetching recent events:', recentError);
      return NextResponse.json({ error: 'Failed to fetch recent events' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      pending: {
        count: pendingEvents?.length || 0,
        events: pendingEvents || []
      },
      recent: {
        count: recentEvents?.length || 0,
        events: recentEvents || []
      }
    });

  } catch (error) {
    console.error('Error getting voting completion status:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}