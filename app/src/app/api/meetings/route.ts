import { NextRequest, NextResponse } from 'next/server';
import { MeetingsService } from '@/lib/database';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// GET /api/meetings - Get meetings with filtering
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create service instance
    const meetingsService = new MeetingsService(supabase);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const upcoming = searchParams.get('upcoming');
    const today = searchParams.get('today');

    let result;

    if (today === 'true') {
      const meetings = await meetingsService.getTodaysMeetings();
      result = { meetings, total: meetings.length, hasMore: false };
    } else if (upcoming === 'true') {
      const meetings = await meetingsService.getUpcomingMeetings(limit);
      result = { meetings, total: meetings.length, hasMore: false };
    } else if (status) {
      const meetings = await meetingsService.getMeetingsByStatus(status as any);
      result = { meetings, total: meetings.length, hasMore: false };
    } else if (type) {
      const meetings = await meetingsService.getMeetingsByType(type as any);
      result = { meetings, total: meetings.length, hasMore: false };
    } else {
      result = await meetingsService.getMeetings(page, limit);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in GET /api/meetings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/meetings - Create new meeting
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create service instance
    const meetingsService = new MeetingsService(supabase);

    const body = await request.json();
    const {
      title,
      description,
      meeting_date,
      duration_minutes = 60,
      location,
      meeting_type = 'board_meeting',
      category_id,
      agenda,
      meeting_link,
      is_recurring = false,
      recurrence_pattern,
    } = body;

    if (!title || !meeting_date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const meetingData = {
      title,
      description,
      meeting_date,
      duration_minutes,
      location,
      meeting_type,
      category_id,
      agenda,
      meeting_link,
      is_recurring,
      recurrence_pattern,
      created_by: user.id,
    };

    const meeting = await meetingsService.createMeeting(meetingData);
    if (!meeting) {
      return NextResponse.json({ error: 'Failed to create meeting' }, { status: 500 });
    }

    // Automatically add all board members as participants
    const participantsAdded = await meetingsService.addAllBoardMembersToMeeting(meeting.id);
    if (!participantsAdded) {
      console.warn('Failed to add participants to meeting:', meeting.id);
      // Don't fail the request, just log the warning
    }

    return NextResponse.json({ meeting }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/meetings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
