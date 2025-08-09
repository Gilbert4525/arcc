'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export function TestGmailButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [testEmail, setTestEmail] = useState('boardmixllc@gmail.com');
  const { toast } = useToast();

  const handleTest = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/test-gmail', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          testEmail: testEmail.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Gmail SMTP Test Successful! ✅',
          description: `Test email sent to ${data.testEmail}. Check your inbox.`,
        });
      } else {
        toast({
          title: 'Gmail SMTP Test Failed ❌',
          description: data.error || 'Gmail SMTP test failed',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error testing Gmail SMTP:', error);
      toast({
        title: 'Network Error ❌',
        description: 'Failed to connect to Gmail SMTP test endpoint',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Test Gmail SMTP</CardTitle>
        <CardDescription>
          Test the Gmail SMTP email service configuration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="testEmail">Test Email Address</Label>
          <Input
            id="testEmail"
            type="email"
            placeholder="boardmixllc@gmail.com"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
          />
        </div>

        <Button
          onClick={handleTest}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? 'Testing Gmail SMTP...' : 'Send Test Email'}
        </Button>

        <div className="text-sm text-muted-foreground space-y-1">
          <p><strong>What this tests:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Gmail SMTP connection</li>
            <li>App password authentication</li>
            <li>Email template generation</li>
            <li>Actual email delivery</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}