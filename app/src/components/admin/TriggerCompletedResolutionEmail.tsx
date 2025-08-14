'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Mail, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function TriggerCompletedResolutionEmail() {
  const [isLoading, setIsLoading] = useState(false);
  const [resolutionId, setResolutionId] = useState('abb4b65f-79db-40ec-97a1-9d00f0cc032c');
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const triggerEmail = async () => {
    if (!resolutionId.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a resolution ID',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      // First try the voting summary service directly
      const response = await fetch('/api/voting-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'resolution',
          itemId: resolutionId,
          force: true // Force send even if already completed
        }),
      });

      const data = await response.json();
      setResult(data);

      if (response.ok && data.success) {
        toast({
          title: 'Success',
          description: 'Voting summary email sent successfully!',
        });
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to send email',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error triggering email:', error);
      setResult({ error: 'Network error occurred' });
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Trigger Completed Resolution Email
        </CardTitle>
        <CardDescription>
          Send voting summary email for a resolution that's already completed (approved/rejected)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="resolutionId">Resolution ID</Label>
          <Input
            id="resolutionId"
            value={resolutionId}
            onChange={(e) => setResolutionId(e.target.value)}
            placeholder="Enter resolution UUID"
          />
        </div>

        <Button
          onClick={triggerEmail}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Mail className="h-4 w-4 mr-2" />
          )}
          Send Voting Summary Email
        </Button>

        {result && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              {result.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <span className="font-medium">
                {result.success ? 'Success' : 'Error'}
              </span>
            </div>
            
            <pre className="text-sm bg-background p-2 rounded border overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}

        <div className="text-sm text-muted-foreground">
          <p><strong>Current Resolution ID:</strong> abb4b65f-79db-40ec-97a1-9d00f0cc032c</p>
          <p><strong>Status:</strong> approved (completed)</p>
          <p>This will force-send the voting summary email even though voting is already complete.</p>
        </div>
      </CardContent>
    </Card>
  );
}