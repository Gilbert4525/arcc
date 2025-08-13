'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Mail, CheckCircle, XCircle } from 'lucide-react';

interface TestResult {
  success: boolean;
  message?: string;
  error?: string;
  details?: {
    messageId: string;
    timestamp: string;
    settings: {
      host: string;
      port: number;
      encryption: string;
      username: string;
    };
  };
  recommendations?: string[];
  settings?: {
    host: string;
    port: number;
    encryption: string;
    username: string;
    hasPassword: boolean;
  };
  timestamp: string;
}

export function QuickGmailTestButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const { toast } = useToast();

  const handleTest = async () => {
    setIsLoading(true);
    setResult(null);
    
    try {
      const response = await fetch('/api/admin/quick-gmail-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      setResult(data);

      if (data.success) {
        toast({
          title: 'Gmail Test Successful! ✅',
          description: 'Check boardmixllc@gmail.com inbox for test email',
        });
      } else {
        toast({
          title: 'Gmail Test Failed ❌',
          description: data.error || 'Gmail SMTP test failed',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error testing Gmail:', error);
      toast({
        title: 'Network Error ❌',
        description: 'Failed to connect to test endpoint',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Mail className="mr-2 h-5 w-5" />
            Quick Gmail Test
          </CardTitle>
          <CardDescription>
            Test Gmail SMTP with exact settings from your screenshot
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 p-3 rounded-lg text-sm">
            <p className="font-medium mb-2">Test Settings:</p>
            <ul className="space-y-1">
              <li><strong>Host:</strong> smtp.gmail.com</li>
              <li><strong>Port:</strong> 465</li>
              <li><strong>Encryption:</strong> SSL</li>
              <li><strong>Username:</strong> boardmixllc@gmail.com</li>
              <li><strong>Password:</strong> Your App Password</li>
            </ul>
          </div>

          <Button
            onClick={handleTest}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? 'Testing Gmail SMTP...' : 'Run Quick Test'}
          </Button>

          {result && (
            <div className="space-y-4 mt-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Test Results</h3>
                <Badge variant={result.success ? 'default' : 'destructive'}>
                  {result.success ? (
                    <><CheckCircle className="mr-1 h-4 w-4" /> Success</>
                  ) : (
                    <><XCircle className="mr-1 h-4 w-4" /> Failed</>
                  )}
                </Badge>
              </div>

              {result.success && result.details && (
                <div className="space-y-2">
                  <h4 className="font-medium text-green-600">✅ Email Sent Successfully!</h4>
                  <div className="bg-green-50 p-3 rounded-lg text-sm space-y-1">
                    <div><strong>Message ID:</strong> {result.details.messageId}</div>
                    <div><strong>Timestamp:</strong> {new Date(result.details.timestamp).toLocaleString()}</div>
                    <div><strong>Destination:</strong> boardmixllc@gmail.com</div>
                  </div>
                  <p className="text-sm text-green-600 font-medium">
                    📧 Check your Gmail inbox for the test email!
                  </p>
                </div>
              )}

              {!result.success && (
                <div className="space-y-2">
                  <h4 className="font-medium text-red-600">❌ Test Failed</h4>
                  <div className="bg-red-50 p-3 rounded-lg text-sm">
                    <p><strong>Error:</strong> {result.error}</p>
                  </div>
                  
                  {result.recommendations && result.recommendations.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="font-medium">Recommendations:</h5>
                      <div className="bg-yellow-50 p-3 rounded-lg">
                        <ul className="text-sm space-y-1">
                          {result.recommendations.map((rec, index) => (
                            <li key={index} className="flex items-start">
                              <span className="mr-2">•</span>
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {result.settings && (
                <div className="space-y-2">
                  <h4 className="font-medium">Configuration Check</h4>
                  <div className="bg-gray-50 p-3 rounded-lg text-sm space-y-1">
                    <div><strong>Host:</strong> {result.settings.host}</div>
                    <div><strong>Port:</strong> {result.settings.port}</div>
                    <div><strong>Encryption:</strong> {result.settings.encryption}</div>
                    <div><strong>Username:</strong> {result.settings.username}</div>
                    <div><strong>Password Set:</strong> {result.settings.hasPassword ? '✅ Yes' : '❌ No'}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            <p><strong>What this test does:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Connects to Gmail SMTP with SSL encryption</li>
              <li>Authenticates with your App Password</li>
              <li>Sends a test email to boardmixllc@gmail.com</li>
              <li>Provides specific error messages if it fails</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}