import nodemailer from 'nodemailer';

interface EmailData {
    to: string;
    subject: string;
    html: string;
    text: string;
}

interface NotificationEmailData {
    userEmail: string;
    userName: string;
    title: string;
    message: string;
    actionUrl?: string;
    actionText?: string;
    type: 'meeting' | 'resolution' | 'document' | 'system' | 'reminder';
}

/**
 * Production-optimized Gmail SMTP service for Vercel serverless functions
 * This service is designed to work reliably in serverless environments
 * without breaking existing functionality
 */
export class ProductionGmailSMTPService {
    private fromEmail: string;
    private fromName: string;
    private appPassword: string;

    constructor() {
        this.fromEmail = process.env.GMAIL_EMAIL || '';
        this.fromName = 'Arc Board Management';
        this.appPassword = process.env.GMAIL_APP_PASSWORD || '';

        // Log configuration status without exposing sensitive data
        console.log('📧 Production Gmail SMTP initialized:', {
            hasEmail: !!this.fromEmail,
            hasPassword: !!this.appPassword,
            environment: process.env.NODE_ENV,
            isVercel: !!process.env.VERCEL
        });
    }

    // Check if service is properly configured
    isConfigured(): boolean {
        return !!(this.fromEmail && this.appPassword);
    }

    // Create transporter optimized for serverless (no connection pooling)
    private createTransporter(): nodemailer.Transporter {
        if (!this.isConfigured()) {
            throw new Error('Gmail SMTP not configured - missing environment variables');
        }

        return nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                user: this.fromEmail,
                pass: this.appPassword,
            },
            // Serverless-optimized settings
            pool: false, // No connection pooling in serverless
            maxConnections: 1,
            maxMessages: 1,
            connectionTimeout: 25000, // 25 seconds (under Vercel's 30s limit)
            greetingTimeout: 25000,
            socketTimeout: 25000,
            // Additional reliability settings
            tls: {
                rejectUnauthorized: true
            }
        });
    }

    // Generate HTML email template (same as existing service for consistency)
    private generateEmailHTML(data: NotificationEmailData): string {
        const { userName, title, message, actionUrl, actionText, type } = data;

        const typeColors = {
            meeting: '#3B82F6',
            resolution: '#8B5CF6',
            document: '#10B981',
            system: '#6B7280',
            reminder: '#F59E0B'
        };

        const color = typeColors[type] || '#6B7280';

        return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${title}</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, ${color} 0%, ${color}CC 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Arc Board Management</h1>
            <p style="color: white; margin: 10px 0 0 0; opacity: 0.9;">Board Notification</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
            <h2 style="color: ${color}; margin-top: 0;">${title}</h2>
            
            <p style="margin: 20px 0;">Hello ${userName},</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid ${color}; margin: 20px 0;">
              <p style="margin: 0; font-size: 16px;">${message}</p>
            </div>
            
            ${actionUrl && actionText ? `
              <div style="text-align: center; margin: 30px 0;">
                <a href="${actionUrl}" 
                   style="background: ${color}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                  ${actionText}
                </a>
              </div>
            ` : ''}
            
            <hr style="border: none; border-top: 1px solid #e9ecef; margin: 30px 0;">
            
            <p style="font-size: 14px; color: #6c757d; margin: 0;">
              This is an automated notification from Arc Board Management System.
            </p>
            
            <p style="font-size: 12px; color: #adb5bd; margin: 10px 0 0 0;">
              © ${new Date().getFullYear()} Arc Board Management. All rights reserved.
            </p>
          </div>
        </body>
      </html>
    `;
    }

    // Generate plain text version
    private generateEmailText(data: NotificationEmailData): string {
        const { userName, title, message, actionUrl, actionText } = data;

        return `
Arc Board Management - ${title}

Hello ${userName},

${message}

${actionUrl && actionText ? `
${actionText}: ${actionUrl}
` : ''}

---
This is an automated notification from Arc Board Management System.

© ${new Date().getFullYear()} Arc Board Management. All rights reserved.
    `.trim();
    }

    // Send single email with production-safe error handling
    async sendNotificationEmail(data: NotificationEmailData): Promise<boolean> {
        if (!this.isConfigured()) {
            console.error('❌ Production Gmail SMTP not configured');
            return false;
        }

        let transporter: nodemailer.Transporter | null = null;
        
        try {
            console.log('📧 Sending production Gmail email to:', data.userEmail);
            
            const emailData: EmailData = {
                to: data.userEmail,
                subject: `Arc Board Management - ${data.title}`,
                html: this.generateEmailHTML(data),
                text: this.generateEmailText(data)
            };

            // Create fresh transporter for this email (serverless best practice)
            transporter = this.createTransporter();

            // Send email with timeout protection
            const sendPromise = transporter.sendMail({
                from: `${this.fromName} <${this.fromEmail}>`,
                to: emailData.to,
                subject: emailData.subject,
                html: emailData.html,
                text: emailData.text,
                headers: {
                    'X-Mailer': 'Arc Board Management System (Production)',
                    'X-Priority': '3',
                },
            });

            // Add timeout protection for Vercel functions
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Email send timeout')), 25000);
            });

            const info = await Promise.race([sendPromise, timeoutPromise]) as any;

            console.log('✅ Production Gmail email sent successfully:', {
                to: emailData.to,
                subject: emailData.subject,
                messageId: info.messageId
            });

            return true;
        } catch (error) {
            console.error('❌ Production Gmail email failed:', {
                to: data.userEmail,
                error: error instanceof Error ? error.message : 'Unknown error',
                isConfigured: this.isConfigured(),
                environment: process.env.NODE_ENV
            });
            return false;
        } finally {
            // Always close transporter connection
            if (transporter) {
                try {
                    transporter.close();
                } catch (closeError) {
                    console.warn('Warning: Error closing transporter:', closeError);
                }
            }
        }
    }

    // Test connection with safe error handling
    async testConnection(testEmail: string = 'boardmixllc@gmail.com'): Promise<boolean> {
        if (!this.isConfigured()) {
            console.error('❌ Cannot test - Gmail SMTP not configured');
            return false;
        }

        try {
            console.log('🧪 Testing production Gmail SMTP connection...');

            const testResult = await this.sendNotificationEmail({
                userEmail: testEmail,
                userName: 'Test User',
                title: 'Production Gmail SMTP Test',
                message: 'This is a test email to verify Gmail SMTP is working in production.',
                type: 'system'
            });

            if (testResult) {
                console.log('✅ Production Gmail SMTP test successful');
                return true;
            } else {
                console.error('❌ Production Gmail SMTP test failed');
                return false;
            }
        } catch (error) {
            console.error('❌ Production Gmail SMTP test error:', error);
            return false;
        }
    }
}

// Helper function to create email notification data (consistent with existing services)
export function createProductionGmailEmailNotificationData(
    user: { email: string; full_name?: string },
    notification: {
        title: string;
        message: string;
        type: 'meeting' | 'resolution' | 'document' | 'system' | 'reminder';
        action_url?: string;
        action_text?: string;
    }
): NotificationEmailData {
    return {
        userEmail: user.email,
        userName: user.full_name || 'Board Member',
        title: notification.title,
        message: notification.message,
        type: notification.type,
        actionUrl: notification.action_url,
        actionText: notification.action_text,
    };
}

// Export singleton instance for production use
export const productionGmailService = new ProductionGmailSMTPService();