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

export class GmailSMTPService {
    private transporter: nodemailer.Transporter;
    private fromEmail: string;
    private fromName: string;

    constructor() {
        this.fromEmail = process.env.GMAIL_EMAIL || 'boardmixllc@gmail.com';
        this.fromName = 'Arc Board Management';

        // Create Gmail SMTP transporter
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: this.fromEmail,
                pass: process.env.GMAIL_APP_PASSWORD || '', // App password from environment
            },
            // Additional security and reliability settings
            secure: true,
            port: 465,
            pool: true, // Use connection pooling
            maxConnections: 5,
            maxMessages: 100,
            rateLimit: 2, // Max 2 emails per second (respects Gmail limits)
        });

        // Verify connection on startup
        this.verifyConnection();
    }

    // Verify Gmail SMTP connection
    private async verifyConnection(): Promise<void> {
        try {
            await this.transporter.verify();
            console.log('✅ Gmail SMTP connection verified successfully');
        } catch (error) {
            console.error('❌ Gmail SMTP connection failed:', error);
        }
    }

    // Generate HTML email template
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
              You can manage your notification preferences in your account settings.
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
You can manage your notification preferences in your account settings.

© ${new Date().getFullYear()} Arc Board Management. All rights reserved.
    `.trim();
    }

    // Send single email notification
    async sendNotificationEmail(data: NotificationEmailData): Promise<boolean> {
        try {
            const emailData: EmailData = {
                to: data.userEmail,
                subject: `Arc Board Management - ${data.title}`,
                html: this.generateEmailHTML(data),
                text: this.generateEmailText(data)
            };

            // Check if Gmail credentials are configured
            if (!process.env.GMAIL_APP_PASSWORD) {
                console.error('❌ Gmail App Password not configured in environment variables');
                return false;
            }

            // Send email using Gmail SMTP
            const info = await this.transporter.sendMail({
                from: `${this.fromName} <${this.fromEmail}>`,
                to: emailData.to,
                subject: emailData.subject,
                html: emailData.html,
                text: emailData.text,
                // Additional headers for better deliverability
                headers: {
                    'X-Mailer': 'Arc Board Management System',
                    'X-Priority': '3',
                },
            });

            console.log('✅ Gmail email sent successfully:', {
                to: emailData.to,
                subject: emailData.subject,
                messageId: info.messageId,
                response: info.response
            });

            return true;
        } catch (error) {
            console.error('❌ Gmail email sending failed:', {
                to: data.userEmail,
                error: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined
            });
            return false;
        }
    }

    // Send bulk email notifications with rate limiting
    async sendBulkNotificationEmails(notifications: NotificationEmailData[]): Promise<boolean> {
        try {
            console.log(`📧 Sending bulk Gmail emails to ${notifications.length} recipients with rate limiting`);

            // Send emails with delay to respect Gmail limits (2 emails per second)
            const results = [];
            for (let i = 0; i < notifications.length; i++) {
                const result = await this.sendNotificationEmail(notifications[i]);
                results.push(result);

                // Add delay between emails to respect Gmail rate limits (500ms = 2 emails per second)
                if (i < notifications.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }

            const successCount = results.filter(r => r === true).length;
            console.log(`📧 Gmail bulk email results: ${successCount}/${notifications.length} successful`);

            return successCount > 0; // Consider successful if at least one email was sent
        } catch (error) {
            console.error('❌ Gmail bulk email sending failed:', error);
            return false;
        }
    }

    // Test Gmail connection and send test email
    async testConnection(testEmail: string = 'boardmixllc@gmail.com'): Promise<boolean> {
        try {
            console.log('🧪 Testing Gmail SMTP connection...');

            // Verify connection first
            await this.transporter.verify();
            console.log('✅ Gmail SMTP connection verified');

            // Send test email
            const testResult = await this.sendNotificationEmail({
                userEmail: testEmail,
                userName: 'Test User',
                title: 'Gmail SMTP Test',
                message: 'This is a test email to verify Gmail SMTP is working correctly.',
                type: 'system'
            });

            if (testResult) {
                console.log('✅ Gmail SMTP test email sent successfully');
                return true;
            } else {
                console.error('❌ Gmail SMTP test email failed');
                return false;
            }
        } catch (error) {
            console.error('❌ Gmail SMTP test failed:', error);
            return false;
        }
    }

    // Close the transporter connection
    async close(): Promise<void> {
        try {
            this.transporter.close();
            console.log('📧 Gmail SMTP connection closed');
        } catch (error) {
            console.error('Error closing Gmail SMTP connection:', error);
        }
    }
}

// Helper function to create email notification data
export function createGmailEmailNotificationData(
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