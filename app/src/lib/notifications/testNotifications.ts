// Test notification utilities for development
import { createClient } from '@/lib/supabase/client';
import { getDatabaseServices } from '@/lib/database';

export async function createTestNotification(userId: string) {
  const supabase = createClient();
  const { notifications: notificationsService } = getDatabaseServices(supabase);

  const testNotifications = [
    {
      title: 'New Meeting Scheduled',
      message: 'Board meeting scheduled for tomorrow at 2:00 PM',
      type: 'meeting' as const,
      priority: 'normal' as const,
      action_url: '/dashboard/meetings',
      action_text: 'View Meeting',
    },
    {
      title: 'Document Published',
      message: 'New financial report has been published',
      type: 'document' as const,
      priority: 'normal' as const,
      action_url: '/dashboard/documents',
      action_text: 'View Document',
    },
    {
      title: 'Resolution Voting Open',
      message: 'Voting is now open for Resolution #2024-001',
      type: 'resolution' as const,
      priority: 'high' as const,
      action_url: '/dashboard/resolutions',
      action_text: 'Vote Now',
    },
    {
      title: 'System Maintenance',
      message: 'Scheduled maintenance tonight from 11 PM to 1 AM',
      type: 'system' as const,
      priority: 'low' as const,
    },
    {
      title: 'Urgent: Board Meeting',
      message: 'Emergency board meeting called for this afternoon',
      type: 'meeting' as const,
      priority: 'urgent' as const,
      action_url: '/dashboard/meetings',
      action_text: 'Join Meeting',
    },
  ];

  const randomNotification = testNotifications[Math.floor(Math.random() * testNotifications.length)];

  try {
    const notification = await notificationsService.createNotification({
      user_id: userId,
      ...randomNotification,
    });

    console.log('Test notification created:', notification);
    return notification;
  } catch (error) {
    console.error('Error creating test notification:', error);
    throw error;
  }
}

export async function createBulkTestNotifications(userIds: string[], count: number = 5) {
  const promises = [];
  
  for (let i = 0; i < count; i++) {
    const randomUserId = userIds[Math.floor(Math.random() * userIds.length)];
    promises.push(createTestNotification(randomUserId));
  }

  try {
    const results = await Promise.all(promises);
    console.log(`Created ${results.length} test notifications`);
    return results;
  } catch (error) {
    console.error('Error creating bulk test notifications:', error);
    throw error;
  }
}

// Function to test web push notifications
export async function testWebPushNotification() {
  if ('serviceWorker' in navigator && 'PushManager' in window) {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Create a test notification
      await registration.showNotification('Test Notification', {
        body: 'This is a test web push notification',
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        // vibrate: [100, 50, 100], // Removed - not supported in all browsers
        data: {
          url: '/dashboard',
        },
        // actions: [ // Removed - not supported in all browsers
        //   {
        //     action: 'open',
        //     title: 'Open Dashboard',
        //   },
        //   {
        //     action: 'close',
        //     title: 'Close',
        //   },
        // ],
      });
      
      console.log('Test web push notification sent');
    } catch (error) {
      console.error('Error sending test web push notification:', error);
    }
  } else {
    console.warn('Web push notifications not supported');
  }
}