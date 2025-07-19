import { NextRequest, NextResponse } from 'next/server';
import { ResolutionsService } from '@/lib/database';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// GET /api/resolutions - Get resolutions with filtering
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create service instance
    const resolutionsService = new ResolutionsService(supabase);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const voting = searchParams.get('voting');
    const stats = searchParams.get('stats');

    if (stats === 'true') {
      const statistics = await resolutionsService.getResolutionStats();
      return NextResponse.json({ stats: statistics });
    }

    let result;

    if (voting === 'true') {
      const resolutions = await resolutionsService.getActiveVotingResolutions();
      result = { resolutions, total: resolutions.length, hasMore: false };
    } else if (status) {
      const resolutions = await resolutionsService.getResolutionsByStatus(status as any);
      result = { resolutions, total: resolutions.length, hasMore: false };
    } else {
      result = await resolutionsService.getResolutions(page, limit);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in GET /api/resolutions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/resolutions - Create new resolution
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create service instance
    const resolutionsService = new ResolutionsService(supabase);

    const body = await request.json();
    const {
      title,
      description,
      resolution_number,
      resolution_type = 'board_resolution',
      category_id,
      content,
      voting_deadline,
      total_eligible_voters,
      requires_majority = true,
      minimum_quorum = 50,
      attachments,
      tags,
      meeting_id,
      effective_date,
    } = body;

    if (!title || !resolution_number || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const resolutionData = {
      title,
      description,
      resolution_number,
      resolution_type,
      category_id,
      content,
      voting_deadline,
      total_eligible_voters: total_eligible_voters || 0,
      requires_majority,
      minimum_quorum,
      attachments,
      tags,
      meeting_id,
      effective_date,
      created_by: user.id,
    };

    const resolution = await resolutionsService.createResolution(resolutionData);
    if (!resolution) {
      return NextResponse.json({ error: 'Failed to create resolution' }, { status: 500 });
    }

    return NextResponse.json({ resolution }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/resolutions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
