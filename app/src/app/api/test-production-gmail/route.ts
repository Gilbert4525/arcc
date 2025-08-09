import { NextRequest, NextResponse } from 'next/server';
import { productionGmailService } from '@/lib/email/productionGmailSmtp';

export async function POST(request: NextRequest) {
    try {
        console.log('🧪 Testing production Gmail SMTP service...');
        
        // Get test email from request body or use default
        const body = await request.json().catch(() => ({}));
        const testEmail = body.email || 'boardmixllc@gmail.com';
        
        // Check if service is configured before testing
        if (!productionGmailService.isConfigured()) {
            console.error('❌ Production Gmail service not configured');
            return NextResponse.json({
                success: false,
                message: 'Gmail SMTP not configured - check environment variables',
                configured: false,
                environment: {
                    nodeEnv: process.env.NODE_ENV,
                    isVercel: !!process.env.VERCEL,
                    hasGmailEmail: !!process.env.GMAIL_EMAIL,
                    hasGmailPassword: !!process.env.GMAIL_APP_PASSWORD
                }
            }, { status: 500 });
        }

        console.log('📧 Environment check passed, testing email send...');
        
        // Test the production Gmail service
        const result = await productionGmailService.testConnection(testEmail);
        
        if (result) {
            console.log('✅ Production Gmail SMTP test successful');
            return NextResponse.json({
                success: true,
                message: 'Production Gmail SMTP test email sent successfully',
                testEmail,
                configured: true,
                environment: {
                    nodeEnv: process.env.NODE_ENV,
                    isVercel: !!process.env.VERCEL,
                    timestamp: new Date().toISOString()
                }
            });
        } else {
            console.error('❌ Production Gmail SMTP test failed');
            return NextResponse.json({
                success: false,
                message: 'Production Gmail SMTP test failed - check logs for details',
                testEmail,
                configured: true,
                environment: {
                    nodeEnv: process.env.NODE_ENV,
                    isVercel: !!process.env.VERCEL,
                    timestamp: new Date().toISOString()
                }
            }, { status: 500 });
        }
    } catch (error) {
        console.error('❌ Production Gmail SMTP test error:', error);
        return NextResponse.json({
            success: false,
            message: 'Production Gmail SMTP test error',
            error: error instanceof Error ? error.message : 'Unknown error',
            environment: {
                nodeEnv: process.env.NODE_ENV,
                isVercel: !!process.env.VERCEL,
                timestamp: new Date().toISOString()
            }
        }, { status: 500 });
    }
}

export async function GET() {
    return NextResponse.json({
        message: 'Production Gmail SMTP Test Endpoint',
        usage: 'POST with optional { "email": "test@example.com" }',
        configured: productionGmailService.isConfigured(),
        environment: {
            nodeEnv: process.env.NODE_ENV,
            isVercel: !!process.env.VERCEL,
            hasGmailCredentials: !!(process.env.GMAIL_EMAIL && process.env.GMAIL_APP_PASSWORD)
        }
    });
}