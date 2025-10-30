import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { VotingSummaryEmailService } from '@/lib/email/votingSummaryService';

/**
 * POST /api/voting-completion
 * Webhook endpoint called by database triggers when voting completes
 * This ensures immediate email sending without relying on cron jobs
 */
export async function POST(request: NextRequest) {
  try {
    console.log('📧 Voting completion webhook triggered');
    
    const supabase = await createServerSupabaseClient();
    const body = await request.json();
    
    const { type, id, title, status, action } = body;

    // Validate input
    if (!type || !id) {
      console.error('❌ Invalid webhook payload:', body);
      return NextResponse.json(
        { success: false, error: 'Missing required fields: type and id' },
        { status: 400 }
      );
    }

    if (!['resolution', 'minutes'].includes(type)) {
      console.error('❌ Invalid type:', type);
      return NextResponse.json(
        { success: false, error: 'Invalid type. Must be "resolution" or "minutes"' },
        { status: 400 }
      );
    }

    console.log(`📧 Processing voting completion for ${type}: "${title}" (${id})`);

    // Initialize email service
    const emailService = new VotingSummaryEmailService(supabase);
    
    // Send voting summary email
    let emailSent = false;
    try {
      if (type === 'resolution') {
        emailSent = await emailService.sendResolutionVotingSummary(id);
      } else {
        emailSent = await emailService.sendMinutesVotingSummary(id);
      }
    } catch (error) {
      console.error(`❌ Error sending voting summary email:`, error);
      
      // Log the error in audit logs
      await supabase
        .from('audit_logs')
        .insert({
          user_id: null,
          action: 'VOTING_SUMMARY_EMAIL_FAILED',
          table_name: type === 'resolution' ? 'resolutions' : 'minutes',
          record_id: id,
          new_values: {
            error: error instanceof Error ? error.message : 'Unknown error',
            title,
            status,
            timestamp: new Date().toISOString()
          }
        });

      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to send email',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

    if (emailSent) {
      console.log(`✅ Successfully sent voting summary email for ${type}: "${title}"`);
      
      // Log successful email sending
      await supabase
        .from('audit_logs')
        .insert({
          user_id: null,
          action: 'VOTING_SUMMARY_EMAIL_SENT',
          table_name: type === 'resolution' ? 'resolutions' : 'minutes',
          record_id: id,
          new_values: {
            title,
            status,
            timestamp: new Date().toISOString(),
            source: 'webhook'
          }
        });

      return NextResponse.json({
        success: true,
        message: `Voting summary email sent successfully for ${type}: ${title}`,
        data: {
          type,
          id,
          title,
          status,
          emailSent: true
        }
      });
    } else {
      console.error(`❌ Email service returned false for ${type}: "${title}"`);
      
      // Log failed email sending
      await supabase
        .from('audit_logs')
        .insert({
          user_id: null,
          action: 'VOTING_SUMMARY_EMAIL_FAILED',
          table_name: type === 'resolution' ? 'resolutions' : 'minutes',
          record_id: id,
          new_values: {
            error: 'Email service returned false',
            title,
            status,
            timestamp: new Date().toISOString()
          }
        });

      return NextResponse.json(
        { 
          success: false, 
          error: 'Email service failed to send email',
          data: {
            type,
            id,
            title,
            status,
            emailSent: false
          }
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ Error in voting completion webhook:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/voting-completion
 * Get status and recent activity
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Get recent voting completion activity
    const { data: recentTriggers } = await supabase
      .from('audit_logs')
      .select('action, table_name, record_id, new_values, created_at')
      .eq('action', 'VOTING_SUMMARY_EMAIL_TRIGGERED')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(20);

    const { data: recentEmails } = await supabase
      .from('audit_logs')
      .select('action, table_name, record_id, new_values, created_at')
      .in('action', ['VOTING_SUMMARY_EMAIL_SENT', 'VOTING_SUMMARY_EMAIL_FAILED'])
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(20);

    return NextResponse.json({
      success: true,
      message: 'Voting completion webhook status',
      data: {
        recentTriggers: recentTriggers || [],
        recentEmails: recentEmails || [],
        stats: {
          triggersLast24h: recentTriggers?.length || 0,
          emailsLast24h: recentEmails?.length || 0,
          successRate: recentEmails && recentEmails.length > 0
            ? (recentEmails.filter(e => e.action === 'VOTING_SUMMARY_EMAIL_SENT').length / recentEmails.length * 100).toFixed(1) + '%'
            : 'N/A'
        }
      }
    });

  } catch (error) {
    console.error('Error getting voting completion status:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
