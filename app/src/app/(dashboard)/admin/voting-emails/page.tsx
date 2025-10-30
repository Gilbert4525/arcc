'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Send, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

interface AuditLog {
  id: string;
  action: string;
  table_name: string;
  record_id: string;
  new_values: any;
  created_at: string;
}

export default function VotingEmailsPage() {
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [recentTriggers, setRecentTriggers] = useState<AuditLog[]>([]);
  const [recentEmails, setRecentEmails] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState({ triggered: 0, sent: 0, failed: 0, pending: 0 });

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/cron/process-voting-notifications');
      const data = await response.json();
      
      if (data.success) {
        setRecentTriggers(data.recentActivity || []);
        
        // Calculate stats
        const triggered = data.recentActivity?.filter((a: AuditLog) => 
          a.action === 'VOTING_SUMMARY_EMAIL_TRIGGERED'
        ).length || 0;
        
        const sent = data.recentActivity?.filter((a: AuditLog) => 
          a.action === 'VOTING_SUMMARY_EMAIL_SENT'
        ).length || 0;
        
        const failed = data.recentActivity?.filter((a: AuditLog) => 
          a.action === 'VOTING_SUMMARY_EMAIL_FAILED'
        ).length || 0;
        
        setStats({
          triggered,
          sent,
          failed,
          pending: triggered - sent - failed
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processEmails = async () => {
    setProcessing(true);
    try {
      const response = await fetch('/api/cron/process-voting-notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer dev-secret'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert(`✅ Processed ${data.processed} triggers\n✅ Sent: ${data.successful}\n❌ Failed: ${data.failed}`);
        fetchData();
      } else {
        alert(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error processing emails:', error);
      alert('❌ Failed to process emails');
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Voting Email Management</h1>
          <p className="text-muted-foreground">Monitor and manage voting summary emails</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchData} disabled={loading} variant="outline">
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={processEmails} disabled={processing}>
            <Send className={`mr-2 h-4 w-4 ${processing ? 'animate-pulse' : ''}`} />
            Process Pending Emails
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Triggered</CardTitle>
            <AlertCircle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.triggered}</div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sent</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.sent}</div>
            <p className="text-xs text-muted-foreground">Successfully delivered</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.failed}</div>
            <p className="text-xs text-muted-foreground">Delivery failures</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Awaiting processing</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity (Last 24 Hours)</CardTitle>
          <CardDescription>Voting completion triggers and email delivery status</CardDescription>
        </CardHeader>
        <CardContent>
          {recentTriggers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No recent activity</p>
          ) : (
            <div className="space-y-2">
              {recentTriggers.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        log.action === 'VOTING_SUMMARY_EMAIL_SENT' ? 'default' :
                        log.action === 'VOTING_SUMMARY_EMAIL_FAILED' ? 'destructive' :
                        'secondary'
                      }>
                        {log.action === 'VOTING_SUMMARY_EMAIL_TRIGGERED' && <AlertCircle className="h-3 w-3 mr-1" />}
                        {log.action === 'VOTING_SUMMARY_EMAIL_SENT' && <CheckCircle className="h-3 w-3 mr-1" />}
                        {log.action === 'VOTING_SUMMARY_EMAIL_FAILED' && <XCircle className="h-3 w-3 mr-1" />}
                        {log.action.replace('VOTING_SUMMARY_EMAIL_', '')}
                      </Badge>
                      <span className="font-medium">
                        {log.new_values?.title || 'Unknown'}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        ({log.table_name === 'resolutions' ? 'Resolution' : 'Minutes'})
                      </span>
                    </div>
                    {log.new_values?.error && (
                      <p className="text-sm text-red-500 mt-1">Error: {log.new_values.error}</p>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(log.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>✅ <strong>Automatic Detection:</strong> When voting completes, database triggers automatically log the event</p>
          <p>✅ <strong>Email Processing:</strong> The cron job processes pending triggers every 5 minutes</p>
          <p>✅ <strong>Manual Processing:</strong> Click "Process Pending Emails" to immediately send any pending emails</p>
          <p>✅ <strong>Duplicate Prevention:</strong> System prevents sending duplicate emails for the same voting completion</p>
          <p className="pt-4 text-muted-foreground">
            <strong>Note:</strong> For production, set up a cron job to call <code>/api/cron/process-voting-notifications</code> every 1-5 minutes
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
