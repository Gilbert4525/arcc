'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface CompletionStatus {
  isComplete: boolean;
  reason: 'all_voted' | 'deadline_expired' | 'manual_completion' | 'not_complete';
  completedAt?: string;
  totalVotes: number;
  totalEligibleVoters: number;
  participationRate: number;
  deadlineExpired: boolean;
}

export function TestVotingCompletionButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [type, setType] = useState<'resolution' | 'minutes'>('resolution');
  const [itemId, setItemId] = useState('');
  const [completionStatus, setCompletionStatus] = useState<CompletionStatus | null>(null);
  const [expiredResults, setExpiredResults] = useState<any>(null);
  const { toast } = useToast();

  const handleCheckCompletion = async () => {
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
      const response = await fetch('/api/voting-completion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'check',
          type,
          id: itemId.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setCompletionStatus(data.completionStatus);
        
        console.log('=== Voting Completion Status ===');
        console.log('Item ID:', itemId);
        console.log('Type:', type);
        console.log('Completion Status:', data.completionStatus);
        
        toast({
          title: 'Completion Check Complete',
          description: data.message,
        });
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to check voting completion',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error checking voting completion:', error);
      toast({
        title: 'Error',
        description: 'Network error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckExpired = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/voting-completion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'check_expired',
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setExpiredResults(data.results);
        
        console.log('=== Expired Voting Check Results ===');
        console.log('Results:', data.results);
        
        toast({
          title: 'Expired Check Complete',
          description: data.message,
        });
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to check expired voting items',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error checking expired voting items:', error);
      toast({
        title: 'Error',
        description: 'Network error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualComplete = async () => {
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
      const response = await fetch('/api/voting-completion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'manual_complete',
          type,
          id: itemId.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Manual Completion Successful',
          description: data.message,
        });
        
        // Refresh completion status
        await handleCheckCompletion();
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to manually complete voting',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error manually completing voting:', error);
      toast({
        title: 'Error',
        description: 'Network error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: CompletionStatus) => {
    if (status.isComplete) {
      const variant = status.reason === 'all_voted' ? 'default' : 
                    status.reason === 'deadline_expired' ? 'secondary' : 'outline';
      return <Badge variant={variant}>Complete - {status.reason.replace('_', ' ')}</Badge>;
    } else {
      return <Badge variant="destructive">In Progress</Badge>;
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Voting Completion Detection System</CardTitle>
        <CardDescription>
          Test the automatic voting completion detection and email triggering system
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
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
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Button
            onClick={handleCheckCompletion}
            disabled={isLoading}
            variant="outline"
          >
            {isLoading ? 'Checking...' : 'Check Completion'}
          </Button>
          
          <Button
            onClick={handleCheckExpired}
            disabled={isLoading}
            variant="outline"
          >
            {isLoading ? 'Checking...' : 'Check Expired'}
          </Button>

          <Button
            onClick={handleManualComplete}
            disabled={isLoading}
            variant="default"
          >
            {isLoading ? 'Completing...' : 'Manual Complete'}
          </Button>
        </div>

        {(completionStatus || expiredResults) && (
          <Tabs defaultValue="status" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="status">Completion Status</TabsTrigger>
              <TabsTrigger value="expired">Expired Results</TabsTrigger>
            </TabsList>
            
            <TabsContent value="status" className="space-y-3">
              {completionStatus && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-blue-800">Voting Status</h4>
                    {getStatusBadge(completionStatus)}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p><strong>Total Votes:</strong> {completionStatus.totalVotes}</p>
                      <p><strong>Eligible Voters:</strong> {completionStatus.totalEligibleVoters}</p>
                      <p><strong>Participation:</strong> {completionStatus.participationRate.toFixed(1)}%</p>
                    </div>
                    <div>
                      <p><strong>Deadline Expired:</strong> {completionStatus.deadlineExpired ? 'Yes' : 'No'}</p>
                      {completionStatus.completedAt && (
                        <p><strong>Completed At:</strong> {new Date(completionStatus.completedAt).toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="expired" className="space-y-3">
              {expiredResults && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h4 className="font-semibold text-orange-800 mb-3">Expired Voting Items</h4>
                  
                  <div className="space-y-2 text-sm">
                    <p><strong>Total Processed:</strong> {expiredResults.totalProcessed}</p>
                    <p><strong>Expired Resolutions:</strong> {expiredResults.expiredResolutions.length}</p>
                    <p><strong>Expired Minutes:</strong> {expiredResults.expiredMinutes.length}</p>
                    
                    {expiredResults.expiredResolutions.length > 0 && (
                      <div>
                        <p className="font-medium">Resolution IDs:</p>
                        <div className="flex flex-wrap gap-1">
                          {expiredResults.expiredResolutions.map((id: string) => (
                            <Badge key={id} variant="outline" className="text-xs">{id}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {expiredResults.expiredMinutes.length > 0 && (
                      <div>
                        <p className="font-medium">Minutes IDs:</p>
                        <div className="flex flex-wrap gap-1">
                          {expiredResults.expiredMinutes.map((id: string) => (
                            <Badge key={id} variant="outline" className="text-xs">{id}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        <div className="text-sm text-muted-foreground space-y-2">
          <p><strong>Completion Detection Features:</strong></p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p><strong>Automatic Triggers:</strong></p>
              <ul className="list-disc list-inside space-y-1">
                <li>All eligible voters voted</li>
                <li>Voting deadline expired</li>
                <li>Real-time detection on vote cast</li>
                <li>Immediate email sending</li>
              </ul>
            </div>
            <div>
              <p><strong>System Features:</strong></p>
              <ul className="list-disc list-inside space-y-1">
                <li>Status updates before email</li>
                <li>Comprehensive audit logging</li>
                <li>Error handling and retry logic</li>
                <li>Manual completion override</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}