'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export function TestVotingSummaryButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [type, setType] = useState<'resolution' | 'minutes'>('resolution');
  const [itemId, setItemId] = useState('');
  const [previewData, setPreviewData] = useState<any>(null);
  const { toast } = useToast();

  const handleSendSummary = async () => {
    if (!itemId.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a valid item ID',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/voting-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          id: itemId.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Success',
          description: data.message,
        });
        setItemId(''); // Clear the input
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to send voting summary email',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error sending voting summary:', error);
      toast({
        title: 'Error',
        description: 'Network error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreviewSummary = async () => {
    if (!itemId.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a valid item ID',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/voting-summary?type=${type}&id=${itemId.trim()}`);
      const data = await response.json();

      if (response.ok) {
        console.log('Voting summary data:', data.data);
        setPreviewData(data.data);
        toast({
          title: 'Preview Generated',
          description: 'Voting summary data loaded successfully',
        });
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to generate voting summary preview',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error previewing voting summary:', error);
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
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Test Voting Summary Email</CardTitle>
        <CardDescription>
          Send voting summary emails manually for testing purposes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="type">Type</Label>
          <Select value={type} onValueChange={(value: 'resolution' | 'minutes') => setType(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="resolution">Resolution</SelectItem>
              <SelectItem value="minutes">Minutes</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="itemId">Item ID</Label>
          <Input
            id="itemId"
            type="text"
            placeholder="Enter resolution or minutes ID"
            value={itemId}
            onChange={(e) => setItemId(e.target.value)}
          />
        </div>

        <div className="flex space-x-2">
          <Button
            onClick={handlePreviewSummary}
            disabled={isLoading}
            variant="outline"
            className="flex-1"
          >
            {isLoading ? 'Loading...' : 'Preview'}
          </Button>
          
          <Button
            onClick={handleSendSummary}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? 'Sending...' : 'Send Email'}
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">
          Preview will show the voting summary data in the browser console. 
          Send Email will actually send the voting summary to all board members.
        </p>

        {previewData && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold mb-2">Preview Data:</h4>
            <div className="space-y-2 text-sm">
              <div><strong>Item:</strong> {previewData.item?.title || 'N/A'}</div>
              <div><strong>Total Votes:</strong> {previewData.votes?.length || 0}</div>
              <div><strong>Non-Voters:</strong> {previewData.nonVoters?.length || 0}</div>
              <div><strong>Outcome:</strong> {previewData.outcome?.result || 'N/A'}</div>
              {previewData.statistics && (
                <div><strong>Statistics:</strong> 
                  {previewData.statistics.yesVotes || 0} Yes, 
                  {previewData.statistics.noVotes || 0} No, 
                  {previewData.statistics.abstainVotes || 0} Abstain
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}