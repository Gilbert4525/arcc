'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Mail,
    Send,
    Eye,
    RefreshCw,
    Search,
    Filter,
    Calendar,
    BarChart3,
    Settings,
    History,
    CheckCircle,
    AlertTriangle,
    FileText
} from 'lucide-react';

interface VotingItem {
    id: string;
    title: string;
    type: 'resolution' | 'minutes';
    status: string;
    created_at: string;
    voting_deadline?: string;
    total_votes: number;
    total_eligible: number;
    participation_rate: number;
    outcome?: string;
    email_sent: boolean;
    email_sent_at?: string;
    email_delivery_status?: 'pending' | 'sent' | 'failed' | 'partial';
    email_recipients?: number;
    email_success_rate?: number;
}

interface EmailHistory {
    id: string;
    item_id: string;
    item_title: string;
    item_type: 'resolution' | 'minutes';
    sent_at: string;
    sent_by: string;
    trigger_type: 'automatic' | 'manual' | 'scheduled';
    recipients_count: number;
    successful_deliveries: number;
    failed_deliveries: number;
    delivery_rate: number;
    status: 'completed' | 'failed' | 'partial';
}

interface SystemStats {
    total_items: number;
    emails_sent: number;
    pending_emails: number;
    average_delivery_rate: number;
    last_24h_emails: number;
    system_health: 'healthy' | 'degraded' | 'unhealthy';
}

function VotingSummaryManagement() {
    const [votingItems, setVotingItems] = useState<VotingItem[]>([]);
    const [emailHistory, setEmailHistory] = useState<EmailHistory[]>([]);
    const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [filters, setFilters] = useState({
        type: 'all',
        status: 'all',
        emailStatus: 'all',
        dateRange: '7d'
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedItem, setSelectedItem] = useState<VotingItem | null>(null);

    // Fetch voting items and email data
    const fetchData = async () => {
        setLoading(true);
        try {
            // In a real implementation, these would be API calls
            const mockVotingItems: VotingItem[] = [
                {
                    id: '1',
                    title: 'Board Meeting Resolution - Q4 Budget Approval',
                    type: 'resolution',
                    status: 'approved',
                    created_at: '2024-01-10T09:00:00Z',
                    voting_deadline: '2024-01-15T17:00:00Z',
                    total_votes: 8,
                    total_eligible: 10,
                    participation_rate: 80,
                    outcome: 'passed',
                    email_sent: true,
                    email_sent_at: '2024-01-15T17:05:00Z',
                    email_delivery_status: 'sent',
                    email_recipients: 10,
                    email_success_rate: 90
                },
                {
                    id: '2',
                    title: 'January Board Meeting Minutes',
                    type: 'minutes',
                    status: 'voting',
                    created_at: '2024-01-12T14:00:00Z',
                    voting_deadline: '2024-01-17T17:00:00Z',
                    total_votes: 6,
                    total_eligible: 10,
                    participation_rate: 60,
                    email_sent: false,
                    email_recipients: 10
                }
            ];

            const mockEmailHistory: EmailHistory[] = [
                {
                    id: '1',
                    item_id: '1',
                    item_title: 'Board Meeting Resolution - Q4 Budget Approval',
                    item_type: 'resolution',
                    sent_at: '2024-01-15T17:05:00Z',
                    sent_by: 'System (Automatic)',
                    trigger_type: 'automatic',
                    recipients_count: 10,
                    successful_deliveries: 9,
                    failed_deliveries: 1,
                    delivery_rate: 90,
                    status: 'completed'
                }
            ];

            const mockSystemStats: SystemStats = {
                total_items: 15,
                emails_sent: 12,
                pending_emails: 3,
                average_delivery_rate: 85.5,
                last_24h_emails: 5,
                system_health: 'healthy'
            };

            setVotingItems(mockVotingItems);
            setEmailHistory(mockEmailHistory);
            setSystemStats(mockSystemStats);
            setMessage({ type: 'success', text: 'Data loaded successfully' });
        } catch (error) {
            console.error('Error fetching data:', error);
            setMessage({ type: 'error', text: 'Failed to load data' });
        } finally {
            setLoading(false);
        }
    };

    // Manual email trigger
    const triggerEmail = async (itemId: string, itemTitle: string, itemType: string) => {
        try {
            setMessage({ type: 'success', text: `Email triggered for: ${itemTitle}` });
            setVotingItems(prev => prev.map(item =>
                item.id === itemId
                    ? { ...item, email_sent: true, email_sent_at: new Date().toISOString(), email_delivery_status: 'sent' as const }
                    : item
            ));
        } catch (error) {
            console.error('Error triggering email:', error);
            setMessage({ type: 'error', text: 'Failed to trigger email' });
        }
    };

    // Format date for display
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString();
    };

    // Get status badge variant
    const getStatusBadgeVariant = (status: string) => {
        switch (status) {
            case 'approved':
            case 'passed':
            case 'sent':
            case 'completed':
                return 'default';
            case 'rejected':
            case 'failed':
                return 'destructive';
            case 'voting':
            case 'pending':
                return 'secondary';
            case 'partial':
                return 'outline';
            default:
                return 'outline';
        }
    };

    // Filter items based on current filters
    const filteredItems = votingItems.filter(item => {
        if (filters.type !== 'all' && item.type !== filters.type) return false;
        if (filters.status !== 'all' && item.status !== filters.status) return false;
        if (filters.emailStatus !== 'all') {
            if (filters.emailStatus === 'sent' && !item.email_sent) return false;
            if (filters.emailStatus === 'pending' && item.email_sent) return false;
        }
        if (searchTerm && !item.title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        return true;
    });

    useEffect(() => {
        fetchData();
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Voting Summary Management</h2>
                    <p className="text-muted-foreground">
                        Manage voting summary emails and monitor delivery status
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
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="overview">
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Overview
                    </TabsTrigger>
                    <TabsTrigger value="items">
                        <FileText className="h-4 w-4 mr-2" />
                        Voting Items
                    </TabsTrigger>
                    <TabsTrigger value="history">
                        <History className="h-4 w-4 mr-2" />
                        Email History
                    </TabsTrigger>
                    <TabsTrigger value="settings">
                        <Settings className="h-4 w-4 mr-2" />
                        Settings
                    </TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">Total Items</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {systemStats?.total_items || 0}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Resolutions & Minutes
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">Emails Sent</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {systemStats?.emails_sent || 0}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Total sent
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {systemStats?.average_delivery_rate.toFixed(1) || 0}%
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Average success rate
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">System Health</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center space-x-2">
                                    {systemStats?.system_health === 'healthy' ? (
                                        <CheckCircle className="h-5 w-5 text-green-600" />
                                    ) : (
                                        <AlertTriangle className="h-5 w-5 text-yellow-600" />
                                    )}
                                    <span className="font-medium capitalize">
                                        {systemStats?.system_health || 'Unknown'}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Recent Activity */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Email Activity</CardTitle>
                            <CardDescription>
                                Latest voting summary email deliveries
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {emailHistory.slice(0, 5).map((email) => (
                                    <div key={email.id} className="flex items-center justify-between p-4 border rounded-lg">
                                        <div className="flex items-center space-x-4">
                                            <div className="flex items-center space-x-2">
                                                {email.item_type === 'resolution' ? (
                                                    <FileText className="h-4 w-4 text-blue-600" />
                                                ) : (
                                                    <Calendar className="h-4 w-4 text-green-600" />
                                                )}
                                                <Badge variant="outline">
                                                    {email.item_type}
                                                </Badge>
                                            </div>
                                            <div>
                                                <div className="font-medium">{email.item_title}</div>
                                                <div className="text-sm text-muted-foreground">
                                                    {email.sent_by} • {formatDate(email.sent_at)}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-4">
                                            <div className="text-right">
                                                <div className="text-sm font-medium">
                                                    {email.successful_deliveries}/{email.recipients_count} delivered
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {email.delivery_rate}% success rate
                                                </div>
                                            </div>
                                            <Badge variant={getStatusBadgeVariant(email.status)}>
                                                {email.status}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Voting Items Tab */}
                <TabsContent value="items">
                    {/* Filters */}
                    <Card className="mb-6">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Filter className="h-5 w-5" />
                                Filters
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                    <Label>Search</Label>
                                    <div className="relative">
                                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search items..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-8"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <Label>Type</Label>
                                    <Select value={filters.type} onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Types</SelectItem>
                                            <SelectItem value="resolution">Resolutions</SelectItem>
                                            <SelectItem value="minutes">Minutes</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <Label>Status</Label>
                                    <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Status</SelectItem>
                                            <SelectItem value="voting">Voting</SelectItem>
                                            <SelectItem value="approved">Approved</SelectItem>
                                            <SelectItem value="rejected">Rejected</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <Label>Email Status</Label>
                                    <Select value={filters.emailStatus} onValueChange={(value) => setFilters(prev => ({ ...prev, emailStatus: value }))}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Email Status</SelectItem>
                                            <SelectItem value="sent">Email Sent</SelectItem>
                                            <SelectItem value="pending">Email Pending</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Items List */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Voting Items ({filteredItems.length})</CardTitle>
                            <CardDescription>
                                Manage voting summary emails for resolutions and minutes
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {filteredItems.map((item) => (
                                    <div key={item.id} className="p-4 border rounded-lg">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center space-x-3 mb-2">
                                                    <Badge variant="outline">
                                                        {item.type}
                                                    </Badge>
                                                    <Badge variant={getStatusBadgeVariant(item.status)}>
                                                        {item.status}
                                                    </Badge>
                                                    {item.email_sent && (
                                                        <Badge variant={getStatusBadgeVariant(item.email_delivery_status || 'sent')}>
                                                            <Mail className="h-3 w-3 mr-1" />
                                                            {item.email_delivery_status || 'sent'}
                                                        </Badge>
                                                    )}
                                                </div>

                                                <h3 className="font-medium mb-2">{item.title}</h3>

                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                                    <div>
                                                        <span className="text-muted-foreground">Created:</span>
                                                        <div>{formatDate(item.created_at)}</div>
                                                    </div>
                                                    <div>
                                                        <span className="text-muted-foreground">Participation:</span>
                                                        <div>{item.total_votes}/{item.total_eligible} ({item.participation_rate}%)</div>
                                                    </div>
                                                    {item.voting_deadline && (
                                                        <div>
                                                            <span className="text-muted-foreground">Deadline:</span>
                                                            <div>{formatDate(item.voting_deadline)}</div>
                                                        </div>
                                                    )}
                                                    {item.email_sent && item.email_success_rate && (
                                                        <div>
                                                            <span className="text-muted-foreground">Email Success:</span>
                                                            <div>{item.email_success_rate}%</div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex space-x-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setSelectedItem(item)}
                                                >
                                                    <Eye className="h-4 w-4 mr-1" />
                                                    View
                                                </Button>
                                                {!item.email_sent && (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => triggerEmail(item.id, item.title, item.type)}
                                                    >
                                                        <Send className="h-4 w-4 mr-1" />
                                                        Send Email
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {filteredItems.length === 0 && (
                                <div className="text-center py-8 text-muted-foreground">
                                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <p>No voting items found matching the current filters.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Email History Tab */}
                <TabsContent value="history">
                    <Card>
                        <CardHeader>
                            <CardTitle>Email Delivery History</CardTitle>
                            <CardDescription>
                                Complete history of voting summary email deliveries
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {emailHistory.map((email) => (
                                    <div key={email.id} className="p-4 border rounded-lg">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center space-x-3 mb-2">
                                                    <Badge variant="outline">
                                                        {email.item_type}
                                                    </Badge>
                                                    <Badge variant={getStatusBadgeVariant(email.trigger_type)}>
                                                        {email.trigger_type}
                                                    </Badge>
                                                    <Badge variant={getStatusBadgeVariant(email.status)}>
                                                        {email.status}
                                                    </Badge>
                                                </div>

                                                <h3 className="font-medium mb-2">{email.item_title}</h3>

                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                                    <div>
                                                        <span className="text-muted-foreground">Sent At:</span>
                                                        <div>{formatDate(email.sent_at)}</div>
                                                    </div>
                                                    <div>
                                                        <span className="text-muted-foreground">Sent By:</span>
                                                        <div>{email.sent_by}</div>
                                                    </div>
                                                    <div>
                                                        <span className="text-muted-foreground">Recipients:</span>
                                                        <div>{email.recipients_count}</div>
                                                    </div>
                                                    <div>
                                                        <span className="text-muted-foreground">Success Rate:</span>
                                                        <div>{email.delivery_rate}%</div>
                                                    </div>
                                                </div>

                                                <div className="mt-2 text-sm">
                                                    <span className="text-muted-foreground">Delivery Status:</span>
                                                    <span className="ml-2">
                                                        {email.successful_deliveries} successful, {email.failed_deliveries} failed
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {emailHistory.length === 0 && (
                                <div className="text-center py-8 text-muted-foreground">
                                    <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <p>No email history available.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Settings Tab */}
                <TabsContent value="settings">
                    <Card>
                        <CardHeader>
                            <CardTitle>Email System Settings</CardTitle>
                            <CardDescription>
                                Configure voting summary email system preferences
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                <div className="text-center py-8 text-muted-foreground">
                                    <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <p>Settings configuration will be implemented in a future update.</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

export default VotingSummaryManagement;