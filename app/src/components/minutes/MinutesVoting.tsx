'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Calendar,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    ThumbsUp,
    ThumbsDown,
    Minus,
    FileText,
    Users
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { MinutesDetailView } from './MinutesDetailView';

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

interface UserVote {
    id: string;
    vote: 'approve' | 'reject' | 'abstain';
    comment?: string;
    voted_at: string;
}

export function MinutesVoting() {
    const [minutes, setMinutes] = useState<Minutes[]>([]);
    const [userVotes, setUserVotes] = useState<Record<string, UserVote>>({});
    const [loading, setLoading] = useState(true);
    const [votingLoading, setVotingLoading] = useState<string | null>(null);
    
    // Detail view state
    const [selectedMinutes, setSelectedMinutes] = useState<Minutes | null>(null);
    const [showDetailView, setShowDetailView] = useState(false);

    const [voteComments, setVoteComments] = useState<Record<string, string>>({});
    const { toast } = useToast();

    useEffect(() => {
        fetchMinutes();
    }, []);

    const fetchMinutes = async () => {
        const fetchId = Math.random().toString(36).substring(7);
        console.log(`[${fetchId}] Starting fetchMinutes...`);
        
        try {
            setLoading(true);
            
            console.log(`[${fetchId}] Fetching minutes from API...`);
            const response = await fetch('/api/minutes?includeCreator=true');
            
            console.log(`[${fetchId}] Minutes API response status:`, response.status);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch minutes: ${response.status}`);
            }

            const data = await response.json();
            const allMinutes = data.minutes || [];
            console.log(`[${fetchId}] Fetched ${allMinutes.length} total minutes:`, allMinutes.map((m: Minutes) => ({ id: m.id, title: m.title, status: m.status })));

            // Filter minutes that are relevant for board members
            // Show all minutes except drafts (board members shouldn't see drafts)
            const relevantMinutes = allMinutes.filter((m: Minutes) =>
                m.status !== 'draft'
            );
            console.log(`[${fetchId}] Filtered to ${relevantMinutes.length} relevant minutes:`, relevantMinutes.map((m: Minutes) => ({ id: m.id, title: m.title, status: m.status })));

            setMinutes(relevantMinutes);

            // Fetch user votes for voting minutes
            const votingMinutes = relevantMinutes.filter((m: Minutes) => m.status === 'voting');
            console.log(`[${fetchId}] Found ${votingMinutes.length} voting minutes:`, votingMinutes.map((m: Minutes) => ({ id: m.id, title: m.title })));
            
            const votes: Record<string, UserVote> = {};
            const voteComments: Record<string, string> = {};

            for (const minutesItem of votingMinutes) {
                try {
                    console.log(`[${fetchId}] Fetching vote for minutes ${minutesItem.id}...`);
                    const voteResponse = await fetch(`/api/minutes/${minutesItem.id}/vote`);
                    
                    console.log(`[${fetchId}] Vote response for ${minutesItem.id}:`, voteResponse.status);
                    
                    if (voteResponse.ok) {
                        const voteData = await voteResponse.json();
                        console.log(`[${fetchId}] Vote data for ${minutesItem.id}:`, voteData);
                        
                        if (voteData.success && voteData.vote) {
                            votes[minutesItem.id] = voteData.vote;
                            voteComments[minutesItem.id] = voteData.vote.comments || '';
                            console.log(`[${fetchId}] Found existing vote for ${minutesItem.id}:`, voteData.vote.vote);
                        } else {
                            console.log(`[${fetchId}] No vote found for ${minutesItem.id}`);
                        }
                    } else {
                        console.warn(`[${fetchId}] Failed to fetch vote for ${minutesItem.id}:`, voteResponse.status);
                    }
                } catch (error) {
                    console.error(`[${fetchId}] Error fetching vote for minutes ${minutesItem.id}:`, error);
                }
            }

            console.log(`[${fetchId}] Setting user votes:`, votes);
            setUserVotes(votes);
            
            console.log(`[${fetchId}] Setting vote comments:`, voteComments);
            setVoteComments(prev => ({ ...prev, ...voteComments }));
            
            console.log(`[${fetchId}] fetchMinutes completed successfully`);
            
        } catch (error) {
            console.error(`[${fetchId}] Error fetching minutes:`, error);
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Failed to load minutes',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetails = (minutesItem: Minutes) => {
        setSelectedMinutes(minutesItem);
        setShowDetailView(true);
    };

    const handleDetailViewVote = async (vote: 'approve' | 'reject' | 'abstain', comment?: string) => {
        if (!selectedMinutes) return;
        
        try {
            const response = await fetch(`/api/minutes/${selectedMinutes.id}/vote`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    vote,
                    comment,
                }),
            });

            if (!response.ok) throw new Error('Failed to cast vote');

            const data = await response.json();

            // Update user vote
            setUserVotes(prev => ({
                ...prev,
                [selectedMinutes.id]: data.vote
            }));

            // Update minutes with new statistics
            setMinutes(prev => prev.map(m =>
                m.id === selectedMinutes.id ? { ...m, ...data.minutes } : m
            ));

            // Close detail view
            setShowDetailView(false);
            setSelectedMinutes(null);

            // Refresh the minutes list to ensure we have the latest data
            setTimeout(() => fetchMinutes(), 1000);

            return Promise.resolve();
        } catch (error) {
            console.error('Error casting vote:', error);
            throw error;
        }
    };

    const handleVote = async (minutesId: string, vote: 'approve' | 'reject' | 'abstain') => {
        const voteId = Math.random().toString(36).substring(7);
        console.log(`[${voteId}] Starting vote submission:`, { minutesId, vote, hasComment: !!voteComments[minutesId] });
        
        try {
            setVotingLoading(minutesId);

            const requestBody = {
                vote,
                comments: voteComments[minutesId] || undefined,
            };

            console.log(`[${voteId}] Sending vote request:`, requestBody);

            const response = await fetch(`/api/minutes/${minutesId}/vote`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            });

            console.log(`[${voteId}] Response status:`, response.status);

            let data;
            try {
                data = await response.json();
                console.log(`[${voteId}] Response data:`, data);
            } catch (parseError) {
                console.error(`[${voteId}] Failed to parse response JSON:`, parseError);
                throw new Error('Invalid response from server');
            }

            if (!response.ok) {
                const errorMessage = data?.error || `HTTP ${response.status}`;
                const errorCode = data?.code || 'UNKNOWN_ERROR';
                console.error(`[${voteId}] Vote submission failed:`, { status: response.status, error: errorMessage, code: errorCode });
                
                throw new Error(`${errorMessage} (${errorCode})`);
            }

            if (!data.success) {
                console.error(`[${voteId}] Vote submission returned success=false:`, data);
                throw new Error(data.error || 'Vote submission failed');
            }

            if (!data.vote) {
                console.error(`[${voteId}] No vote data in response:`, data);
                throw new Error('No vote data returned from server');
            }

            console.log(`[${voteId}] Vote submitted successfully:`, data.vote);

            // Update user vote immediately
            setUserVotes(prev => {
                const updated = {
                    ...prev,
                    [minutesId]: data.vote
                };
                console.log(`[${voteId}] Updated user votes:`, updated);
                return updated;
            });

            // Update minutes with new statistics if available
            if (data.minutes) {
                setMinutes(prev => {
                    const updated = prev.map(m =>
                        m.id === minutesId ? { ...m, ...data.minutes } : m
                    );
                    console.log(`[${voteId}] Updated minutes:`, updated.find(m => m.id === minutesId));
                    return updated;
                });
            } else {
                console.warn(`[${voteId}] No updated minutes data in response`);
            }

            // Verify the vote was saved by fetching it again
            console.log(`[${voteId}] Verifying vote was saved...`);
            try {
                const verifyResponse = await fetch(`/api/minutes/${minutesId}/vote`);
                if (verifyResponse.ok) {
                    const verifyData = await verifyResponse.json();
                    console.log(`[${voteId}] Vote verification:`, verifyData);
                    
                    if (verifyData.success && verifyData.vote) {
                        // Update with verified vote data
                        setUserVotes(prev => ({
                            ...prev,
                            [minutesId]: verifyData.vote
                        }));
                    } else {
                        console.warn(`[${voteId}] Vote verification failed - vote not found in database`);
                    }
                } else {
                    console.warn(`[${voteId}] Vote verification request failed:`, verifyResponse.status);
                }
            } catch (verifyError) {
                console.warn(`[${voteId}] Vote verification error:`, verifyError);
            }

            // Refresh the minutes list to ensure we have the latest data
            console.log(`[${voteId}] Scheduling data refresh...`);
            setTimeout(() => {
                console.log(`[${voteId}] Refreshing minutes data...`);
                fetchMinutes();
            }, 1000);

            toast({
                title: 'Vote Submitted',
                description: `Your ${vote} vote has been recorded`,
            });

            console.log(`[${voteId}] Vote submission completed successfully`);

        } catch (error) {
            console.error(`[${voteId}] Error casting vote:`, error);
            
            let errorMessage = 'Failed to submit vote';
            if (error instanceof Error) {
                errorMessage = error.message;
            }

            toast({
                title: 'Error',
                description: errorMessage,
                variant: 'destructive',
            });

            // Try to refresh data even on error to get current state
            setTimeout(() => {
                console.log(`[${voteId}] Refreshing data after error...`);
                fetchMinutes();
            }, 2000);

        } finally {
            setVotingLoading(null);
        }
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

    const getStatusBadge = (status: Minutes['status']) => {
        const statusConfig = {
            draft: { label: 'Draft', variant: 'secondary' as const, icon: AlertCircle },
            published: { label: 'Published', variant: 'default' as const, icon: Calendar },
            voting: { label: 'Voting Open', variant: 'default' as const, icon: Users },
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
            approve: { label: 'Approved', icon: ThumbsUp, className: 'bg-green-100 text-green-800' },
            reject: { label: 'Rejected', icon: ThumbsDown, className: 'bg-red-100 text-red-800' },
            abstain: { label: 'Abstained', icon: Minus, className: 'bg-gray-100 text-gray-800' },
        };

        const config = voteConfig[vote as keyof typeof voteConfig];
        const Icon = config.icon;

        return (
            <Badge className={`${config.className} flex items-center gap-1`}>
                <Icon className="h-3 w-3" />
                {config.label}
            </Badge>
        );
    };

    const isVotingExpired = (deadline?: string) => {
        if (!deadline) return false;
        return new Date(deadline) < new Date();
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString();
    };

    const formatDateTime = (dateString: string) => {
        return new Date(dateString).toLocaleString();
    };

    const votingMinutes = minutes.filter(m => m.status === 'voting');
    const completedMinutes = minutes.filter(m => ['passed', 'failed'].includes(m.status));

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Meeting Minutes</h1>
                <p className="text-gray-600">Review and vote on meeting minutes</p>
            </div>

            {/* Voting Section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">
                        Minutes Requiring Your Vote ({votingMinutes.length})
                    </h2>
                </div>

                {votingMinutes.length === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <Users className="h-12 w-12 text-gray-400 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No minutes awaiting votes</h3>
                            <p className="text-gray-600 text-center">
                                There are currently no minutes open for voting
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4">
                        {votingMinutes.map((minutesItem) => {
                            const userVote = userVotes[minutesItem.id];
                            const isExpired = isVotingExpired(minutesItem.voting_deadline);
                            const canVote = !isExpired;

                            return (
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
                                                    {minutesItem.voting_deadline && (
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="h-4 w-4" />
                                                            Deadline: {formatDateTime(minutesItem.voting_deadline)}
                                                        </span>
                                                    )}
                                                </CardDescription>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {userVote && getVoteBadge(userVote.vote)}
                                                {getStatusBadge(minutesItem.status)}
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            {/* Content Preview */}
                                            <div>
                                                <p className="text-sm text-gray-600 line-clamp-3">
                                                    {minutesItem.content.substring(0, 300)}...
                                                </p>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleViewDetails(minutesItem)}
                                                    className="mt-2"
                                                >
                                                    <FileText className="h-4 w-4 mr-1" />
                                                    View Full Details
                                                </Button>
                                            </div>

                                            {/* Voting Progress */}
                                            <div className="bg-blue-50 p-4 rounded-lg">
                                                <div className="flex justify-between items-center mb-3">
                                                    <h4 className="font-medium text-blue-900">Voting Progress</h4>
                                                    <span className="text-sm text-blue-700">
                                                        {((minutesItem.total_votes || 0) > 0 
                                                            ? (((minutesItem.approve_votes || 0) / (minutesItem.total_votes || 1)) * 100).toFixed(1)
                                                            : '0.0'
                                                        )}% approval
                                                    </span>
                                                </div>

                                                <div className="grid grid-cols-3 gap-4 text-sm mb-4">
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
                                                </div>

                                                {/* Voting Actions */}
                                                {canVote && !userVote && (
                                                    <div className="space-y-3">
                                                        <div>
                                                            <Label htmlFor={`comment-${minutesItem.id}`} className="text-sm font-medium">
                                                                Comment (optional)
                                                            </Label>
                                                            <Textarea
                                                                id={`comment-${minutesItem.id}`}
                                                                placeholder="Add a comment about your vote..."
                                                                value={voteComments[minutesItem.id] || ''}
                                                                onChange={(e) => setVoteComments(prev => ({
                                                                    ...prev,
                                                                    [minutesItem.id]: e.target.value
                                                                }))}
                                                                rows={2}
                                                                className="mt-1"
                                                            />
                                                        </div>

                                                        <div className="flex gap-2">
                                                            <Button
                                                                size="sm"
                                                                onClick={() => handleVote(minutesItem.id, 'approve')}
                                                                disabled={votingLoading === minutesItem.id}
                                                                className="bg-green-600 hover:bg-green-700"
                                                            >
                                                                <ThumbsUp className="h-4 w-4 mr-1" />
                                                                Approve
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="destructive"
                                                                onClick={() => handleVote(minutesItem.id, 'reject')}
                                                                disabled={votingLoading === minutesItem.id}
                                                            >
                                                                <ThumbsDown className="h-4 w-4 mr-1" />
                                                                Reject
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => handleVote(minutesItem.id, 'abstain')}
                                                                disabled={votingLoading === minutesItem.id}
                                                            >
                                                                <Minus className="h-4 w-4 mr-1" />
                                                                Abstain
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Already Voted */}
                                                {userVote && (
                                                    <div className="bg-white p-3 rounded border">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-sm font-medium">Your vote:</span>
                                                            {getVoteBadge(userVote.vote)}
                                                        </div>
                                                        {userVote.comment && (
                                                            <p className="text-sm text-gray-600 mt-2">{userVote.comment}</p>
                                                        )}
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            Voted on {formatDateTime(userVote.voted_at)}
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Expired */}
                                                {isExpired && !userVote && (
                                                    <div className="bg-red-50 p-3 rounded border border-red-200">
                                                        <p className="text-sm text-red-700">
                                                            Voting deadline has passed. You did not vote on these minutes.
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Completed Section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">
                        Completed Minutes ({completedMinutes.length})
                    </h2>
                </div>

                {completedMinutes.length === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-8">
                            <FileText className="h-8 w-8 text-gray-400 mb-2" />
                            <p className="text-gray-600 text-center">No completed minutes to display</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4">
                        {completedMinutes.map((minutesItem) => (
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
                                            </CardDescription>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {getStatusBadge(minutesItem.status)}
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {/* Content Preview */}
                                        <div>
                                            <p className="text-sm text-gray-600 line-clamp-2">
                                                {minutesItem.content.substring(0, 200)}...
                                            </p>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleViewDetails(minutesItem)}
                                                className="mt-2"
                                            >
                                                <FileText className="h-4 w-4 mr-1" />
                                                View Full Details
                                            </Button>
                                        </div>

                                        {/* Final Results */}
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
                                                        {((minutesItem.total_votes || 0) > 0 
                                                            ? (((minutesItem.approve_votes || 0) / (minutesItem.total_votes || 1)) * 100).toFixed(1)
                                                            : '0.0'
                                                        )}%
                                                    </div>
                                                    <div className="text-gray-600">Approval</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Minutes Detail View Dialog */}
            {selectedMinutes && (
                <MinutesDetailView
                    open={showDetailView}
                    onOpenChange={setShowDetailView}
                    minutes={selectedMinutes}
                    userVote={userVotes[selectedMinutes.id]}
                    onVote={handleDetailViewVote}
                    canVote={selectedMinutes.status === 'voting' && !isVotingExpired(selectedMinutes.voting_deadline)}
                />
            )}
        </div>
    );
}