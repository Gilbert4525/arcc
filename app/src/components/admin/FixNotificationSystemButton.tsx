'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertCircle, 
  CheckCircle, 
  Mail, 
  Users, 
  Settings, 
  Wrench,
  Loader2,
  RefreshCw
} from 'lucide-react';

interface FixResult {
  success: boolean;
  message: string;
  results: {
    validation: {
      isValid: boolean;
      issues: string[];
      recommendations: string[];
    };
    setup: {
      success: boolean;
      created: number;
      errors: string[];
    };
    test: {
      success: boolean;
      steps: Array<{ step: string; success: boolean; message: string }>;
    };
    testNotification: {
      success: boolean;
      recipientCount?: number;
      message: string;
    };
  };
  summary: {
    systemValid: boolean;
    preferencesCreated: number;
    testPassed: boolean;
    emailsSent: boolean;
  };
}

export default function FixNotificationSystemButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<FixResult | null>(null);

  const handleFixNotifications = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/admin/fix-notification-preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Fix failed:', error);
      setResult({
        success: false,
        message: 'Failed to fix notification system',
        results: {} as any,
        summary: {} as any
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderValidationResults = (validation: FixResult['results']['validation']) => (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Settings className="h-4 w-4" />
          System Validation
          <Badge variant={validation.isValid ? "default" : "destructive"}>
            {validation.isValid ? 'Valid' : 'Issues Found'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {validation.issues.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-red-600">Issues:</p>
            {validation.issues.map((issue, index) => (
              <div key={index} className="text-xs text-red-600 flex items-start gap-2">
                <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                {issue}
              </div>
            ))}
          </div>
        )}
        {validation.recommendations.length > 0 && (
          <div className="space-y-2 mt-3">
            <p className="text-sm font-medium text-blue-600">Recommendations:</p>
            {validation.recommendations.map((rec, index) => (
              <div key={index} className="text-xs text-blue-600 flex items-start gap-2">
                <CheckCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                {rec}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderSetupResults = (setup: FixResult['results']['setup']) => (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Users className="h-4 w-4" />
          Notification Preferences Setup
          <Badge variant={setup.success ? "default" : "destructive"}>
            {setup.success ? 'Success' : 'Failed'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {setup.created > 0 && (
          <div className="text-sm text-green-600 flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Created preferences for {setup.created} users
          </div>
        )}
        {setup.created === 0 && setup.success && (
          <div className="text-sm text-blue-600 flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            All users already have notification preferences
          </div>
        )}
        {setup.errors.length > 0 && (
          <div className="space-y-1 mt-2">
            {setup.errors.map((error, index) => (
              <div key={index} className="text-xs text-red-600 flex items-start gap-2">
                <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                {error}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderTestResults = (test: FixResult['results']['test']) => (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <RefreshCw className="h-4 w-4" />
          System Test
          <Badge variant={test.success ? "default" : "destructive"}>
            {test.success ? 'Passed' : 'Failed'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {test.steps.map((step, index) => (
            <div key={index} className="flex items-center gap-2 text-xs">
              {step.success ? (
                <CheckCircle className="h-3 w-3 text-green-500" />
              ) : (
                <AlertCircle className="h-3 w-3 text-red-500" />
              )}
              <span className="font-medium">{step.step}:</span>
              <span className={step.success ? 'text-green-600' : 'text-red-600'}>
                {step.message}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const renderTestNotificationResults = (testNotif: FixResult['results']['testNotification']) => (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Mail className="h-4 w-4" />
          Test Email Notification
          <Badge variant={testNotif.success ? "default" : "destructive"}>
            {testNotif.success ? 'Sent' : 'Failed'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-xs">
          {testNotif.success ? (
            <div className="text-green-600 flex items-center gap-2">
              <CheckCircle className="h-3 w-3" />
              {testNotif.message}
              {testNotif.recipientCount && (
                <span className="ml-2">({testNotif.recipientCount} recipients)</span>
              )}
            </div>
          ) : (
            <div className="text-red-600 flex items-center gap-2">
              <AlertCircle className="h-3 w-3" />
              {testNotif.message}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          Fix Email Notification System
        </CardTitle>
        <CardDescription>
          Diagnose and fix issues preventing email notifications from being sent when resolutions and minutes are created
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This will check and fix common issues that prevent email notifications from working:
            <ul className="list-disc list-inside mt-2 text-sm space-y-1">
              <li>Missing notification preferences for users</li>
              <li>Email service configuration issues</li>
              <li>Database table setup problems</li>
            </ul>
          </AlertDescription>
        </Alert>

        <Button 
          onClick={handleFixNotifications} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Fixing Notification System...
            </>
          ) : (
            <>
              <Wrench className="mr-2 h-4 w-4" />
              Fix Email Notifications
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
                {result.success && result.summary && (
                  <div className="mt-2 text-sm space-y-1">
                    <div>✅ System Valid: {result.summary.systemValid ? 'Yes' : 'No'}</div>
                    <div>✅ Preferences Created: {result.summary.preferencesCreated}</div>
                    <div>✅ Test Passed: {result.summary.testPassed ? 'Yes' : 'No'}</div>
                    <div>✅ Test Emails Sent: {result.summary.emailsSent ? 'Yes' : 'No'}</div>
                  </div>
                )}
              </AlertDescription>
            </Alert>

            {/* Detailed Results */}
            {result.results && (
              <>
                {renderValidationResults(result.results.validation)}
                {renderSetupResults(result.results.setup)}
                {renderTestResults(result.results.test)}
                {renderTestNotificationResults(result.results.testNotification)}
              </>
            )}

            {result.success && (
              <Alert className="border-blue-200 bg-blue-50">
                <Mail className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <div className="font-medium">Next Steps:</div>
                  <div className="mt-1 text-sm">
                    1. Check your email inbox for the test notification<br/>
                    2. Try creating a new resolution or minute to test the fix<br/>
                    3. Board members should now receive email notifications
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}