'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Users, AlertTriangle, Clock } from 'lucide-react';

interface Minutes {
  id: string;
  title: string;
  meeting_date: string;
  content: string;
  key_decisions?: string;
  action_items?: string;
  status: string;
}

interface PublishMinutesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  minutes: Minutes;
  onPublish: (minutesId: string, votingDeadline: string) => Promise<void>;
}

export function PublishMinutesDialog({ 
  open, 
  onOpenChange, 
  minutes, 
  onPublish 
}: PublishMinutesDialogProps) {
  const [votingDeadline, setVotingDeadline] = useState('');
  const [loading, setLoading] = useState(false);

  // Set default deadline to 7 days from now
  const getDefaultDeadline = () => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString().slice(0, 16); // Format for datetime-local input
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!votingDeadline) {
      return;
    }

    // Validate deadline is in the future
    const deadlineDate = new Date(votingDeadline);
    if (deadlineDate <= new Date()) {
      alert('Voting deadline must be in the future');
      return;
    }

    try {
      setLoading(true);
      await onPublish(minutes.id, votingDeadline);
    } catch (error) {
      console.error('Error publishing minutes:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Set default deadline when dialog opens
  useEffect(() => {
    if (open && !votingDeadline) {
      setVotingDeadline(getDefaultDeadline());
    }
  }, [open, votingDeadline]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Publish Minutes for Voting
          </DialogTitle>
          <DialogDescription>
            Publishing these minutes will make them available for board member voting. 
            Board members will receive notifications and can vote to approve or reject the minutes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Minutes Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{minutes.title}</CardTitle>
              <CardDescription className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Meeting: {formatDate(minutes.meeting_date)}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-sm text-gray-700 mb-1">Content Preview</h4>
                  <p className="text-sm text-gray-600 line-clamp-3">
                    {minutes.content.substring(0, 200)}...
                  </p>
                </div>
                
                {minutes.key_decisions && (
                  <div>
                    <h4 className="font-medium text-sm text-gray-700 mb-1">Key Decisions</h4>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {minutes.key_decisions.substring(0, 150)}...
                    </p>
                  </div>
                )}
                
                {minutes.action_items && (
                  <div>
                    <h4 className="font-medium text-sm text-gray-700 mb-1">Action Items</h4>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {minutes.action_items.substring(0, 150)}...
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Voting Configuration */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="voting_deadline" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Voting Deadline *
              </Label>
              <Input
                id="voting_deadline"
                type="datetime-local"
                value={votingDeadline}
                onChange={(e) => setVotingDeadline(e.target.value)}
                required
                min={new Date().toISOString().slice(0, 16)}
              />
              <p className="text-sm text-gray-500">
                Board members must submit their votes before this deadline. 
                Recommended: Allow at least 3-7 days for voting.
              </p>
            </div>

            {/* Important Information */}
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div className="space-y-2">
                    <h4 className="font-medium text-amber-800">Important Information</h4>
                    <ul className="text-sm text-amber-700 space-y-1">
                      <li>• Board members will receive notifications about the voting</li>
                      <li>• Minutes require &gt;75% approval rate to pass</li>
                      <li>• Voting options: Approve, Reject, or Abstain</li>
                      <li>• Results will be calculated automatically when voting closes</li>
                      <li>• You cannot edit minutes once published for voting</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Publishing...' : 'Publish for Voting'}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}