'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertCircle, 
  CheckCircle, 
  Loader2,
  Bug
} from 'lucide-react';

interface DebugResult {
  success: boolean;
  message: string;
  environment: {
    emailApiKey: boolean;
    fromEmail: string;
    configured: boolean;
  };
  database: {
    profilesAccessible: boolean;
    notificationsAccessible: boolean;
    userCount: number;
  };
  testEmail: {
    success: boolean;
    message: string;
    recipientCount?: number;
  };
}

export default function TestNotificationDebugButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<DebugResult | null>(null);

  const handleDebugTest = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/admin/test-notification-debug', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Debug test failed:', error);
      setResult({
        success: false,
        message: 'Failed to run debug test',
        environment: { emailApiKey: false, fromEmail: '', configured: false },
        database: { profilesAccessible: false, notificationsAccessible: false, userCount: 0 },
        testEmail: { success: false, message: 'Network error' }
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bug className="h-5 w-5" />
          Debug Notification System
        </CardTitle>
        <CardDescription>
          Comprehensive debugging tool to identify notification system issues
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This debug tool will check:
            <ul className="list-disc list-inside mt-2 text-sm space-y-1">
              <li>Environment variables configuration</li>
              <li>Database table accessibility</li>
              <li>User data availability</li>
              <li>Email sending functionality</li>
            </ul>
          </AlertDescription>
        </Alert>

        <Button 
          onClick={handleDebugTest} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Running Debug Test...
            </>
          ) : (
            <>
              <Bug className="mr-2 h-4 w-4" />
              Run Debug Test
            </>
          )}
        </Button>

        {result && (
          <div className="space-y-4">
            {/* Summary */}
            <Alert className={result.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
              {result.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription className={result.success ? "text-green-800" : "text-red-800"}>
                <div className="font-medium">{result.message}</div>
              </AlertDescription>
            </Alert>

            {/* Environment Check */}
            {result.environment && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Environment Configuration</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Email API Key:</span>
                      <span className={result.environment.emailApiKey ? 'text-green-600' : 'text-red-600'}>
                        {result.environment.emailApiKey ? '✅ Set' : '❌ Missing'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>From Email:</span>
                      <span className="text-muted-foreground">
                        {result.environment.fromEmail || 'Not set'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Overall Config:</span>
                      <span className={result.environment.configured ? 'text-green-600' : 'text-red-600'}>
                        {result.environment.configured ? '✅ Valid' : '❌ Invalid'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Database Check */}
            {result.database && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Database Status</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Profiles Table:</span>
                      <span className={result.database.profilesAccessible ? 'text-green-600' : 'text-red-600'}>
                        {result.database.profilesAccessible ? '✅ Accessible' : '❌ Error'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Notifications Table:</span>
                      <span className={result.database.notificationsAccessible ? 'text-green-600' : 'text-red-600'}>
                        {result.database.notificationsAccessible ? '✅ Accessible' : '❌ Error'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>User Count:</span>
                      <span className="text-muted-foreground">
                        {result.database.userCount} users
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Test Email Results */}
            {result.testEmail && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Test Email Results</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-sm">
                    {result.testEmail.success ? (
                      <div className="text-green-600 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        {result.testEmail.message}
                        {result.testEmail.recipientCount && (
                          <span className="ml-2">({result.testEmail.recipientCount} recipients)</span>
                        )}
                      </div>
                    ) : (
                      <div className="text-red-600 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        {result.testEmail.message}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}