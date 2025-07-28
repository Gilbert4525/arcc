'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Calendar, Users, Clock, CheckCircle, XCircle, AlertCircle, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CreateMinutesDialog } from './CreateMinutesDialog';
import { MinutesDetailsDialog } from './MinutesDetailsDialog';
import { PublishMinutesDialog } from './PublishMinutesDialog';
import { AdminCommentView } from './AdminCommentView';
import { MinutesErrorBoundary } from './MinutesErrorBoundary';

interface Minutes {
  id: string;
  title: string;
  meeting_date: string;
  content: string;
  key_decisions?: string;
  action_items?: string;
  status: 'draft' | 'published' | 'voting' | 'passed' | 'failed' | 'cancelled';
  voting_deadline?: string;
  created_at: string;
  total_votes: number;
  approve_votes: number;
  reject_votes: number;
  abstain_votes: number;
  approval_percentage?: number; // Make this optional since it's calculated
  comment_count?: number; // Add comment count for admin view
  has_comments?: boolean; // Flag to indicate if there are any comments
  creator?: {
    full_name: string;
    email: string;
  };
}

export function MinutesManagement() {
  const [minutes, setMinutes] = useState<Minutes[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMinutes, setSelectedMinutes] = useState<Minutes | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [showCommentsDialog, setShowCommentsDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [showOnlyWithComments, setShowOnlyWithComments] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchMinutes();
  }, []);

  const fetchMinutes = async (retryCount = 0) => {
    try {
      setLoading(true);
      const response = await fetch('/api/minutes?includeCreator=true&includeCommentCounts=true');
      
      if (!response.ok) {
        if (response.status >= 500 && retryCount < 2) {
          // Retry on server errors up to 2 times
          setTimeout(() => fetchMinutes(retryCount + 1), 1000 * (retryCount + 1));
          return;
        }
        throw new Error(`Failed to fetch minutes: ${response.status}`);
      }

      const data = await response.json();
      console.log('MinutesManagement - Fetched minutes:', data.minutes); // Debug log
      setMinutes(data.minutes || []);
    } catch (error) {
      console.error('Error fetching minutes:', error);
      toast({
        title: 'Error',
        description: retryCount > 0 
          ? 'Failed to load minutes after multiple attempts. Please refresh the page.'
          : 'Failed to load minutes. Retrying...',
        variant: 'destructive',

      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMinutes = async (data: any) => {
    try {
      const response = await fetch('/api/minutes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Failed to create minutes');

      toast({
        title: 'Success',
        description: 'Minutes created successfully',
      });

      setShowCreateDialog(false);
      fetchMinutes();
    } catch (error) {
      console.error('Error creating minutes:', error);
      toast({
        title: 'Error',
        description: 'Failed to create minutes',
        variant: 'destructive',
      });
    }
  };

  const handlePublishMinutes = async (minutesId: string, votingDeadline: string) => {
    try {
      const response = await fetch(`/api/minutes/${minutesId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voting_deadline: votingDeadline }),
      });

      if (!response.ok) throw new Error('Failed to publish minutes');

      toast({
        title: 'Success',
        description: 'Minutes published for voting',
      });

      setShowPublishDialog(false);
      fetchMinutes();
    } catch (error) {
      console.error('Error publishing minutes:', error);
      toast({
        title: 'Error',
        description: 'Failed to publish minutes',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteMinutes = async (minutesId: string) => {
    if (!confirm('Are you sure you want to delete these minutes?')) return;

    try {
      const response = await fetch(`/api/minutes/${minutesId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete minutes');

      toast({
        title: 'Success',
        description: 'Minutes deleted successfully',
      });

      fetchMinutes();
    } catch (error) {
      console.error('Error deleting minutes:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete minutes',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: Minutes['status']) => {
    const statusConfig = {
      draft: { label: 'Draft', variant: 'secondary' as const, icon: AlertCircle },
      published: { label: 'Published', variant: 'default' as const, icon: Calendar },
      voting: { label: 'Voting', variant: 'default' as const, icon: Users },
      passed: { label: 'Passed', variant: 'default' as const, icon: CheckCircle },
      failed: { label: 'Failed', variant: 'destructive' as const, icon: XCircle },
      cancelled: { label: 'Cancelled', variant: 'secondary' as const, icon: XCircle },
    };

    const config = statusConfig[status] || { 
      label: status || 'Unknown', 
      variant: 'secondary' as const, 
      icon: AlertCircle 
    };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getFilteredMinutes = () => {
    let filtered: Minutes[] = [];
    
    switch (activeTab) {
      case 'draft':
        filtered = minutes.filter(m => m.status === 'draft');
        break;
      case 'voting':
        filtered = minutes.filter(m => m.status === 'voting');
        break;
      case 'completed':
        filtered = minutes.filter(m => ['passed', 'failed'].includes(m.status));
        break;
      case 'with-comments':
        filtered = minutes.filter(m => m.has_comments || (m.comment_count && m.comment_count > 0));
        break;
      default:
        filtered = minutes;
    }

    // Apply comment filter if enabled
    if (showOnlyWithComments) {
      filtered = filtered.filter(m => m.has_comments || (m.comment_count && m.comment_count > 0));
    }

    return filtered;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading minutes...</p>
        </div>
      </div>
    );
  }

  return (
    <MinutesErrorBoundary>
      <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Minutes Management</h1>
          <p className="text-gray-600">Create and manage meeting minutes for board approval</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant={showOnlyWithComments ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowOnlyWithComments(!showOnlyWithComments)}
            className="flex items-center gap-2"
          >
            <MessageSquare className="h-4 w-4" />
            {showOnlyWithComments ? 'Show All' : 'With Comments Only'}
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Minutes
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Minutes ({minutes.length})</TabsTrigger>
          <TabsTrigger value="draft">
            Draft ({minutes.filter(m => m.status === 'draft').length})
          </TabsTrigger>
          <TabsTrigger value="voting">
            Voting ({minutes.filter(m => m.status === 'voting').length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({minutes.filter(m => ['passed', 'failed'].includes(m.status)).length})
          </TabsTrigger>
          <TabsTrigger value="with-comments">
            With Comments ({minutes.filter(m => m.has_comments || (m.comment_count && m.comment_count > 0)).length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {getFilteredMinutes().length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No minutes found</h3>
                <p className="text-gray-600 text-center mb-4">
                  {activeTab === 'all'
                    ? 'Get started by creating your first meeting minutes'
                    : `No minutes in ${activeTab} status`
                  }
                </p>
                {activeTab === 'all' && (
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Minutes
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {getFilteredMinutes().map((minutesItem) => (
                <Card key={minutesItem.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{minutesItem.title}</CardTitle>
                        <CardDescription className="flex items-center gap-4 mt-2">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Meeting: {formatDate(minutesItem.meeting_date)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            Created: {formatDate(minutesItem.created_at)}
                          </span>
                          {minutesItem.creator && (
                            <span>By: {minutesItem.creator.full_name}</span>
                          )}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(minutesItem.status)}
                        {(minutesItem.comment_count && minutesItem.comment_count > 0) && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {minutesItem.comment_count} comment{minutesItem.comment_count !== 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Voting Information */}
                      {minutesItem.status === 'voting' && (
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="font-medium text-blue-900">Voting Progress</h4>
                            <span className="text-sm text-blue-700">
                              Deadline: {minutesItem.voting_deadline ? formatDateTime(minutesItem.voting_deadline) : 'No deadline'}
                            </span>
                          </div>
                          <div className="grid grid-cols-4 gap-4 text-sm">
                            <div className="text-center">
                              <div className="font-medium text-green-600">{minutesItem.approve_votes || 0}</div>
                              <div className="text-gray-600">Approve</div>
                            </div>
                            <div className="text-center">
                              <div className="font-medium text-red-600">{minutesItem.reject_votes || 0}</div>
                              <div className="text-gray-600">Reject</div>
                            </div>
                            <div className="text-center">
                              <div className="font-medium text-gray-600">{minutesItem.abstain_votes || 0}</div>
                              <div className="text-gray-600">Abstain</div>
                            </div>
                            <div className="text-center">
                              <div className="font-medium text-blue-600">
                                {(minutesItem.total_votes || 0) > 0
                                  ? (((minutesItem.approve_votes || 0) / (minutesItem.total_votes || 1)) * 100).toFixed(1)
                                  : '0.0'
                                }%
                              </div>
                              <div className="text-gray-600">Approval</div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Completed Voting Results */}
                      {['passed', 'failed'].includes(minutesItem.status) && (
                        <div className={`p-4 rounded-lg ${minutesItem.status === 'passed' ? 'bg-green-50' : 'bg-red-50'}`}>
                          <h4 className={`font-medium mb-2 ${minutesItem.status === 'passed' ? 'text-green-900' : 'text-red-900'}`}>
                            Final Results - {minutesItem.status === 'passed' ? 'Passed' : 'Failed'}
                          </h4>
                          <div className="grid grid-cols-4 gap-4 text-sm">
                            <div className="text-center">
                              <div className="font-medium text-green-600">{minutesItem.approve_votes || 0}</div>
                              <div className="text-gray-600">Approve</div>
                            </div>
                            <div className="text-center">
                              <div className="font-medium text-red-600">{minutesItem.reject_votes || 0}</div>
                              <div className="text-gray-600">Reject</div>
                            </div>
                            <div className="text-center">
                              <div className="font-medium text-gray-600">{minutesItem.abstain_votes || 0}</div>
                              <div className="text-gray-600">Abstain</div>
                            </div>
                            <div className="text-center">
                              <div className="font-medium">
                                {(minutesItem.total_votes || 0) > 0
                                  ? (((minutesItem.approve_votes || 0) / (minutesItem.total_votes || 1)) * 100).toFixed(1)
                                  : '0.0'
                                }%
                              </div>
                              <div className="text-gray-600">Approval</div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedMinutes(minutesItem);
                            setShowDetailsDialog(true);
                          }}
                        >
                          View Details
                        </Button>

                        {/* Show View Comments button for minutes with voting status or completed */}
                        {(['voting', 'passed', 'failed'].includes(minutesItem.status)) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedMinutes(minutesItem);
                              setShowCommentsDialog(true);
                            }}
                            className="flex items-center gap-1"
                          >
                            <MessageSquare className="h-3 w-3" />
                            View Comments
                            {(minutesItem.comment_count && minutesItem.comment_count > 0) && (
                              <Badge variant="secondary" className="ml-1 px-1 py-0 text-xs">
                                {minutesItem.comment_count}
                              </Badge>
                            )}
                          </Button>
                        )}

                        {minutesItem.status === 'draft' && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedMinutes(minutesItem);
                              setShowPublishDialog(true);
                            }}
                          >
                            Publish for Voting
                          </Button>
                        )}

                        {minutesItem.status === 'draft' && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteMinutes(minutesItem.id)}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <CreateMinutesDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={handleCreateMinutes}
      />

      {selectedMinutes && (
        <>
          <MinutesDetailsDialog
            open={showDetailsDialog}
            onOpenChange={setShowDetailsDialog}
            minutes={selectedMinutes}
          />

          <PublishMinutesDialog
            open={showPublishDialog}
            onOpenChange={setShowPublishDialog}
            minutes={selectedMinutes}
            onPublish={handlePublishMinutes}
          />

          <AdminCommentView
            open={showCommentsDialog}
            onOpenChange={setShowCommentsDialog}
            minutes={selectedMinutes}
          />
        </>
      )}
    </div>
    </MinutesErrorBoundary>
  );
}