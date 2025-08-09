'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Mail, Settings, Loader2 } from 'lucide-react';

interface ValidationResult {
  status: string;
  environment: {
    GMAIL_EMAIL: { exists: boolean; value: string };
    GMAIL_APP_PASSWORD: { exists: boolean; value: string };
    NODE_ENV: string;
  };
  gmailService: {
    canLoad: boolean;
    canInitialize: boolean;
    canConnect: boolean;
    error: string | null;
  };
  notificationService: {
    canLoadService: boolean;
    canLoadHelpers: boolean;
    error: string | null;
  };
  overall: {
    isConfigured: boolean;
    canSendEmails: boolean;
    environment: string;
    timestamp: string;
  };
  recommendations: string[];
}

export function ValidateEmailConfigButton() {
  const [isValidating, setIsValidating] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validateEmailConfig = async () => {
    setIsValidating(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/admin/validate-email-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Validation failed');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsValidating(false);
    }
  };

  const getStatusIcon = (status: boolean) => {
    return status ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <AlertCircle className="h-4 w-4 text-red-500" />
    );
  };

  const getStatusBadge = (status: boolean, label: string) => {
    return (
      <Badge variant={status ? "default" : "destructive"} className="ml-2">
        {status ? "✓" : "✗"} {label}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Email Configuration Validator
          </CardTitle>
          <CardDescription>
            Validate Gmail SMTP configuration and test email system functionality in production
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={validateEmailConfig} 
            disabled={isValidating}
            className="w-full"
          >
            {isValidating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Validating Email Configuration...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Validate Email Configuration
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Validation Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {result && (
        <div className="space-y-4">
          {/* Overall Status */}
          <Card className={result.overall.canSendEmails ? "border-green-200" : "border-red-200"}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getStatusIcon(result.overall.canSendEmails)}
                Overall Email System Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-medium">Configuration Status:</p>
                  {getStatusBadge(result.overall.isConfigured, "Configured")}
                </div>
                <div>
                  <p className="font-medium">Email Sending:</p>
                  {getStatusBadge(result.overall.canSendEmails, "Operational")}
                </div>
                <div>
                  <p className="font-medium">Environment:</p>
                  <Badge variant="outline">{result.overall.environment}</Badge>
                </div>
                <div>
                  <p className="font-medium">Last Check:</p>
                  <p className="text-sm text-gray-600">
                    {new Date(result.overall.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Environment Variables */}
          <Card>
            <CardHeader>
              <CardTitle>Environment Variables</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span>GMAIL_EMAIL:</span>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(result.environment.GMAIL_EMAIL.exists)}
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                      {result.environment.GMAIL_EMAIL.value}
                    </code>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span>GMAIL_APP_PASSWORD:</span>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(result.environment.GMAIL_APP_PASSWORD.exists)}
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                      {result.environment.GMAIL_APP_PASSWORD.value}
                    </code>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Gmail Service Status */}
          <Card>
            <CardHeader>
              <CardTitle>Gmail SMTP Service</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span>Can Load Service:</span>
                  {getStatusBadge(result.gmailService.canLoad, "Load")}
                </div>
                <div className="flex items-center justify-between">
                  <span>Can Initialize:</span>
                  {getStatusBadge(result.gmailService.canInitialize, "Initialize")}
                </div>
                <div className="flex items-center justify-between">
                  <span>Can Connect:</span>
                  {getStatusBadge(result.gmailService.canConnect, "Connect")}
                </div>
                {result.gmailService.error && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                    <p className="text-red-600 text-sm font-medium">Error:</p>
                    <p className="text-red-600 text-sm">{result.gmailService.error}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Notification Service Status */}
          <Card>
            <CardHeader>
              <CardTitle>Notification Service</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span>Can Load Email Service:</span>
                  {getStatusBadge(result.notificationService.canLoadService, "Service")}
                </div>
                <div className="flex items-center justify-between">
                  <span>Can Load Email Helpers:</span>
                  {getStatusBadge(result.notificationService.canLoadHelpers, "Helpers")}
                </div>
                {result.notificationService.error && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                    <p className="text-red-600 text-sm font-medium">Error:</p>
                    <p className="text-red-600 text-sm">{result.notificationService.error}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle>Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {result.recommendations.map((recommendation, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-blue-500 mt-1">•</span>
                    <span className="text-sm">{recommendation}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}