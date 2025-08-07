'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Mail, Users, Settings, Bell } from 'lucide-react';

export default function TestNotificationDebugButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [debugResult, setDebugResult] = useState<any>(null);

  const handleDebugTest = async () => {
    setIsLoading(true);
    setDebugResult(null);

    try {
      const response = await fetch('/api/admin/test-notification-debug', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      setDebugResult(result);
    } catch (error) {
      console.error('Debug test failed:', error);
      setDebugResult({
        success: false,
        error: 'Failed to run debug test',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderDebugInfo = (debugInfo: any) => {
    if (!debugInfo?.debug?.checks) return null;

    const { checks } = debugInfo.debug;

    return (
      <div className="space-y-4">
        {/* Users Check */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4" />
              Users ({checks.users?.count || 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {checks.users?.error ? (
              <Badge variant="destructive">Error: {checks.users.error}</Badge>
            ) : (
              <div className="space-y-1">
                {checks.users?.users?.map((user: any) => (
                  <div key={user.id} className="text-xs flex justify-between">
                    <span>{user.email}</span>
                    <Badge variant="outline" className="text-xs">{user.role}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Preferences Check */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Settings className="h-4 w-4" />
              Notification Preferences ({checks.preferences?.count || 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {checks.preferences?.error ? (
              <Badge variant="destructive">Error: {checks.preferences.error}</Badge>
            ) : (
              <div className="space-y-1">
                {checks.preferences?.preferences?.map((pref: any) => (
                  <div key={pref.user_id} className="text-xs flex justify-between">
                    <span>User {pref.user_id.slice(0, 8)}...</span>
                    <div className="flex gap-1">
                      <Badge variant={pref.email_notifications ? "default" : "secondary"} className="text-xs">
                        Email: {pref.email_notifications ? 'On' : 'Off'}
                      </Badge>
                      <Badge variant={pref.resolution_alerts ? "default" : "secondary"} className="text-xs">
                        Resolutions: {pref.resolution_alerts ? 'On' : 'Off'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Environment Check */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4" />
              Email Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>Email API Key:</span>
                <Badge variant={checks.environment?.emailApiKey ? "default" : "destructive"}>
                  {checks.environment?.emailApiKey ? 'Configured' : 'Missing'}
                </Badge>
              </div>
              <div className="flex justify-between text-xs">
                <span>From Email:</span>
                <span className="text-muted-foreground">{checks.environment?.fromEmail || 'Not set'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>VAPID Keys:</span>
                <Badge variant={checks.environment?.vapidConfigured ? "default" : "secondary"}>
                  {checks.environment?.vapidConfigured ? 'Configured' : 'Not configured'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Notifications */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Bell className="h-4 w-4" />
              Recent Notifications ({checks.recentNotifications?.count || 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {checks.recentNotifications?.notifications?.length > 0 ? (
              <div className="space-y-1">
                {checks.recentNotifications.notifications.map((notif: any) => (
                  <div key={notif.id} className="text-xs border-l-2 border-blue-200 pl-2">
                    <div className="font-medium">{notif.title}</div>
                    <div className="text-muted-foreground">{notif.message}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(notif.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No recent notifications</p>
            )}
          </CardContent>
        </Card>

        {/* Test Notification Result */}
        {checks.testNotificationSent && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                {checks.testNotificationSent.success ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                )}
                Test Notification
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {checks.testNotificationSent.success ? (
                <div className="text-xs text-green-600">
                  ✅ Test notification sent to {checks.testNotificationSent.recipientCount} recipients
                </div>
              ) : (
                <div className="text-xs text-red-600">
                  ❌ Failed: {checks.testNotificationSent.error || checks.testNotificationSent.reason}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Users Without Preferences */}
        {checks.usersWithoutPreferences && checks.usersWithoutPreferences.count > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                Users Without Preferences ({checks.usersWithoutPreferences.count})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-1">
                {checks.usersWithoutPreferences.users?.map((user: any) => (
                  <div key={user.id} className="text-xs">
                    {user.email}
                  </div>
                ))}
              </div>
              {checks.createdDefaultPreferences && (
                <div className="mt-2 text-xs">
                  {checks.createdDefaultPreferences.created ? (
                    <Badge variant="default">✅ Default preferences created</Badge>
                  ) : (
                    <Badge variant="destructive">❌ Failed to create preferences</Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Debug Notification System
        </CardTitle>
        <CardDescription>
          Test and debug the email notification system to identify issues
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={handleDebugTest} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? 'Running Debug...' : 'Run Notification Debug Test'}
        </Button>

        {debugResult && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {debugResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}
              <span className="font-medium">
                {debugResult.success ? 'Debug Completed' : 'Debug Failed'}
              </span>
            </div>

            {debugResult.success && renderDebugInfo(debugResult)}

            {!debugResult.success && (
              <div className="text-sm text-red-600">
                Error: {debugResult.error}
                {debugResult.details && (
                  <div className="text-xs mt-1 text-muted-foreground">
                    Details: {debugResult.details}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}