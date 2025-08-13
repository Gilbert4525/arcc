import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Quick Gmail SMTP test with current credentials...');

    // Test with exact settings from screenshot
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // SSL
      auth: {
        user: 'boardmixllc@gmail.com',
        pass: process.env.GMAIL_APP_PASSWORD,
      },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 15000,
    });

    console.log('📧 Testing connection...');
    await transporter.verify();
    console.log('✅ Connection successful!');

    console.log('📧 Sending test email...');
    const info = await transporter.sendMail({
      from: 'Arc Board Management <boardmixllc@gmail.com>',
      to: 'boardmixllc@gmail.com',
      subject: 'Quick Gmail Test - ' + new Date().toISOString(),
      html: `
        <h2>Gmail SMTP Quick Test</h2>
        <p>This email confirms Gmail SMTP is working correctly!</p>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        <p><strong>Settings Used:</strong></p>
        <ul>
          <li>Host: smtp.gmail.com</li>
          <li>Port: 465</li>
          <li>Encryption: SSL</li>
          <li>Username: boardmixllc@gmail.com</li>
        </ul>
        <p style="color: green;"><strong>✅ SUCCESS!</strong></p>
      `,
      text: `Gmail SMTP Quick Test - SUCCESS - ${new Date().toISOString()}`
    });

    console.log('✅ Email sent successfully:', info.messageId);
    transporter.close();

    return NextResponse.json({
      success: true,
      message: 'Gmail SMTP test successful!',
      details: {
        messageId: info.messageId,
        timestamp: new Date().toISOString(),
        settings: {
          host: 'smtp.gmail.com',
          port: 465,
          encryption: 'SSL',
          username: 'boardmixllc@gmail.com'
        }
      }
    });

  } catch (error) {
    console.error('❌ Gmail SMTP test failed:', error);
    
    let errorMessage = 'Unknown error';
    let recommendations = [];

    if (error instanceof Error) {
      errorMessage = error.message;
      
      if (errorMessage.includes('Invalid login')) {
        recommendations.push('App Password may be incorrect or expired');
        recommendations.push('Generate a new Gmail App Password');
        recommendations.push('Ensure 2-Factor Authentication is enabled');
      } else if (errorMessage.includes('timeout')) {
        recommendations.push('Check if IMAP is enabled in Gmail settings');
        recommendations.push('Verify network connectivity to smtp.gmail.com:465');
      } else if (errorMessage.includes('ENOTFOUND')) {
        recommendations.push('DNS resolution issue - check internet connection');
      }
    }

    return NextResponse.json({
      success: false,
      error: errorMessage,
      recommendations,
      timestamp: new Date().toISOString(),
      settings: {
        host: 'smtp.gmail.com',
        port: 465,
        encryption: 'SSL',
        username: 'boardmixllc@gmail.com',
        hasPassword: !!process.env.GMAIL_APP_PASSWORD
      }
    }, { status: 500 });
  }
}