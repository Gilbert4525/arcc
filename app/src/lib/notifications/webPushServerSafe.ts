// Safe server-side web push service that uses API calls to avoid client-side bundling issues

export interface WebPushNotificationData {
  title: string;
  message: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
  requireInteraction?: boolean;
}

// API-based web push service that avoids client-side bundling issues
export class SafeWebPushService {
  private isConfigured: boolean = false;

  constructor() {
    // Check if web push is configured
    this.checkConfiguration();
  }

  private checkConfiguration(): void {
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

    this.isConfigured = !!(vapidPublicKey && vapidPrivateKey && 
      vapidPublicKey !== 'placeholder-key' && vapidPrivateKey !== 'placeholder-key');
  }

  async sendNotification(
    subscription: PushSubscription,
    data: WebPushNotificationData
  ): Promise<boolean> {
    // Use bulk method for single notification
    const result = await this.sendBulkNotifications([subscription], data);
    return result.successful > 0;
  }

  async sendBulkNotifications(
    subscriptions: PushSubscription[],
    data: WebPushNotificationData
  ): Promise<{ successful: number; failed: number }> {
    if (!this.isConfigured || typeof window !== 'undefined') {
      return { successful: 0, failed: subscriptions.length };
    }

    try {
      // Get user IDs from subscriptions (we'll need to modify this approach)
      // For now, we'll call the API with the subscription data directly
      const response = await fetch('/api/notifications/send-push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.INTERNAL_API_KEY || 'internal-key'}`,
        },
        body: JSON.stringify({
          subscriptions,
          notificationData: data,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        return {
          successful: result.successful || 0,
          failed: result.failed || subscriptions.length,
        };
      } else {
        console.error('Failed to send web push notifications via API');
        return { successful: 0, failed: subscriptions.length };
      }
    } catch (error) {
      console.error('Error sending web push notifications:', error);
      return { successful: 0, failed: subscriptions.length };
    }
  }

  // Method to send notifications to specific user IDs
  async sendNotificationsToUsers(
    userIds: string[],
    data: WebPushNotificationData
  ): Promise<{ successful: number; failed: number }> {
    if (!this.isConfigured || typeof window !== 'undefined') {
      return { successful: 0, failed: userIds.length };
    }

    try {
      const response = await fetch('/api/notifications/send-push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.INTERNAL_API_KEY || 'internal-key'}`,
        },
        body: JSON.stringify({
          userIds,
          notificationData: data,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        return {
          successful: result.successful || 0,
          failed: result.failed || 0,
        };
      } else {
        console.error('Failed to send web push notifications via API');
        return { successful: 0, failed: userIds.length };
      }
    } catch (error) {
      console.error('Error sending web push notifications:', error);
      return { successful: 0, failed: userIds.length };
    }
  }

  isServiceConfigured(): boolean {
    return this.isConfigured && typeof window === 'undefined';
  }
}

// Create a safe instance that won't break on client side
let safeWebPushInstance: SafeWebPushService | null = null;

export function getSafeWebPushService(): SafeWebPushService {
  if (!safeWebPushInstance) {
    safeWebPushInstance = new SafeWebPushService();
  }
  return safeWebPushInstance;
}