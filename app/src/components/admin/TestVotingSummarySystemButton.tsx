'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Mail, Send, CheckCircle, XCircle, Clock } from 'lucide-react';

interface TestResult {
  success: boolean;
  message?: string;
  error?: string;
  details?: any;
}

export function TestVotingSummarySystemButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [itemType, setItemType] = useState<'resolution' | 'minutes'>('resolution');
  const [itemId, setItemId] = useState('');
  const [result, setResult] = useState<TestResult | null>(null);
  const { toast } = useToast();

  const handleTest = async () => {
    if (!itemId.trim()) {
      toast({
        title: 'Missing Item ID',
        description: 'Please enter a resolution or minutes ID to test',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setResult(null);
    
    try {
      console.log(`🧪 Testing voting summary system for ${itemType}: ${itemId}`);
      
      const response = await fetch('/api/voting-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: itemType,
          id: itemId.trim(),
          trigger: 'manual_test',
          checkCompletion: true
        }),
      });

      const data = await response.json();
      setResult(data);

      if (data.success || response.ok) {
        toast({
          title: 'Voting Summary Test Successful! ✅',
          description: `Voting summary email sent for ${itemType}`,
        });
      } else {
        toast({
          title: 'Voting Summary Test Failed ❌',
          description: data.error || 'Failed to send voting summary email',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error testing voting summary system:', error);
      const errorResult = {
        success: false,
        error: 'Network error or server unavailable',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
      setResult(errorResult);
      
      toast({
        title: 'Network Error ❌',
        description: 'Failed to connect to voting summary endpoint',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckCompletion = async () => {
    if (!itemId.trim()) {
      toast({
        title: 'Missing Item ID',
        description: 'Please enter a resolution or minutes ID to check',
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
          type: itemType,
          id: itemId.trim()
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const status = data.completionStatus;
        toast({
          title: status.isComplete ? 'Voting Complete ✅' : 'Voting In Progress ⏳',
          description: status.isComplete 
            ? `Completed: ${status.reason} (${status.participationRate.toFixed(1)}% participation)`
            : `${status.totalVotes}/${status.totalEligibleVoters} votes cast`,
        });
      } else {
        toast({
          title: 'Check Failed ❌',
          description: data.error || 'Failed to check voting completion',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error checking voting completion:', error);
      toast({
        title: 'Network Error ❌',
        description: 'Failed to check voting completion',
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
            Test Voting Summary System
          </CardTitle>
          <CardDescription>
            Test the complete voting summary email system for resolutions and minutes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="itemType">Item Type</Label>
              <Select value={itemType} onValueChange={(value: 'resolution' | 'minutes') => setItemType(value)}>
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

          <div className="flex space-x-2">
            <Button
              onClick={handleTest}
              disabled={isLoading || !itemId.trim()}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Clock className="mr-2 h-4 w-4 animate-spin" />
                  Sending Email...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Voting Summary
                </>
              )}
            </Button>

            <Button
              onClick={handleCheckCompletion}
              disabled={isLoading || !itemId.trim()}
              variant="outline"
            >
              Check Completion
            </Button>
          </div>

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

              {result.success && result.message && (
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-green-800 font-medium">✅ {result.message}</p>
                  <p className="text-green-600 text-sm mt-1">
                    Check all board member email inboxes for the voting summary email.
                  </p>
                </div>
              )}

              {!result.success && result.error && (
                <div className="bg-red-50 p-3 rounded-lg">
                  <p className="text-red-800 font-medium">❌ {result.error}</p>
                  {result.details && (
                    <p className="text-red-600 text-sm mt-1">
                      Details: {result.details}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="bg-blue-50 p-3 rounded-lg text-sm">
            <p className="font-medium mb-2">What this test does:</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Generates comprehensive voting summary data</li>
              <li>Creates professional email templates with voting results</li>
              <li>Shows individual board member votes and comments</li>
              <li>Sends emails to all board members using Gmail SMTP</li>
              <li>Includes voting statistics and outcome analysis</li>
            </ul>
          </div>

          <div className="bg-yellow-50 p-3 rounded-lg text-sm">
            <p className="font-medium mb-2">📋 How to get Item IDs:</p>
            <ul className="space-y-1 list-disc list-inside">
              <li><strong>Resolutions:</strong> Go to Resolutions page, click on a resolution, copy ID from URL</li>
              <li><strong>Minutes:</strong> Go to Minutes page, click on minutes, copy ID from URL</li>
              <li><strong>Database:</strong> Check the resolutions or minutes table in Supabase</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}