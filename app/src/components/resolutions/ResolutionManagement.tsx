'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  Plus,
  Edit,
  Trash2,
  Vote,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  FileText,
  ThumbsUp,
  ThumbsDown,
  Minus,
  AlertTriangle,
  MessageSquare,
  RefreshCw,
} from 'lucide-react';
import { format } from 'date-fns';
import { AdminResolutionCommentView } from './AdminResolutionCommentView';
import { ResolutionDetailView } from './ResolutionDetailView';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';

type Resolution = Database['public']['Tables']['resolutions']['Row'] & {
  profiles?: { full_name: string | null; email: string } | null;
  categories?: { name: string; color: string | null } | null;
};

type Category = Database['public']['Tables']['categories']['Row'];

interface ResolutionManagementProps {
  initialResolutions: Resolution[];
  categories: Category[];
  userId: string;
  userRole: string;
}

const resolutionTypes = [
  { value: 'board_resolution', label: 'Board Resolution' },
  { value: 'committee_resolution', label: 'Committee Resolution' },
  { value: 'special_resolution', label: 'Special Resolution' },
];

const resolutionStatuses = [
  { value: 'draft', label: 'Draft', icon: FileText, color: 'gray' },
  { value: 'under_review', label: 'Under Review', icon: Eye, color: 'blue' },
  { value: 'voting', label: 'Voting Open', icon: Vote, color: 'orange' },
  { value: 'approved', label: 'Approved', icon: CheckCircle, color: 'green' },
  { value: 'rejected', label: 'Rejected', icon: XCircle, color: 'red' },
  { value: 'withdrawn', label: 'Withdrawn', icon: AlertTriangle, color: 'yellow' },
];

export function ResolutionManagement({
  initialResolutions,
  categories,
  userId,
  userRole
}: ResolutionManagementProps) {
  const [resolutions, setResolutions] = useState<Resolution[]>(initialResolutions);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isVoteDialogOpen, setIsVoteDialogOpen] = useState(false);
  const [editingResolution, setEditingResolution] = useState<Resolution | null>(null);
  const [votingResolution, setVotingResolution] = useState<Resolution | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);

  const supabase = createClient();

  // Real-time subscription for resolution changes
  useRealtimeSubscription({
    table: 'resolutions',
    onUpdate: (payload) => {
      console.log('Resolution updated in management:', payload);
      if (payload.new && typeof payload.new === 'object' && 'id' in payload.new) {
        const newResolution = payload.new as Resolution;
        setResolutions(prev => prev.map(r =>
          r.id === newResolution.id ? { ...r, ...newResolution } : r
        ));
      }
    },
    onInsert: (payload) => {
      console.log('New resolution created:', payload);
      if (payload.new && typeof payload.new === 'object' && 'id' in payload.new) {
        const newResolution = payload.new as Resolution;
        setResolutions(prev => [newResolution, ...prev]);
      }
    },
    onDelete: (payload) => {
      console.log('Resolution deleted:', payload);
      if (payload.old && typeof payload.old === 'object' && 'id' in payload.old) {
        const deletedResolution = payload.old as Resolution;
        setResolutions(prev => prev.filter(r => r.id !== deletedResolution.id));
      }
    }
  });

  // Real-time subscription for resolution votes to update vote counts
  useRealtimeSubscription({
    table: 'resolution_votes',
    onInsert: (payload) => {
      console.log('New vote cast in management:', payload);
      // Refresh the specific resolution to get updated vote counts
      if (payload.new && typeof payload.new === 'object' && 'resolution_id' in payload.new) {
        const voteData = payload.new as { resolution_id: string };
        refreshResolution(voteData.resolution_id);
      }
    },
    onUpdate: (payload) => {
      console.log('Vote updated in management:', payload);
      // Refresh the specific resolution to get updated vote counts
      if (payload.new && typeof payload.new === 'object' && 'resolution_id' in payload.new) {
        const voteData = payload.new as { resolution_id: string };
        refreshResolution(voteData.resolution_id);
      }
    },
    onDelete: (payload) => {
      console.log('Vote deleted in management:', payload);
      // Refresh the specific resolution to get updated vote counts
      if (payload.old && typeof payload.old === 'object' && 'resolution_id' in payload.old) {
        const voteData = payload.old as { resolution_id: string };
        refreshResolution(voteData.resolution_id);
      }
    }
  });

  // Function to refresh a specific resolution's data
  const refreshResolution = async (resolutionId: string) => {
    try {
      const { data, error } = await supabase
        .from('resolutions')
        .select(`
          *,
          profiles!created_by(full_name, email),
          categories(name, color)
        `)
        .eq('id', resolutionId)
        .single();

      if (!error && data) {
        setResolutions(prev => prev.map(r =>
          r.id === resolutionId ? data : r
        ));
      }
    } catch (error) {
      console.error('Error refreshing resolution:', error);
    }
  };

  const filteredResolutions = resolutions.filter(resolution => {
    const matchesSearch = resolution.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resolution.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resolution.resolution_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || resolution.status === statusFilter;
    const matchesType = typeFilter === 'all' || resolution.resolution_type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  // Function to refresh all resolutions
  const refreshAllResolutions = async () => {
    try {
      setRefreshing(true);

      const { data, error } = await supabase
        .from('resolutions')
        .select(`
          *,
          profiles!created_by(full_name, email),
          categories(name, color)
        `)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setResolutions(data);
        toast.success('Resolutions refreshed');
      } else if (error) {
        toast.error('Failed to refresh resolutions');
      }
    } catch (error) {
      console.error('Error refreshing resolutions:', error);
      toast.error('Failed to refresh resolutions');
    } finally {
      setRefreshing(false);
    }
  };

  const generateResolutionNumber = async (retryCount = 0): Promise<string> => {
    const year = new Date().getFullYear();

    try {
      // Get all resolution numbers for the current year from the database
      const { data: existingResolutions, error } = await supabase
        .from('resolutions')
        .select('resolution_number')
        .like('resolution_number', `RES-${year}-%`)
        .order('resolution_number', { ascending: false });

      if (error) {
        console.error('Error fetching existing resolution numbers:', error);
        // Fallback to timestamp-based number if query fails
        const timestamp = Date.now().toString().slice(-6);
        return `RES-${year}-${timestamp}`;
      }

      // Extract the highest number for this year
      let highestNumber = 0;
      if (existingResolutions && existingResolutions.length > 0) {
        for (const resolution of existingResolutions) {
          const match = resolution.resolution_number?.match(/RES-\d{4}-(\d+)/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > highestNumber) {
              highestNumber = num;
            }
          }
        }
      }

      // Generate the next number with retry offset
      const nextNumber = highestNumber + 1 + retryCount;
      return `RES-${year}-${nextNumber.toString().padStart(3, '0')}`;

    } catch (error) {
      console.error('Error in generateResolutionNumber:', error);
      // Fallback to timestamp-based number
      const timestamp = Date.now().toString().slice(-6);
      return `RES-${year}-${timestamp}`;
    }
  };

  const handleAddResolution = async (formData: FormData) => {
    setLoading(true);

    try {
      const title = formData.get('title') as string;
      const description = formData.get('description') as string;
      const content = formData.get('content') as string;
      const resolution_type = formData.get('resolution_type') as 'board_resolution' | 'committee_resolution' | 'special_resolution';
      const category_id = formData.get('category_id') as string;
      const voting_deadline = formData.get('voting_deadline') as string;
      const requires_majority = formData.get('requires_majority') === 'on';
      const minimum_quorum = parseInt(formData.get('minimum_quorum') as string) || 50;
      const total_eligible_voters = parseInt(formData.get('total_eligible_voters') as string) || 1;
      const tagsString = formData.get('tags') as string;
      const tags = tagsString ? tagsString.split(',').map(tag => tag.trim()).filter(Boolean) : null;

      // Retry logic for resolution creation in case of duplicate numbers
      let retryCount = 0;
      const maxRetries = 3;
      let success = false;

      while (!success && retryCount < maxRetries) {
        try {
          const resolution_number = await generateResolutionNumber(retryCount);

          // Use the API endpoint instead of direct database access
          const response = await fetch('/api/resolutions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              title,
              description: description || null,
              content,
              resolution_number,
              resolution_type,
              category_id: category_id || null,
              voting_deadline: voting_deadline || null,
              requires_majority,
              minimum_quorum,
              total_eligible_voters,
              tags,
              meeting_id: null,
              effective_date: null,
              attachments: null,
            }),
          });

          const result = await response.json();

          if (response.ok) {
            success = true;
            setIsAddDialogOpen(false);
            toast.success('Resolution created successfully');
          } else if (result.error && result.error.includes('duplicate key')) {
            // If it's a duplicate key error, retry with a different number
            retryCount++;
            if (retryCount >= maxRetries) {
              toast.error('Failed to create resolution: Unable to generate unique resolution number');
              return;
            }
          } else {
            // For other errors, don't retry
            toast.error(`Failed to create resolution: ${result.error || 'Unknown error'}`);
            return;
          }
        } catch (error) {
          console.error('Error creating resolution:', error);
          toast.error('Failed to create resolution: Network error');
          return;
        }
      }
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleEditResolution = async (formData: FormData) => {
    if (!editingResolution) return;

    setLoading(true);

    try {
      const title = formData.get('title') as string;
      const description = formData.get('description') as string;
      const content = formData.get('content') as string;
      const resolution_type = formData.get('resolution_type') as 'board_resolution' | 'committee_resolution' | 'special_resolution';
      const category_id = formData.get('category_id') as string;
      const voting_deadline = formData.get('voting_deadline') as string;
      const requires_majority = formData.get('requires_majority') === 'on';
      const minimum_quorum = parseInt(formData.get('minimum_quorum') as string);
      const total_eligible_voters = parseInt(formData.get('total_eligible_voters') as string);
      const tagsString = formData.get('tags') as string;
      const tags = tagsString ? tagsString.split(',').map(tag => tag.trim()).filter(Boolean) : null;

      const { data, error } = await supabase
        .from('resolutions')
        .update({
          title,
          description: description || null,
          content,
          resolution_type,
          category_id: category_id || null,
          voting_deadline: voting_deadline || null,
          requires_majority,
          minimum_quorum,
          total_eligible_voters,
          tags,
          updated_by: userId,
        })
        .eq('id', editingResolution.id)
        .select(`
          *,
          profiles!created_by(full_name, email),
          categories(name, color)
        `)
        .single();

      if (error) {
        toast.error(`Failed to update resolution: ${error.message}`);
        return;
      }

      setResolutions(resolutions.map(resolution => resolution.id === editingResolution.id ? data : resolution));
      setIsEditDialogOpen(false);
      setEditingResolution(null);
      toast.success('Resolution updated successfully');
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (resolutionId: string, newStatus: string) => {
    try {
      const updateData: {
        status: string;
        updated_by: string;
        passed_at?: string;
      } = {
        status: newStatus,
        updated_by: userId
      };

      // If approved, set passed_at timestamp
      if (newStatus === 'approved') {
        updateData.passed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('resolutions')
        .update(updateData)
        .eq('id', resolutionId);

      if (error) {
        toast.error(`Failed to update resolution status: ${error.message}`);
        return;
      }

      setResolutions(resolutions.map(resolution =>
        resolution.id === resolutionId
          ? {
            ...resolution,
            status: newStatus as Resolution['status'],
            passed_at: newStatus === 'approved' ? new Date().toISOString() : resolution.passed_at
          }
          : resolution
      ));

      toast.success('Resolution status updated successfully');
    } catch {
      toast.error('An unexpected error occurred');
    }
  };

  const handleVote = async (formData: FormData) => {
    if (!votingResolution) return;

    setLoading(true);

    try {
      const vote = formData.get('vote') as 'for' | 'against' | 'abstain';
      const vote_reason = formData.get('vote_reason') as string;

      // Map database vote format to API format
      const apiVote = vote === 'for' ? 'approve' : vote === 'against' ? 'reject' : 'abstain';

      // Use the API endpoint instead of direct database access
      const response = await fetch(`/api/resolutions/${votingResolution.id}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vote: apiVote,
          comment: vote_reason || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit vote');
      }

      setIsVoteDialogOpen(false);
      setVotingResolution(null);
      toast.success(data.message || 'Vote recorded successfully');

      // The real-time subscription will handle updating the UI

    } catch (error) {
      console.error('Error casting vote:', error);
      toast.error(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteResolution = async (resolutionId: string) => {
    try {
      // Delete all votes first
      await supabase
        .from('resolution_votes')
        .delete()
        .eq('resolution_id', resolutionId);

      // Delete resolution
      const { error } = await supabase
        .from('resolutions')
        .delete()
        .eq('id', resolutionId);

      if (error) {
        toast.error(`Failed to delete resolution: ${error.message}`);
        return;
      }

      setResolutions(resolutions.filter(resolution => resolution.id !== resolutionId));
      toast.success('Resolution deleted successfully');
    } catch {
      toast.error('An unexpected error occurred');
    }
  };

  const canEditResolution = (resolution: Resolution) => {
    return userRole === 'admin' || (resolution.created_by === userId && resolution.status === 'draft');
  };

  const canVoteOnResolution = (resolution: Resolution) => {
    return resolution.status === 'voting' && userRole === 'board_member';
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = resolutionStatuses.find(s => s.value === status);
    if (!statusConfig) return null;

    const Icon = statusConfig.icon;

    return (
      <Badge variant="secondary" className={`text-${statusConfig.color}-700 bg-${statusConfig.color}-100`}>
        <Icon className="w-3 h-3 mr-1" />
        {statusConfig.label}
      </Badge>
    );
  };

  const calculateVotingProgress = (resolution: Resolution) => {
    const votesFor = resolution.votes_for || 0;
    const votesAgainst = resolution.votes_against || 0;
    const votesAbstain = resolution.votes_abstain || 0;
    const totalVotes = votesFor + votesAgainst + votesAbstain;
    const totalEligible = resolution.total_eligible_voters || 1;
    return (totalVotes / totalEligible) * 100;
  };

  const loadEditingResolution = (resolution: Resolution) => {
    setEditingResolution(resolution);
    setIsEditDialogOpen(true);
  };

  const openVoteDialog = (resolution: Resolution) => {
    setVotingResolution(resolution);
    setIsVoteDialogOpen(true);
  };



  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-center sm:space-y-0">
        <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-4 flex-1">
          <div className="flex-1 sm:max-w-sm">
            <Input
              placeholder="Search resolutions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>

          <div className="flex space-x-2 sm:space-x-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {resolutionStatuses.map(status => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {resolutionTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshAllResolutions}
            disabled={refreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>

          {userRole === 'admin' && (
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <Plus className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Create Resolution</span>
                  <span className="sm:hidden">Create</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
                <DialogHeader>
                  <DialogTitle>Create New Resolution</DialogTitle>
                  <DialogDescription>
                    Draft a new board resolution for review and voting.
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  await handleAddResolution(formData);
                }} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Resolution Title *</Label>
                      <Input id="title" name="title" required />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="resolution_type">Resolution Type *</Label>
                      <Select name="resolution_type" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select resolution type" />
                        </SelectTrigger>
                        <SelectContent>
                          {resolutionTypes.map(type => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      name="description"
                      placeholder="Brief description of the resolution"
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="content">Resolution Content *</Label>
                    <Textarea
                      id="content"
                      name="content"
                      placeholder="Full text of the resolution, including whereas clauses and resolved statements"
                      rows={8}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="category_id">Category</Label>
                      <Select name="category_id">
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map(category => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="voting_deadline">Voting Deadline</Label>
                      <Input
                        id="voting_deadline"
                        name="voting_deadline"
                        type="datetime-local"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="total_eligible_voters">Eligible Voters *</Label>
                      <Input
                        id="total_eligible_voters"
                        name="total_eligible_voters"
                        type="number"
                        defaultValue="1"
                        min="1"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="minimum_quorum">Minimum Quorum (%)</Label>
                      <Input
                        id="minimum_quorum"
                        name="minimum_quorum"
                        type="number"
                        defaultValue="50"
                        min="1"
                        max="100"
                      />
                    </div>

                    <div className="flex items-center space-x-2 pt-6">
                      <Switch id="requires_majority" name="requires_majority" defaultChecked />
                      <Label htmlFor="requires_majority">Requires Majority Vote</Label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tags">Tags (comma-separated)</Label>
                    <Input
                      id="tags"
                      name="tags"
                      placeholder="governance, finance, policy"
                    />
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={loading}>
                      Create Resolution
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Resolutions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Board Resolutions ({filteredResolutions.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {/* Mobile Card View */}
          <div className="block sm:hidden">
            {filteredResolutions.map((resolution) => (
              <div key={resolution.id} className="border-b border-gray-200 p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-medium text-sm">{resolution.title}</h3>
                    <p className="text-xs text-muted-foreground">{resolution.resolution_number}</p>
                    {resolution.description && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {resolution.description.substring(0, 80)}
                        {resolution.description.length > 80 && '...'}
                      </p>
                    )}
                  </div>
                  <div className="ml-2">
                    {getStatusBadge(resolution.status || 'draft')}
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <Badge variant="outline" className="text-xs">
                    {resolutionTypes.find(t => t.value === resolution.resolution_type)?.label}
                  </Badge>
                  {resolution.voting_deadline && (
                    <span className="text-muted-foreground">
                      Due: {format(new Date(resolution.voting_deadline), 'MMM d')}
                    </span>
                  )}
                </div>

                {(resolution.status === 'voting' || resolution.status === 'approved' || resolution.status === 'rejected') && (
                  <div className="space-y-2">
                    <Progress value={calculateVotingProgress(resolution)} className="w-full h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span className="flex items-center">
                        <ThumbsUp className="w-3 h-3 mr-1 text-green-600" />
                        {resolution.votes_for || 0}
                      </span>
                      <span className="flex items-center">
                        <ThumbsDown className="w-3 h-3 mr-1 text-red-600" />
                        {resolution.votes_against || 0}
                      </span>
                      <span className="flex items-center">
                        <Minus className="w-3 h-3 mr-1 text-gray-600" />
                        {resolution.votes_abstain || 0}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <div className="flex space-x-2">
                    {userRole === 'admin' && (
                      <Select
                        value={resolution.status || undefined}
                        onValueChange={(value) => handleUpdateStatus(resolution.id, value)}
                      >
                        <SelectTrigger className="w-24 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {resolutionStatuses.map(status => (
                            <SelectItem key={status.value} value={status.value}>
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <div className="flex space-x-1">
                    <ResolutionDetailView
                      resolution={resolution}
                      canVote={false}
                      trigger={
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2 text-xs"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Details
                        </Button>
                      }
                    />

                    {canVoteOnResolution(resolution) && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => openVoteDialog(resolution)}
                        className="h-8 px-2 text-xs"
                      >
                        <Vote className="h-3 w-3 mr-1" />
                        Vote
                      </Button>
                    )}

                    {userRole === 'admin' && (resolution.status === 'voting' || resolution.status === 'approved' || resolution.status === 'rejected') && (
                      <AdminResolutionCommentView
                        resolutionId={resolution.id}
                        resolutionTitle={resolution.title}
                        trigger={
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2 text-xs"
                          >
                            <MessageSquare className="h-3 w-3 mr-1" />
                            Comments
                          </Button>
                        }
                      />
                    )}

                    {canEditResolution(resolution) && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => loadEditingResolution(resolution)}
                          className="h-8 px-2"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 px-2">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Resolution</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete &quot;{resolution.title}&quot;?
                                This action cannot be undone and will remove all associated votes.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteResolution(resolution.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Resolution</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Voting Progress</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResolutions.map((resolution) => (
                  <TableRow key={resolution.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{resolution.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {resolution.resolution_number}
                        </div>
                        {resolution.description && (
                          <div className="text-sm text-muted-foreground mt-1">
                            {resolution.description.substring(0, 100)}
                            {resolution.description.length > 100 && '...'}
                          </div>
                        )}
                        {resolution.tags && resolution.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {resolution.tags.slice(0, 3).map((tag, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {resolution.tags.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{resolution.tags.length - 3} more
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge variant="outline">
                        {resolutionTypes.find(t => t.value === resolution.resolution_type)?.label}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      {getStatusBadge(resolution.status || 'draft')}
                    </TableCell>

                    <TableCell>
                      {resolution.status === 'voting' || resolution.status === 'approved' || resolution.status === 'rejected' ? (
                        <div className="space-y-2">
                          <Progress value={calculateVotingProgress(resolution)} className="w-full" />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span className="flex items-center">
                              <ThumbsUp className="w-3 h-3 mr-1 text-green-600" />
                              {resolution.votes_for || 0}
                            </span>
                            <span className="flex items-center">
                              <ThumbsDown className="w-3 h-3 mr-1 text-red-600" />
                              {resolution.votes_against || 0}
                            </span>
                            <span className="flex items-center">
                              <Minus className="w-3 h-3 mr-1 text-gray-600" />
                              {resolution.votes_abstain || 0}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {(resolution.votes_for || 0) + (resolution.votes_against || 0) + (resolution.votes_abstain || 0)} / {resolution.total_eligible_voters || 0} votes
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Not yet voting</span>
                      )}
                    </TableCell>

                    <TableCell>
                      {resolution.voting_deadline ? (
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="text-sm font-medium">
                              {format(new Date(resolution.voting_deadline), 'MMM d, yyyy')}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {format(new Date(resolution.voting_deadline), 'h:mm a')}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No deadline</span>
                      )}
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {/* Status Update Dropdown for Admin */}
                        {userRole === 'admin' && (
                          <Select
                            value={resolution.status || undefined}
                            onValueChange={(value) => handleUpdateStatus(resolution.id, value)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {resolutionStatuses.map(status => (
                                <SelectItem key={status.value} value={status.value}>
                                  {status.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}

                        {/* Vote Button */}
                        {canVoteOnResolution(resolution) && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => openVoteDialog(resolution)}
                          >
                            <Vote className="h-4 w-4 mr-1" />
                            Vote
                          </Button>
                        )}

                        {/* View Details Button */}
                        <ResolutionDetailView
                          resolution={resolution}
                          canVote={false}
                          trigger={
                            <Button
                              variant="outline"
                              size="sm"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Details
                            </Button>
                          }
                        />

                        {/* View Comments Button for Admin */}
                        {userRole === 'admin' && (resolution.status === 'voting' || resolution.status === 'approved' || resolution.status === 'rejected') && (
                          <AdminResolutionCommentView
                            resolutionId={resolution.id}
                            resolutionTitle={resolution.title}
                            trigger={
                              <Button
                                variant="outline"
                                size="sm"
                              >
                                <MessageSquare className="h-4 w-4 mr-1" />
                                Comments
                              </Button>
                            }
                          />
                        )}

                        {canEditResolution(resolution) && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => loadEditingResolution(resolution)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Resolution</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete &quot;{resolution.title}&quot;?
                                    This action cannot be undone and will remove all associated votes.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteResolution(resolution.id)}
                                    className="bg-destructive text-destructive-foreground"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Vote Dialog */}
      {votingResolution && (
        <Dialog open={isVoteDialogOpen} onOpenChange={setIsVoteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cast Your Vote</DialogTitle>
              <DialogDescription>
                Vote on &quot;{votingResolution.title}&quot; - {votingResolution.resolution_number}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">Resolution Content:</h4>
                <p className="text-sm text-muted-foreground">
                  {votingResolution.content.substring(0, 300)}
                  {votingResolution.content.length > 300 && '...'}
                </p>
              </div>

              <form action={handleVote} className="space-y-4">
                <div className="space-y-3">
                  <Label>Your Vote *</Label>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input type="radio" name="vote" value="for" required />
                      <ThumbsUp className="w-4 h-4 text-green-600" />
                      <span>Vote For</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input type="radio" name="vote" value="against" required />
                      <ThumbsDown className="w-4 h-4 text-red-600" />
                      <span>Vote Against</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input type="radio" name="vote" value="abstain" required />
                      <Minus className="w-4 h-4 text-gray-600" />
                      <span>Abstain</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vote_reason">Reason (Optional)</Label>
                  <Textarea
                    id="vote_reason"
                    name="vote_reason"
                    placeholder="Explain your vote (optional)"
                    rows={3}
                  />
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsVoteDialogOpen(false);
                      setVotingResolution(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    Submit Vote
                  </Button>
                </DialogFooter>
              </form>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Resolution Dialog */}
      {editingResolution && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Resolution</DialogTitle>
              <DialogDescription>
                Update resolution details and settings.
              </DialogDescription>
            </DialogHeader>

            <form action={handleEditResolution} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_title">Resolution Title *</Label>
                  <Input
                    id="edit_title"
                    name="title"
                    defaultValue={editingResolution.title}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_resolution_type">Resolution Type *</Label>
                  <Select name="resolution_type" defaultValue={editingResolution.resolution_type || undefined}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {resolutionTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_description">Description</Label>
                <Textarea
                  id="edit_description"
                  name="description"
                  defaultValue={editingResolution.description || ''}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_content">Resolution Content *</Label>
                <Textarea
                  id="edit_content"
                  name="content"
                  defaultValue={editingResolution.content}
                  rows={8}
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_category_id">Category</Label>
                  <Select name="category_id" defaultValue={editingResolution.category_id || undefined}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_voting_deadline">Voting Deadline</Label>
                  <Input
                    id="edit_voting_deadline"
                    name="voting_deadline"
                    type="datetime-local"
                    defaultValue={editingResolution.voting_deadline?.slice(0, 16) || ''}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_total_eligible_voters">Eligible Voters *</Label>
                  <Input
                    id="edit_total_eligible_voters"
                    name="total_eligible_voters"
                    type="number"
                    defaultValue={editingResolution.total_eligible_voters || undefined}
                    min="1"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_minimum_quorum">Minimum Quorum (%)</Label>
                  <Input
                    id="edit_minimum_quorum"
                    name="minimum_quorum"
                    type="number"
                    defaultValue={editingResolution.minimum_quorum || undefined}
                    min="1"
                    max="100"
                  />
                </div>

                <div className="flex items-center space-x-2 pt-6">
                  <Switch
                    id="edit_requires_majority"
                    name="requires_majority"
                    defaultChecked={editingResolution.requires_majority || false}
                  />
                  <Label htmlFor="edit_requires_majority">Requires Majority Vote</Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_tags">Tags (comma-separated)</Label>
                <Input
                  id="edit_tags"
                  name="tags"
                  defaultValue={editingResolution.tags?.join(', ') || ''}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setEditingResolution(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  Update Resolution
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}


    </div>
  );
}
