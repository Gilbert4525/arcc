import { NextRequest, NextResponse } from 'next/server';
import { ResolutionsService } from '@/lib/database/resolutions';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// GET /api/resolutions/[id]/comments - Get all votes and comments (admin only)
export async function GET(
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

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const voteFilter = searchParams.get('vote'); // 'approve', 'reject', 'abstain'
    const withComments = searchParams.get('withComments') === 'true';
    const search = searchParams.get('search');

    const resolutionsService = new ResolutionsService(supabase);

    try {
      const { votes, statistics } = await resolutionsService.getResolutionComments(
        resolvedParams.id,
        withComments
      );

      let filteredVotes = votes;

      // Filter by vote type if specified
      if (voteFilter && ['approve', 'reject', 'abstain'].includes(voteFilter)) {
        const dbVoteValue = voteFilter === 'approve' ? 'for' : voteFilter === 'reject' ? 'against' : 'abstain';
        filteredVotes = votes.filter(vote => vote.vote === dbVoteValue);
      }

      // Filter by search term if specified
      if (search && search.trim().length > 0) {
        const searchTerm = search.toLowerCase().trim();
        filteredVotes = filteredVotes.filter(vote => 
          vote.voter.full_name.toLowerCase().includes(searchTerm) ||
          vote.voter.email.toLowerCase().includes(searchTerm) ||
          (vote.vote_reason && vote.vote_reason.toLowerCase().includes(searchTerm))
        );
      }

      // Map vote values to API format
      const mappedVotes = filteredVotes.map(vote => ({
        ...vote,
        vote: vote.vote === 'for' ? 'approve' : vote.vote === 'against' ? 'reject' : 'abstain'
      }));

      return NextResponse.json({
        votes: mappedVotes,
        statistics,
        filters: {
          vote: voteFilter,
          withComments,
          search
        },
        total: mappedVotes.length
      });

    } catch (error) {
      console.error('Error fetching resolution comments:', error);
      return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
    }

  } catch (error) {
    console.error('Error in GET /api/resolutions/[id]/comments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}