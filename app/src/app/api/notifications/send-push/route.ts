import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// Define PushSubscription type for web push
interface PushSubscription {
  endpoint: string;
  keys?: {
    p256dh: string;
    auth: string;
  };
}

// POST /api/notifications/send-push - Send web push notification (internal API)
export async function POST(request: NextRequest) {
  try {
    // This is an internal API, so we'll add a simple security check
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.INTERNAL_API_KEY || 'internal-key'}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userIds, notificationData } = body;

    if (!userIds || !notificationData) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    // Get users' push subscriptions
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, push_subscription')
      .in('id', userIds)
      .not('push_subscription', 'is', null);

    if (error || !profiles || profiles.length === 0) {
      return NextResponse.json({ 
        message: 'No users with push subscriptions found',
        successful: 0,
        failed: 0 
      });
    }

    // Check if web push is configured
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    
    if (!vapidPublicKey || !vapidPrivateKey || 
        vapidPublicKey === 'placeholder-key' || vapidPrivateKey === 'placeholder-key') {
      return NextResponse.json({ 
        message: 'Web push not configured',
        successful: 0,
        failed: profiles.length 
      });
    }

    // Dynamic import of web-push (server-side only)
    let webpush;
    try {
      webpush = await import('web-push');
      const webpushModule = webpush.default || webpush;
      
      const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@arcboard.com';
      webpushModule.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
      
      const payload = JSON.stringify({
        title: notificationData.title,
        body: notificationData.message,
        icon: notificationData.icon || '/icon-192x192.png',
        badge: notificationData.badge || '/badge-72x72.png',
        url: notificationData.url,
        tag: notificationData.tag,
        requireInteraction: notificationData.requireInteraction || false,
        timestamp: Date.now(),
      });

      const options = {
        TTL: 24 * 60 * 60, // 24 hours
        urgency: 'normal' as const,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      let successful = 0;
      let failed = 0;

      // Send notifications in batches
      const batchSize = 10;
      const subscriptions = profiles
        .filter(profile => (profile as any).push_subscription)
        .map(profile => (profile as any).push_subscription as PushSubscription);

      for (let i = 0; i < subscriptions.length; i += batchSize) {
        const batch = subscriptions.slice(i, i + batchSize);
        
        const promises = batch.map(async (subscription) => {
          try {
            // Convert to web-push compatible format
            const webPushSubscription = {
              endpoint: subscription.endpoint,
              keys: {
                p256dh: subscription.keys?.p256dh || '',
                auth: subscription.keys?.auth || ''
              }
            };
            await webpushModule.sendNotification(webPushSubscription, payload, options);
            return true;
          } catch (error: any) {
            console.error('Failed to send web push notification:', error);
            return false;
          }
        });

        const results = await Promise.allSettled(promises);
        
        results.forEach((result) => {
          if (result.status === 'fulfilled' && result.value) {
            successful++;
          } else {
            failed++;
          }
        });

        // Small delay between batches
        if (i + batchSize < subscriptions.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      return NextResponse.json({ 
        message: 'Web push notifications sent',
        successful,
        failed 
      });

    } catch (importError) {
      console.error('Failed to import web-push:', importError);
      return NextResponse.json({ 
        message: 'Web push module not available',
        successful: 0,
        failed: profiles.length 
      });
    }

  } catch (error) {
    console.error('Error in POST /api/notifications/send-push:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}