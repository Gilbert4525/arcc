'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export function TestVotingStatisticsButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [type, setType] = useState<'resolution' | 'minutes'>('resolution');
  const [itemId, setItemId] = useState('');
  const { toast } = useToast();

  const handleTestStatistics = async () => {
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
        const statistics = data.data.statistics;
        
        // Display comprehensive statistics in console
        console.log('=== Enhanced Voting Statistics ===');
        console.log('Basic Counts:', {
          totalVotes: statistics.totalVotes,
          totalEligibleVoters: statistics.totalEligibleVoters,
          approveVotes: statistics.approveVotes,
          rejectVotes: statistics.rejectVotes,
          abstainVotes: statistics.abstainVotes
        });
        
        console.log('Percentages:', {
          participationRate: statistics.participationRate + '%',
          approvalPercentage: statistics.approvalPercentage + '%',
          rejectionPercentage: statistics.rejectionPercentage + '%',
          abstentionPercentage: statistics.abstentionPercentage + '%'
        });
        
        console.log('Analysis:', {
          isUnanimous: statistics.isUnanimous,
          unanimousType: statistics.unanimousType,
          consensusLevel: statistics.consensusLevel,
          engagementScore: statistics.engagementScore + '/100'
        });
        
        console.log('Quorum Status:', statistics.quorumStatus);
        console.log('Voting Margin:', statistics.votingMargin);
        console.log('Comment Analysis:', statistics.commentAnalysis);
        
        console.log('Outcome:', {
          passed: statistics.passed,
          reason: statistics.passedReason
        });
        
        toast({
          title: 'Statistics Generated',
          description: `Enhanced voting statistics calculated. Check console for details. Engagement Score: ${statistics.engagementScore}/100`,
        });
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to generate voting statistics',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error testing voting statistics:', error);
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
        <CardTitle>Test Enhanced Voting Statistics</CardTitle>
        <CardDescription>
          Test the enhanced voting statistics calculation engine with detailed analysis
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

        <Button
          onClick={handleTestStatistics}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? 'Calculating...' : 'Test Enhanced Statistics'}
        </Button>

        <div className="text-sm text-muted-foreground space-y-1">
          <p><strong>Enhanced Features:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li>Participation rate & quorum analysis</li>
            <li>Unanimous vote detection</li>
            <li>Voting margin calculation</li>
            <li>Comment participation analysis</li>
            <li>Engagement scoring (0-100)</li>
            <li>Consensus level assessment</li>
            <li>Non-voter identification</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}