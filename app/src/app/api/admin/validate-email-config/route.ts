import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/middleware';

// POST /api/admin/validate-email-config - Validate email configuration (admin only)
export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const user = await requireAdmin(request);
    if (user instanceof NextResponse) {
      return user; // Return the error response
    }

    const supabase = await createServerSupabaseClient();

    console.log('🔍 Validating email configuration...');

    // Check environment variables
    const envCheck = {
      GMAIL_EMAIL: {
        exists: !!process.env.GMAIL_EMAIL,
        value: process.env.GMAIL_EMAIL ? `${process.env.GMAIL_EMAIL.substring(0, 3)}***` : 'Not set'
      },
      GMAIL_APP_PASSWORD: {
        exists: !!process.env.GMAIL_APP_PASSWORD,
        value: process.env.GMAIL_APP_PASSWORD ? `${process.env.GMAIL_APP_PASSWORD.substring(0, 4)}***` : 'Not set'
      },
      NODE_ENV: process.env.NODE_ENV || 'development'
    };

    console.log('Environment variables check:', envCheck);

    // Test Gmail SMTP service loading
    const gmailServiceStatus = {
      canLoad: false,
      canInitialize: false,
      canConnect: false,
      error: null as string | null
    };

    try {
      console.log('🔄 Testing Gmail SMTP service loading...');
      const { GmailSMTPService } = await import('@/lib/email/gmailSmtp');
      gmailServiceStatus.canLoad = true;
      console.log('✅ Gmail SMTP service can be loaded');

      try {
        const gmailService = new GmailSMTPService();
        gmailServiceStatus.canInitialize = true;
        console.log('✅ Gmail SMTP service can be initialized');

        // Test connection
        const connectionTest = await gmailService.testConnection();
        gmailServiceStatus.canConnect = connectionTest;
        console.log(connectionTest ? '✅ Gmail SMTP connection successful' : '❌ Gmail SMTP connection failed');

        // Close connection
        await gmailService.close();
      } catch (initError) {
        gmailServiceStatus.error = initError instanceof Error ? initError.message : 'Unknown initialization error';
        console.error('❌ Gmail SMTP service initialization failed:', initError);
      }
    } catch (loadError) {
      gmailServiceStatus.error = loadError instanceof Error ? loadError.message : 'Unknown loading error';
      console.error('❌ Gmail SMTP service loading failed:', loadError);
    }

    // Test notification service
    const notificationServiceStatus = {
      canLoadService: false,
      canLoadHelpers: false,
      error: null as string | null
    };

    try {
      const { getDatabaseServices } = await import('@/lib/database');
      const { notifications } = getDatabaseServices(supabase);
      
      // Test if the service can load email components
      const emailService = await (notifications as any).getEmailService();
      notificationServiceStatus.canLoadService = !!emailService;

      const emailHelpers = await (notifications as any).getEmailHelpers();
      notificationServiceStatus.canLoadHelpers = !!emailHelpers;

      console.log('Notification service status:', notificationServiceStatus);
    } catch (error) {
      notificationServiceStatus.error = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Notification service test failed:', error);
    }

    const overallStatus = {
      isConfigured: envCheck.GMAIL_EMAIL.exists && envCheck.GMAIL_APP_PASSWORD.exists,
      canSendEmails: gmailServiceStatus.canConnect,
      environment: envCheck.NODE_ENV,
      timestamp: new Date().toISOString()
    };

    console.log('📊 Overall email system status:', overallStatus);

    return NextResponse.json({
      status: 'Email configuration validation complete',
      environment: envCheck,
      gmailService: gmailServiceStatus,
      notificationService: notificationServiceStatus,
      overall: overallStatus,
      recommendations: generateRecommendations(envCheck, gmailServiceStatus, notificationServiceStatus)
    });

  } catch (error) {
    console.error('❌ Email configuration validation failed:', error);
    return NextResponse.json(
      { 
        error: 'Email configuration validation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

function generateRecommendations(
  envCheck: { GMAIL_EMAIL: { exists: boolean }; GMAIL_APP_PASSWORD: { exists: boolean } },
  gmailStatus: { canLoad: boolean; canInitialize: boolean; canConnect: boolean },
  notificationStatus: { canLoadService: boolean; canLoadHelpers: boolean }
): string[] {
  const recommendations: string[] = [];

  if (!envCheck.GMAIL_EMAIL.exists) {
    recommendations.push('Add GMAIL_EMAIL environment variable to Vercel dashboard');
  }

  if (!envCheck.GMAIL_APP_PASSWORD.exists) {
    recommendations.push('Add GMAIL_APP_PASSWORD environment variable to Vercel dashboard');
  }

  if (!gmailStatus.canLoad) {
    recommendations.push('Check if nodemailer is properly installed and configured');
  }

  if (!gmailStatus.canInitialize) {
    recommendations.push('Verify Gmail credentials are correct and app password is valid');
  }

  if (!gmailStatus.canConnect) {
    recommendations.push('Test Gmail SMTP connection - check firewall and Gmail settings');
  }

  if (!notificationStatus.canLoadService) {
    recommendations.push('Check notification service dynamic imports in serverless environment');
  }

  if (recommendations.length === 0) {
    recommendations.push('Email system is properly configured and operational');
  }

  return recommendations;
}