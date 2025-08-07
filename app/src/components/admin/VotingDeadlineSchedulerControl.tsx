'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Play, 
  Square, 
  RefreshCw, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Calendar,
  Activity
} from 'lucide-react';

interface SchedulerStatus {
  isRunning: boolean;
  lastRunTime?: string;
  nextRunTime?: string;
  intervalMinutes?: number;
}

interface UpcomingDeadline {
  id: string;
  title: string;
  deadline: string;
  hoursRemaining: number;
}

interface UpcomingDeadlines {
  resolutions: UpcomingDeadline[];
  minutes: UpcomingDeadline[];
}

interface JobResult {
  success: boolean;
  processedItems: number;
  expiredResolutions: string[];
  expiredMinutes: string[];
  errors: string[];
  executionTime: number;
}

export default function VotingDeadlineSchedulerControl() {
  const [status, setStatus] = useState<SchedulerStatus | null>(null);
  const [upcoming, setUpcoming] = useState<UpcomingDeadlines | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [lastJobResult, setLastJobResult] = useState<JobResult | null>(null);

  // Fetch scheduler status and upcoming deadlines
  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/voting-deadline-scheduler');
      const data = await response.json();
      
      if (data.success) {
        setStatus(data.data.scheduler);
        setUpcoming(data.data.upcoming);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to fetch status' });
      }
    } catch (error) {
      console.error('Error fetching scheduler status:', error);
      setMessage({ type: 'error', text: 'Failed to fetch scheduler status' });
    }
  };

  // Control scheduler (start, stop, manual check)
  const controlScheduler = async (action: string, intervalMinutes?: number) => {
    setLoading(true);
    setMessage(null);
    
    try {
      const response = await fetch('/api/voting-deadline-scheduler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, intervalMinutes })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        if (data.data && 'processedItems' in data.data) {
          setLastJobResult(data.data as JobResult);
        }
        await fetchStatus();
      } else {
        setMessage({ type: 'error', text: data.error || 'Operation failed' });
      }
    } catch (error) {
      console.error('Error controlling scheduler:', error);
      setMessage({ type: 'error', text: 'Failed to control scheduler' });
    } finally {
      setLoading(false);
    }
  };

  // Manual cron trigger
  const triggerCronJob = async () => {
    setLoading(true);
    setMessage(null);
    
    try {
      const response = await fetch('/api/cron/voting-deadlines', {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        setLastJobResult(data.data);
        await fetchStatus();
      } else {
        setMessage({ type: 'error', text: data.error || 'Cron job failed' });
      }
    } catch (error) {
      console.error('Error triggering cron job:', error);
      setMessage({ type: 'error', text: 'Failed to trigger cron job' });
    } finally {
      setLoading(false);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Format hours remaining
  const formatHoursRemaining = (hours: number) => {
    if (hours < 1) {
      return `${Math.round(hours * 60)} minutes`;
    } else if (hours < 24) {
      return `${Math.round(hours)} hours`;
    } else {
      return `${Math.round(hours / 24)} days`;
    }
  };

  useEffect(() => {
    fetchStatus();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Voting Deadline Scheduler</h2>
          <p className="text-muted-foreground">
            Manage automatic checking for expired voting deadlines
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={fetchStatus}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {message && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Scheduler Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Scheduler Status
          </CardTitle>
          <CardDescription>
            Current status of the voting deadline scheduler
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <span className="font-medium">Status:</span>
              <Badge variant={status?.isRunning ? 'default' : 'secondary'}>
                {status?.isRunning ? (
                  <>
                    <Play className="h-3 w-3 mr-1" />
                    Running
                  </>
                ) : (
                  <>
                    <Square className="h-3 w-3 mr-1" />
                    Stopped
                  </>
                )}
              </Badge>
            </div>
            
            {status?.lastRunTime && (
              <div className="flex items-center gap-2">
                <span className="font-medium">Last Run:</span>
                <span className="text-sm text-muted-foreground">
                  {formatDate(status.lastRunTime)}
                </span>
              </div>
            )}
            
            {status?.nextRunTime && (
              <div className="flex items-center gap-2">
                <span className="font-medium">Next Run:</span>
                <span className="text-sm text-muted-foreground">
                  {formatDate(status.nextRunTime)}
                </span>
              </div>
            )}
          </div>

          <Separator className="my-4" />

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => controlScheduler('start', 1)}
              disabled={loading || status?.isRunning}
              size="sm"
            >
              <Play className="h-4 w-4 mr-2" />
              Start Scheduler
            </Button>
            
            <Button
              onClick={() => controlScheduler('stop')}
              disabled={loading || !status?.isRunning}
              variant="outline"
              size="sm"
            >
              <Square className="h-4 w-4 mr-2" />
              Stop Scheduler
            </Button>
            
            <Button
              onClick={() => controlScheduler('manual_check')}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Manual Check
            </Button>
            
            <Button
              onClick={triggerCronJob}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              <Clock className="h-4 w-4 mr-2" />
              Test Cron Job
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Last Job Result */}
      {lastJobResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Last Job Result
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {lastJobResult.processedItems}
                </div>
                <div className="text-sm text-muted-foreground">Items Processed</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {lastJobResult.expiredResolutions.length}
                </div>
                <div className="text-sm text-muted-foreground">Resolutions</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {lastJobResult.expiredMinutes.length}
                </div>
                <div className="text-sm text-muted-foreground">Minutes</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">
                  {lastJobResult.executionTime}ms
                </div>
                <div className="text-sm text-muted-foreground">Execution Time</div>
              </div>
            </div>

            {lastJobResult.errors.length > 0 && (
              <div className="mt-4">
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-medium">Errors occurred:</div>
                    <ul className="list-disc list-inside mt-1">
                      {lastJobResult.errors.map((error, index) => (
                        <li key={index} className="text-sm">{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Upcoming Deadlines */}
      {upcoming && (upcoming.resolutions.length > 0 || upcoming.minutes.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Deadlines (Next 24 Hours)
            </CardTitle>
            <CardDescription>
              Voting items with deadlines approaching
            </CardDescription>
          </CardHeader>
          <CardContent>
            {upcoming.resolutions.length > 0 && (
              <div className="mb-4">
                <h4 className="font-medium mb-2">Resolutions ({upcoming.resolutions.length})</h4>
                <div className="space-y-2">
                  {upcoming.resolutions.map((resolution) => (
                    <div key={resolution.id} className="flex items-center justify-between p-2 bg-muted rounded">
                      <div>
                        <div className="font-medium">{resolution.title}</div>
                        <div className="text-sm text-muted-foreground">
                          Deadline: {formatDate(resolution.deadline)}
                        </div>
                      </div>
                      <Badge variant={resolution.hoursRemaining < 2 ? 'destructive' : 'secondary'}>
                        {formatHoursRemaining(resolution.hoursRemaining)} remaining
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {upcoming.minutes.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Minutes ({upcoming.minutes.length})</h4>
                <div className="space-y-2">
                  {upcoming.minutes.map((minutes) => (
                    <div key={minutes.id} className="flex items-center justify-between p-2 bg-muted rounded">
                      <div>
                        <div className="font-medium">{minutes.title}</div>
                        <div className="text-sm text-muted-foreground">
                          Deadline: {formatDate(minutes.deadline)}
                        </div>
                      </div>
                      <Badge variant={minutes.hoursRemaining < 2 ? 'destructive' : 'secondary'}>
                        {formatHoursRemaining(minutes.hoursRemaining)} remaining
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* No Upcoming Deadlines */}
      {upcoming && upcoming.resolutions.length === 0 && upcoming.minutes.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">No Upcoming Deadlines</h3>
            <p className="text-muted-foreground">
              No voting items have deadlines in the next 24 hours.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}