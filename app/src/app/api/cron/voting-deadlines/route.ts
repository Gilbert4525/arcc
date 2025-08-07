import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { VotingDeadlineScheduler } from '@/lib/services/votingDeadlineScheduler';

/**
 * GET /api/cron/voting-deadlines
 * Cron endpoint for checking expired voting deadlines
 * This endpoint is designed to be called by external cron services like Vercel Cron or GitHub Actions
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🕐 Cron job triggered: checking voting deadlines');
    
    // Verify cron authorization (optional security measure)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.warn('⚠️ Unauthorized cron request');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = await createClient();
    const scheduler = new VotingDeadlineScheduler(supabase);

    // Execute deadline check
    const result = await scheduler.checkExpiredDeadlines();

    // Log the result
    console.log(`✅ Cron job completed:`, {
      success: result.success,
      processedItems: result.processedItems,
      executionTime: result.executionTime,
      errors: result.errors
    });

    return NextResponse.json({
      success: true,
      message: `Cron job completed successfully. Processed ${result.processedItems} expired items.`,
      data: {
        processedItems: result.processedItems,
        expiredResolutions: result.expiredResolutions.length,
        expiredMinutes: result.expiredMinutes.length,
        executionTime: result.executionTime,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Cron job error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Cron job failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cron/voting-deadlines
 * Manual trigger for cron job (for testing)
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Manual cron job trigger');
    
    const supabase = await createClient();
    
    // Check if user is admin (for manual triggers)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required for manual trigger' },
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
        { success: false, error: 'Admin access required for manual trigger' },
        { status: 403 }
      );
    }

    const scheduler = new VotingDeadlineScheduler(supabase);
    const result = await scheduler.manualDeadlineCheck();

    console.log(`✅ Manual cron job completed by ${user.email}:`, {
      success: result.success,
      processedItems: result.processedItems,
      executionTime: result.executionTime
    });

    return NextResponse.json({
      success: true,
      message: `Manual cron job completed. Processed ${result.processedItems} expired items.`,
      data: {
        processedItems: result.processedItems,
        expiredResolutions: result.expiredResolutions.length,
        expiredMinutes: result.expiredMinutes.length,
        executionTime: result.executionTime,
        triggeredBy: user.email,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Manual cron job error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Manual cron job failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}