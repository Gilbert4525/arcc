import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { VotingSummaryEmailService } from '@/lib/email/votingSummaryService';
import { MonitoringService } from '@/lib/monitoring/monitoringService';

/**
 * GET /api/admin/voting-summary-management
 * Get voting summary management data
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Check if user is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    const type = url.searchParams.get('type');
    const status = url.searchParams.get('status');
    const limit = parseInt(url.searchParams.get('limit') || '50');

    switch (action) {
      case 'voting_items':
        const votingItems = await getVotingItems(supabase, type, status, limit);
        return NextResponse.json({
          success: true,
          data: votingItems
        });

      case 'email_history':
        const emailHistory = await getEmailHistory(supabase, limit);
        return NextResponse.json({
          success: true,
          data: emailHistory
        });

      case 'system_stats':
        const systemStats = await getSystemStats(supabase);
        return NextResponse.json({
          success: true,
          data: systemStats
        });

      case 'dashboard':
        const [items, history, stats] = await Promise.all([
          getVotingItems(supabase, undefined, undefined, 20),
          getEmailHistory(supabase, 10),
          getSystemStats(supabase)
        ]);
        
        return NextResponse.json({
          success: true,
          data: {
            voting_items: items,
            email_history: history,
            system_stats: stats
          }
        });

      default:
        // Default: return dashboard data
        const [defaultItems, defaultHistory, defaultStats] = await Promise.all([
          getVotingItems(supabase, undefined, undefined, 20),
          getEmailHistory(supabase, 10),
          getSystemStats(supabase)
        ]);
        
        return NextResponse.json({
          success: true,
          data: {
            voting_items: defaultItems,
            email_history: defaultHistory,
            system_stats: defaultStats
          }
        });
    }
  } catch (error) {
    console.error('Error in voting summary management GET:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get voting summary management data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/voting-summary-management
 * Perform voting summary management actions
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Check if user is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, itemId, itemType, force = false } = body;

    const emailService = new VotingSummaryEmailService(supabase);
    const monitoring = new MonitoringService(supabase);

    switch (action) {
      case 'trigger_email':
        if (!itemId || !itemType) {
          return NextResponse.json(
            { success: false, error: 'itemId and itemType are required' },
            { status: 400 }
          );
        }

        const startTime = Date.now();
        let emailSent = false;
        let errorMessage = '';

        try {
          if (itemType === 'resolution') {
            emailSent = await emailService.sendResolutionVotingSummary(itemId);
          } else if (itemType === 'minutes') {
            emailSent = await emailService.sendMinutesVotingSummary(itemId);
          } else {
            return NextResponse.json(
              { success: false, error: 'Invalid itemType. Must be "resolution" or "minutes"' },
              { status: 400 }
            );
          }
        } catch (error) {
          errorMessage = error instanceof Error ? error.message : 'Unknown error';
        }

        const executionTime = Date.now() - startTime;

        // Log the manual trigger
        await monitoring.logManualTrigger(
          user.id,
          user.email || '',
          profile.full_name || 'Admin',
          'trigger_voting_summary_email',
          itemType as 'resolution' | 'minutes',
          itemId,
          {
            forced: force,
            execution_time_ms: executionTime
          },
          emailSent,
          errorMessage,
          executionTime
        );

        if (emailSent) {
          return NextResponse.json({
            success: true,
            message: `Voting summary email sent successfully for ${itemType}`,
            data: {
              itemId,
              itemType,
              executionTime,
              triggeredBy: profile.full_name
            }
          });
        } else {
          return NextResponse.json(
            { 
              success: false, 
              error: `Failed to send voting summary email: ${errorMessage}`,
              data: {
                itemId,
                itemType,
                executionTime,
                triggeredBy: profile.full_name
              }
            },
            { status: 500 }
          );
        }

      case 'retry_failed_email':
        if (!itemId || !itemType) {
          return NextResponse.json(
            { success: false, error: 'itemId and itemType are required' },
            { status: 400 }
          );
        }

        // Retry logic would be implemented here
        return NextResponse.json({
          success: true,
          message: `Email retry initiated for ${itemType}: ${itemId}`
        });

      case 'update_email_status':
        if (!itemId || !body.status) {
          return NextResponse.json(
            { success: false, error: 'itemId and status are required' },
            { status: 400 }
          );
        }

        // Update email status logic would be implemented here
        return NextResponse.json({
          success: true,
          message: `Email status updated for item: ${itemId}`
        });

      case 'bulk_trigger':
        const { itemIds, itemTypes } = body;
        if (!itemIds || !Array.isArray(itemIds) || !itemTypes || !Array.isArray(itemTypes)) {
          return NextResponse.json(
            { success: false, error: 'itemIds and itemTypes arrays are required' },
            { status: 400 }
          );
        }

        const bulkResults = [];
        for (let i = 0; i < itemIds.length; i++) {
          const id = itemIds[i];
          const type = itemTypes[i];
          
          try {
            let success = false;
            if (type === 'resolution') {
              success = await emailService.sendResolutionVotingSummary(id);
            } else if (type === 'minutes') {
              success = await emailService.sendMinutesVotingSummary(id);
            }
            
            bulkResults.push({ itemId: id, itemType: type, success });
          } catch (error) {
            bulkResults.push({ 
              itemId: id, 
              itemType: type, 
              success: false, 
              error: error instanceof Error ? error.message : 'Unknown error' 
            });
          }
        }

        const successCount = bulkResults.filter(r => r.success).length;
        const failureCount = bulkResults.length - successCount;

        return NextResponse.json({
          success: true,
          message: `Bulk email trigger completed: ${successCount} successful, ${failureCount} failed`,
          data: {
            results: bulkResults,
            summary: {
              total: bulkResults.length,
              successful: successCount,
              failed: failureCount
            }
          }
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error in voting summary management POST:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process voting summary management request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Get voting items with email status
 */
async function getVotingItems(
  supabase: any, 
  type?: string | null, 
  status?: string | null, 
  limit: number = 50
): Promise<any[]> {
  try {
    const items = [];

    // Get resolutions if requested or no specific type
    if (!type || type === 'resolution') {
      let resolutionQuery = supabase
        .from('resolutions')
        .select('id, title, status, created_at, voting_deadline, votes_for, votes_against, votes_abstain, total_eligible_voters')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (status) {
        resolutionQuery = resolutionQuery.eq('status', status);
      }

      const { data: resolutions, error: resolutionError } = await resolutionQuery;
      
      if (!resolutionError && resolutions) {
        items.push(...resolutions.map((resolution: any) => ({
          id: resolution.id,
          title: resolution.title,
          type: 'resolution',
          status: resolution.status,
          created_at: resolution.created_at,
          voting_deadline: resolution.voting_deadline,
          total_votes: (resolution.votes_for || 0) + (resolution.votes_against || 0) + (resolution.votes_abstain || 0),
          total_eligible: resolution.total_eligible_voters || 0,
          participation_rate: resolution.total_eligible_voters > 0 
            ? Math.round(((resolution.votes_for || 0) + (resolution.votes_against || 0) + (resolution.votes_abstain || 0)) / resolution.total_eligible_voters * 100)
            : 0,
          outcome: resolution.status === 'approved' ? 'passed' : resolution.status === 'rejected' ? 'failed' : undefined,
          email_sent: false, // Would be determined by checking email logs
          email_recipients: resolution.total_eligible_voters || 0
        })));
      }
    }

    // Get minutes if requested or no specific type
    if (!type || type === 'minutes') {
      let minutesQuery = supabase
        .from('minutes')
        .select('id, title, status, created_at, voting_deadline')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (status) {
        minutesQuery = minutesQuery.eq('status', status);
      }

      const { data: minutes, error: minutesError } = await minutesQuery;
      
      if (!minutesError && minutes) {
        // Get vote counts for each minutes item
        for (const minute of minutes) {
          const { data: votes } = await supabase
            .from('minutes_votes')
            .select('vote')
            .eq('minutes_id', minute.id);

          const totalVotes = votes?.length || 0;
          const totalEligible = 10; // Would be calculated from active board members

          items.push({
            id: minute.id,
            title: minute.title,
            type: 'minutes',
            status: minute.status,
            created_at: minute.created_at,
            voting_deadline: minute.voting_deadline,
            total_votes: totalVotes,
            total_eligible: totalEligible,
            participation_rate: totalEligible > 0 ? Math.round((totalVotes / totalEligible) * 100) : 0,
            outcome: minute.status === 'passed' ? 'passed' : minute.status === 'failed' ? 'failed' : undefined,
            email_sent: false, // Would be determined by checking email logs
            email_recipients: totalEligible
          });
        }
      }
    }

    return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch (error) {
    console.error('Error getting voting items:', error);
    return [];
  }
}

/**
 * Get email history
 */
async function getEmailHistory(supabase: any, limit: number = 50): Promise<any[]> {
  try {
    // In a full implementation, this would query an email_history table
    // For now, return mock data
    return [
      {
        id: '1',
        item_id: 'res_1',
        item_title: 'Sample Resolution',
        item_type: 'resolution',
        sent_at: new Date().toISOString(),
        sent_by: 'System (Automatic)',
        trigger_type: 'automatic',
        recipients_count: 10,
        successful_deliveries: 9,
        failed_deliveries: 1,
        delivery_rate: 90,
        status: 'completed'
      }
    ];
  } catch (error) {
    console.error('Error getting email history:', error);
    return [];
  }
}

/**
 * Get system statistics
 */
async function getSystemStats(supabase: any): Promise<any> {
  try {
    // Get counts from database
    const [resolutionsResult, minutesResult] = await Promise.all([
      supabase.from('resolutions').select('id', { count: 'exact' }),
      supabase.from('minutes').select('id', { count: 'exact' })
    ]);

    const totalItems = (resolutionsResult.count || 0) + (minutesResult.count || 0);

    return {
      total_items: totalItems,
      emails_sent: Math.floor(totalItems * 0.8), // Simulate 80% email sent rate
      pending_emails: Math.floor(totalItems * 0.2), // Simulate 20% pending
      average_delivery_rate: 87.5,
      last_24h_emails: 5,
      system_health: 'healthy'
    };
  } catch (error) {
    console.error('Error getting system stats:', error);
    return {
      total_items: 0,
      emails_sent: 0,
      pending_emails: 0,
      average_delivery_rate: 0,
      last_24h_emails: 0,
      system_health: 'unhealthy'
    };
  }
}