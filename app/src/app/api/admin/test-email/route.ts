import { NextRequest, NextResponse } from 'next/server';
import { createGmailEmailNotificationData } from '@/lib/email/gmailSmtp';

export async function POST(request: NextRequest) {
  try {
    const { email, name } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 }
      );
    }

    // Use Gmail SMTP service
    const { GmailSMTPService } = await import('@/lib/email/gmailSmtp');
    const emailService = new GmailSMTPService();
    
    const testEmailData = createGmailEmailNotificationData(
      { 
        email: email, 
        full_name: name || 'Test User' 
      },
      {
        title: 'Test Email Notification',
        message: 'This is a test email to verify that your email notification system is working correctly. If you receive this email, your email notifications are properly configured!',
        type: 'system',
        action_url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        action_text: 'Visit Dashboard'
      }
    );

    const success = await emailService.sendNotificationEmail(testEmailData);

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Test email sent successfully!'
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to send test email' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error sending test email:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}