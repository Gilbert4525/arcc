import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { GmailSMTPService } from '@/lib/email/gmailSmtp';

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
      .select('role, email, full_name')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { testEmail } = body;

    console.log('🧪 Testing Gmail SMTP service...');
    
    const gmailService = new GmailSMTPService();
    
    // Test connection and send test email
    const testResult = await gmailService.testConnection(testEmail || profile.email);

    if (testResult) {
      return NextResponse.json({ 
        success: true,
        message: 'Gmail SMTP test successful! Check your email.',
        testEmail: testEmail || profile.email
      });
    } else {
      return NextResponse.json(
        { error: 'Gmail SMTP test failed. Check your configuration.' }, 
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('❌ Gmail SMTP test API error:', error);
    return NextResponse.json(
      { 
        error: 'Gmail SMTP test failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }, 
      { status: 500 }
    );
  }
}