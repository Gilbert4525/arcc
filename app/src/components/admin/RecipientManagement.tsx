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
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Users, 
  Mail, 
  Settings, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle,
  UserCheck,
  UserX,
  BarChart3,
  Filter
} from 'lucide-react';

interface EmailRecipient {
  id: string;
  full_name: string;
  email: string;
  position?: string;
  role: 'admin' | 'board_member';
  is_active: boolean;
  email_notifications_enabled: boolean;
  voting_email_notifications: boolean;
  last_email_sent?: string;
  preferences?: {
    voting_summaries: boolean;
    voting_reminders: boolean;
    system_notifications: boolean;
    digest_frequency: 'immediate' | 'daily' | 'weekly' | 'disabled';
    preferred_format: 'html' | 'text' | 'both';
  };
}

interface SystemEmailStats {
  total_recipients: number;
  active_recipients: number;
  email_enabled_recipients: number;
  voting_email_enabled: number;
  recent_bounces: number;
  delivery_rate: number;
}

export default function RecipientManagement() {
  const [recipients, setRecipients] = useState<EmailRecipient[]>([]);
  const [filteredRecipients, setFilteredRecipients] = useState<EmailRecipient[]>([]);
  const [systemStats, setSystemStats] = useState<SystemEmailStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [filters, setFilters] = useState({
    role: 'all',
    status: 'all',
    emailEnabled: 'all',
    votingEnabled: 'all'
  });
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch recipients and system stats
  const fetchData = async () => {
    setLoading(true);
    try {
      // In a real implementation, these would be API calls
      // For now, we'll simulate the data structure
      const mockRecipients: EmailRecipient[] = [
        {
          id: '1',
          full_name: 'John Smith',
          email: 'john.smith@example.com',
          position: 'Chairman',
          role: 'admin',
          is_active: true,
          email_notifications_enabled: true,
          voting_email_notifications: true,
          last_email_sent: '2024-01-15T10:30:00Z',
          preferences: {
            voting_summaries: true,
            voting_reminders: true,
            system_notifications: true,
            digest_frequency: 'immediate',
            preferred_format: 'html'
          }
        },
        {
          id: '2',
          full_name: 'Jane Doe',
          email: 'jane.doe@example.com',
          position: 'Board Member',
          role: 'board_member',
          is_active: true,
          email_notifications_enabled: true,
          voting_email_notifications: false,
          preferences: {
            voting_summaries: false,
            voting_reminders: true,
            system_notifications: true,
            digest_frequency: 'daily',
            preferred_format: 'text'
          }
        }
      ];

      const mockStats: SystemEmailStats = {
        total_recipients: 12,
        active_recipients: 10,
        email_enabled_recipients: 9,
        voting_email_enabled: 8,
        recent_bounces: 1,
        delivery_rate: 95.5
      };

      setRecipients(mockRecipients);
      setSystemStats(mockStats);
      setMessage({ type: 'success', text: 'Data loaded successfully' });
    } catch (error) {
      console.error('Error fetching data:', error);
      setMessage({ type: 'error', text: 'Failed to load data' });
    } finally {
      setLoading(false);
    }
  };

  // Update recipient preferences
  const updateRecipientPreferences = async (
    recipientId: string, 
    field: string, 
    value: any
  ) => {
    try {
      // In a real implementation, this would be an API call
      console.log(`Updating ${field} to ${value} for recipient ${recipientId}`);
      
      setRecipients(prev => prev.map(recipient => {
        if (recipient.id === recipientId) {
          if (field.includes('.')) {
            const [parent, child] = field.split('.');
            return {
              ...recipient,
              [parent]: {
                ...recipient[parent as keyof EmailRecipient],
                [child]: value
              }
            };
          } else {
            return {
              ...recipient,
              [field]: value
            };
          }
        }
        return recipient;
      }));

      setMessage({ type: 'success', text: 'Preferences updated successfully' });
    } catch (error) {
      console.error('Error updating preferences:', error);
      setMessage({ type: 'error', text: 'Failed to update preferences' });
    }
  };

  // Apply filters
  useEffect(() => {
    let filtered = recipients;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(recipient =>
        recipient.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        recipient.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply role filter
    if (filters.role !== 'all') {
      filtered = filtered.filter(recipient => recipient.role === filters.role);
    }

    // Apply status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(recipient => 
        filters.status === 'active' ? recipient.is_active : !recipient.is_active
      );
    }

    // Apply email enabled filter
    if (filters.emailEnabled !== 'all') {
      filtered = filtered.filter(recipient => 
        filters.emailEnabled === 'enabled' ? recipient.email_notifications_enabled : !recipient.email_notifications_enabled
      );
    }

    // Apply voting enabled filter
    if (filters.votingEnabled !== 'all') {
      filtered = filtered.filter(recipient => 
        filters.votingEnabled === 'enabled' ? recipient.voting_email_notifications : !recipient.voting_email_notifications
      );
    }

    setFilteredRecipients(filtered);
  }, [recipients, filters, searchTerm]);

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  // Get status badge variant
  const getStatusVariant = (isActive: boolean) => {
    return isActive ? 'default' : 'secondary';
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Recipient Management</h2>
          <p className="text-muted-foreground">
            Manage email recipients and notification preferences
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={fetchData}
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

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">
            <BarChart3 className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="recipients">
            <Users className="h-4 w-4 mr-2" />
            Recipients
          </TabsTrigger>
          <TabsTrigger value="preferences">
            <Settings className="h-4 w-4 mr-2" />
            Preferences
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          {systemStats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Recipients
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Total Recipients:</span>
                      <Badge variant="outline">{systemStats.total_recipients}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Active Recipients:</span>
                      <Badge variant="default">{systemStats.active_recipients}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Email Enabled:</span>
                      <Badge variant="default">{systemStats.email_enabled_recipients}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Voting Emails:</span>
                      <Badge variant="default">{systemStats.voting_email_enabled}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Delivery Stats
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Delivery Rate:</span>
                      <Badge variant="default">{systemStats.delivery_rate}%</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Recent Bounces:</span>
                      <Badge variant={systemStats.recent_bounces > 0 ? 'destructive' : 'default'}>
                        {systemStats.recent_bounces}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Health Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      {systemStats.delivery_rate >= 95 ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      )}
                      <span className="text-sm">
                        {systemStats.delivery_rate >= 95 ? 'Excellent' : 'Needs Attention'}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Email delivery system is {systemStats.delivery_rate >= 95 ? 'performing well' : 'experiencing issues'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Recipients Tab */}
        <TabsContent value="recipients">
          <Card>
            <CardHeader>
              <CardTitle>All Recipients</CardTitle>
              <CardDescription>
                Manage recipient status and basic settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-wrap gap-4 mb-6">
                <div className="flex-1 min-w-[200px]">
                  <Input
                    placeholder="Search recipients..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <Select value={filters.role} onValueChange={(value) => setFilters(prev => ({ ...prev, role: value }))}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="board_member">Board Member</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator className="mb-6" />

              {/* Recipients List */}
              <div className="space-y-4">
                {filteredRecipients.map((recipient) => (
                  <div key={recipient.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="font-medium">{recipient.full_name}</div>
                          <div className="text-sm text-muted-foreground">{recipient.email}</div>
                          {recipient.position && (
                            <div className="text-xs text-muted-foreground">{recipient.position}</div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Badge variant={getStatusVariant(recipient.is_active)}>
                            {recipient.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          <Badge variant="outline">
                            {recipient.role === 'admin' ? 'Admin' : 'Board Member'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={recipient.email_notifications_enabled}
                          onCheckedChange={(checked) => 
                            updateRecipientPreferences(recipient.id, 'email_notifications_enabled', checked)
                          }
                        />
                        <Label className="text-sm">Email</Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={recipient.voting_email_notifications}
                          onCheckedChange={(checked) => 
                            updateRecipientPreferences(recipient.id, 'voting_email_notifications', checked)
                          }
                        />
                        <Label className="text-sm">Voting</Label>
                      </div>
                      
                      <div className="text-xs text-muted-foreground min-w-[80px]">
                        Last: {formatDate(recipient.last_email_sent)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {filteredRecipients.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No recipients found matching the current filters.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences">
          <div className="space-y-6">
            {filteredRecipients.map((recipient) => (
              <Card key={recipient.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    {recipient.full_name}
                  </CardTitle>
                  <CardDescription>
                    {recipient.email} • {recipient.role === 'admin' ? 'Administrator' : 'Board Member'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {recipient.preferences && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="font-medium">Email Types</h4>
                        
                        <div className="flex items-center justify-between">
                          <Label>Voting Summaries</Label>
                          <Switch
                            checked={recipient.preferences.voting_summaries}
                            onCheckedChange={(checked) => 
                              updateRecipientPreferences(recipient.id, 'preferences.voting_summaries', checked)
                            }
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <Label>Voting Reminders</Label>
                          <Switch
                            checked={recipient.preferences.voting_reminders}
                            onCheckedChange={(checked) => 
                              updateRecipientPreferences(recipient.id, 'preferences.voting_reminders', checked)
                            }
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <Label>System Notifications</Label>
                          <Switch
                            checked={recipient.preferences.system_notifications}
                            onCheckedChange={(checked) => 
                              updateRecipientPreferences(recipient.id, 'preferences.system_notifications', checked)
                            }
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <h4 className="font-medium">Delivery Preferences</h4>
                        
                        <div>
                          <Label className="text-sm">Digest Frequency</Label>
                          <Select 
                            value={recipient.preferences.digest_frequency}
                            onValueChange={(value) => 
                              updateRecipientPreferences(recipient.id, 'preferences.digest_frequency', value)
                            }
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="immediate">Immediate</SelectItem>
                              <SelectItem value="daily">Daily</SelectItem>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="disabled">Disabled</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label className="text-sm">Preferred Format</Label>
                          <Select 
                            value={recipient.preferences.preferred_format}
                            onValueChange={(value) => 
                              updateRecipientPreferences(recipient.id, 'preferences.preferred_format', value)
                            }
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="html">HTML</SelectItem>
                              <SelectItem value="text">Text Only</SelectItem>
                              <SelectItem value="both">Both</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}