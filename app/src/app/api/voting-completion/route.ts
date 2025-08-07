import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { VotingCompletionDetector } from '@/lib/email/votingCompletionDetector';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, type, id } = body;

    if (!action) {
      return NextResponse.json(
        { error: 'Missing required field: action' }, 
        { status: 400 }
      );
    }

    const detector = new VotingCompletionDetector(supabase);

    switch (action) {
      case 'check':
        if (!type || !id) {
          return NextResponse.json(
            { error: 'Missing required fields: type and id for check action' }, 
            { status: 400 }
          );
        }

        if (type !== 'resolution' && type !== 'minutes') {
          return NextResponse.json(
            { error: 'Invalid type. Must be "resolution" or "minutes"' }, 
            { status: 400 }
          );
        }

        let completionStatus;
        if (type === 'resolution') {
          completionStatus = await detector.checkResolutionCompletion(id);
        } else {
          completionStatus = await detector.checkMinutesCompletion(id);
        }

        return NextResponse.json({
          success: true,
          completionStatus,
          message: completionStatus.isComplete 
            ? `Voting completed: ${completionStatus.reason}` 
            : 'Voting is still in progress'
        });

      case 'check_expired':
        const expiredResults = await detector.checkExpiredDeadlines();
        return NextResponse.json({
          success: true,
          results: expiredResults,
          message: `Processed ${expiredResults.totalProcessed} expired voting items`
        });

      case 'manual_complete':
        // Check if user is admin for manual completion
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profile?.role !== 'admin') {
          return NextResponse.json({ error: 'Admin access required for manual completion' }, { status: 403 });
        }

        if (!type || !id) {
          return NextResponse.json(
            { error: 'Missing required fields: type and id for manual completion' }, 
            { status: 400 }
          );
        }

        if (type !== 'resolution' && type !== 'minutes') {
          return NextResponse.json(
            { error: 'Invalid type. Must be "resolution" or "minutes"' }, 
            { status: 400 }
          );
        }

        const manualResult = await detector.manuallyCompleteVoting(type, id);
        
        return NextResponse.json({
          success: manualResult.success,
          message: manualResult.message
        }, { status: manualResult.success ? 200 : 500 });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Must be "check", "check_expired", or "manual_complete"' }, 
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error in voting completion API:', error);
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

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const id = searchParams.get('id');

    if (!type || !id) {
      return NextResponse.json(
        { error: 'Missing required query parameters: type and id' }, 
        { status: 400 }
      );
    }

    if (type !== 'resolution' && type !== 'minutes') {
      return NextResponse.json(
        { error: 'Invalid type. Must be "resolution" or "minutes"' }, 
        { status: 400 }
      );
    }

    const detector = new VotingCompletionDetector(supabase);
    
    let completionStatus;
    if (type === 'resolution') {
      completionStatus = await detector.checkResolutionCompletion(id);
    } else {
      completionStatus = await detector.checkMinutesCompletion(id);
    }

    return NextResponse.json({
      success: true,
      completionStatus,
      message: completionStatus.isComplete 
        ? `Voting completed: ${completionStatus.reason}` 
        : 'Voting is still in progress'
    });
  } catch (error) {
    console.error('Error in voting completion check API:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}