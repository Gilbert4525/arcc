'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, BellOff } from 'lucide-react';
import { webPushService } from '@/lib/notifications/webPush';
import { useToast } from '@/hooks/use-toast';

interface NotificationPreferences {
  email_notifications: boolean;
  meeting_reminders: boolean;
  resolution_alerts: boolean;
  document_updates: boolean;
  system_alerts: boolean;
  email_frequency: 'immediate' | 'daily' | 'weekly' | 'never';
}

export function NotificationSettings() {
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email_notifications: true,
    meeting_reminders: true,
    resolution_alerts: true,
    document_updates: true,
    system_alerts: true,
    email_frequency: 'immediate',
  });
  const [webPushEnabled, setWebPushEnabled] = useState(false);
  const [webPushSupported, setWebPushSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load preferences on mount
  useEffect(() => {
    setIsHydrated(true);
    loadPreferences();
    checkWebPushStatus();
  }, []);

  const loadPreferences = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/notifications/preferences');
      if (response.ok) {
        const data = await response.json();
        if (data.preferences) {
          setPreferences(data.preferences);
        }
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to load notification preferences',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const savePreferences = async () => {
    try {
      setIsSaving(true);
      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Notification preferences saved',
        });
      } else {
        throw new Error('Failed to save preferences');
      }
    } catch (error) {
      console.error('Error saving notification preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to save notification preferences',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const checkWebPushStatus = () => {
    try {
      const supported = webPushService.isSupported();
      setWebPushSupported(supported);
      
      if (supported) {
        setWebPushEnabled(
          webPushService.getPermissionStatus() === 'granted' && 
          webPushService.isSubscribed()
        );
      }
    } catch (error) {
      console.error('Error checking web push status:', error);
      setWebPushSupported(false);
      setWebPushEnabled(false);
    }
  };

  const toggleWebPush = async () => {
    if (!webPushSupported) return;
    
    try {
      if (webPushEnabled) {
        // Disable web push
        const success = await webPushService.unsubscribe();
        if (success) {
          setWebPushEnabled(false);
          toast({
            title: 'Success',
            description: 'Web notifications disabled',
          });
        }
      } else {
        // Enable web push
        const initialized = await webPushService.initialize();
        if (initialized) {
          const subscription = await webPushService.subscribe();
          if (subscription) {
            setWebPushEnabled(true);
            toast({
              title: 'Success',
              description: 'Web notifications enabled',
            });
          }
        } else {
          toast({
            title: 'Error',
            description: 'Web notifications are not supported in this browser',
            variant: 'destructive',
          });
        }
      }
    } catch (error) {
      console.error('Error toggling web push:', error);
      toast({
        title: 'Error',
        description: 'Failed to update web notification settings',
        variant: 'destructive',
      });
    }
  };

  const updatePreference = (key: keyof NotificationPreferences, value: boolean | string) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Notification Settings</CardTitle>
          <CardDescription>Loading preferences...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Web Push Notifications - Only render after hydration */}
      {isHydrated && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Web Notifications
            </CardTitle>
            <CardDescription>
              Receive instant notifications in your browser
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="web-push">Browser Notifications</Label>
                <p className="text-sm text-gray-500">
                  Get notified instantly when something important happens
                </p>
              </div>
              <Switch
                id="web-push"
                checked={webPushEnabled}
                onCheckedChange={toggleWebPush}
                disabled={!webPushSupported}
              />
            </div>
            {!webPushSupported && (
              <p className="text-sm text-yellow-600 mt-2">
                Web notifications are not supported in this browser
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Email Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Email Notifications</CardTitle>
          <CardDescription>
            Configure when and how you receive email notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="email-notifications">Email Notifications</Label>
              <p className="text-sm text-gray-500">
                Receive notifications via email
              </p>
            </div>
            <Switch
              id="email-notifications"
              checked={preferences.email_notifications}
              onCheckedChange={(checked) => updatePreference('email_notifications', checked)}
            />
          </div>

          {preferences.email_notifications && (
            <div>
              <Label htmlFor="email-frequency">Email Frequency</Label>
              <Select
                value={preferences.email_frequency}
                onValueChange={(value) => updatePreference('email_frequency', value)}
              >
                <SelectTrigger className="w-full mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Immediate</SelectItem>
                  <SelectItem value="daily">Daily Digest</SelectItem>
                  <SelectItem value="weekly">Weekly Digest</SelectItem>
                  <SelectItem value="never">Never</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Types */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Types</CardTitle>
          <CardDescription>
            Choose which types of notifications you want to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="meeting-reminders">Meeting Reminders</Label>
              <p className="text-sm text-gray-500">
                Get notified about upcoming meetings
              </p>
            </div>
            <Switch
              id="meeting-reminders"
              checked={preferences.meeting_reminders}
              onCheckedChange={(checked) => updatePreference('meeting_reminders', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="resolution-alerts">Resolution Alerts</Label>
              <p className="text-sm text-gray-500">
                Get notified about new resolutions and voting
              </p>
            </div>
            <Switch
              id="resolution-alerts"
              checked={preferences.resolution_alerts}
              onCheckedChange={(checked) => updatePreference('resolution_alerts', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="document-updates">Document Updates</Label>
              <p className="text-sm text-gray-500">
                Get notified when new documents are published
              </p>
            </div>
            <Switch
              id="document-updates"
              checked={preferences.document_updates}
              onCheckedChange={(checked) => updatePreference('document_updates', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="system-alerts">System Alerts</Label>
              <p className="text-sm text-gray-500">
                Get notified about system updates and maintenance
              </p>
            </div>
            <Switch
              id="system-alerts"
              checked={preferences.system_alerts}
              onCheckedChange={(checked) => updatePreference('system_alerts', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={savePreferences} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
    </div>
  );
}