'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Search,
  Filter,
  Users,
  Calendar,
  AlertTriangle,
  CheckCircle,
  User
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VoteWithProfile {
  id: string;
  minutes_id: string;
  user_id: string;
  vote: 'approve' | 'reject' | 'abstain';
  comments?: string;
  voted_at: string;
  created_at: string;
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

interface Minutes {
  id: string;
  title: string;
  meeting_date: string;
  status: string;
}

interface AdminCommentViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  minutes: Minutes;
}

export function AdminCommentView({ open, onOpenChange, minutes }: AdminCommentViewProps) {
  const [votes, setVotes] = useState<VoteWithProfile[]>([]);
  const [statistics, setStatistics] = useState<CommentStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyComments, setShowOnlyComments] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && minutes.id) {
      fetchComments();
    }
  }, [open, minutes.id, showOnlyComments]);

  const fetchComments = async (retryCount = 0) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (showOnlyComments) {
        params.append('withComments', 'true');
      }

      const response = await fetch(`/api/minutes/${minutes.id}/comments?${params}`);
      
      if (!response.ok) {
        if (response.status >= 500 && retryCount < 2) {
          // Retry on server errors up to 2 times
          setTimeout(() => fetchComments(retryCount + 1), 1000 * (retryCount + 1));
          return;
        }
        
        if (response.status === 403) {
          throw new Error('Access denied. Admin privileges required.');
        }
        
        throw new Error(`Failed to fetch comments: ${response.status}`);
      }

      const data = await response.json();
      console.log('AdminCommentView - Fetched data:', data); // Debug log
      setVotes(data.votes || []);
      setStatistics(data.statistics || null);
    } catch (error) {
      console.error('Error fetching comments:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load voting comments',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
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

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const filterVotes = (voteType?: string) => {
    let filtered = votes;

    // Filter by vote type
    if (voteType && voteType !== 'all') {
      filtered = filtered.filter(vote => vote.vote === voteType);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(vote => 
        vote.voter.full_name.toLowerCase().includes(query) ||
        vote.voter.email.toLowerCase().includes(query) ||
        (vote.comments && vote.comments.toLowerCase().includes(query))
      );
    }

    // Filter to only show votes with comments
    if (showOnlyComments) {
      filtered = filtered.filter(vote => vote.comments && vote.comments.trim());
    }

    return filtered.sort((a, b) => new Date(b.voted_at).getTime() - new Date(a.voted_at).getTime());
  };

  const getFilteredVotes = () => {
    return filterVotes(activeTab);
  };

  const VoteCard = ({ vote }: { vote: VoteWithProfile }) => (
    <Card key={vote.id} className="mb-3">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-500" />
              <div>
                <p className="font-medium text-sm">{vote.voter.full_name}</p>
                <p className="text-xs text-gray-500">{vote.voter.email}</p>
                {vote.voter.position && (
                  <p className="text-xs text-gray-600">{vote.voter.position}</p>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getVoteBadge(vote.vote)}
            <span className="text-xs text-gray-500">
              {formatDateTime(vote.voted_at)}
            </span>
          </div>
        </div>
      </CardHeader>
      {vote.comments && vote.comments.trim() && (
        <CardContent className="pt-0">
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex items-start gap-2">
              <MessageSquare className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-700 leading-relaxed">
                {vote.comments}
              </p>
            </div>
          </div>
        </CardContent>
      )}
      {(!vote.comments || !vote.comments.trim()) && (
        <CardContent className="pt-0">
          <p className="text-xs text-gray-500 italic">No comment provided</p>
        </CardContent>
      )}
    </Card>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Voting Comments - {minutes.title}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Meeting: {formatDate(minutes.meeting_date)}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              Status: {minutes.status}
            </span>
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading comments...</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Statistics */}
            {statistics && (
              <Card className="flex-shrink-0 mb-4">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Comment Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{statistics.total_votes}</div>
                      <div className="text-sm text-gray-600">Total Votes</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{statistics.total_comments}</div>
                      <div className="text-sm text-gray-600">With Comments</div>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">{Math.round(statistics.avg_comment_length)}</div>
                      <div className="text-sm text-gray-600">Avg Length</div>
                    </div>
                    <div className="text-center p-3 bg-orange-50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">{statistics.comments_by_vote.reject}</div>
                      <div className="text-sm text-gray-600">Reject Comments</div>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <div className="flex items-center justify-center">
                        {statistics.has_concerns ? (
                          <AlertTriangle className="h-6 w-6 text-red-600" />
                        ) : (
                          <CheckCircle className="h-6 w-6 text-green-600" />
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        {statistics.has_concerns ? 'Has Concerns' : 'No Concerns'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Filters */}
            <div className="flex-shrink-0 mb-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by name, email, or comment..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button
                  variant={showOnlyComments ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setShowOnlyComments(!showOnlyComments)}
                  className="flex items-center gap-2"
                >
                  <Filter className="h-4 w-4" />
                  Comments Only
                </Button>
              </div>
            </div>

            {/* Tabs and Content */}
            <div className="flex-1 overflow-hidden">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                <TabsList className="grid w-full grid-cols-4 flex-shrink-0">
                  <TabsTrigger value="all">
                    All ({votes.length})
                  </TabsTrigger>
                  <TabsTrigger value="approve">
                    Approve ({votes.filter(v => v.vote === 'approve').length})
                  </TabsTrigger>
                  <TabsTrigger value="reject">
                    Reject ({votes.filter(v => v.vote === 'reject').length})
                  </TabsTrigger>
                  <TabsTrigger value="abstain">
                    Abstain ({votes.filter(v => v.vote === 'abstain').length})
                  </TabsTrigger>
                </TabsList>

                <div className="flex-1 overflow-hidden mt-4">
                  <ScrollArea className="h-full pr-4">
                    {getFilteredVotes().length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12">
                        <MessageSquare className="h-12 w-12 text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No votes found</h3>
                        <p className="text-gray-600 text-center">
                          {searchQuery.trim() || showOnlyComments
                            ? 'No votes match your current filters.'
                            : 'No votes have been cast on these minutes yet.'}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {getFilteredVotes().map((vote) => (
                          <VoteCard key={vote.id} vote={vote} />
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </Tabs>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}