'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
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
    Eye,
    User,
    Tag,
    Building
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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

interface ResolutionDetailViewProps {
    resolution: Resolution;
    userVote?: UserVote | null;
    onVote?: (vote: 'approve' | 'reject' | 'abstain', comment?: string) => Promise<void>;
    canVote?: boolean;
    trigger?: React.ReactNode;
}

export function ResolutionDetailView({ 
    resolution, 
    userVote, 
    onVote, 
    canVote = false,
    trigger 
}: ResolutionDetailViewProps) {
    const [open, setOpen] = useState(false);
    const [voteComment, setVoteComment] = useState('');
    const [votingLoading, setVotingLoading] = useState(false);
    const { toast } = useToast();

    const handleVote = async (vote: 'approve' | 'reject' | 'abstain') => {
        if (!onVote) return;
        
        try {
            setVotingLoading(true);
            await onVote(vote, voteComment || undefined);
            setVoteComment('');
            setOpen(false);
            toast({
                title: 'Vote Submitted',
                description: `Your ${vote} vote has been recorded`,
            });
        } catch (error) {
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Failed to submit vote',
                variant: 'destructive',
            });
        } finally {
            setVotingLoading(false);
        }
    };

    const getStatusBadge = (status: Resolution['status']) => {
        const statusConfig = {
            draft: { label: 'Draft', variant: 'secondary' as const, icon: AlertCircle, color: 'gray' },
            under_review: { label: 'Under Review', variant: 'default' as const, icon: FileText, color: 'blue' },
            published: { label: 'Published', variant: 'default' as const, icon: Calendar, color: 'green' },
            voting: { label: 'Voting Open', variant: 'default' as const, icon: Vote, color: 'orange' },
            approved: { label: 'Approved', variant: 'default' as const, icon: CheckCircle, color: 'green' },
            rejected: { label: 'Rejected', variant: 'destructive' as const, icon: XCircle, color: 'red' },
            archived: { label: 'Archived', variant: 'secondary' as const, icon: XCircle, color: 'gray' },
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

    const formatDateTime = (dateString: string | null | undefined) => {
        if (!dateString) return 'Not specified';
        return new Date(dateString).toLocaleString();
    };

    const isVotingExpired = (deadline?: string) => {
        if (!deadline) return false;
        return new Date(deadline) < new Date();
    };

    const defaultTrigger = (
        <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            View Details
        </Button>
    );

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || defaultTrigger}
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <DialogTitle className="text-xl font-bold">
                                {resolution.title}
                            </DialogTitle>
                            <DialogDescription className="flex items-center gap-4 mt-2">
                                <span className="flex items-center gap-1">
                                    <FileText className="h-4 w-4" />
                                    {resolution.resolution_number}
                                </span>
                                {resolution.categories && (
                                    <span className="flex items-center gap-1">
                                        <Tag className="h-4 w-4" />
                                        {resolution.categories.name}
                                    </span>
                                )}
                            </DialogDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            {userVote && getVoteBadge(userVote.vote)}
                            {getStatusBadge(resolution.status)}
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Resolution Metadata */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Building className="h-5 w-5" />
                                Resolution Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-sm font-medium text-gray-700">Resolution Type</Label>
                                    <p className="text-sm text-gray-900 capitalize">
                                        {resolution.resolution_type?.replace('_', ' ') || 'Board Resolution'}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-sm font-medium text-gray-700">Created By</Label>
                                    <p className="text-sm text-gray-900">
                                        {resolution.profiles?.full_name || 'Unknown'}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-sm font-medium text-gray-700">Created Date</Label>
                                    <p className="text-sm text-gray-900">
                                        {formatDateTime(resolution.created_at)}
                                    </p>
                                </div>
                                {resolution.effective_date && (
                                    <div>
                                        <Label className="text-sm font-medium text-gray-700">Effective Date</Label>
                                        <p className="text-sm text-gray-900">
                                            {new Date(resolution.effective_date).toLocaleDateString()}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {resolution.tags && resolution.tags.length > 0 && (
                                <div>
                                    <Label className="text-sm font-medium text-gray-700">Tags</Label>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                        {resolution.tags.map((tag, index) => (
                                            <Badge key={index} variant="secondary" className="text-xs">
                                                {tag}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Resolution Description */}
                    {resolution.description && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Description</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-gray-700 whitespace-pre-wrap">
                                    {resolution.description}
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    {/* Resolution Content */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Resolution Content</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="prose max-w-none">
                                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                                    {resolution.content}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Voting Information */}
                    {(resolution.status === 'voting' || resolution.status === 'approved' || resolution.status === 'rejected') && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Vote className="h-5 w-5" />
                                    Voting Information
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {resolution.voting_deadline && (
                                    <div>
                                        <Label className="text-sm font-medium text-gray-700">Voting Deadline</Label>
                                        <p className="text-sm text-gray-900 flex items-center gap-2">
                                            <Clock className="h-4 w-4" />
                                            {formatDateTime(resolution.voting_deadline)}
                                            {isVotingExpired(resolution.voting_deadline) && (
                                                <Badge variant="destructive" className="text-xs">Expired</Badge>
                                            )}
                                        </p>
                                    </div>
                                )}

                                {/* Voting Progress */}
                                <div className="bg-blue-50 p-4 rounded-lg">
                                    <div className="flex justify-between items-center mb-3">
                                        <h4 className="font-medium text-blue-900">Voting Progress</h4>
                                        <span className="text-sm text-blue-700">
                                            {((resolution.votes_for || 0) > 0
                                                ? (((resolution.votes_for || 0) / Math.max(1, (resolution.votes_for || 0) + (resolution.votes_against || 0) + (resolution.votes_abstain || 0))) * 100).toFixed(1)
                                                : '0.0'
                                            )}% approval
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                                        <div className="text-center">
                                            <div className="font-medium text-green-600">{resolution.votes_for || 0}</div>
                                            <div className="text-gray-600">Approve</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="font-medium text-red-600">{resolution.votes_against || 0}</div>
                                            <div className="text-gray-600">Reject</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="font-medium text-gray-600">{resolution.votes_abstain || 0}</div>
                                            <div className="text-gray-600">Abstain</div>
                                        </div>
                                    </div>

                                    <div className="text-xs text-gray-600">
                                        Total votes: {(resolution.votes_for || 0) + (resolution.votes_against || 0) + (resolution.votes_abstain || 0)} / {resolution.total_eligible_voters || 0}
                                    </div>
                                </div>

                                {/* User's Vote */}
                                {userVote && (
                                    <div className="bg-white p-3 rounded border">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-medium">Your vote:</span>
                                            {getVoteBadge(userVote.vote)}
                                        </div>
                                        {userVote.vote_reason && (
                                            <p className="text-sm text-gray-600 mb-2">{userVote.vote_reason}</p>
                                        )}
                                        <p className="text-xs text-gray-500">
                                            Voted on {formatDateTime(userVote.voted_at)}
                                        </p>
                                    </div>
                                )}

                                {/* Voting Actions */}
                                {canVote && !userVote && resolution.status === 'voting' && !isVotingExpired(resolution.voting_deadline ?? undefined) && (
                                    <div className="space-y-3">
                                        <Separator />
                                        <div>
                                            <Label htmlFor="vote-comment" className="text-sm font-medium">
                                                Comment (optional)
                                            </Label>
                                            <Textarea
                                                id="vote-comment"
                                                placeholder="Add a comment about your vote..."
                                                value={voteComment}
                                                onChange={(e) => setVoteComment(e.target.value)}
                                                rows={3}
                                                className="mt-1"
                                            />
                                        </div>

                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                onClick={() => handleVote('approve')}
                                                disabled={votingLoading}
                                                className="bg-green-600 hover:bg-green-700"
                                            >
                                                <ThumbsUp className="h-4 w-4 mr-1" />
                                                {votingLoading ? 'Voting...' : 'Approve'}
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                onClick={() => handleVote('reject')}
                                                disabled={votingLoading}
                                            >
                                                <ThumbsDown className="h-4 w-4 mr-1" />
                                                {votingLoading ? 'Voting...' : 'Reject'}
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleVote('abstain')}
                                                disabled={votingLoading}
                                            >
                                                <Minus className="h-4 w-4 mr-1" />
                                                {votingLoading ? 'Voting...' : 'Abstain'}
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* Voting Expired */}
                                {canVote && !userVote && isVotingExpired(resolution.voting_deadline ?? undefined) && (
                                    <div className="bg-red-50 p-3 rounded border border-red-200">
                                        <p className="text-sm text-red-700">
                                            Voting deadline has passed. You did not vote on this resolution.
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}