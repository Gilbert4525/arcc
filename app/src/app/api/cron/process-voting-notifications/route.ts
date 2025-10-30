import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { VotingSummaryEmailService } from '@/lib/email/votingSummaryService';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Processing voting notifications cron job started');
    
    const supabase = await createServerSupabaseClient();
    
    // Verify this is a legitimate cron call (check for auth header or specific token)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'dev-secret';
    
    if (!authHeader || !authHeader.includes(cronSecret)) {
      console.log('❌ Unauthorized cron call');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const votingSummaryService = new VotingSummaryEmailService(supabase);
    
    // Get recent voting completion triggers that haven't been processed
    const { data: recentTriggers, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('action', 'VOTING_SUMMARY_EMAIL_TRIGGERED')
      .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Last 5 minutes
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching recent triggers:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!recentTriggers || recentTriggers.length === 0) {
      console.log('✅ No recent voting completion triggers to process');
      return NextResponse.json({ 
        success: true, 
        message: 'No recent triggers to process',
        processed: 0 
      });
    }

    console.log(`📧 Processing ${recentTriggers.length} recent voting completion triggers`);

    let successCount = 0;
    let errorCount = 0;
    const results = [];

    // Process each trigger
    for (const trigger of recentTriggers) {
      try {
        const itemType = trigger.table_name === 'resolutions' ? 'resolution' : 'minutes';
        const itemId = trigger.record_id;
        if (!itemId) {
          console.error('❌ Missing record_id in trigger, skipping');
          continue;
        }
        
        // Safely extract title from new_values
        let itemTitle = 'Unknown';
        if (trigger.new_values && typeof trigger.new_values === 'object' && !Array.isArray(trigger.new_values)) {
          const values = trigger.new_values as { [key: string]: any };
          itemTitle = values.title || 'Unknown';
        }

        console.log(`📧 Processing ${itemType} "${itemTitle}" (${itemId})`);

        // Check if we already sent an email for this completion (prevent duplicates)
        const { data: existingEmailLog } = await supabase
          .from('audit_logs')
          .select('id')
          .eq('action', 'VOTING_SUMMARY_EMAIL_SENT')
          .eq('record_id', itemId)
          .gte('created_at', trigger.created_at)
          .limit(1);

        if (existingEmailLog && existingEmailLog.length > 0) {
          console.log(`⏭️ Email already sent for ${itemType} ${itemId}, skipping`);
          results.push({
            itemType,
            itemId,
            itemTitle,
            status: 'skipped',
            reason: 'already_sent'
          });
          continue;
        }

        // Send the voting summary email
        let emailSent = false;
        if (itemType === 'resolution') {
          emailSent = await votingSummaryService.sendResolutionVotingSummary(itemId);
        } else {
          emailSent = await votingSummaryService.sendMinutesVotingSummary(itemId);
        }

        if (emailSent) {
          successCount++;
          console.log(`✅ Successfully sent voting summary for ${itemType} "${itemTitle}"`);
          
          // Log successful email sending
          await supabase
            .from('audit_logs')
            .insert({
              user_id: null, // System action
              action: 'VOTING_SUMMARY_EMAIL_SENT',
              table_name: trigger.table_name,
              record_id: itemId,
              new_values: {
                trigger_source: 'cron_processor',
                original_trigger_id: trigger.id,
                item_title: itemTitle,
                processed_at: new Date().toISOString()
              }
            });

          results.push({
            itemType,
            itemId,
            itemTitle,
            status: 'success'
          });
        } else {
          errorCount++;
          console.error(`❌ Failed to send voting summary for ${itemType} "${itemTitle}"`);
          
          // Log failed email sending
          await supabase
            .from('audit_logs')
            .insert({
              user_id: null,
              action: 'VOTING_SUMMARY_EMAIL_FAILED',
              table_name: trigger.table_name,
              record_id: itemId,
              new_values: {
                trigger_source: 'cron_processor',
                original_trigger_id: trigger.id,
                item_title: itemTitle,
                error: 'Email service returned false',
                processed_at: new Date().toISOString()
              }
            });

          results.push({
            itemType,
            itemId,
            itemTitle,
            status: 'failed',
            error: 'Email service failed'
          });
        }

        // Small delay between emails to avoid overwhelming the email service
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        errorCount++;
        console.error(`❌ Error processing trigger for ${trigger.record_id}:`, error);
        
        // Safely extract title from new_values
        let errorItemTitle = 'Unknown';
        if (trigger.new_values && typeof trigger.new_values === 'object' && !Array.isArray(trigger.new_values)) {
          const values = trigger.new_values as { [key: string]: any };
          errorItemTitle = values.title || 'Unknown';
        }
        
        results.push({
          itemType: trigger.table_name === 'resolutions' ? 'resolution' : 'minutes',
          itemId: trigger.record_id || 'unknown',
          itemTitle: errorItemTitle,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    console.log(`✅ Voting notification processing completed: ${successCount} success, ${errorCount} errors`);

    return NextResponse.json({
      success: true,
      message: `Processed ${recentTriggers.length} voting completion triggers`,
      processed: recentTriggers.length,
      successful: successCount,
      failed: errorCount,
      results
    });

  } catch (error) {
    console.error('❌ Error in voting notifications cron job:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }, 
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Get recent voting completion activity
    const { data: recentActivity } = await supabase
      .from('audit_logs')
      .select('action, table_name, record_id, new_values, created_at')
      .in('action', ['VOTING_SUMMARY_EMAIL_TRIGGERED', 'VOTING_SUMMARY_EMAIL_SENT', 'VOTING_SUMMARY_EMAIL_FAILED'])
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
      .order('created_at', { ascending: false })
      .limit(20);

    return NextResponse.json({
      success: true,
      message: 'Voting notification processor status',
      recentActivity: recentActivity || [],
      endpoints: {
        process: 'POST /api/cron/process-voting-notifications (with Authorization header)',
        status: 'GET /api/cron/process-voting-notifications'
      }
    });

  } catch (error) {
    console.error('Error getting voting notification status:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}