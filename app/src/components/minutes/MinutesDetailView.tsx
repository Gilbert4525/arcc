'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Calendar,
  FileText,
  CheckSquare,
  Users,
  Clock,
  ThumbsUp,
  ThumbsDown,
  Minus,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  total_votes?: number;
  approve_votes?: number;
  reject_votes?: number;
  abstain_votes?: number;
  creator?: {
    full_name: string;
    email: string;
  };
}

interface UserVote {
  id: string;
  vote: 'approve' | 'reject' | 'abstain';
  comments?: string;
  voted_at: string;
}

interface MinutesDetailViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  minutes: Minutes;
  userVote?: UserVote;
  onVote: (vote: 'approve' | 'reject' | 'abstain', comment?: string) => Promise<void>;
  canVote?: boolean;
}

export function MinutesDetailView({
  open,
  onOpenChange,
  minutes,
  userVote,
  onVote,
  canVote = true
}: MinutesDetailViewProps) {
  const [selectedVote, setSelectedVote] = useState<'approve' | 'reject' | 'abstain' | null>(null);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleVoteSubmit = async () => {
    if (!selectedVote) {
      toast({
        title: 'Vote Required',
        description: 'Please select your vote before submitting.',
        variant: 'destructive',
      });
      return;
    }

    // Validate comment length
    const trimmedComment = comment.trim();
    if (trimmedComment.length > 1000) {
      toast({
        title: 'Comment Too Long',
        description: 'Comments must be 1000 characters or less.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await onVote(selectedVote, trimmedComment || undefined);
      
      toast({
        title: 'Vote Submitted',
        description: `Your ${selectedVote} vote has been recorded successfully.`,
      });
      
      // Reset form
      setSelectedVote(null);
      setComment('');
      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting vote:', error);
      
      let errorMessage = 'Failed to submit your vote. Please try again.';
      if (error instanceof Error) {
        if (error.message.includes('429')) {
          errorMessage = 'Please wait before voting again. You are submitting votes too quickly.';
        } else if (error.message.includes('403')) {
          errorMessage = 'You do not have permission to vote on these minutes.';
        } else if (error.message.includes('404')) {
          errorMessage = 'These minutes could not be found.';
        } else if (error.message.includes('deadline')) {
          errorMessage = 'The voting deadline for these minutes has passed.';
        }
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const isVotingExpired = (deadline?: string) => {
    if (!deadline) return false;
    return new Date(deadline) < new Date();
  };

  const canUserVote = canVote && minutes.status === 'voting' && !userVote && !isVotingExpired(minutes.voting_deadline);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
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
            {minutes.voting_deadline && (
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Deadline: {formatDateTime(minutes.voting_deadline)}
              </span>
            )}
            {minutes.creator && (
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                By: {minutes.creator.full_name}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
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

            {/* Voting Progress (if applicable) */}
            {minutes.status === 'voting' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Current Voting Progress
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-medium text-green-600">{minutes.approve_votes || 0}</div>
                      <div className="text-gray-600">Approve</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-red-600">{minutes.reject_votes || 0}</div>
                      <div className="text-gray-600">Reject</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-gray-600">{minutes.abstain_votes || 0}</div>
                      <div className="text-gray-600">Abstain</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* User's Existing Vote */}
            {userVote && (
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-900">
                    <CheckCircle className="h-5 w-5" />
                    Your Vote
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-900">You voted:</span>
                    {getVoteBadge(userVote.vote)}
                  </div>
                  {userVote.comments && (
                    <div className="mt-2">
                      <p className="text-sm font-medium text-blue-900 mb-1">Your comment:</p>
                      <p className="text-sm text-blue-800 bg-white p-2 rounded border">
                        {userVote.comments}
                      </p>
                    </div>
                  )}
                  <p className="text-xs text-blue-700 mt-2">
                    Voted on {formatDateTime(userVote.voted_at)}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Voting Interface */}
            {canUserVote && (
              <Card className="border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-900">
                    <Users className="h-5 w-5" />
                    Cast Your Vote
                  </CardTitle>
                  <CardDescription className="text-green-700">
                    Please review the minutes above and cast your vote below.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Vote Options */}
                  <div>
                    <Label className="text-sm font-medium text-green-900 mb-3 block">
                      Select your vote:
                    </Label>
                    <div className="flex gap-2">
                      <Button
                        variant={selectedVote === 'approve' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedVote('approve')}
                        className={selectedVote === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}
                      >
                        <ThumbsUp className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        variant={selectedVote === 'reject' ? 'destructive' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedVote('reject')}
                      >
                        <ThumbsDown className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                      <Button
                        variant={selectedVote === 'abstain' ? 'secondary' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedVote('abstain')}
                      >
                        <Minus className="h-4 w-4 mr-1" />
                        Abstain
                      </Button>
                    </div>
                  </div>

                  {/* Comment Input */}
                  <div>
                    <Label htmlFor="vote-comment" className="text-sm font-medium text-green-900">
                      Comment (optional)
                    </Label>
                    <Textarea
                      id="vote-comment"
                      placeholder="Add any comments about your vote..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={3}
                      className={`mt-1 ${comment.length > 1000 ? 'border-red-500' : ''}`}
                      maxLength={1000}
                    />
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-xs text-green-700">
                        Your comment will be visible to administrators for feedback purposes.
                      </p>
                      <p className={`text-xs ${comment.length > 1000 ? 'text-red-500' : 'text-gray-500'}`}>
                        {comment.length}/1000
                      </p>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => onOpenChange(false)}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleVoteSubmit}
                      disabled={!selectedVote || isSubmitting}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit Vote'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Voting Expired Message */}
            {minutes.status === 'voting' && !userVote && isVotingExpired(minutes.voting_deadline) && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-red-700">
                    <XCircle className="h-5 w-5" />
                    <p className="font-medium">Voting deadline has passed</p>
                  </div>
                  <p className="text-sm text-red-600 mt-1">
                    You can no longer vote on these minutes.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}