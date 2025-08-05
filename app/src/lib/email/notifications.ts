// Email notification service
// This would integrate with services like SendGrid, Mailgun, or Resend

interface EmailNotificationData {
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

export class EmailNotificationService {
  private apiKey: string;
  private fromEmail: string;

  constructor() {
    this.apiKey = process.env.EMAIL_API_KEY || '';
    this.fromEmail = process.env.FROM_EMAIL || 'noreply@boardmix.com';
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

  // Send email notification
  async sendNotificationEmail(data: NotificationEmailData): Promise<boolean> {
    try {
      const emailData: EmailNotificationData = {
        to: data.userEmail,
        subject: `Arc Board Management - ${data.title}`,
        html: this.generateEmailHTML(data),
        text: this.generateEmailText(data)
      };

      // Check if email service is configured
      if (!this.apiKey) {
        console.log('📧 Email service not configured. Email would be sent:', {
          to: emailData.to,
          subject: emailData.subject,
          preview: data.message.substring(0, 100) + '...'
        });
        return true; // Return true to not break the notification flow
      }

      // Send email using Resend
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.fromEmail,
          to: emailData.to,
          subject: emailData.subject,
          html: emailData.html,
          text: emailData.text,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Email sending failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        return false;
      }

      const result = await response.json();
      console.log('✅ Email sent successfully:', {
        to: emailData.to,
        subject: emailData.subject,
        id: result.id
      });

      return true;
    } catch (error) {
      console.error('Error sending email notification:', error);
      return false;
    }
  }

  // Send bulk email notifications
  async sendBulkNotificationEmails(notifications: NotificationEmailData[]): Promise<boolean> {
    try {
      const promises = notifications.map(notification => 
        this.sendNotificationEmail(notification)
      );
      
      const results = await Promise.all(promises);
      return results.every(result => result === true);
    } catch (error) {
      console.error('Error sending bulk email notifications:', error);
      return false;
    }
  }
}

// Helper function to create email notification data
export function createEmailNotificationData(
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