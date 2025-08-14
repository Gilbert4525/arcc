'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Mail, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PendingEvent {
  id: string;
  item_type: 'resolution' | 'minutes';
  item_id: string;
  completion_reason: string;
  completed_at: string;
}

interface RecentEvent {
  id: string;
  item_type: 'resolution' | 'minutes';
  item_id: string;
  completion_reason: string;
  email_sent: boolean;
  email_sent_at?: string;
  email_error?: string;
}

interface ProcessorStatus {
  pending: {
    count: number;
    events: PendingEvent[];
  };
  recent: {
    count: number;
    events: RecentEvent[];
  };
}

interface ProcessResult {
  processed: number;
  successful: number;
  failed: number;
  results: Array<{
    id: string;
    item_type: string;
    item_id: string;
    completion_reason: string;
    email_sent: boolean;
    error?: string;
  }>;
}

export default function VotingCompletionProcessor() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<ProcessorStatus | null>(null);
  const [lastProcessResult, setLastProcessResult] = useState<ProcessResult | null>(null);
  const { toast } = useToast();

  const loadStatus = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/voting-completion-processor');
      if (!response.ok) {
        throw new Error('Failed to load status');
      }
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Error loading status:', error);
      toast({
        title: 'Error',
        description: 'Failed to load voting completion status',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const processCompletions = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/voting-completion-processor', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to process completions');
      }
      
      const result = await response.json();
      setLastProcessResult(result);
      
      toast({
        title: 'Processing Complete',
        description: `Processed ${result.processed} events: ${result.successful} successful, ${result.failed} failed`,
        variant: result.failed > 0 ? 'destructive' : 'default',
      });
      
      // Reload status after processing
      await loadStatus();
    } catch (error) {
      console.error('Error processing completions:', error);
      toast({
        title: 'Error',
        description: 'Failed to process voting completions',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadge = (reason: string) => {
    switch (reason) {
      case 'all_voted':
        return <Badge variant="default" className="bg-green-100 text-green-800">All Voted</Badge>;
      case 'deadline_expired':
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Deadline Expired</Badge>;
      case 'manual_completion':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Manual</Badge>;
      default:
        return <Badge variant="outline">{reason}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Voting Completion Email Processor
          </CardTitle>
          <CardDescription>
            Monitor and process pending voting completion events that need email notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              onClick={loadStatus}
              disabled={isLoading}
              variant="outline"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh Status
            </Button>
            
            <Button
              onClick={processCompletions}
              disabled={isProcessing || !status?.pending.count}
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Mail className="h-4 w-4 mr-2" />
              )}
              Process Pending ({status?.pending.count || 0})
            </Button>
          </div>

          {status && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Pending Events */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Pending Events ({status.pending.count})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {status.pending.count === 0 ? (
                    <p className="text-sm text-muted-foreground">No pending events</p>
                  ) : (
                    <div className="space-y-2">
                      {status.pending.events.slice(0, 5).map((event) => (
                        <div key={event.id} className="flex items-center justify-between p-2 bg-muted rounded">
                          <div>
                            <div className="font-medium text-sm">
                              {event.item_type} {event.item_id.slice(0, 8)}...
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatDate(event.completed_at)}
                            </div>
                          </div>
                          {getStatusBadge(event.completion_reason)}
                        </div>
                      ))}
                      {status.pending.count > 5 && (
                        <p className="text-xs text-muted-foreground">
                          ...and {status.pending.count - 5} more
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Events */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Recent Processed ({status.recent.count})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {status.recent.count === 0 ? (
                    <p className="text-sm text-muted-foreground">No recent events</p>
                  ) : (
                    <div className="space-y-2">
                      {status.recent.events.slice(0, 5).map((event) => (
                        <div key={event.id} className="flex items-center justify-between p-2 bg-muted rounded">
                          <div>
                            <div className="font-medium text-sm flex items-center gap-2">
                              {event.item_type} {event.item_id.slice(0, 8)}...
                              {event.email_sent ? (
                                <CheckCircle className="h-3 w-3 text-green-600" />
                              ) : (
                                <XCircle className="h-3 w-3 text-red-600" />
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {event.email_sent_at ? formatDate(event.email_sent_at) : 'Failed'}
                            </div>
                            {event.email_error && (
                              <div className="text-xs text-red-600">
                                {event.email_error}
                              </div>
                            )}
                          </div>
                          {getStatusBadge(event.completion_reason)}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {lastProcessResult && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Last Processing Result</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{lastProcessResult.processed}</div>
                    <div className="text-sm text-muted-foreground">Processed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{lastProcessResult.successful}</div>
                    <div className="text-sm text-muted-foreground">Successful</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{lastProcessResult.failed}</div>
                    <div className="text-sm text-muted-foreground">Failed</div>
                  </div>
                </div>
                
                {lastProcessResult.results.length > 0 && (
                  <div className="space-y-1">
                    <h4 className="font-medium">Details:</h4>
                    {lastProcessResult.results.map((result, index) => (
                      <div key={index} className="text-sm flex items-center justify-between p-1">
                        <span>
                          {result.item_type} {result.item_id.slice(0, 8)}...
                        </span>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(result.completion_reason)}
                          {result.email_sent ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}