import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
    try {
        // Safely check environment variables without exposing sensitive data
        const diagnostics = {
            environment: {
                nodeEnv: process.env.NODE_ENV,
                isVercel: !!process.env.VERCEL,
                vercelEnv: process.env.VERCEL_ENV,
                timestamp: new Date().toISOString()
            },
            emailConfig: {
                hasGmailEmail: !!process.env.GMAIL_EMAIL,
                hasGmailPassword: !!process.env.GMAIL_APP_PASSWORD,
                gmailEmailLength: process.env.GMAIL_EMAIL?.length || 0,
                gmailPasswordLength: process.env.GMAIL_APP_PASSWORD?.length || 0,
                // Show first 3 chars of email for verification (safe)
                gmailEmailPrefix: process.env.GMAIL_EMAIL?.substring(0, 3) || 'N/A'
            },
            serverInfo: {
                platform: process.platform,
                nodeVersion: process.version,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
            }
        };

        return NextResponse.json({
            success: true,
            message: 'Vercel email diagnostics completed',
            diagnostics
        });
    } catch (error) {
        return NextResponse.json({
            success: false,
            message: 'Diagnostic error',
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        // Test basic nodemailer import without creating connections
        const nodemailer = await import('nodemailer');
        
        const testResults = {
            nodemailerImport: !!nodemailer,
            environmentCheck: {
                hasGmailEmail: !!process.env.GMAIL_EMAIL,
                hasGmailPassword: !!process.env.GMAIL_APP_PASSWORD,
                isProduction: process.env.NODE_ENV === 'production',
                isVercel: !!process.env.VERCEL
            }
        };

        return NextResponse.json({
            success: true,
            message: 'Basic email system test completed',
            testResults
        });
    } catch (error) {
        return NextResponse.json({
            success: false,
            message: 'Email system test failed',
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}