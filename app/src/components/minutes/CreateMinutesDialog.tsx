'use client';

import { useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Calendar, FileText, CheckSquare, Users } from 'lucide-react';

interface CreateMinutesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => Promise<void>;
}

export function CreateMinutesDialog({ open, onOpenChange, onSubmit }: CreateMinutesDialogProps) {
  const [formData, setFormData] = useState({
    title: '',
    meeting_date: '',
    content: '',
    key_decisions: '',
    action_items: '',
    minimum_quorum: 50,
    approval_threshold: 75,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.meeting_date || !formData.content) {
      return;
    }

    try {
      setLoading(true);
      await onSubmit(formData);

      // Reset form
      setFormData({
        title: '',
        meeting_date: '',
        content: '',
        key_decisions: '',
        action_items: '',
        minimum_quorum: 50,
        approval_threshold: 75,
      });
    } catch (error) {
      console.error('Error creating minutes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNumberChange = (field: string, value: number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Create Meeting Minutes
          </DialogTitle>
          <DialogDescription>
            Create new meeting minutes that will require board member approval through voting.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Minutes Title *
              </Label>
              <Input
                id="title"
                placeholder="e.g., Board Meeting Minutes - January 2024"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="meeting_date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Meeting Date *
              </Label>
              <Input
                id="meeting_date"
                type="date"
                value={formData.meeting_date}
                onChange={(e) => handleChange('meeting_date', e.target.value)}
                required
              />
            </div>
          </div>

          {/* Meeting Content */}
          <div className="space-y-2">
            <Label htmlFor="content" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Meeting Notes/Content *
            </Label>
            <Textarea
              id="content"
              placeholder="Enter the full meeting notes, discussions, and proceedings..."
              value={formData.content}
              onChange={(e) => handleChange('content', e.target.value)}
              rows={8}
              required
              className="min-h-[200px]"
            />
            <p className="text-sm text-gray-500">
              Include all relevant meeting discussions, decisions made, and important points covered.
            </p>
          </div>

          {/* Key Decisions */}
          <div className="space-y-2">
            <Label htmlFor="key_decisions" className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4" />
              Key Decisions Made
            </Label>
            <Textarea
              id="key_decisions"
              placeholder="List the key decisions made during the meeting..."
              value={formData.key_decisions}
              onChange={(e) => handleChange('key_decisions', e.target.value)}
              rows={4}
            />
            <p className="text-sm text-gray-500">
              Summarize the main decisions and resolutions approved during the meeting.
            </p>
          </div>

          {/* Action Items */}
          <div className="space-y-2">
            <Label htmlFor="action_items" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Action Items & Follow-ups
            </Label>
            <Textarea
              id="action_items"
              placeholder="List action items, assignments, and follow-up tasks..."
              value={formData.action_items}
              onChange={(e) => handleChange('action_items', e.target.value)}
              rows={4}
            />
            <p className="text-sm text-gray-500">
              Include tasks assigned to specific people, deadlines, and follow-up requirements.
            </p>
          </div>

          {/* Voting Configuration */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-lg font-medium text-gray-900">Voting Configuration</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minimum_quorum" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Minimum Quorum (%)
                </Label>
                <Input
                  id="minimum_quorum"
                  type="number"
                  min="1"
                  max="100"
                  value={formData.minimum_quorum}
                  onChange={(e) => handleNumberChange('minimum_quorum', parseInt(e.target.value) || 50)}
                />
                <p className="text-sm text-gray-500">
                  Minimum percentage of board members required to vote for the result to be valid.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="approval_threshold" className="flex items-center gap-2">
                  <CheckSquare className="h-4 w-4" />
                  Approval Threshold (%)
                </Label>
                <Input
                  id="approval_threshold"
                  type="number"
                  min="1"
                  max="100"
                  value={formData.approval_threshold}
                  onChange={(e) => handleNumberChange('approval_threshold', parseInt(e.target.value) || 75)}
                />
                <p className="text-sm text-gray-500">
                  Percentage of votes required to approve the minutes.
                </p>
              </div>
            </div>
          </div>

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
              {loading ? 'Creating...' : 'Create Minutes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}