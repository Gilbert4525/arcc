import { NextRequest, NextResponse } from 'next/server';
import { MinutesService } from '@/lib/database';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// GET /api/minutes/[id] - Get specific minutes
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

    // Get user profile to check role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return NextResponse.json({ error: 'Failed to get user profile' }, { status: 500 });
    }

    const minutesService = new MinutesService(supabase);
    const { searchParams } = new URL(request.url);
    const withVoting = searchParams.get('withVoting') === 'true';
    const includeComments = searchParams.get('includeComments') === 'true';
    const includeVotes = searchParams.get('includeVotes') === 'true';

    // Admin-only features
    if (includeComments && profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required for comments' }, { status: 403 });
    }

    if (includeComments) {
      // Admin view with full comment details
      const result = await minutesService.getMinutesWithComments(resolvedParams.id);
      if (!result) {
        return NextResponse.json({ error: 'Minutes not found' }, { status: 404 });
      }
      return NextResponse.json(result);
    } else if (withVoting || includeVotes) {
      // Standard voting details view
      const result = await minutesService.getMinutesWithVotingDetails(resolvedParams.id);
      if (!result) {
        return NextResponse.json({ error: 'Minutes not found' }, { status: 404 });
      }
      return NextResponse.json(result);
    } else {
      // Basic minutes view
      const minutes = await minutesService.getMinutesById(resolvedParams.id);
      if (!minutes) {
        return NextResponse.json({ error: 'Minutes not found' }, { status: 404 });
      }
      return NextResponse.json({ minutes });
    }
  } catch (error) {
    console.error('Error in GET /api/minutes/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/minutes/[id] - Update minutes
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
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const minutesService = new MinutesService(supabase);
    const body = await request.json();

    const minutes = await minutesService.updateMinutes(resolvedParams.id, body);
    if (!minutes) {
      return NextResponse.json({ error: 'Failed to update minutes' }, { status: 500 });
    }

    return NextResponse.json({ minutes });
  } catch (error) {
    console.error('Error in PUT /api/minutes/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/minutes/[id] - Delete minutes
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
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const minutesService = new MinutesService(supabase);
    const success = await minutesService.deleteMinutes(resolvedParams.id);

    if (!success) {
      return NextResponse.json({ error: 'Failed to delete minutes' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Minutes deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/minutes/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}