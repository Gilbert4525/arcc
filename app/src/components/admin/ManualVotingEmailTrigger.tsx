'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Send, 
  Eye, 
  TestTube, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle,
  Mail,
  FileText,
  Clock,
  Users
} from 'lucide-react';

interface VotingItem {
  id: string;
  title: string;
  status: string;
  created_at: string;
  vote_count?: number;
}

interface AvailableItems {
  resolutions: VotingItem[];
  minutes: VotingItem[];
}

interface EmailPreview {
  subject: string;
  html: string;
  text: string;
  votingPeriod: string;
}

interface SummaryStats {
  totalVotes: number;
  totalEligibleVoters: number;
  participationRate: number;
  approvalPercentage: number;
  passed: boolean;
  nonVotersCount: number;
}

export default function ManualVotingEmailTrigger() {
  const [availableItems, setAvailableItems] = useState<AvailableItems | null>(null);
  const [testableItems, setTestableItems] = useState<AvailableItems | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedItem, setSelectedItem] = useState<{ type: 'resolution' | 'minutes'; id: string; title: string } | null>(null);
  const [emailPreview, setEmailPreview] = useState<EmailPreview | null>(null);
  const [summaryStats, setSummaryStats] = useState<SummaryStats | null>(null);
  const [forceMode, setForceMode] = useState(false);
  const [activeTab, setActiveTab] = useState('trigger');

  // Fetch available items for manual triggering
  const fetchAvailableItems = async () => {
    try {
      const response = await fetch('/api/admin/manual-voting-summary');
      const data = await response.json();
      
      if (data.success) {
        setAvailableItems(data.data);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to fetch available items' });
      }
    } catch (error) {
      console.error('Error fetching available items:', error);
      setMessage({ type: 'error', text: 'Failed to fetch available items' });
    }
  };

  // Fetch testable items
  const fetchTestableItems = async () => {
    try {
      const response = await fetch('/api/admin/test-voting-email');
      const data = await response.json();
      
      if (data.success) {
        setTestableItems(data.data);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to fetch testable items' });
      }
    } catch (error) {
      console.error('Error fetching testable items:', error);
      setMessage({ type: 'error', text: 'Failed to fetch testable items' });
    }
  };

  // Manually trigger voting summary email
  const triggerEmail = async (type: 'resolution' | 'minutes', itemId: string, itemTitle: string) => {
    setLoading(true);
    setMessage(null);
    
    try {
      const response = await fetch('/api/admin/manual-voting-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, itemId, force: forceMode })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage({ 
          type: 'success', 
          text: `✅ Voting summary email sent successfully for: ${itemTitle}` 
        });
      } else {
        setMessage({ 
          type: 'error', 
          text: `❌ ${data.error || 'Failed to send email'}` 
        });
      }
    } catch (error) {
      console.error('Error triggering email:', error);
      setMessage({ type: 'error', text: 'Failed to trigger email' });
    } finally {
      setLoading(false);
    }
  };

  // Preview email content
  const previewEmail = async (type: 'resolution' | 'minutes', itemId: string, itemTitle: string) => {
    setLoading(true);
    setMessage(null);
    setEmailPreview(null);
    setSummaryStats(null);
    
    try {
      const response = await fetch('/api/admin/test-voting-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, itemId, action: 'preview' })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setEmailPreview(data.data.preview);
        setSummaryStats(data.data.summaryStats);
        setSelectedItem({ type, id: itemId, title: itemTitle });
        setMessage({ 
          type: 'success', 
          text: `📧 Email preview generated for: ${itemTitle}` 
        });
      } else {
        setMessage({ 
          type: 'error', 
          text: `❌ ${data.error || 'Failed to generate preview'}` 
        });
      }
    } catch (error) {
      console.error('Error previewing email:', error);
      setMessage({ type: 'error', text: 'Failed to generate email preview' });
    } finally {
      setLoading(false);
    }
  };

  // Send test email
  const sendTestEmail = async (type: 'resolution' | 'minutes', itemId: string, itemTitle: string) => {
    setLoading(true);
    setMessage(null);
    
    try {
      const response = await fetch('/api/admin/test-voting-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, itemId, action: 'test_send' })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage({ 
          type: 'success', 
          text: `✅ Test email sent to ${data.data.testRecipient} for: ${itemTitle}` 
        });
      } else {
        setMessage({ 
          type: 'error', 
          text: `❌ ${data.error || 'Failed to send test email'}` 
        });
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      setMessage({ type: 'error', text: 'Failed to send test email' });
    } finally {
      setLoading(false);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Get status badge variant
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'approved':
      case 'passed':
        return 'default';
      case 'rejected':
      case 'failed':
        return 'destructive';
      case 'voting':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  // Render item list
  const renderItemList = (items: VotingItem[], type: 'resolution' | 'minutes', showActions: 'trigger' | 'test') => {
    if (!items || items.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No {type === 'resolution' ? 'resolutions' : 'minutes'} available</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex-1">
              <div className="font-medium">{item.title}</div>
              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                <span>Created: {formatDate(item.created_at)}</span>
                <Badge variant={getStatusVariant(item.status)}>
                  {item.status}
                </Badge>
                {item.vote_count !== undefined && (
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {item.vote_count} votes
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex gap-2">
              {showActions === 'trigger' && (
                <>
                  <Button
                    onClick={() => previewEmail(type, item.id, item.title)}
                    disabled={loading}
                    variant="outline"
                    size="sm"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Preview
                  </Button>
                  <Button
                    onClick={() => triggerEmail(type, item.id, item.title)}
                    disabled={loading}
                    size="sm"
                  >
                    <Send className="h-4 w-4 mr-1" />
                    Send Email
                  </Button>
                </>
              )}
              
              {showActions === 'test' && (
                <>
                  <Button
                    onClick={() => previewEmail(type, item.id, item.title)}
                    disabled={loading}
                    variant="outline"
                    size="sm"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Preview
                  </Button>
                  <Button
                    onClick={() => sendTestEmail(type, item.id, item.title)}
                    disabled={loading}
                    variant="outline"
                    size="sm"
                  >
                    <TestTube className="h-4 w-4 mr-1" />
                    Test Email
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  useEffect(() => {
    fetchAvailableItems();
    fetchTestableItems();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Manual Voting Email Trigger</h2>
          <p className="text-muted-foreground">
            Manually send voting summary emails and test email generation
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => {
            fetchAvailableItems();
            fetchTestableItems();
          }}
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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="trigger">
            <Send className="h-4 w-4 mr-2" />
            Manual Trigger
          </TabsTrigger>
          <TabsTrigger value="test">
            <TestTube className="h-4 w-4 mr-2" />
            Test & Preview
          </TabsTrigger>
          <TabsTrigger value="preview">
            <Eye className="h-4 w-4 mr-2" />
            Email Preview
          </TabsTrigger>
        </TabsList>

        {/* Manual Trigger Tab */}
        <TabsContent value="trigger" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Manual Email Trigger
              </CardTitle>
              <CardDescription>
                Send voting summary emails for completed voting items
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2 mb-4">
                <Switch
                  id="force-mode"
                  checked={forceMode}
                  onCheckedChange={setForceMode}
                />
                <Label htmlFor="force-mode">
                  Force mode (bypass status and duplicate checks)
                </Label>
              </div>
              
              <Separator className="mb-6" />

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-3">Resolutions</h3>
                  {renderItemList(availableItems?.resolutions || [], 'resolution', 'trigger')}
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-3">Minutes</h3>
                  {renderItemList(availableItems?.minutes || [], 'minutes', 'trigger')}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Test & Preview Tab */}
        <TabsContent value="test" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="h-5 w-5" />
                Email Testing
              </CardTitle>
              <CardDescription>
                Test email generation and send test emails to yourself
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-3">Resolutions</h3>
                  {renderItemList(testableItems?.resolutions || [], 'resolution', 'test')}
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-3">Minutes</h3>
                  {renderItemList(testableItems?.minutes || [], 'minutes', 'test')}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Preview Tab */}
        <TabsContent value="preview" className="space-y-6">
          {emailPreview && selectedItem ? (
            <>
              {/* Summary Statistics */}
              {summaryStats && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5" />
                      Voting Summary Statistics
                    </CardTitle>
                    <CardDescription>
                      Statistics for {selectedItem.title}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {summaryStats.totalVotes}/{summaryStats.totalEligibleVoters}
                        </div>
                        <div className="text-sm text-muted-foreground">Participation</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {summaryStats.participationRate.toFixed(1)}%
                        </div>
                        <div className="text-sm text-muted-foreground">Participation Rate</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {summaryStats.approvalPercentage.toFixed(1)}%
                        </div>
                        <div className="text-sm text-muted-foreground">Approval Rate</div>
                      </div>
                      
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${summaryStats.passed ? 'text-green-600' : 'text-red-600'}`}>
                          {summaryStats.passed ? 'PASSED' : 'FAILED'}
                        </div>
                        <div className="text-sm text-muted-foreground">Result</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">
                          {summaryStats.nonVotersCount}
                        </div>
                        <div className="text-sm text-muted-foreground">Non-Voters</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Email Preview */}
              <Card>
                <CardHeader>
                  <CardTitle>Email Preview</CardTitle>
                  <CardDescription>
                    Subject: {emailPreview.subject}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Voting Period:</Label>
                      <p className="text-sm text-muted-foreground mt-1">{emailPreview.votingPeriod}</p>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <Label className="text-sm font-medium">HTML Preview:</Label>
                      <div 
                        className="mt-2 p-4 border rounded-lg max-h-96 overflow-y-auto"
                        dangerouslySetInnerHTML={{ __html: emailPreview.html }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Eye className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">No Email Preview</h3>
                <p className="text-muted-foreground">
                  Generate an email preview from the Manual Trigger or Test & Preview tabs.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}