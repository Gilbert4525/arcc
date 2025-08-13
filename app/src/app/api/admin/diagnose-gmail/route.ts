import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import nodemailer from 'nodemailer';

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

    console.log('🔍 Starting comprehensive Gmail SMTP diagnosis...');

    const diagnosis = {
      environment: {
        nodeEnv: process.env.NODE_ENV,
        isVercel: !!process.env.VERCEL,
        timestamp: new Date().toISOString()
      },
      credentials: {
        gmailEmail: {
          exists: !!process.env.GMAIL_EMAIL,
          value: process.env.GMAIL_EMAIL || 'NOT_SET',
          isValid: process.env.GMAIL_EMAIL?.includes('@gmail.com') || false
        },
        gmailAppPassword: {
          exists: !!process.env.GMAIL_APP_PASSWORD,
          length: process.env.GMAIL_APP_PASSWORD?.length || 0,
          format: process.env.GMAIL_APP_PASSWORD?.replace(/\s/g, '').length === 16 ? 'CORRECT' : 'INCORRECT',
          hasSpaces: process.env.GMAIL_APP_PASSWORD?.includes(' ') || false,
          preview: process.env.GMAIL_APP_PASSWORD ? 
            `${process.env.GMAIL_APP_PASSWORD.substring(0, 4)}****${process.env.GMAIL_APP_PASSWORD.substring(-4)}` : 
            'NOT_SET'
        }
      },
      connectionTests: {
        basicConnection: { success: false, error: null as string | null },
        authTest: { success: false, error: null as string | null },
        sendTest: { success: false, error: null as string | null }
      },
      recommendations: [] as string[]
    };

    // Test 1: Basic SMTP Connection
    try {
      console.log('🧪 Test 1: Basic SMTP Connection...');
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_EMAIL,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
        secure: true,
        port: 465,
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000,
      });

      await transporter.verify();
      diagnosis.connectionTests.basicConnection.success = true;
      console.log('✅ Basic SMTP connection successful');
    } catch (error) {
      diagnosis.connectionTests.basicConnection.error = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Basic SMTP connection failed:', error);
    }

    // Test 2: Authentication Test
    try {
      console.log('🧪 Test 2: Authentication Test...');
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_EMAIL,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
        connectionTimeout: 10000,
      });

      await transporter.verify();
      diagnosis.connectionTests.authTest.success = true;
      console.log('✅ Authentication test successful');
    } catch (error) {
      diagnosis.connectionTests.authTest.error = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Authentication test failed:', error);
    }

    // Test 3: Actual Email Send Test
    if (diagnosis.connectionTests.basicConnection.success || diagnosis.connectionTests.authTest.success) {
      try {
        console.log('🧪 Test 3: Email Send Test...');
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.GMAIL_EMAIL,
            pass: process.env.GMAIL_APP_PASSWORD,
          },
          secure: true,
          port: 465,
        });

        const info = await transporter.sendMail({
          from: `Arc Board Management <${process.env.GMAIL_EMAIL}>`,
          to: process.env.GMAIL_EMAIL,
          subject: 'Gmail SMTP Diagnosis Test',
          html: `
            <h2>Gmail SMTP Diagnosis Test</h2>
            <p>This is a test email to verify Gmail SMTP is working correctly.</p>
            <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
            <p><strong>Environment:</strong> ${process.env.NODE_ENV}</p>
            <p><strong>Test Status:</strong> SUCCESS ✅</p>
          `,
          text: `Gmail SMTP Diagnosis Test - ${new Date().toISOString()} - SUCCESS`
        });

        diagnosis.connectionTests.sendTest.success = true;
        console.log('✅ Email send test successful:', info.messageId);
        
        transporter.close();
      } catch (error) {
        diagnosis.connectionTests.sendTest.error = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Email send test failed:', error);
      }
    }

    // Generate recommendations
    if (!diagnosis.credentials.gmailEmail.exists) {
      diagnosis.recommendations.push('Set GMAIL_EMAIL environment variable');
    }
    
    if (!diagnosis.credentials.gmailEmail.isValid) {
      diagnosis.recommendations.push('GMAIL_EMAIL must be a valid @gmail.com address');
    }
    
    if (!diagnosis.credentials.gmailAppPassword.exists) {
      diagnosis.recommendations.push('Set GMAIL_APP_PASSWORD environment variable');
    }
    
    if (diagnosis.credentials.gmailAppPassword.format === 'INCORRECT') {
      diagnosis.recommendations.push('Gmail App Password must be exactly 16 characters (with or without spaces)');
    }
    
    if (!diagnosis.connectionTests.basicConnection.success && !diagnosis.connectionTests.authTest.success) {
      diagnosis.recommendations.push('Check Gmail account has 2-Factor Authentication enabled');
      diagnosis.recommendations.push('Verify App Password is generated correctly from Google Account settings');
      diagnosis.recommendations.push('Check if "Less secure app access" is disabled (should be disabled when using App Passwords)');
    }
    
    if (diagnosis.connectionTests.basicConnection.success && !diagnosis.connectionTests.sendTest.success) {
      diagnosis.recommendations.push('Connection works but email sending fails - check Gmail sending limits');
      diagnosis.recommendations.push('Verify Gmail account is not suspended or restricted');
    }

    if (diagnosis.recommendations.length === 0) {
      diagnosis.recommendations.push('Gmail SMTP is properly configured and working!');
    }

    console.log('📊 Gmail SMTP diagnosis complete');

    return NextResponse.json({
      status: 'Gmail SMTP diagnosis complete',
      diagnosis,
      summary: {
        configured: diagnosis.credentials.gmailEmail.exists && diagnosis.credentials.gmailAppPassword.exists,
        canConnect: diagnosis.connectionTests.basicConnection.success || diagnosis.connectionTests.authTest.success,
        canSendEmails: diagnosis.connectionTests.sendTest.success,
        overallStatus: diagnosis.connectionTests.sendTest.success ? 'WORKING' : 
                      (diagnosis.connectionTests.basicConnection.success || diagnosis.connectionTests.authTest.success) ? 'CONNECTED_BUT_CANNOT_SEND' : 
                      'NOT_WORKING'
      }
    });

  } catch (error) {
    console.error('❌ Gmail SMTP diagnosis failed:', error);
    return NextResponse.json(
      { 
        error: 'Gmail SMTP diagnosis failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}