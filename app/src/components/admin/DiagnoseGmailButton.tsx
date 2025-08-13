'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

interface DiagnosisResult {
  status: string;
  diagnosis: {
    environment: {
      nodeEnv: string;
      isVercel: boolean;
      timestamp: string;
    };
    credentials: {
      gmailEmail: {
        exists: boolean;
        value: string;
        isValid: boolean;
      };
      gmailAppPassword: {
        exists: boolean;
        length: number;
        format: string;
        hasSpaces: boolean;
        preview: string;
      };
    };
    connectionTests: {
      basicConnection: { success: boolean; error: string | null };
      authTest: { success: boolean; error: string | null };
      sendTest: { success: boolean; error: string | null };
    };
    recommendations: string[];
  };
  summary: {
    configured: boolean;
    canConnect: boolean;
    canSendEmails: boolean;
    overallStatus: string;
  };
}

export function DiagnoseGmailButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const { toast } = useToast();

  const handleDiagnose = async () => {
    setIsLoading(true);
    setResult(null);
    
    try {
      const response = await fetch('/api/admin/diagnose-gmail', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
        toast({
          title: 'Gmail Diagnosis Complete ✅',
          description: `Status: ${data.summary.overallStatus}`,
        });
      } else {
        toast({
          title: 'Diagnosis Failed ❌',
          description: data.error || 'Gmail diagnosis failed',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error diagnosing Gmail:', error);
      toast({
        title: 'Network Error ❌',
        description: 'Failed to connect to diagnosis endpoint',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'WORKING':
        return <Badge className="bg-green-500">Working ✅</Badge>;
      case 'CONNECTED_BUT_CANNOT_SEND':
        return <Badge className="bg-yellow-500">Connected but Cannot Send ⚠️</Badge>;
      case 'NOT_WORKING':
        return <Badge className="bg-red-500">Not Working ❌</Badge>;
      default:
        return <Badge className="bg-gray-500">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Gmail SMTP Diagnosis</CardTitle>
          <CardDescription>
            Comprehensive diagnosis of Gmail SMTP configuration and connectivity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleDiagnose}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? 'Running Diagnosis...' : 'Run Gmail Diagnosis'}
          </Button>

          {result && (
            <div className="space-y-4 mt-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Diagnosis Results</h3>
                {getStatusBadge(result.summary.overallStatus)}
              </div>

              {/* Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Configuration Status</p>
                  <Badge variant={result.summary.configured ? 'default' : 'destructive'}>
                    {result.summary.configured ? 'Configured ✅' : 'Not Configured ❌'}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Connection Status</p>
                  <Badge variant={result.summary.canConnect ? 'default' : 'destructive'}>
                    {result.summary.canConnect ? 'Can Connect ✅' : 'Cannot Connect ❌'}
                  </Badge>
                </div>
              </div>

              {/* Credentials Check */}
              <div className="space-y-2">
                <h4 className="font-medium">Credentials Check</h4>
                <div className="bg-gray-50 p-3 rounded-lg space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Gmail Email:</span>
                    <span className={result.diagnosis.credentials.gmailEmail.exists ? 'text-green-600' : 'text-red-600'}>
                      {result.diagnosis.credentials.gmailEmail.exists ? '✅ Set' : '❌ Missing'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>App Password:</span>
                    <span className={result.diagnosis.credentials.gmailAppPassword.exists ? 'text-green-600' : 'text-red-600'}>
                      {result.diagnosis.credentials.gmailAppPassword.exists ? '✅ Set' : '❌ Missing'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Password Format:</span>
                    <span className={result.diagnosis.credentials.gmailAppPassword.format === 'CORRECT' ? 'text-green-600' : 'text-red-600'}>
                      {result.diagnosis.credentials.gmailAppPassword.format}
                    </span>
                  </div>
                </div>
              </div>

              {/* Connection Tests */}
              <div className="space-y-2">
                <h4 className="font-medium">Connection Tests</h4>
                <div className="bg-gray-50 p-3 rounded-lg space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Basic Connection:</span>
                    <span className={result.diagnosis.connectionTests.basicConnection.success ? 'text-green-600' : 'text-red-600'}>
                      {result.diagnosis.connectionTests.basicConnection.success ? '✅ Success' : '❌ Failed'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Authentication:</span>
                    <span className={result.diagnosis.connectionTests.authTest.success ? 'text-green-600' : 'text-red-600'}>
                      {result.diagnosis.connectionTests.authTest.success ? '✅ Success' : '❌ Failed'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Email Sending:</span>
                    <span className={result.diagnosis.connectionTests.sendTest.success ? 'text-green-600' : 'text-red-600'}>
                      {result.diagnosis.connectionTests.sendTest.success ? '✅ Success' : '❌ Failed'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Recommendations */}
              {result.diagnosis.recommendations.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Recommendations</h4>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <ul className="text-sm space-y-1">
                      {result.diagnosis.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start">
                          <span className="mr-2">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Error Details */}
              {(result.diagnosis.connectionTests.basicConnection.error || 
                result.diagnosis.connectionTests.authTest.error || 
                result.diagnosis.connectionTests.sendTest.error) && (
                <div className="space-y-2">
                  <h4 className="font-medium">Error Details</h4>
                  <div className="bg-red-50 p-3 rounded-lg text-sm space-y-2">
                    {result.diagnosis.connectionTests.basicConnection.error && (
                      <div>
                        <strong>Basic Connection:</strong> {result.diagnosis.connectionTests.basicConnection.error}
                      </div>
                    )}
                    {result.diagnosis.connectionTests.authTest.error && (
                      <div>
                        <strong>Authentication:</strong> {result.diagnosis.connectionTests.authTest.error}
                      </div>
                    )}
                    {result.diagnosis.connectionTests.sendTest.error && (
                      <div>
                        <strong>Email Sending:</strong> {result.diagnosis.connectionTests.sendTest.error}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}