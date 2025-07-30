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
    approval_threshold?: number;
    minimum_quorum?: number;
    total_eligible_voters?: number;
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
        try {
            setLoading(true);

            // Single API call to get minutes with user votes included
            const response = await fetch('/api/minutes?includeCreator=true&includeUserVotes=true');

            if (!response.ok) {
                throw new Error(`Failed to fetch minutes: ${response.status}`);
            }

            const data = await response.json();
            const allMinutes = data.minutes || [];

            // Filter minutes that are relevant for board members
            // Show all minutes except drafts (board members shouldn't see drafts)
            const relevantMinutes = allMinutes.filter((m: Minutes) =>
                m.status !== 'draft'
            );

            setMinutes(relevantMinutes);

            // Extract user votes from the response
            const votes: Record<string, UserVote> = {};
            const voteComments: Record<string, string> = {};

            relevantMinutes.forEach((minutesItem: any) => {
                if (minutesItem.userVote) {
                    votes[minutesItem.id] = minutesItem.userVote;
                    voteComments[minutesItem.id] = minutesItem.userVote.comments || '';
                }
            });

            setUserVotes(votes);
            setVoteComments(prev => ({ ...prev, ...voteComments }));

        } catch (error) {
            console.error('Error fetching minutes:', error);
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
        try {
            setVotingLoading(minutesId);

            const response = await fetch(`/api/minutes/${minutesId}/vote`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    vote,
                    comments: voteComments[minutesId] || undefined,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Failed to submit vote (${response.status})`);
            }

            const data = await response.json();

            if (!data.success || !data.vote) {
                throw new Error(data.error || 'Vote submission failed');
            }

            // Update user vote immediately
            setUserVotes(prev => ({
                ...prev,
                [minutesId]: data.vote
            }));

            // Update minutes with new statistics
            if (data.minutes) {
                setMinutes(prev => prev.map(m =>
                    m.id === minutesId ? { ...m, ...data.minutes } : m
                ));
            }

            // Clear the comment for this minutes
            setVoteComments(prev => ({
                ...prev,
                [minutesId]: ''
            }));

            toast({
                title: 'Vote Submitted',
                description: `Your ${vote} vote has been recorded successfully`,
            });

        } catch (error) {
            console.error('Error casting vote:', error);
            
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Failed to submit vote',
                variant: 'destructive',
            });
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

    const getTimeUntilDeadline = (deadline?: string) => {
        if (!deadline) return null;
        
        const now = new Date();
        const deadlineDate = new Date(deadline);
        const timeDiff = deadlineDate.getTime() - now.getTime();
        
        if (timeDiff <= 0) return null;
        
        const hours = Math.floor(timeDiff / (1000 * 60 * 60));
        const days = Math.floor(hours / 24);
        
        if (days > 0) {
            return `${days} day${days !== 1 ? 's' : ''} remaining`;
        } else if (hours > 0) {
            return `${hours} hour${hours !== 1 ? 's' : ''} remaining`;
        } else {
            const minutes = Math.floor(timeDiff / (1000 * 60));
            return `${minutes} minute${minutes !== 1 ? 's' : ''} remaining`;
        }
    };

    const isDeadlineUrgent = (deadline?: string) => {
        if (!deadline) return false;
        
        const now = new Date();
        const deadlineDate = new Date(deadline);
        const timeDiff = deadlineDate.getTime() - now.getTime();
        
        // Consider urgent if less than 24 hours remaining
        return timeDiff > 0 && timeDiff < (24 * 60 * 60 * 1000);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString();
    };

    const formatDateTime = (dateString: string) => {
        return new Date(dateString).toLocaleString();
    };

    // Show minutes in voting section if:
    // 1. Status is 'voting' (actively open for voting)
    // 2. OR status is 'passed'/'failed' but voting deadline hasn't passed yet (recently completed)
    const votingMinutes = minutes.filter(m => {
        if (m.status === 'voting') return true;
        
        // If recently passed/failed but deadline hasn't passed, keep showing in voting section
        if (['passed', 'failed'].includes(m.status) && m.voting_deadline) {
            const deadline = new Date(m.voting_deadline);
            const now = new Date();
            // Show for 24 hours after completion or until deadline passes, whichever is longer
            const showUntil = new Date(Math.max(deadline.getTime(), now.getTime() - 24 * 60 * 60 * 1000));
            return now <= showUntil;
        }
        
        return false;
    });
    
    // Only show in completed section if voting period is truly over
    const completedMinutes = minutes.filter(m => {
        if (!['passed', 'failed'].includes(m.status)) return false;
        
        // If has voting deadline and it hasn't passed, don't show in completed yet
        if (m.voting_deadline) {
            const deadline = new Date(m.voting_deadline);
            const now = new Date();
            // Only show in completed after 24 hours past deadline
            return now > new Date(deadline.getTime() + 24 * 60 * 60 * 1000);
        }
        
        // If no deadline, show in completed
        return true;
    });

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
                        Active & Recent Voting ({votingMinutes.length})
                    </h2>
                </div>

                {votingMinutes.length === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <Users className="h-12 w-12 text-gray-400 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No active voting</h3>
                            <p className="text-gray-600 text-center">
                                There are currently no minutes open for voting or recently completed
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
                                                        <span className={`flex items-center gap-1 ${isDeadlineUrgent(minutesItem.voting_deadline) ? 'text-red-600 font-medium' : ''}`}>
                                                            <Clock className="h-4 w-4" />
                                                            {getTimeUntilDeadline(minutesItem.voting_deadline) || 'Deadline passed'}
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
                                                    <div className="text-right">
                                                        <div className="text-sm text-blue-700">
                                                            {((minutesItem.total_votes || 0) > 0
                                                                ? (((minutesItem.approve_votes || 0) / (minutesItem.total_votes || 1)) * 100).toFixed(1)
                                                                : '0.0'
                                                            )}% approval (need {minutesItem.approval_threshold || 75}%)
                                                        </div>
                                                        <div className="text-xs text-blue-600">
                                                            {minutesItem.total_votes || 0} of {minutesItem.total_eligible_voters || 0} votes
                                                            {minutesItem.minimum_quorum && (
                                                                <span> • {minutesItem.minimum_quorum}% quorum required</span>
                                                            )}
                                                        </div>
                                                    </div>
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

                                                {/* Quorum Status */}
                                                {minutesItem.minimum_quorum && minutesItem.total_eligible_voters && (
                                                    <div className="mb-4">
                                                        <div className="flex justify-between items-center text-xs text-blue-700 mb-1">
                                                            <span>Quorum Progress</span>
                                                            <span>
                                                                {Math.round(((minutesItem.total_votes || 0) / minutesItem.total_eligible_voters) * 100)}% 
                                                                (need {minutesItem.minimum_quorum}%)
                                                            </span>
                                                        </div>
                                                        <div className="w-full bg-blue-200 rounded-full h-2">
                                                            <div 
                                                                className={`h-2 rounded-full transition-all duration-300 ${
                                                                    ((minutesItem.total_votes || 0) / minutesItem.total_eligible_voters) * 100 >= minutesItem.minimum_quorum
                                                                        ? 'bg-green-500' 
                                                                        : 'bg-blue-500'
                                                                }`}
                                                                style={{ 
                                                                    width: `${Math.min(100, ((minutesItem.total_votes || 0) / minutesItem.total_eligible_voters) * 100)}%` 
                                                                }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Voting Completed Notice */}
                                                {['passed', 'failed'].includes(minutesItem.status) && (
                                                    <div className={`p-3 rounded border ${
                                                        minutesItem.status === 'passed' 
                                                            ? 'bg-green-50 border-green-200' 
                                                            : 'bg-red-50 border-red-200'
                                                    }`}>
                                                        <div className="flex items-center gap-2">
                                                            {minutesItem.status === 'passed' ? (
                                                                <CheckCircle className="h-4 w-4 text-green-600" />
                                                            ) : (
                                                                <XCircle className="h-4 w-4 text-red-600" />
                                                            )}
                                                            <span className={`text-sm font-medium ${
                                                                minutesItem.status === 'passed' 
                                                                    ? 'text-green-800' 
                                                                    : 'text-red-800'
                                                            }`}>
                                                                Voting Complete - Minutes {minutesItem.status === 'passed' ? 'Approved' : 'Rejected'}
                                                            </span>
                                                        </div>
                                                        <p className={`text-xs mt-1 ${
                                                            minutesItem.status === 'passed' 
                                                                ? 'text-green-700' 
                                                                : 'text-red-700'
                                                        }`}>
                                                            Final result based on voting threshold and participation
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Voting Actions */}
                                                {canVote && !userVote && minutesItem.status === 'voting' && (
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