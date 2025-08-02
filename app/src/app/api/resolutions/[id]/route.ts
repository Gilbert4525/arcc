import { NextRequest, NextResponse } from 'next/server';
import { ResolutionsService } from '@/lib/database/resolutions';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// GET /api/resolutions/[id] - Get single resolution with voting details
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

    const resolutionsService = new ResolutionsService(supabase);

    try {
      const resolution = await resolutionsService.getResolution(resolvedParams.id);
      
      if (!resolution) {
        return NextResponse.json({ error: 'Resolution not found' }, { status: 404 });
      }

      // Get user's vote if resolution is in voting status
      let userVote = null;
      if (resolution.status === 'voting') {
        const vote = await resolutionsService.getUserVote(resolvedParams.id, user.id);
        if (vote) {
          userVote = {
            ...vote,
            vote: vote.vote === 'for' ? 'approve' : vote.vote === 'against' ? 'reject' : 'abstain'
          };
        }
      }

      // Calculate voting statistics
      const totalVotes = (resolution.votes_for || 0) + (resolution.votes_against || 0) + (resolution.votes_abstain || 0);
      const participationRate = resolution.total_eligible_voters 
        ? Math.round((totalVotes / resolution.total_eligible_voters) * 100)
        : 0;
      const approvalRate = totalVotes > 0 ? Math.round(((resolution.votes_for || 0) / totalVotes) * 100) : 0;

      // Check if voting deadline is approaching (within 24 hours)
      const deadlineApproaching = resolution.voting_deadline 
        ? new Date(resolution.voting_deadline).getTime() - Date.now() < 24 * 60 * 60 * 1000
        : false;

      const response = {
        resolution,
        user_vote: userVote,
        voting_stats: {
          total_votes: totalVotes,
          participation_rate: participationRate,
          approval_rate: approvalRate,
          deadline_approaching: deadlineApproaching,
          can_vote: resolution.status === 'voting' && 
                   !userVote && 
                   (!resolution.voting_deadline || new Date(resolution.voting_deadline) > new Date())
        }
      };

      return NextResponse.json(response);

    } catch (error) {
      console.error('Error fetching resolution:', error);
      return NextResponse.json({ error: 'Failed to fetch resolution' }, { status: 500 });
    }

  } catch (error) {
    console.error('Error in GET /api/resolutions/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/resolutions/[id] - Update resolution (admin only)
export async function PUT(
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

    const body = await request.json();
    const resolutionsService = new ResolutionsService(supabase);

    try {
      const updatedResolution = await resolutionsService.updateResolution(resolvedParams.id, {
        ...body,
        updated_at: new Date().toISOString()
      });

      if (!updatedResolution) {
        return NextResponse.json({ error: 'Failed to update resolution' }, { status: 500 });
      }

      // If status changed to voting, update vote counts
      if (body.status === 'voting') {
        await resolutionsService.updateVoteCounts(resolvedParams.id);
      }

      return NextResponse.json({ resolution: updatedResolution });

    } catch (error) {
      console.error('Error updating resolution:', error);
      return NextResponse.json({ error: 'Failed to update resolution' }, { status: 500 });
    }

  } catch (error) {
    console.error('Error in PUT /api/resolutions/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/resolutions/[id] - Delete resolution (admin only)
export async function DELETE(
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

    const resolutionsService = new ResolutionsService(supabase);

    try {
      const success = await resolutionsService.deleteResolution(resolvedParams.id);

      if (!success) {
        return NextResponse.json({ error: 'Failed to delete resolution' }, { status: 500 });
      }

      return NextResponse.json({ success: true });

    } catch (error) {
      console.error('Error deleting resolution:', error);
      return NextResponse.json({ error: 'Failed to delete resolution' }, { status: 500 });
    }

  } catch (error) {
    console.error('Error in DELETE /api/resolutions/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}