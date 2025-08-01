import { NextRequest, NextResponse } from 'next/server';
import { MinutesService, getDatabaseServices } from '@/lib/database';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireBoardMember, rateLimit, sanitizeComment } from '@/lib/auth/middleware';

// POST /api/minutes/[id]/vote - Vote on minutes
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);

  try {
    const resolvedParams = await params;
    console.log(`[${requestId}] Starting vote submission for minutes ${resolvedParams.id}`);

    // Validate request parameters
    if (!resolvedParams.id) {
      console.error(`[${requestId}] Missing minutes ID in request`);
      return NextResponse.json({
        error: 'Missing minutes ID',
        code: 'MISSING_MINUTES_ID',
        requestId
      }, { status: 400 });
    }

    // Authentication and authorization
    const authResult = await requireBoardMember(request);
    if (authResult instanceof NextResponse) {
      console.error(`[${requestId}] Authentication failed`);
      return authResult;
    }
    const { user } = authResult;

    console.log(`[${requestId}] User ${user.id} attempting to vote on minutes ${resolvedParams.id}`);

    // Rate limiting - 5 votes per minute per user
    const rateLimitKey = `vote:${user.id}:${resolvedParams.id}`;
    if (!rateLimit(rateLimitKey, 5, 60000)) {
      console.warn(`[${requestId}] Rate limit exceeded for user ${user.id}`);
      return NextResponse.json({
        error: 'Rate limit exceeded. Please wait before voting again.',
        code: 'RATE_LIMIT_EXCEEDED',
        requestId,
        retryAfter: 60
      }, { status: 429 });
    }

    // Parse request body with error handling
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error(`[${requestId}] Failed to parse request body:`, parseError);
      return NextResponse.json({
        error: 'Invalid JSON in request body',
        code: 'INVALID_JSON',
        requestId
      }, { status: 400 });
    }

    const { vote, comments } = body;

    // Validate vote value
    if (!vote || !['approve', 'reject', 'abstain'].includes(vote)) {
      console.error(`[${requestId}] Invalid vote value:`, vote);
      return NextResponse.json({
        error: 'Invalid vote. Must be approve, reject, or abstain',
        code: 'INVALID_VOTE',
        requestId,
        received: vote,
        allowed: ['approve', 'reject', 'abstain']
      }, { status: 400 });
    }

    // Sanitize comments using utility function
    let sanitizedComments: string | null = null;
    try {
      sanitizedComments = sanitizeComment(comments);
    } catch (error) {
      console.error(`[${requestId}] Comment sanitization failed:`, error);
      return NextResponse.json({
        error: error instanceof Error ? error.message : 'Invalid comment format',
        code: 'INVALID_COMMENT',
        requestId
      }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const minutesService = new MinutesService(supabase);

    // Check if minutes exists and is open for voting
    let minutes;
    try {
      minutes = await minutesService.getMinutesById(resolvedParams.id);
    } catch (dbError) {
      console.error(`[${requestId}] Database error fetching minutes:`, dbError);
      return NextResponse.json({
        error: 'Failed to fetch minutes',
        code: 'DATABASE_ERROR',
        requestId
      }, { status: 500 });
    }

    if (!minutes) {
      console.error(`[${requestId}] Minutes not found: ${resolvedParams.id}`);
      return NextResponse.json({
        error: 'Minutes not found',
        code: 'MINUTES_NOT_FOUND',
        requestId,
        minutesId: resolvedParams.id
      }, { status: 404 });
    }

    if (minutes.status !== 'voting') {
      console.error(`[${requestId}] Minutes not open for voting. Status: ${minutes.status}`);
      return NextResponse.json({
        error: 'Minutes is not open for voting',
        code: 'VOTING_NOT_OPEN',
        requestId,
        currentStatus: minutes.status
      }, { status: 400 });
    }

    if (minutes.voting_deadline && new Date(minutes.voting_deadline) < new Date()) {
      console.error(`[${requestId}] Voting deadline passed: ${minutes.voting_deadline}`);
      return NextResponse.json({
        error: 'Voting deadline has passed',
        code: 'VOTING_DEADLINE_PASSED',
        requestId,
        deadline: minutes.voting_deadline
      }, { status: 400 });
    }

    // Submit vote with retry logic
    let voteResult;
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        console.log(`[${requestId}] Submitting vote (attempt ${retryCount + 1}):`, {
          minutesId: resolvedParams.id,
          vote,
          hasComments: !!sanitizedComments
        });

        voteResult = await minutesService.voteOnMinutes(resolvedParams.id, vote, sanitizedComments || undefined);
        break; // Success, exit retry loop
      } catch (voteError) {
        retryCount++;
        console.error(`[${requestId}] Vote submission attempt ${retryCount} failed:`, voteError);

        if (retryCount >= maxRetries) {
          return NextResponse.json({
            error: 'Failed to submit vote after multiple attempts',
            code: 'VOTE_SUBMISSION_FAILED',
            requestId,
            attempts: retryCount,
            details: voteError instanceof Error ? voteError.message : 'Unknown error'
          }, { status: 500 });
        }

        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 100));
      }
    }

    if (!voteResult) {
      console.error(`[${requestId}] Vote result is null after successful submission`);
      return NextResponse.json({
        error: 'Vote submission returned no result',
        code: 'NULL_VOTE_RESULT',
        requestId
      }, { status: 500 });
    }

    console.log(`[${requestId}] Vote successfully submitted:`, voteResult);

    // Manually update vote counts since database trigger is unreliable
    console.log(`[${requestId}] Vote submitted successfully - manually updating vote counts`);

    try {
      // Call the database function to update vote counts
      // @ts-expect-error - Function will be created by SQL script
      await supabase.rpc('refresh_minutes_vote_counts', {
        minutes_id_param: resolvedParams.id
      });
      console.log(`[${requestId}] Vote counts updated successfully`);
    } catch (countError) {
      console.error(`[${requestId}] Failed to update vote counts:`, countError);
      // Don't fail the vote submission, just log the error
    }

    // Get updated minutes with voting results
    let updatedMinutes;
    try {
      updatedMinutes = await minutesService.getMinutesById(resolvedParams.id);
    } catch (updateError) {
      console.error(`[${requestId}] Failed to fetch updated minutes:`, updateError);
      // Don't fail the request, just log the error
      updatedMinutes = minutes; // Use original minutes as fallback
    }

    console.log(`[${requestId}] Updated minutes after vote:`, {
      id: updatedMinutes?.id,
      totalVotes: updatedMinutes?.total_votes,
      approveVotes: updatedMinutes?.approve_votes,
      rejectVotes: updatedMinutes?.reject_votes,
      abstainVotes: updatedMinutes?.abstain_votes
    });

    // Create notifications for vote submission (don't let this fail the main operation)
    try {
      const { notifications } = getDatabaseServices(supabase);
      await notifications.notifyMinutesVoteSubmitted(updatedMinutes!, user.id, vote);
      console.log(`[${requestId}] Vote notification sent successfully`);
    } catch (notificationError) {
      console.error(`[${requestId}] Failed to create vote notification:`, notificationError);
      // Continue - don't fail the main operation
    }

    const duration = Date.now() - startTime;
    console.log(`[${requestId}] Vote submission completed successfully in ${duration}ms`);

    return NextResponse.json({
      success: true,
      vote: voteResult,
      minutes: updatedMinutes,
      message: 'Vote submitted successfully',
      requestId,
      duration
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[${requestId}] Unexpected error in POST /api/minutes/[id]/vote (${duration}ms):`, error);

    return NextResponse.json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      requestId,
      duration,
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET /api/minutes/[id]/vote - Get user's vote for minutes
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = Math.random().toString(36).substring(7);

  try {
    const resolvedParams = await params;
    console.log(`[${requestId}] Fetching user vote for minutes ${resolvedParams.id}`);

    // Validate request parameters
    if (!resolvedParams.id) {
      console.error(`[${requestId}] Missing minutes ID in request`);
      return NextResponse.json({
        error: 'Missing minutes ID',
        code: 'MISSING_MINUTES_ID',
        requestId
      }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error(`[${requestId}] Authentication failed:`, authError);
      return NextResponse.json({
        error: 'Unauthorized',
        code: 'UNAUTHORIZED',
        requestId
      }, { status: 401 });
    }

    console.log(`[${requestId}] User ${user.id} fetching vote for minutes ${resolvedParams.id}`);

    const minutesService = new MinutesService(supabase);

    let userVote;
    try {
      userVote = await minutesService.getUserVote(resolvedParams.id);
    } catch (dbError) {
      console.error(`[${requestId}] Database error fetching user vote:`, dbError);
      return NextResponse.json({
        error: 'Failed to fetch user vote',
        code: 'DATABASE_ERROR',
        requestId
      }, { status: 500 });
    }

    console.log(`[${requestId}] User vote retrieved:`, {
      hasVote: !!userVote,
      vote: userVote?.vote,
      votedAt: userVote?.voted_at
    });

    return NextResponse.json({
      success: true,
      vote: userVote,
      requestId
    });
  } catch (error) {
    console.error(`[${requestId}] Unexpected error in GET /api/minutes/[id]/vote:`, error);
    return NextResponse.json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      requestId,
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}