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
    Vote,
    RefreshCw,
    Eye
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { ResolutionDetailView } from './ResolutionDetailView';
import { Database } from '@/types/database';

type Resolution = Database['public']['Tables']['resolutions']['Row'] & {
    profiles?: { full_name: string | null; email: string } | null;
    categories?: { name: string; color: string | null } | null;
    voting_stats?: {
        total_votes: number;
        participation_rate: number;
        approval_rate: number;
    };
};

interface UserVote {
    id: string;
    vote: 'approve' | 'reject' | 'abstain';
    vote_reason?: string;
    voted_at: string;
}

export function ResolutionVoting() {
    const [resolutions, setResolutions] = useState<Resolution[]>([]);
    const [userVotes, setUserVotes] = useState<Record<string, UserVote>>({});
    const [loading, setLoading] = useState(true);
    const [votingLoading, setVotingLoading] = useState<string | null>(null);
    const [voteComments, setVoteComments] = useState<Record<string, string>>({});
    const [refreshing, setRefreshing] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        fetchResolutions();
    }, []);

    // Real-time subscription for resolution changes
    useRealtimeSubscription({
        table: 'resolutions',
        onUpdate: (payload) => {
            console.log('Resolution updated:', payload);
            if (payload.new && typeof payload.new === 'object' && 'id' in payload.new && payload.new.id) {
                setResolutions(prev => prev.map(r =>
                    r.id === (payload.new as any).id ? { ...r, ...payload.new } : r
                ));
            }
        },
        onChange: () => {
            // Refresh data when any resolution changes
            fetchResolutions(true);
        }
    });

    // Real-time subscription for resolution votes
    useRealtimeSubscription({
        table: 'resolution_votes',
        onInsert: (payload) => {
            console.log('New vote cast:', payload);
            // Refresh data to get updated vote counts
            fetchResolutions(true);
        },
        onUpdate: (payload) => {
            console.log('Vote updated:', payload);
            // Refresh data to get updated vote counts
            fetchResolutions(true);
        },
        onDelete: (payload) => {
            console.log('Vote deleted:', payload);
            // Refresh data to get updated vote counts
            fetchResolutions(true);
        }
    });

    const fetchResolutions = async (silent = false) => {
        const fetchId = Math.random().toString(36).substring(7);
        console.log(`[${fetchId}] Starting fetchResolutions... (silent: ${silent})`);

        try {
            if (!silent) {
                setLoading(true);
            } else {
                setRefreshing(true);
            }

            // Fetch resolutions from API
            const response = await fetch('/api/resolutions?status=voting,approved,rejected', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch resolutions: ${response.statusText}`);
            }

            const data = await response.json();
            console.log(`[${fetchId}] Fetched ${data.resolutions?.length || 0} resolutions`);
            console.log(`[${fetchId}] Resolution data:`, data.resolutions?.map((r: Resolution) => ({
                id: r.id,
                title: r.title,
                votes_for: r.votes_for,
                votes_against: r.votes_against,
                votes_abstain: r.votes_abstain,
                status: r.status
            })));
            setResolutions(data.resolutions || []);

        // Fetch user votes for voting resolutions
        const votingResolutions = (data.resolutions || []).filter((r: Resolution) => r.status === 'voting');
        console.log(`[${fetchId}] Found ${votingResolutions.length} voting resolutions`);

        const votes: Record<string, UserVote> = {};
        const comments: Record<string, string> = {};

        // Fetch votes in parallel
        await Promise.all(
            votingResolutions.map(async (resolution: Resolution) => {
                try {
                    console.log(`[${fetchId}] Fetching vote for resolution ${resolution.id}...`);
                    const voteResponse = await fetch(`/api/resolutions/${resolution.id}/vote`, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    });

                    if (voteResponse.ok) {
                        const voteData = await voteResponse.json();
                        if (voteData.vote) {
                            votes[resolution.id] = voteData.vote;
                            comments[resolution.id] = voteData.vote.vote_reason || '';
                            console.log(`[${fetchId}] Found existing vote for ${resolution.id}:`, voteData.vote.vote);
                        } else {
                            console.log(`[${fetchId}] No vote found for ${resolution.id}`);
                        }
                    }
                } catch (error) {
                    console.error(`[${fetchId}] Error fetching vote for resolution ${resolution.id}:`, error);
                }
            })
        );

        console.log(`[${fetchId}] Setting user votes:`, votes);
        setUserVotes(votes);
        setVoteComments(prev => ({ ...prev, ...comments }));

        console.log(`[${fetchId}] fetchResolutions completed successfully`);

    } catch (error) {
        console.error(`[${fetchId}] Error fetching resolutions:`, error);
        if (!silent) {
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Failed to load resolutions',
                variant: 'destructive',
            });
        }
    } finally {
        setLoading(false);
        setRefreshing(false);
    }
};

const handleVote = async (resolutionId: string, vote: 'approve' | 'reject' | 'abstain', comment?: string) => {
    const voteId = Math.random().toString(36).substring(7);
    console.log(`[${voteId}] Starting vote submission:`, { resolutionId, vote, hasComment: !!voteComments[resolutionId] });

    try {
        setVotingLoading(resolutionId);

        const commentToSend = comment || voteComments[resolutionId] || null;
        console.log(`[${voteId}] Sending vote with comment:`, { vote, comment: commentToSend, hasComment: !!commentToSend });

        const response = await fetch(`/api/resolutions/${resolutionId}/vote`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                vote,
                comment: commentToSend,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to submit vote');
        }

        console.log(`[${voteId}] Vote recorded successfully:`, data.vote);

        // Update local state immediately for better UX
        setUserVotes(prev => ({
            ...prev,
            [resolutionId]: data.vote
        }));

        // Clear the comment for this resolution
        setVoteComments(prev => ({
            ...prev,
            [resolutionId]: ''
        }));

        // Don't update counts optimistically - wait for server refresh to avoid inconsistencies
        // The server will return the correct counts after the database triggers run

        toast({
            title: 'Vote Submitted',
            description: data.message || `Your ${vote} vote has been recorded`,
        });

        // Refresh data immediately to get updated vote counts from server
        fetchResolutions(true);

        console.log(`[${voteId}] Vote submission completed successfully`);

    } catch (error) {
        console.error(`[${voteId}] Error casting vote:`, error);

        // If it's a "already voted" error, refresh to get current state
        if (error instanceof Error && error.message.includes('already voted')) {
            console.log(`[${voteId}] User has already voted, refreshing data...`);
            fetchResolutions(true);
        }

        toast({
            title: 'Error',
            description: error instanceof Error ? error.message : 'Failed to submit vote',
            variant: 'destructive',
        });

        // Refresh data immediately to get current state
        fetchResolutions(true);

    } finally {
        setVotingLoading(null);
    }
};

if (loading) {
    return (
        <div className="flex items-center justify-center h-64">
            <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading resolutions...</p>
            </div>
        </div>
    );
}

const getStatusBadge = (status: Resolution['status']) => {
    const statusConfig = {
        draft: { label: 'Draft', variant: 'secondary' as const, icon: AlertCircle },
        under_review: { label: 'Under Review', variant: 'default' as const, icon: FileText },
        published: { label: 'Published', variant: 'default' as const, icon: Calendar },
        voting: { label: 'Voting Open', variant: 'default' as const, icon: Vote },
        approved: { label: 'Approved', variant: 'default' as const, icon: CheckCircle },
        rejected: { label: 'Rejected', variant: 'destructive' as const, icon: XCircle },
        archived: { label: 'Archived', variant: 'secondary' as const, icon: XCircle },
    };

    const statusKey = (status || 'draft') as keyof typeof statusConfig;
    const config = statusConfig[statusKey];
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
        approve: { label: 'Approve', icon: ThumbsUp, className: 'bg-green-100 text-green-800' },
        reject: { label: 'Reject', icon: ThumbsDown, className: 'bg-red-100 text-red-800' },
        abstain: { label: 'Abstain', icon: Minus, className: 'bg-gray-100 text-gray-800' },
        // Legacy support
        for: { label: 'For', icon: ThumbsUp, className: 'bg-green-100 text-green-800' },
        against: { label: 'Against', icon: ThumbsDown, className: 'bg-red-100 text-red-800' },
    };

    const config = voteConfig[vote as keyof typeof voteConfig];
    if (!config) return null;

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

const formatDateTime = (dateString: string | null | undefined) => {
    if (!dateString) return 'Unknown date';
    return new Date(dateString).toLocaleString();
};

const votingResolutions = resolutions.filter(r => r.status === 'voting');
const completedResolutions = resolutions.filter(r => ['approved', 'rejected'].includes(r.status || ''));

return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Resolution Voting</h1>
                <p className="text-gray-600">Review and vote on board resolutions</p>
            </div>
            <Button
                variant="outline"
                size="sm"
                onClick={() => fetchResolutions()}
                disabled={loading || refreshing}
                className="flex items-center gap-2"
            >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
        </div>

        {/* Voting Section */}
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                    Resolutions Requiring Your Vote ({votingResolutions.length})
                </h2>
            </div>

            {votingResolutions.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Vote className="h-12 w-12 text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No resolutions awaiting votes</h3>
                        <p className="text-gray-600 text-center">
                            There are currently no resolutions open for voting
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {votingResolutions.map((resolution) => {
                        const userVote = userVotes[resolution.id];
                        const isExpired = isVotingExpired(resolution.voting_deadline ?? undefined);
                        const canVote = !isExpired;

                        return (
                            <Card key={resolution.id} className="hover:shadow-md transition-shadow">
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <CardTitle className="text-lg">{resolution.title}</CardTitle>
                                            <CardDescription className="flex items-center gap-4 mt-2">
                                                <span className="flex items-center gap-1">
                                                    <FileText className="h-4 w-4" />
                                                    {resolution.resolution_number}
                                                </span>
                                                {resolution.voting_deadline && (
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="h-4 w-4" />
                                                        Deadline: {formatDateTime(resolution.voting_deadline)}
                                                    </span>
                                                )}
                                            </CardDescription>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {userVote && getVoteBadge(userVote.vote)}
                                            {getStatusBadge(resolution.status)}
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {/* Content Preview */}
                                        <div>
                                            <p className="text-sm text-gray-600 line-clamp-3">
                                                {resolution.content.substring(0, 300)}...
                                            </p>
                                            <div className="mt-3">
                                                <ResolutionDetailView
                                                    resolution={resolution}
                                                    userVote={userVote}
                                                    onVote={async (vote, comment) => {
                                                        await handleVote(resolution.id, vote, comment);
                                                    }}
                                                    canVote={canVote && !userVote}
                                                    trigger={
                                                        <Button variant="outline" size="sm" className="flex items-center gap-2">
                                                            <Eye className="h-4 w-4" />
                                                            View Full Details
                                                        </Button>
                                                    }
                                                />
                                            </div>
                                        </div>

                                        {/* Voting Progress */}
                                        <div className="bg-blue-50 p-4 rounded-lg">
                                            <div className="flex justify-between items-center mb-3">
                                                <h4 className="font-medium text-blue-900">Voting Progress</h4>
                                                <span className="text-sm text-blue-700">
                                                    {((resolution.votes_for || 0) > 0
                                                        ? (((resolution.votes_for || 0) / Math.max(1, (resolution.votes_for || 0) + (resolution.votes_against || 0) + (resolution.votes_abstain || 0))) * 100).toFixed(1)
                                                        : '0.0'
                                                    )}% for
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                                                <div className="text-center">
                                                    <div className="font-medium text-green-600">{resolution.votes_for || 0}</div>
                                                    <div className="text-gray-600">For</div>
                                                </div>
                                                <div className="text-center">
                                                    <div className="font-medium text-red-600">{resolution.votes_against || 0}</div>
                                                    <div className="text-gray-600">Against</div>
                                                </div>
                                                <div className="text-center">
                                                    <div className="font-medium text-gray-600">{resolution.votes_abstain || 0}</div>
                                                    <div className="text-gray-600">Abstain</div>
                                                </div>
                                            </div>

                                            {/* Voting Actions */}
                                            {canVote && !userVote && (
                                                <div className="space-y-3">
                                                    <div>
                                                        <Label htmlFor={`comment-${resolution.id}`} className="text-sm font-medium">
                                                            Comment (optional)
                                                        </Label>
                                                        <Textarea
                                                            id={`comment-${resolution.id}`}
                                                            placeholder="Add a comment about your vote..."
                                                            value={voteComments[resolution.id] || ''}
                                                            onChange={(e) => setVoteComments(prev => ({
                                                                ...prev,
                                                                [resolution.id]: e.target.value
                                                            }))}
                                                            rows={2}
                                                            className="mt-1"
                                                        />
                                                    </div>

                                                    <div className="flex gap-2">
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleVote(resolution.id, 'approve')}
                                                            disabled={votingLoading === resolution.id}
                                                            className="bg-green-600 hover:bg-green-700"
                                                        >
                                                            <ThumbsUp className="h-4 w-4 mr-1" />
                                                            {votingLoading === resolution.id ? 'Voting...' : 'Approve'}
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="destructive"
                                                            onClick={() => handleVote(resolution.id, 'reject')}
                                                            disabled={votingLoading === resolution.id}
                                                        >
                                                            <ThumbsDown className="h-4 w-4 mr-1" />
                                                            {votingLoading === resolution.id ? 'Voting...' : 'Reject'}
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleVote(resolution.id, 'abstain')}
                                                            disabled={votingLoading === resolution.id}
                                                        >
                                                            <Minus className="h-4 w-4 mr-1" />
                                                            {votingLoading === resolution.id ? 'Voting...' : 'Abstain'}
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
                                                    {userVote.vote_reason && (
                                                        <p className="text-sm text-gray-600 mt-2">{userVote.vote_reason}</p>
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
                                                        Voting deadline has passed. You did not vote on this resolution.
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
                    Completed Resolutions ({completedResolutions.length})
                </h2>
            </div>

            {completedResolutions.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-8">
                        <CheckCircle className="h-8 w-8 text-gray-400 mb-2" />
                        <p className="text-gray-600">No completed resolutions</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {completedResolutions.map((resolution) => {
                        const userVote = userVotes[resolution.id];

                        return (
                            <Card key={resolution.id}>
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <CardTitle className="text-lg">{resolution.title}</CardTitle>
                                            <CardDescription>
                                                {resolution.resolution_number}
                                            </CardDescription>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {userVote && getVoteBadge(userVote.vote)}
                                            {getStatusBadge(resolution.status)}
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                                        <div className="text-center">
                                            <div className="font-medium text-green-600">{resolution.votes_for || 0}</div>
                                            <div className="text-gray-600">For</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="font-medium text-red-600">{resolution.votes_against || 0}</div>
                                            <div className="text-gray-600">Against</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="font-medium text-gray-600">{resolution.votes_abstain || 0}</div>
                                            <div className="text-gray-600">Abstain</div>
                                        </div>
                                    </div>

                                    <div className="flex justify-center">
                                        <ResolutionDetailView
                                            resolution={resolution}
                                            userVote={userVote}
                                            canVote={false}
                                            trigger={
                                                <Button variant="outline" size="sm" className="flex items-center gap-2">
                                                    <Eye className="h-4 w-4" />
                                                    View Details
                                                </Button>
                                            }
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    </div>
);
}