import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { VotingDeadlineScheduler } from '@/lib/services/votingDeadlineScheduler';

// Global scheduler instance to maintain state across requests
let globalScheduler: VotingDeadlineScheduler | null = null;

/**
 * GET /api/voting-deadline-scheduler
 * Get scheduler status and upcoming deadlines
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Initialize scheduler if not exists
    if (!globalScheduler) {
      globalScheduler = new VotingDeadlineScheduler(supabase);
    }

    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    const hoursAhead = parseInt(url.searchParams.get('hours') || '24');

    switch (action) {
      case 'status':
        const status = globalScheduler.getSchedulerStatus();
        return NextResponse.json({
          success: true,
          data: status
        });

      case 'upcoming':
        const upcoming = await globalScheduler.getUpcomingDeadlines(hoursAhead);
        return NextResponse.json({
          success: true,
          data: upcoming
        });

      case 'statistics':
        const stats = await globalScheduler.getJobStatistics(hoursAhead);
        return NextResponse.json({
          success: true,
          data: stats
        });

      default:
        // Default: return status and upcoming deadlines
        const schedulerStatus = globalScheduler.getSchedulerStatus();
        const upcomingDeadlines = await globalScheduler.getUpcomingDeadlines(24);
        
        return NextResponse.json({
          success: true,
          data: {
            scheduler: schedulerStatus,
            upcoming: upcomingDeadlines
          }
        });
    }
  } catch (error) {
    console.error('Error in voting deadline scheduler GET:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get scheduler information',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/voting-deadline-scheduler
 * Control scheduler operations (start, stop, manual check)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
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

    // Initialize scheduler if not exists
    if (!globalScheduler) {
      globalScheduler = new VotingDeadlineScheduler(supabase);
    }

    const body = await request.json();
    const { action, intervalMinutes, itemType, itemId } = body;

    switch (action) {
      case 'start':
        const interval = intervalMinutes || 1;
        globalScheduler.startScheduledJob(interval);
        
        return NextResponse.json({
          success: true,
          message: `Voting deadline scheduler started (checking every ${interval} minute(s))`,
          data: globalScheduler.getSchedulerStatus()
        });

      case 'stop':
        globalScheduler.stopScheduledJob();
        
        return NextResponse.json({
          success: true,
          message: 'Voting deadline scheduler stopped',
          data: globalScheduler.getSchedulerStatus()
        });

      case 'manual_check':
        const result = await globalScheduler.manualDeadlineCheck();
        
        return NextResponse.json({
          success: true,
          message: `Manual deadline check completed. Processed ${result.processedItems} items.`,
          data: result
        });

      case 'check_specific':
        if (!itemType || !itemId) {
          return NextResponse.json(
            { success: false, error: 'itemType and itemId are required for specific checks' },
            { status: 400 }
          );
        }

        const specificResult = await globalScheduler.checkSpecificItemDeadline(
          itemType as 'resolution' | 'minutes',
          itemId
        );
        
        return NextResponse.json({
          success: true,
          message: `Checked ${itemType} ${itemId}`,
          data: specificResult
        });

      case 'restart':
        globalScheduler.stopScheduledJob();
        const restartInterval = intervalMinutes || 1;
        globalScheduler.startScheduledJob(restartInterval);
        
        return NextResponse.json({
          success: true,
          message: `Voting deadline scheduler restarted (checking every ${restartInterval} minute(s))`,
          data: globalScheduler.getSchedulerStatus()
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action. Use: start, stop, manual_check, check_specific, or restart' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error in voting deadline scheduler POST:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to control scheduler',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/voting-deadline-scheduler
 * Cleanup and stop scheduler
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    
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

    if (globalScheduler) {
      globalScheduler.cleanup();
      globalScheduler = null;
    }

    return NextResponse.json({
      success: true,
      message: 'Voting deadline scheduler cleaned up and stopped'
    });
  } catch (error) {
    console.error('Error in voting deadline scheduler DELETE:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to cleanup scheduler',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}