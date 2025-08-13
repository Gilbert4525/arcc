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

    console.log('🔍 Validating Gmail configuration against screenshot requirements...');

    const validation = {
      timestamp: new Date().toISOString(),
      requirements: {
        host: 'smtp.gmail.com',
        port: 465,
        encryption: 'SSL',
        username: 'boardmixllc@gmail.com',
        emailFrom: 'boardmixllc@gmail.com'
      },
      current: {
        gmailEmail: process.env.GMAIL_EMAIL || 'NOT_SET',
        gmailAppPassword: process.env.GMAIL_APP_PASSWORD ? 'SET' : 'NOT_SET',
        appPasswordLength: process.env.GMAIL_APP_PASSWORD?.length || 0,
        appPasswordFormat: process.env.GMAIL_APP_PASSWORD?.replace(/\s/g, '').length === 16 ? 'CORRECT' : 'INCORRECT'
      },
      checks: {
        emailMatches: false,
        passwordExists: false,
        passwordFormatCorrect: false,
        canConnect: false,
        canAuthenticate: false
      },
      issues: [] as string[],
      recommendations: [] as string[]
    };

    // Check 1: Email matches requirement
    validation.checks.emailMatches = validation.current.gmailEmail === validation.requirements.username;
    if (!validation.checks.emailMatches) {
      validation.issues.push(`Email mismatch: Expected ${validation.requirements.username}, got ${validation.current.gmailEmail}`);
      validation.recommendations.push('Set GMAIL_EMAIL=boardmixllc@gmail.com in .env.local');
    }

    // Check 2: Password exists
    validation.checks.passwordExists = !!process.env.GMAIL_APP_PASSWORD;
    if (!validation.checks.passwordExists) {
      validation.issues.push('Gmail App Password not set');
      validation.recommendations.push('Generate Gmail App Password and set GMAIL_APP_PASSWORD in .env.local');
    }

    // Check 3: Password format
    validation.checks.passwordFormatCorrect = validation.current.appPasswordFormat === 'CORRECT';
    if (!validation.checks.passwordFormatCorrect && validation.checks.passwordExists) {
      validation.issues.push(`App Password format incorrect: Expected 16 characters, got ${validation.current.appPasswordLength}`);
      validation.recommendations.push('Gmail App Password must be exactly 16 characters (with or without spaces)');
    }

    // Check 4: Connection test (only if basic config is correct)
    if (validation.checks.emailMatches && validation.checks.passwordExists && validation.checks.passwordFormatCorrect) {
      try {
        console.log('🧪 Testing SMTP connection with screenshot settings...');
        const transporter = nodemailer.createTransport({
          host: validation.requirements.host,
          port: validation.requirements.port,
          secure: true, // SSL encryption
          auth: {
            user: validation.requirements.username,
            pass: process.env.GMAIL_APP_PASSWORD,
          },
          connectionTimeout: 10000,
          greetingTimeout: 10000,
        });

        await transporter.verify();
        validation.checks.canConnect = true;
        console.log('✅ SMTP connection successful');

        // Test authentication
        validation.checks.canAuthenticate = true;
        console.log('✅ SMTP authentication successful');

        transporter.close();
      } catch (error) {
        validation.issues.push(`Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        
        if (error instanceof Error) {
          if (error.message.includes('Invalid login')) {
            validation.recommendations.push('Generate a new Gmail App Password - current one may be invalid');
            validation.recommendations.push('Ensure 2-Factor Authentication is enabled on Gmail account');
          } else if (error.message.includes('timeout')) {
            validation.recommendations.push('Check if IMAP is enabled in Gmail settings');
            validation.recommendations.push('Verify network allows connections to smtp.gmail.com:465');
          }
        }
      }
    }

    // Generate overall status
    const allChecksPass = Object.values(validation.checks).every(check => check === true);
    const overallStatus = allChecksPass ? 'READY' : 'NEEDS_CONFIGURATION';

    // Add general recommendations if needed
    if (!allChecksPass) {
      validation.recommendations.push('Follow the Gmail Configuration Checklist for step-by-step setup');
      validation.recommendations.push('Ensure 2-Factor Authentication is enabled on boardmixllc@gmail.com');
      validation.recommendations.push('Verify IMAP is enabled in Gmail settings');
    }

    console.log(`📊 Gmail validation complete: ${overallStatus}`);

    return NextResponse.json({
      status: 'Gmail configuration validation complete',
      overallStatus,
      validation,
      summary: {
        configured: validation.checks.emailMatches && validation.checks.passwordExists && validation.checks.passwordFormatCorrect,
        connected: validation.checks.canConnect,
        authenticated: validation.checks.canAuthenticate,
        ready: allChecksPass
      },
      nextSteps: allChecksPass ? 
        ['Gmail is properly configured! You can now send emails.'] :
        validation.recommendations
    });

  } catch (error) {
    console.error('❌ Gmail configuration validation failed:', error);
    return NextResponse.json(
      { 
        error: 'Gmail configuration validation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}