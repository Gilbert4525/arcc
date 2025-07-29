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
    Users,
    Vote
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/types/database';

type Resolution = Database['public']['Tables']['resolutions']['Row'] & {
  profiles?: { full_name: string | null; email: string } | null;
  categories?: { name: string; color: string | null } | null;
};

interface UserVote {
    id: string;
    vote: 'for' | 'against' | 'abstain';
    vote_reason?: string;
    voted_at: string;
}

export function ResolutionVoting() {
    const [resolutions, setResolutions] = useState<Resolution[]>([]);
    const [userVotes, setUserVotes] = useState<Record<string, UserVote>>({});
    const [loading, setLoading] = useState(true);
    const [votingLoading, setVotingLoading] = useState<string | null>(null);
    const [voteComments, setVoteComments] = useState<Record<string, string>>({});
    const { toast } = useToast();
    const supabase = createClient();

    useEffect(() => {
        fetchResolutions();
    }, []);

    const fetchResolutions = async () => {
        const fetchId = Math.random().toString(36).substring(7);
        console.log(`[${fetchId}] Starting fetchResolutions...`);
        
        try {
            setLoading(true);
            
            // Get current user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                console.error(`[${fetchId}] No authenticated user`);
                return;
            }

            console.log(`[${fetchId}] Fetching resolutions from database...`);
            const { data: allResolutions, error } = await supabase
                .from('resolutions')
                .select(`
                    *,
                    profiles:created_by(full_name, email),
                    categories(name, color)
                `)
                .in('status', ['voting', 'approved', 'rejected'])
                .order('created_at', { ascending: false });

            if (error) {
                throw new Error(`Failed to fetch resolutions: ${error.message}`);
            }

            console.log(`[${fetchId}] Fetched ${allResolutions?.length || 0} resolutions`);
            setResolutions(allResolutions || []);

            // Fetch user votes for voting resolutions
            const votingResolutions = (allResolutions || []).filter(r => r.status === 'voting');
            console.log(`[${fetchId}] Found ${votingResolutions.length} voting resolutions`);
            
            const votes: Record<string, UserVote> = {};
            const comments: Record<string, string> = {};

            for (const resolution of votingResolutions) {
                try {
                    console.log(`[${fetchId}] Fetching vote for resolution ${resolution.id}...`);
                    const { data: voteData, error: voteError } = await supabase
                        .from('resolution_votes')
                        .select('*')
                        .eq('resolution_id', resolution.id)
                        .eq('voter_id', user.id)
                        .single();

                    if (voteError && voteError.code !== 'PGRST116') { // PGRST116 is "not found"
                        console.warn(`[${fetchId}] Error fetching vote for ${resolution.id}:`, voteError);
                        continue;
                    }

                    if (voteData) {
                        votes[resolution.id] = voteData;
                        comments[resolution.id] = voteData.vote_reason || '';
                        console.log(`[${fetchId}] Found existing vote for ${resolution.id}:`, voteData.vote);
                    } else {
                        console.log(`[${fetchId}] No vote found for ${resolution.id}`);
                    }
                } catch (error) {
                    console.error(`[${fetchId}] Error fetching vote for resolution ${resolution.id}:`, error);
                }
            }

            console.log(`[${fetchId}] Setting user votes:`, votes);
            setUserVotes(votes);
            setVoteComments(prev => ({ ...prev, ...comments }));
            
            console.log(`[${fetchId}] fetchResolutions completed successfully`);
            
        } catch (error) {
            console.error(`[${fetchId}] Error fetching resolutions:`, error);
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Failed to load resolutions',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleVote = async (resolutionId: string, vote: 'for' | 'against' | 'abstain') => {
        const voteId = Math.random().toString(36).substring(7);
        console.log(`[${voteId}] Starting vote submission:`, { resolutionId, vote, hasComment: !!voteComments[resolutionId] });
        
        try {
            setVotingLoading(resolutionId);

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                throw new Error('Not authenticated');
            }

            const resolution = resolutions.find(r => r.id === resolutionId);
            if (!resolution) {
                throw new Error('Resolution not found');
            }

            if (resolution.status !== 'voting') {
                throw new Error('Resolution is not open for voting');
            }

            if (resolution.voting_deadline && new Date(resolution.voting_deadline) < new Date()) {
                throw new Error('Voting deadline has passed');
            }

            // Check if user has already voted
            const { data: existingVote } = await supabase
                .from('resolution_votes')
                .select('id')
                .eq('resolution_id', resolutionId)
                .eq('voter_id', user.id)
                .single();

            if (existingVote) {
                throw new Error('You have already voted on this resolution');
            }

            console.log(`[${voteId}] Submitting vote to database...`);

            // Insert vote
            const { data: voteData, error: voteError } = await supabase
                .from('resolution_votes')
                .insert({
                    resolution_id: resolutionId,
                    voter_id: user.id,
                    vote,
                    vote_reason: voteComments[resolutionId] || null,
                    voted_at: new Date().toISOString(),
                })
                .select()
                .single();

            if (voteError) {
                throw new Error(`Failed to record vote: ${voteError.message}`);
            }

            console.log(`[${voteId}] Vote recorded successfully:`, voteData);

            // Update resolution vote counts
            const currentVotesFor = resolution.votes_for || 0;
            const currentVotesAgainst = resolution.votes_against || 0;
            const currentVotesAbstain = resolution.votes_abstain || 0;
            
            const updates: Partial<Resolution> = {};
            if (vote === 'for') updates.votes_for = currentVotesFor + 1;
            if (vote === 'against') updates.votes_against = currentVotesAgainst + 1;
            if (vote === 'abstain') updates.votes_abstain = currentVotesAbstain + 1;

            // Check if voting is complete
            const totalVotes = currentVotesFor + currentVotesAgainst + currentVotesAbstain + 1;
            const newVotesFor = vote === 'for' ? currentVotesFor + 1 : currentVotesFor;
            const totalEligibleVoters = resolution.total_eligible_voters || 1;
            const minimumQuorum = resolution.minimum_quorum || 50;
            
            if (totalVotes >= totalEligibleVoters) {
                // Determine if resolution passes
                const majorityRequired = resolution.requires_majority;
                const quorumMet = (totalVotes / totalEligibleVoters) * 100 >= minimumQuorum;
                const majorityVotes = majorityRequired ? newVotesFor > (totalVotes / 2) : newVotesFor > 0;
                
                if (quorumMet && majorityVotes) {
                    updates.status = 'approved';
                    updates.passed_at = new Date().toISOString();
                    updates.is_unanimous = newVotesFor === totalVotes;
                } else {
                    updates.status = 'rejected';
                }
            }

            const { error: updateError } = await supabase
                .from('resolutions')
                .update(updates)
                .eq('id', resolutionId);

            if (updateError) {
                console.error(`[${voteId}] Failed to update resolution:`, updateError);
                // Don't fail the vote if update fails
            }

            // Update local state
            setUserVotes(prev => ({
                ...prev,
                [resolutionId]: voteData
            }));

            setResolutions(prev => prev.map(r => 
                r.id === resolutionId ? { ...r, ...updates } : r
            ));

            // Refresh data to ensure consistency
            setTimeout(() => fetchResolutions(), 1000);

            toast({
                title: 'Vote Submitted',
                description: `Your ${vote} vote has been recorded`,
            });

            console.log(`[${voteId}] Vote submission completed successfully`);

        } catch (error) {
            console.error(`[${voteId}] Error casting vote:`, error);
            
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Failed to submit vote',
                variant: 'destructive',
            });

            // Refresh data even on error to get current state
            setTimeout(() => fetchResolutions(), 2000);

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

        const config = statusConfig[status || 'draft'];
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
            for: { label: 'For', icon: ThumbsUp, className: 'bg-green-100 text-green-800' },
            against: { label: 'Against', icon: ThumbsDown, className: 'bg-red-100 text-red-800' },
            abstain: { label: 'Abstain', icon: Minus, className: 'bg-gray-100 text-gray-800' },
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

    const votingResolutions = resolutions.filter(r => r.status === 'voting');
    const completedResolutions = resolutions.filter(r => ['approved', 'rejected'].includes(r.status || ''));

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Resolution Voting</h1>
                <p className="text-gray-600">Review and vote on board resolutions</p>
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
                            const isExpired = isVotingExpired(resolution.voting_deadline);
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
                                                                onClick={() => handleVote(resolution.id, 'for')}
                                                                disabled={votingLoading === resolution.id}
                                                                className="bg-green-600 hover:bg-green-700"
                                                            >
                                                                <ThumbsUp className="h-4 w-4 mr-1" />
                                                                For
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="destructive"
                                                                onClick={() => handleVote(resolution.id, 'against')}
                                                                disabled={votingLoading === resolution.id}
                                                            >
                                                                <ThumbsDown className="h-4 w-4 mr-1" />
                                                                Against
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => handleVote(resolution.id, 'abstain')}
                                                                disabled={votingLoading === resolution.id}
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
                                        <div className="grid grid-cols-3 gap-4 text-sm">
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