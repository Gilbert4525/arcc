import { NextRequest, NextResponse } from 'next/server';
import { MinutesService } from '@/lib/database';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/middleware';

// GET /api/minutes/[id]/comments - Get voting comments (admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = Math.random().toString(36).substring(7);
  const startTime = Date.now();
  
  try {
    const resolvedParams = await params;
    console.log(`[${requestId}] Fetching comments for minutes ${resolvedParams.id}`);

    // Validate request parameters
    if (!resolvedParams.id) {
      console.error(`[${requestId}] Missing minutes ID in request`);
      return NextResponse.json({ 
        error: 'Missing minutes ID',
        code: 'MISSING_MINUTES_ID',
        requestId 
      }, { status: 400 });
    }

    // Authentication and authorization - admin only
    const authResult = await requireAdmin(request);
    if (authResult instanceof NextResponse) {
      console.error(`[${requestId}] Admin authentication failed`);
      return authResult;
    }

    const { user } = authResult;
    console.log(`[${requestId}] Admin user ${user.id} requesting comments for minutes ${resolvedParams.id}`);

    const supabase = await createServerSupabaseClient();
    const minutesService = new MinutesService(supabase);
    
    const { searchParams } = new URL(request.url);
    const withComments = searchParams.get('withComments') === 'true';
    
    console.log(`[${requestId}] Fetching comments with filter: withComments=${withComments}`);

    // Check if minutes exists first
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

    // Fetch comments and statistics
    let result;
    try {
      result = await minutesService.getMinutesComments(resolvedParams.id, withComments);
    } catch (dbError) {
      console.error(`[${requestId}] Database error fetching comments:`, dbError);
      return NextResponse.json({ 
        error: 'Failed to fetch voting comments',
        code: 'COMMENTS_FETCH_ERROR',
        requestId,
        details: dbError instanceof Error ? dbError.message : 'Unknown database error'
      }, { status: 500 });
    }

    const duration = Date.now() - startTime;
    console.log(`[${requestId}] Comments fetched successfully in ${duration}ms:`, {
      totalVotes: result.votes.length,
      totalComments: result.statistics.total_comments,
      withCommentsFilter: withComments
    });

    return NextResponse.json({
      success: true,
      ...result,
      requestId,
      duration
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[${requestId}] Unexpected error in GET /api/minutes/[id]/comments (${duration}ms):`, error);
    
    return NextResponse.json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      requestId,
      duration,
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}