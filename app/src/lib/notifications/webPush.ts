// Web Push Notification Service
export class WebPushService {
  private static instance: WebPushService;
  private registration: ServiceWorkerRegistration | null = null;
  private subscription: PushSubscription | null = null;

  private constructor() {}

  static getInstance(): WebPushService {
    if (!WebPushService.instance) {
      WebPushService.instance = new WebPushService();
    }
    return WebPushService.instance;
  }

  // Initialize service worker and request notification permission
  async initialize(): Promise<boolean> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push messaging is not supported');
      return false;
    }

    try {
      // Register service worker
      console.log('Registering service worker...');
      this.registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', this.registration);
      
      // Wait for the service worker to be active
      if (this.registration.installing) {
        console.log('Service worker installing...');
        await new Promise((resolve) => {
          this.registration!.installing!.addEventListener('statechange', (e) => {
            if ((e.target as ServiceWorker).state === 'activated') {
              resolve(void 0);
            }
          });
        });
      }

      // Request notification permission
      const permission = await this.requestPermission();
      if (permission !== 'granted') {
        console.warn('Notification permission not granted');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error initializing web push service:', error);
      return false;
    }
  }

  // Request notification permission
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission;
    }

    return Notification.permission;
  }

  // Subscribe to push notifications
  async subscribe(): Promise<PushSubscription | null> {
    try {
      console.log('Starting web push subscription process...');
      
      // Wait for service worker to be ready
      const registration = await navigator.serviceWorker.ready;
      this.registration = registration;
      console.log('Service worker ready:', registration);

      // Check if already subscribed
      this.subscription = await this.registration.pushManager.getSubscription();
      
      if (this.subscription) {
        console.log('Already subscribed to push notifications');
        return this.subscription;
      }
      
      // Create new subscription
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      console.log('VAPID public key available:', !!vapidPublicKey);
      
      if (!vapidPublicKey || vapidPublicKey === 'placeholder-key') {
        console.warn('VAPID public key not configured. Web push notifications will not work.');
        throw new Error('VAPID public key not configured');
      }
      
      console.log('Creating new push subscription...');
      this.subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey),
      });
      
      console.log('Push subscription created:', this.subscription);

      // Send subscription to server
      await this.sendSubscriptionToServer(this.subscription);
      console.log('Subscription sent to server successfully');

      return this.subscription;
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      throw error; // Re-throw to let the caller handle it
    }
  }

  // Unsubscribe from push notifications
  async unsubscribe(): Promise<boolean> {
    if (!this.subscription) {
      return true;
    }

    try {
      await this.subscription.unsubscribe();
      await this.removeSubscriptionFromServer();
      this.subscription = null;
      return true;
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      return false;
    }
  }

  // Send subscription to server
  private async sendSubscriptionToServer(subscription: PushSubscription): Promise<void> {
    try {
      console.log('Sending subscription to server...');
      const subscriptionData = subscription.toJSON();
      console.log('Subscription data:', subscriptionData);
      
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: subscriptionData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Server response error:', response.status, errorData);
        throw new Error(`Failed to send subscription to server: ${response.status} ${errorData}`);
      }
      
      const result = await response.json();
      console.log('Server response:', result);
    } catch (error) {
      console.error('Error sending subscription to server:', error);
      throw error;
    }
  }

  // Remove subscription from server
  private async removeSubscriptionFromServer(): Promise<void> {
    try {
      const response = await fetch('/api/notifications/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to remove subscription from server');
      }
    } catch (error) {
      console.error('Error removing subscription from server:', error);
      throw error;
    }
  }

  // Show local notification (fallback)
  async showLocalNotification(title: string, options: NotificationOptions = {}): Promise<void> {
    const permission = await this.requestPermission();
    
    if (permission === 'granted') {
      new Notification(title, {
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        ...options,
      });
    }
  }

  // Utility function to convert VAPID key
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Check if notifications are supported and enabled
  isSupported(): boolean {
    // Return false during server-side rendering
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return false;
    }
    
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  }

  // Get current permission status
  getPermissionStatus(): NotificationPermission {
    // Return 'default' during server-side rendering
    if (typeof window === 'undefined' || typeof Notification === 'undefined') {
      return 'default';
    }
    
    return Notification.permission;
  }

  // Get current subscription status
  isSubscribed(): boolean {
    // Return false during server-side rendering
    if (typeof window === 'undefined') {
      return false;
    }
    
    return this.subscription !== null;
  }
}

// Export singleton instance
export const webPushService = WebPushService.getInstance();