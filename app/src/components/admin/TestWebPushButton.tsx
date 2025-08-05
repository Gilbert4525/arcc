'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, BellRing, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { webPushService } from '@/lib/notifications/webPush';

export function TestWebPushButton() {
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
    const [isSubscribed, setIsSubscribed] = useState(false);

    const handleTestWebPush = async () => {
        setIsLoading(true);
        setResult(null);

        try {
            console.log('Starting web push test...');
            console.log('Environment check:');
            console.log('- NEXT_PUBLIC_VAPID_PUBLIC_KEY:', !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
            console.log('- NEXT_PUBLIC_SUPABASE_URL:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
            
            // Check if web push is supported
            if (!webPushService.isSupported()) {
                setResult({ success: false, message: 'Web push notifications are not supported in this browser' });
                return;
            }
            console.log('Web push is supported');

            // Check current environment
            const isHTTPS = window.location.protocol === 'https:';
            const isLocalhost = window.location.hostname === 'localhost';
            console.log('Environment check - HTTPS:', isHTTPS, 'Localhost:', isLocalhost);
            
            if (!isHTTPS && !isLocalhost) {
                setResult({ 
                    success: false, 
                    message: 'Web push notifications require HTTPS or localhost. Current protocol: ' + window.location.protocol 
                });
                return;
            }

            // Initialize the service
            console.log('Initializing web push service...');
            const initialized = await webPushService.initialize();
            if (!initialized) {
                setResult({ success: false, message: 'Failed to initialize web push service' });
                return;
            }
            console.log('Web push service initialized');

            // Subscribe to notifications
            let subscription;
            try {
                subscription = await webPushService.subscribe();
                if (!subscription) {
                    setResult({ success: false, message: 'Failed to subscribe to web push notifications' });
                    return;
                }
            } catch (subscribeError: any) {
                console.error('Subscription error:', subscribeError);
                setResult({ 
                    success: false, 
                    message: `Subscription failed: ${subscribeError.message || 'Unknown error'}` 
                });
                return;
            }

            setIsSubscribed(true);

            // Show a local test notification
            await webPushService.showLocalNotification('Arc Board Management - Test', {
                body: 'Web push notifications are working correctly!',
                icon: '/icon-192x192.png',
                badge: '/badge-72x72.png',
                tag: 'test-notification'
            });

            setResult({ success: true, message: 'Web push notification test successful! Check your browser notifications.' });
        } catch (error) {
            console.error('Error testing web push:', error);
            setResult({ success: false, message: 'Error occurred while testing web push notifications' });
        } finally {
            setIsLoading(false);
        }
    };

    const getPermissionStatus = () => {
        const status = webPushService.getPermissionStatus();
        switch (status) {
            case 'granted':
                return { text: 'Granted', color: 'text-green-600' };
            case 'denied':
                return { text: 'Denied', color: 'text-red-600' };
            default:
                return { text: 'Not requested', color: 'text-yellow-600' };
        }
    };

    const permission = getPermissionStatus();

    return (
        <Card className="w-full max-w-md">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Test Web Push
                </CardTitle>
                <CardDescription>
                    Test browser push notifications
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                        <span>Browser Support:</span>
                        <span className={webPushService.isSupported() ? 'text-green-600' : 'text-red-600'}>
                            {webPushService.isSupported() ? 'Supported' : 'Not Supported'}
                        </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                        <span>Permission:</span>
                        <span className={permission.color}>{permission.text}</span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                        <span>Subscribed:</span>
                        <span className={isSubscribed ? 'text-green-600' : 'text-gray-600'}>
                            {isSubscribed ? 'Yes' : 'No'}
                        </span>
                    </div>
                </div>

                <Button
                    onClick={handleTestWebPush}
                    disabled={isLoading || !webPushService.isSupported()}
                    className="w-full"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Testing...
                        </>
                    ) : (
                        <>
                            <BellRing className="mr-2 h-4 w-4" />
                            Test Web Push
                        </>
                    )}
                </Button>

                {result && (
                    <div className={`flex items-center gap-2 p-3 rounded-md ${result.success
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                        {result.success ? (
                            <CheckCircle className="h-4 w-4" />
                        ) : (
                            <XCircle className="h-4 w-4" />
                        )}
                        <span className="text-sm">{result.message}</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}