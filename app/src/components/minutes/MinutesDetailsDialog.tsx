'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, 
  FileText, 
  CheckSquare, 
  Users, 
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  User
} from 'lucide-react';

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
  approval_percentage?: number;
  creator?: {
    full_name: string;
    email: string;
  };
}

interface Vote {
  id: string;
  vote: 'approve' | 'reject' | 'abstain';
  comment?: string;
  voted_at: string;
  voter?: {
    full_name: string;
    email: string;
  };
}

interface MinutesDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  minutes: Minutes;
}

export function MinutesDetailsDialog({ open, onOpenChange, minutes }: MinutesDetailsDialogProps) {
  const [votes, setVotes] = useState<Vote[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && minutes && ['voting', 'passed', 'failed'].includes(minutes.status)) {
      fetchVotingData();
    }
  }, [open, minutes]);

  const fetchVotingData = async () => {
    try {
      setLoading(true);
      const [votesResponse, statsResponse] = await Promise.all([
        fetch(`/api/minutes/${minutes.id}?includeVotes=true`),
        fetch(`/api/minutes/${minutes.id}?includeStats=true`)
      ]);

      if (votesResponse.ok) {
        const votesData = await votesResponse.json();
        setVotes(votesData.votes || []);
      }

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStatistics(statsData.statistics);
      }
    } catch (error) {
      console.error('Error fetching voting data:', error);
    } finally {
      setLoading(false);
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

  const getVoteBadge = (vote: string) => {
    const voteConfig = {
      approve: { label: 'Approve', variant: 'default' as const, className: 'bg-green-100 text-green-800' },
      reject: { label: 'Reject', variant: 'destructive' as const, className: 'bg-red-100 text-red-800' },
      abstain: { label: 'Abstain', variant: 'secondary' as const, className: 'bg-gray-100 text-gray-800' },
    };

    const config = voteConfig[vote as keyof typeof voteConfig];
    return (
      <Badge className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <DialogTitle className="text-xl">{minutes.title}</DialogTitle>
            </div>
            {getStatusBadge(minutes.status)}
          </div>
          <DialogDescription className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Meeting: {formatDate(minutes.meeting_date)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Created: {formatDate(minutes.created_at)}
            </span>
            {minutes.creator && (
              <span className="flex items-center gap-1">
                <User className="h-4 w-4" />
                By: {minutes.creator.full_name}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="content" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="voting" disabled={!['voting', 'passed', 'failed'].includes(minutes.status)}>
              Voting Results
            </TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="space-y-6">
            {/* Meeting Content */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Meeting Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {minutes.content}
                </div>
              </CardContent>
            </Card>

            {/* Key Decisions */}
            {minutes.key_decisions && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckSquare className="h-5 w-5" />
                    Key Decisions Made
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {minutes.key_decisions}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Items */}
            {minutes.action_items && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Action Items & Follow-ups
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {minutes.action_items}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="voting" className="space-y-6">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <>
                {/* Voting Statistics */}
                {statistics && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Voting Statistics</CardTitle>
                      <CardDescription>
                        {minutes.voting_deadline && (
                          <span>Deadline: {formatDateTime(minutes.voting_deadline)}</span>
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">{statistics.approve_votes}</div>
                          <div className="text-sm text-gray-600">Approve</div>
                        </div>
                        <div className="text-center p-4 bg-red-50 rounded-lg">
                          <div className="text-2xl font-bold text-red-600">{statistics.reject_votes}</div>
                          <div className="text-sm text-gray-600">Reject</div>
                        </div>
                        <div className="text-center p-4 bg-gray-50 rounded-lg">
                          <div className="text-2xl font-bold text-gray-600">{statistics.abstain_votes}</div>
                          <div className="text-sm text-gray-600">Abstain</div>
                        </div>
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">
                            {statistics.approval_percentage ? statistics.approval_percentage.toFixed(1) : '0.0'}%
                          </div>
                          <div className="text-sm text-gray-600">Approval</div>
                        </div>
                        <div className="text-center p-4 bg-purple-50 rounded-lg">
                          <div className="text-2xl font-bold text-purple-600">
                            {statistics.participation_percentage ? statistics.participation_percentage.toFixed(1) : '0.0'}%
                          </div>
                          <div className="text-sm text-gray-600">Participation</div>
                        </div>
                      </div>
                      
                      <div className="mt-4 text-sm text-gray-600">
                        <p>{statistics.total_votes} of {statistics.total_eligible_voters} eligible voters have participated</p>
                        <p className="mt-1">
                          {(statistics.approval_percentage || 0) >= 75 
                            ? '✅ Minutes will pass (≥75% approval required)'
                            : '❌ Minutes will fail (<75% approval)'
                          }
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Individual Votes */}
                <Card>
                  <CardHeader>
                    <CardTitle>Individual Votes ({votes.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {votes.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">No votes cast yet</p>
                    ) : (
                      <div className="space-y-3">
                        {votes.map((vote) => (
                          <div key={vote.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium">
                                  {vote.voter?.full_name || 'Anonymous'}
                                </span>
                                {getVoteBadge(vote.vote)}
                              </div>
                              {vote.comment && (
                                <p className="text-sm text-gray-600 mt-1">{vote.comment}</p>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 ml-4">
                              {formatDateTime(vote.voted_at)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="details" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Minutes Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-gray-500">Status</div>
                    <div className="mt-1">{getStatusBadge(minutes.status)}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">Meeting Date</div>
                    <div className="mt-1">{formatDate(minutes.meeting_date)}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">Created</div>
                    <div className="mt-1">{formatDateTime(minutes.created_at)}</div>
                  </div>
                  {minutes.voting_deadline && (
                    <div>
                      <div className="text-sm font-medium text-gray-500">Voting Deadline</div>
                      <div className="mt-1">{formatDateTime(minutes.voting_deadline)}</div>
                    </div>
                  )}
                  {minutes.creator && (
                    <div>
                      <div className="text-sm font-medium text-gray-500">Created By</div>
                      <div className="mt-1">{minutes.creator.full_name}</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}