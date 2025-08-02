'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
    ThumbsUp,
    ThumbsDown,
    Minus,
    MessageSquare,
    Search,
    Filter,
    AlertTriangle,
    Users,
    BarChart3,
    Calendar,
    X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';

interface VoteWithProfile {
    id: string;
    resolution_id: string;
    voter_id: string;
    vote: 'approve' | 'reject' | 'abstain';
    vote_reason?: string;
    voted_at: string;
    voter: {
        id: string;
        full_name: string;
        email: string;
        position?: string;
    };
}

interface CommentStatistics {
    total_votes: number;
    total_comments: number;
    comments_by_vote: {
        approve: number;
        reject: number;
        abstain: number;
    };
    avg_comment_length: number;
    has_concerns: boolean;
}

interface AdminResolutionCommentViewProps {
    resolutionId: string;
    resolutionTitle: string;
    trigger?: React.ReactNode;
}

export function AdminResolutionCommentView({ 
    resolutionId, 
    resolutionTitle, 
    trigger 
}: AdminResolutionCommentViewProps) {
    const [votes, setVotes] = useState<VoteWithProfile[]>([]);
    const [statistics, setStatistics] = useState<CommentStatistics | null>(null);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [voteFilter, setVoteFilter] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [showCommentsOnly, setShowCommentsOnly] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (open) {
            fetchComments();
        }
    }, [open, resolutionId]);

    // Real-time subscription for resolution votes when dialog is open
    useRealtimeSubscription({
        table: 'resolution_votes',
        filter: `resolution_id=eq.${resolutionId}`,
        onInsert: (payload) => {
            console.log('New vote for resolution:', payload);
            if (open) {
                fetchComments(); // Refresh comments when new vote is cast
            }
        },
        onUpdate: (payload) => {
            console.log('Vote updated for resolution:', payload);
            if (open) {
                fetchComments(); // Refresh comments when vote is updated
            }
        },
        onDelete: (payload) => {
            console.log('Vote deleted for resolution:', payload);
            if (open) {
                fetchComments(); // Refresh comments when vote is deleted
            }
        }
    });

    const fetchComments = async () => {
        try {
            setLoading(true);

            const params = new URLSearchParams();
            if (voteFilter !== 'all') {
                params.append('vote', voteFilter);
            }
            if (showCommentsOnly) {
                params.append('withComments', 'true');
            }
            if (searchTerm.trim()) {
                params.append('search', searchTerm.trim());
            }

            const response = await fetch(`/api/resolutions/${resolutionId}/comments?${params}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch comments');
            }

            const data = await response.json();
            setVotes(data.votes || []);
            setStatistics(data.statistics || null);

        } catch (error) {
            console.error('Error fetching comments:', error);
            toast({
                title: 'Error',
                description: 'Failed to load voting comments',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = () => {
        fetchComments();
    };

    const clearFilters = () => {
        setVoteFilter('all');
        setSearchTerm('');
        setShowCommentsOnly(false);
        setTimeout(fetchComments, 100);
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

    const formatDateTime = (dateString: string) => {
        return new Date(dateString).toLocaleString();
    };

    const defaultTrigger = (
        <Button variant="outline" size="sm" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            View Comments
        </Button>
    );

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || defaultTrigger}
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        Voting Comments: {resolutionTitle}
                    </DialogTitle>
                    <DialogDescription>
                        View all votes and comments for this resolution
                    </DialogDescription>
                </DialogHeader>

                {/* Statistics Section */}
                {statistics && (
                    <Card className="mb-4">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <BarChart3 className="h-5 w-5" />
                                Voting Statistics
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-blue-600">{statistics.total_votes}</div>
                                    <div className="text-sm text-gray-600">Total Votes</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-purple-600">{statistics.total_comments}</div>
                                    <div className="text-sm text-gray-600">With Comments</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-orange-600">{statistics.avg_comment_length}</div>
                                    <div className="text-sm text-gray-600">Avg. Comment Length</div>
                                </div>
                                <div className="text-center">
                                    <div className={`text-2xl font-bold ${statistics.has_concerns ? 'text-red-600' : 'text-green-600'}`}>
                                        {statistics.has_concerns ? 'Yes' : 'No'}
                                    </div>
                                    <div className="text-sm text-gray-600">Has Concerns</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="text-center p-3 bg-green-50 rounded-lg">
                                    <div className="text-lg font-semibold text-green-700">
                                        {statistics.comments_by_vote.approve}
                                    </div>
                                    <div className="text-sm text-green-600">Approve Comments</div>
                                </div>
                                <div className="text-center p-3 bg-red-50 rounded-lg">
                                    <div className="text-lg font-semibold text-red-700">
                                        {statistics.comments_by_vote.reject}
                                    </div>
                                    <div className="text-sm text-red-600">Reject Comments</div>
                                </div>
                                <div className="text-center p-3 bg-gray-50 rounded-lg">
                                    <div className="text-lg font-semibold text-gray-700">
                                        {statistics.comments_by_vote.abstain}
                                    </div>
                                    <div className="text-sm text-gray-600">Abstain Comments</div>
                                </div>
                            </div>

                            {statistics.has_concerns && (
                                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <div className="flex items-center gap-2 text-red-700">
                                        <AlertTriangle className="h-4 w-4" />
                                        <span className="font-medium">Concerns Detected</span>
                                    </div>
                                    <p className="text-sm text-red-600 mt-1">
                                        There are rejection votes with comments that may require attention.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Filters Section */}
                <Card className="mb-4">
                    <CardContent className="pt-4">
                        <div className="flex flex-wrap gap-4 items-end">
                            <div className="flex-1 min-w-[200px]">
                                <Label htmlFor="search">Search</Label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        id="search"
                                        placeholder="Search by voter name, email, or comment..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="vote-filter">Vote Type</Label>
                                <Select value={voteFilter} onValueChange={setVoteFilter}>
                                    <SelectTrigger className="w-[140px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Votes</SelectItem>
                                        <SelectItem value="approve">Approve</SelectItem>
                                        <SelectItem value="reject">Reject</SelectItem>
                                        <SelectItem value="abstain">Abstain</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="comments-only"
                                    checked={showCommentsOnly}
                                    onChange={(e) => setShowCommentsOnly(e.target.checked)}
                                    className="rounded"
                                />
                                <Label htmlFor="comments-only" className="text-sm">
                                    Comments only
                                </Label>
                            </div>
                            <Button onClick={handleFilterChange} size="sm">
                                <Filter className="h-4 w-4 mr-2" />
                                Apply
                            </Button>
                            <Button onClick={clearFilters} variant="outline" size="sm">
                                <X className="h-4 w-4 mr-2" />
                                Clear
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Votes List */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="text-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                                <p className="text-gray-600">Loading comments...</p>
                            </div>
                        </div>
                    ) : votes.length === 0 ? (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-8">
                                <Users className="h-12 w-12 text-gray-400 mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">No votes found</h3>
                                <p className="text-gray-600 text-center">
                                    {voteFilter !== 'all' || searchTerm || showCommentsOnly
                                        ? 'No votes match your current filters'
                                        : 'No votes have been cast on this resolution yet'
                                    }
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {votes.map((vote) => (
                                <Card key={vote.id} className={`${vote.vote === 'reject' && vote.vote_reason ? 'border-red-200 bg-red-50' : ''}`}>
                                    <CardContent className="pt-4">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h4 className="font-medium text-gray-900">
                                                        {vote.voter.full_name}
                                                    </h4>
                                                    {getVoteBadge(vote.vote)}
                                                    {vote.vote === 'reject' && vote.vote_reason && (
                                                        <Badge variant="destructive" className="flex items-center gap-1">
                                                            <AlertTriangle className="h-3 w-3" />
                                                            Concern
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="text-sm text-gray-600 flex items-center gap-4">
                                                    <span>{vote.voter.email}</span>
                                                    {vote.voter.position && (
                                                        <span>• {vote.voter.position}</span>
                                                    )}
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="h-3 w-3" />
                                                        {formatDateTime(vote.voted_at)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {vote.vote_reason && (
                                            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <MessageSquare className="h-4 w-4 text-gray-500" />
                                                    <span className="text-sm font-medium text-gray-700">Comment</span>
                                                </div>
                                                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                                    {vote.vote_reason}
                                                </p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}