import { NextRequest, NextResponse } from 'next/server';
import { ResolutionsService } from '@/lib/database/resolutions';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { VotingCompletionDetector } from '@/lib/email/votingCompletionDetector';

// Simple rate limiting using Map
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(userId: string, resolutionId: string): boolean {
  const now = Date.now();
  const key = `${userId}-${resolutionId}`;

  // Clean up expired entries
  for (const [k, v] of rateLimitMap.entries()) {
    if (now > v.resetTime) {
      rateLimitMap.delete(k);
    }
  }

  const current = rateLimitMap.get(key);

  if (!current) {
    rateLimitMap.set(key, { count: 1, resetTime: now + 60000 }); // 1 minute
    return true;
  }

  if (now > current.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + 60000 });
    return true;
  }

  if (current.count >= 5) { // Max 5 attempts per minute
    return false;
  }

  current.count++;
  return true;
}

// POST /api/resolutions/[id]/vote - Cast vote on resolution
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !profile.role || !['admin', 'board_member'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Rate limiting
    if (!checkRateLimit(user.id, resolvedParams.id)) {
      return NextResponse.json({ error: 'Too many vote attempts. Please try again later.' }, { status: 429 });
    }

    const body = await request.json();
    const { vote, comment } = body;

    console.log('Vote API received:', { vote, comment, hasComment: !!comment });

    // Validate vote value
    if (!vote || !['approve', 'reject', 'abstain'].includes(vote)) {
      return NextResponse.json({
        error: 'Invalid vote value. Must be approve, reject, or abstain'
      }, { status: 400 });
    }

    // Validate comment length
    if (comment && comment.length > 1000) {
      return NextResponse.json({
        error: 'Comment too long. Maximum 1000 characters allowed.'
      }, { status: 400 });
    }

    const resolutionsService = new ResolutionsService(supabase);

    try {
      const voteResult = await resolutionsService.voteOnResolution(
        resolvedParams.id,
        vote,
        comment,
        user.id
      );

      if (!voteResult) {
        return NextResponse.json({ error: 'Failed to record vote' }, { status: 500 });
      }

      // Map database vote format to API format for consistency
      const mappedVote = {
        ...voteResult,
        vote: voteResult.vote === 'for' ? 'approve' : voteResult.vote === 'against' ? 'reject' : 'abstain'
      };

      // Check if voting is now complete and trigger email if needed
      try {
        const completionDetector = new VotingCompletionDetector(supabase);
        const completionStatus = await completionDetector.checkResolutionCompletion(resolvedParams.id);
        
        if (completionStatus.isComplete) {
          console.log(`🎯 Resolution ${resolvedParams.id} voting completed: ${completionStatus.reason}`);
          console.log(`📧 Voting summary email should have been triggered automatically`);
        } else {
          console.log(`⏳ Resolution ${resolvedParams.id} voting still in progress: ${completionStatus.totalVotes}/${completionStatus.totalEligibleVoters} votes`);
        }
      } catch (completionError) {
        // Don't fail the vote if completion detection fails
        console.error('Error checking voting completion:', completionError);
        
        // Try direct email service call as fallback
        try {
          const { VotingSummaryEmailService } = await import('@/lib/email/votingSummaryService');
          const emailService = new VotingSummaryEmailService(supabase);
          const emailSent = await emailService.sendResolutionVotingSummary(resolvedParams.id);
          
          if (emailSent) {
            console.log('✅ Direct voting summary email sent successfully');
          } else {
            console.log('⚠️ Direct voting summary email failed - voting may not be complete yet');
          }
        } catch (fallbackError) {
          console.error('❌ Direct voting summary email failed:', fallbackError);
        }
      }

      return NextResponse.json({
        success: true,
        vote: mappedVote,
        message: `Your ${vote} vote has been recorded`
      });

    } catch (error) {
      console.error('Error casting vote:', error);

      if (error instanceof Error) {
        // Handle specific error cases
        if (error.message.includes('not found')) {
          return NextResponse.json({ error: 'Resolution not found' }, { status: 404 });
        }
        if (error.message.includes('not open for voting')) {
          return NextResponse.json({ error: 'Resolution is not open for voting' }, { status: 400 });
        }
        if (error.message.includes('deadline has passed')) {
          return NextResponse.json({ error: 'Voting deadline has passed' }, { status: 400 });
        }
        if (error.message.includes('already voted')) {
          return NextResponse.json({ error: 'You have already voted on this resolution' }, { status: 400 });
        }

        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({ error: 'Failed to cast vote' }, { status: 500 });
    }

  } catch (error) {
    console.error('Error in POST /api/resolutions/[id]/vote:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/resolutions/[id]/vote - Get user's vote on resolution
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolutionsService = new ResolutionsService(supabase);

    try {
      const userVote = await resolutionsService.getUserVote(resolvedParams.id, user.id);

      if (!userVote) {
        return NextResponse.json({ vote: null });
      }

      // Map database vote format to API format
      const mappedVote = {
        ...userVote,
        vote: userVote.vote === 'for' ? 'approve' : userVote.vote === 'against' ? 'reject' : 'abstain'
      };

      return NextResponse.json({ vote: mappedVote });

    } catch (error) {
      console.error('Error fetching user vote:', error);
      return NextResponse.json({ error: 'Failed to fetch vote' }, { status: 500 });
    }

  } catch (error) {
    console.error('Error in GET /api/resolutions/[id]/vote:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}