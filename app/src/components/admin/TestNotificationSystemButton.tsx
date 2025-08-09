'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export function TestNotificationSystemButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const { toast } = useToast();

  const runTest = async (testType: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/test-notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ testType }),
      });

      const data = await response.json();

      if (response.ok) {
        setResults(data.result);
        toast({
          title: 'Test Completed',
          description: `${testType} test completed successfully`,
        });
      } else {
        toast({
          title: 'Test Failed',
          description: data.error || 'Test failed',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error running test:', error);
      toast({
        title: 'Error',
        description: 'Network error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Test Notification System</CardTitle>
        <CardDescription>
          Debug the notification system to identify email delivery issues
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Button
            onClick={() => runTest('getBoardMembers')}
            disabled={isLoading}
            variant="outline"
          >
            Test Board Members
          </Button>
          
          <Button
            onClick={() => runTest('getNotificationPreferences')}
            disabled={isLoading}
            variant="outline"
          >
            Test Preferences
          </Button>
          
          <Button
            onClick={() => runTest('testResolutionNotification')}
            disabled={isLoading}
            variant="outline"
          >
            Test Resolution Email
          </Button>
          
          <Button
            onClick={() => runTest('testMinutesNotification')}
            disabled={isLoading}
            variant="outline"
          >
            Test Minutes Email
          </Button>
        </div>

        {results && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold mb-2">Test Results:</h4>
            <pre className="text-sm overflow-auto max-h-96 bg-white p-3 rounded border">
              {JSON.stringify(results, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}