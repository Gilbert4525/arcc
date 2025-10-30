import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
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

    console.log('🧪 Testing voting notification system...');

    // Call the notification processor
    const processorResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/cron/process-voting-notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer dev-secret'
      }
    });

    const processorResult = await processorResponse.json();

    return NextResponse.json({
      success: true,
      message: 'Voting notification test completed',
      processorResult
    });

  } catch (error) {
    console.error('Error testing voting notifications:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }, 
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Get recent voting activity
    const { data: recentTriggers } = await supabase
      .from('audit_logs')
      .select('action, table_name, record_id, new_values, created_at')
      .eq('action', 'VOTING_SUMMARY_EMAIL_TRIGGERED')
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour
      .order('created_at', { ascending: false })
      .limit(10);

    const { data: recentEmails } = await supabase
      .from('audit_logs')
      .select('action, table_name, record_id, new_values, created_at')
      .eq('action', 'VOTING_SUMMARY_EMAIL_SENT')
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      success: true,
      recentTriggers: recentTriggers || [],
      recentEmails: recentEmails || [],
      message: 'Use POST to test the notification processor'
    });

  } catch (error) {
    console.error('Error getting voting notification status:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}