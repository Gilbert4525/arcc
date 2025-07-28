import { NextRequest, NextResponse } from 'next/server';
import { MinutesService, getDatabaseServices } from '@/lib/database';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// POST /api/minutes/[id]/publish - Publish minutes for voting
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

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { voting_deadline } = body;

    if (!voting_deadline) {
      return NextResponse.json({ 
        error: 'Voting deadline is required' 
      }, { status: 400 });
    }

    // Validate voting deadline is in the future
    const deadlineDate = new Date(voting_deadline);
    if (deadlineDate <= new Date()) {
      return NextResponse.json({ 
        error: 'Voting deadline must be in the future' 
      }, { status: 400 });
    }

    const minutesService = new MinutesService(supabase);
    
    // Check if minutes exists and is in draft status
    const currentMinutes = await minutesService.getMinutesById(resolvedParams.id, false);
    if (!currentMinutes) {
      return NextResponse.json({ error: 'Minutes not found' }, { status: 404 });
    }

    if (currentMinutes.status !== 'draft') {
      return NextResponse.json({ 
        error: 'Only draft minutes can be published for voting' 
      }, { status: 400 });
    }

    // Publish minutes for voting
    const minutes = await minutesService.publishMinutesForVoting(resolvedParams.id, voting_deadline);
    if (!minutes) {
      return NextResponse.json({ error: 'Failed to publish minutes' }, { status: 500 });
    }

    // Create notifications for board members (don't let this fail the main operation)
    try {
      const { notifications } = getDatabaseServices(supabase);
      await notifications.notifyMinutesPublishedForVoting(minutes, user.id);
    } catch (notificationError) {
      console.error('Failed to create minutes published notification:', notificationError);
      // Continue - don't fail the main operation
    }

    return NextResponse.json({ minutes });
  } catch (error) {
    console.error('Error in POST /api/minutes/[id]/publish:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}