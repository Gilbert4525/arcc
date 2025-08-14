import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { VotingSummaryEmailService } from '@/lib/email/votingSummaryService';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    const body = await request.json();
    const { type, itemId, id, trigger, force } = body;
    
    // Support both 'id' and 'itemId' for backwards compatibility
    const resolvedId = itemId || id;

    // Allow system calls (from voting completion detection) without authentication
    const isSystemCall = trigger && (trigger === 'automatic' || trigger === 'vote_cast_fallback' || trigger === 'database_trigger');
    
    if (!isSystemCall) {
      // Check authentication for manual calls
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Check if user is admin for manual calls
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      }
    } else {
      console.log(`🤖 System call detected: ${trigger} - bypassing authentication`);
    }

    // Body parsing moved up for system call detection

    if (!type || !resolvedId) {
      return NextResponse.json(
        { error: 'Missing required fields: type and id/itemId' }, 
        { status: 400 }
      );
    }

    if (type !== 'resolution' && type !== 'minutes') {
      return NextResponse.json(
        { error: 'Invalid type. Must be "resolution" or "minutes"' }, 
        { status: 400 }
      );
    }

    console.log(`🚀 Starting voting summary for ${type} with ID: ${resolvedId}${force ? ' (FORCED)' : ''}`);
    
    const votingSummaryService = new VotingSummaryEmailService(supabase);
    
    let success = false;
    if (type === 'resolution') {
      console.log('📧 Calling sendResolutionVotingSummary...');
      success = await votingSummaryService.sendResolutionVotingSummary(resolvedId);
    } else {
      console.log('📧 Calling sendMinutesVotingSummary...');
      success = await votingSummaryService.sendMinutesVotingSummary(resolvedId);
    }

    console.log(`✅ Voting summary service returned: ${success}`);

    if (success) {
      return NextResponse.json({ 
        message: `Voting summary email sent successfully for ${type}`,
        success: true 
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to send voting summary email' }, 
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('❌ DETAILED ERROR in voting summary API:');
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('Full error object:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }, 
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Check authentication
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

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const id = searchParams.get('id');

    if (!type || !id) {
      return NextResponse.json(
        { error: 'Missing required query parameters: type and id' }, 
        { status: 400 }
      );
    }

    if (type !== 'resolution' && type !== 'minutes') {
      return NextResponse.json(
        { error: 'Invalid type. Must be "resolution" or "minutes"' }, 
        { status: 400 }
      );
    }

    const votingSummaryService = new VotingSummaryEmailService(supabase);
    const summaryData = await votingSummaryService.generateVotingSummaryData(type, id);

    if (!summaryData) {
      return NextResponse.json(
        { error: 'Failed to generate voting summary data' }, 
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: summaryData
    });
  } catch (error) {
    console.error('Error in voting summary preview API:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}