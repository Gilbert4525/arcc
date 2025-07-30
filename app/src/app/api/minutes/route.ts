import { NextRequest, NextResponse } from 'next/server';
import { MinutesService, getDatabaseServices } from '@/lib/database';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// GET /api/minutes - Get minutes with filtering
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile to check role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return NextResponse.json({ error: 'Failed to get user profile' }, { status: 500 });
    }

    // Create service instance
    const minutesService = new MinutesService(supabase);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const voting = searchParams.get('voting');
    const stats = searchParams.get('stats');
    const search = searchParams.get('search');
    const includeCommentCounts = searchParams.get('includeCommentCounts') === 'true';
    const includeCreator = searchParams.get('includeCreator') === 'true';
    const includeUserVotes = searchParams.get('includeUserVotes') === 'true';

    if (stats === 'true') {
      const statistics = await minutesService.getMinutesStats();
      return NextResponse.json({ stats: statistics });
    }

    let result;

    if (search) {
      const minutes = await minutesService.searchMinutes(search);
      result = { minutes, total: minutes.length, hasMore: false };
    } else if (voting === 'true') {
      const minutes = await minutesService.getActiveVotingMinutes();
      result = { minutes, total: minutes.length, hasMore: false };
    } else if (status) {
      const minutes = await minutesService.getMinutesByStatus(status as any);
      result = { minutes, total: minutes.length, hasMore: false };
    } else {
      // Check if admin wants comment counts
      if (includeCommentCounts && profile.role === 'admin') {
        result = await minutesService.getMinutesWithCommentCounts(page, limit);
      } else if (includeCreator && includeUserVotes) {
        result = await minutesService.getMinutesWithCreatorAndUserVotes(page, limit);
      } else if (includeCreator) {
        result = await minutesService.getMinutesWithCreator(page, limit);
      } else {
        result = await minutesService.getMinutes(page, limit);
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in GET /api/minutes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/minutes - Create new minutes
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Create service instance
    const minutesService = new MinutesService(supabase);

    const body = await request.json();
    const {
      title,
      meeting_date,
      meeting_id,
      content,
      key_decisions,
      action_items,
      category_id,
      voting_deadline,
      minimum_quorum = 50,
      approval_threshold = 75,
      attachments,
      tags,
      notes,
    } = body;

    if (!title || !meeting_date || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const minutesData = {
      title,
      meeting_date,
      meeting_id,
      content,
      key_decisions,
      action_items,
      category_id,
      voting_deadline,
      minimum_quorum,
      approval_threshold,
      attachments,
      tags,
      notes,
      created_by: user.id, // Add the required created_by field
    };

    const minutes = await minutesService.createMinutes(minutesData);
    if (!minutes) {
      return NextResponse.json({ error: 'Failed to create minutes' }, { status: 500 });
    }

    // Create notifications (don't let this fail the main operation)
    try {
      const { notifications } = getDatabaseServices(supabase);
      await notifications.notifyMinutesCreated(minutes, user.id);
    } catch (notificationError) {
      console.error('Failed to create minutes notification:', notificationError);
      // Continue - don't fail the main operation
    }

    return NextResponse.json({ minutes }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/minutes:', error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      return NextResponse.json({ 
        error: 'Failed to create minutes', 
        details: error.message 
      }, { status: 500 });
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}