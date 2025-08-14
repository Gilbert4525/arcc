import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

type Resolution = Database['public']['Tables']['resolutions']['Row'];
type ResolutionInsert = Database['public']['Tables']['resolutions']['Insert'];
type ResolutionUpdate = Database['public']['Tables']['resolutions']['Update'];
type ResolutionVote = Database['public']['Tables']['resolution_votes']['Row'];
type ResolutionVoteInsert = Database['public']['Tables']['resolution_votes']['Insert'];

export class ResolutionsService {
  private supabase: SupabaseClient<Database>;

  constructor(supabase: SupabaseClient<Database>) {
    this.supabase = supabase;
  }

  /**
   * Get all resolutions with pagination
   */
  async getResolutions(page = 1, limit = 20): Promise<{
    resolutions: Resolution[];
    total: number;
    hasMore: boolean;
  }> {
    const offset = (page - 1) * limit;

    // Get total count
    const { count } = await this.supabase
      .from('resolutions')
      .select('*', { count: 'exact', head: true });

    // Get resolutions
    const { data, error } = await this.supabase
      .from('resolutions')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching resolutions:', error);
      return { resolutions: [], total: 0, hasMore: false };
    }

    return {
      resolutions: data || [],
      total: count || 0,
      hasMore: (count || 0) > offset + limit
    };
  }

  /**
   * Get resolution by ID
   */
  async getResolution(id: string): Promise<Resolution | null> {
    const { data, error } = await this.supabase
      .from('resolutions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching resolution:', error);
      return null;
    }

    return data;
  }

  /**
   * Get all resolutions with related details (creator, category)
   */
  async getAllResolutionsWithDetails(): Promise<Resolution[]> {
    const { data, error } = await this.supabase
      .from('resolutions')
      .select(`
        *,
        profiles:created_by(full_name, email),
        categories(name, color)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching resolutions with details:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Create new resolution
   */
  async createResolution(resolution: ResolutionInsert): Promise<Resolution | null> {
    const { data, error } = await this.supabase
      .from('resolutions')
      .insert(resolution)
      .select()
      .single();

    if (error) {
      console.error('Error creating resolution:', error);
      return null;
    }

    return data;
  }

  /**
   * Update resolution
   */
  async updateResolution(id: string, updates: ResolutionUpdate): Promise<Resolution | null> {
    const { data, error } = await this.supabase
      .from('resolutions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating resolution:', error);
      return null;
    }

    return data;
  }

  /**
   * Delete resolution
   */
  async deleteResolution(id: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('resolutions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting resolution:', error);
      return false;
    }

    return true;
  }

  /**
   * Get resolutions by status
   */
  async getResolutionsByStatus(status: Resolution['status']): Promise<Resolution[]> {
    if (!status) {
      return [];
    }

    const { data, error } = await this.supabase
      .from('resolutions')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching resolutions by status:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get active voting resolutions
   */
  async getActiveVotingResolutions(): Promise<Resolution[]> {
    const now = new Date().toISOString();

    const { data, error } = await this.supabase
      .from('resolutions')
      .select('*')
      .eq('status', 'voting')
      .or(`voting_deadline.is.null,voting_deadline.gte.${now}`)
      .order('voting_deadline', { ascending: true });

    if (error) {
      console.error('Error fetching active voting resolutions:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get resolutions visible to board members (published and voting resolutions)
   */
  async getResolutionsForBoardMembers(): Promise<Resolution[]> {
    const { data, error } = await this.supabase
      .from('resolutions')
      .select(`
        *,
        profiles:created_by(full_name, email),
        categories(name, color)
      `)
      .in('status', ['published', 'voting', 'under_review'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching resolutions for board members:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get resolution statistics
   */
  async getResolutionStats(): Promise<{
    total: number;
    pending: number;
    voting: number;
    passed: number;
    failed: number;
    archived: number;
  }> {
    const { data, error, count } = await this.supabase
      .from('resolutions')
      .select('status', { count: 'exact' });

    if (error) {
      console.error('Error fetching resolution stats:', error);
      return { total: 0, pending: 0, voting: 0, passed: 0, failed: 0, archived: 0 };
    }

    const stats = (data || []).reduce((acc, { status }) => {
      if (status) {
        acc[status] = (acc[status] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return {
      total: count || 0,
      pending: stats.pending || 0,
      voting: stats.voting || 0,
      passed: stats.passed || 0,
      failed: stats.failed || 0,
      archived: stats.archived || 0,
    };
  }

  /**
   * Cast vote on resolution with proper validation
   */
  async voteOnResolution(
    resolutionId: string, 
    vote: 'approve' | 'reject' | 'abstain', 
    comment?: string,
    userId?: string
  ): Promise<ResolutionVote | null> {
    try {
      // Get current user if not provided
      if (!userId) {
        const { data: { user }, error: authError } = await this.supabase.auth.getUser();
        if (authError || !user) {
          throw new Error('User not authenticated');
        }
        userId = user.id;
      }

      // Validate resolution exists and is open for voting
      const resolution = await this.getResolution(resolutionId);
      if (!resolution) {
        throw new Error('Resolution not found');
      }

      if (resolution.status !== 'voting') {
        throw new Error('Resolution is not open for voting');
      }

      // Check voting deadline
      if (resolution.voting_deadline && new Date(resolution.voting_deadline) < new Date()) {
        throw new Error('Voting deadline has passed');
      }

      // Map vote values to database format
      const voteValue = vote === 'approve' ? 'for' : vote === 'reject' ? 'against' : 'abstain';

      // Check if user has already voted
      const { data: existingVote } = await this.supabase
        .from('resolution_votes')
        .select('id')
        .eq('resolution_id', resolutionId)
        .eq('voter_id', userId)
        .single();

      let data, error;

      if (existingVote) {
        // Update existing vote
        const result = await this.supabase
          .from('resolution_votes')
          .update({
            vote: voteValue,
            vote_reason: comment || null,
            voted_at: new Date().toISOString(),
          })
          .eq('resolution_id', resolutionId)
          .eq('voter_id', userId)
          .select()
          .single();
        
        data = result.data;
        error = result.error;
      } else {
        // Insert new vote
        const result = await this.supabase
          .from('resolution_votes')
          .insert({
            resolution_id: resolutionId,
            voter_id: userId,
            vote: voteValue,
            vote_reason: comment || null,
            voted_at: new Date().toISOString(),
          })
          .select()
          .single();
        
        data = result.data;
        error = result.error;
      }

      if (error) {
        console.error('Error casting vote:', error);
        throw new Error(`Failed to record vote: ${error.message}`);
      }

      console.log('Vote recorded successfully, updating counts...', data);

      // Update vote counts and check if voting is complete
      await this.updateVoteCounts(resolutionId);
      await this.checkVotingStatus(resolutionId);

      console.log('Vote counts updated, returning data');
      return data;
    } catch (error) {
      console.error('Error in voteOnResolution:', error);
      throw error;
    }
  }

  /**
   * Get votes for a resolution
   */
  async getResolutionVotes(resolutionId: string): Promise<ResolutionVote[]> {
    const { data, error } = await this.supabase
      .from('resolution_votes')
      .select('*')
      .eq('resolution_id', resolutionId)
      .order('voted_at', { ascending: false });

    if (error) {
      console.error('Error fetching resolution votes:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get user's vote on a resolution
   */
  async getUserVote(resolutionId: string, userId: string): Promise<ResolutionVote | null> {
    try {
      console.log('Checking for existing vote:', { resolutionId, userId });
      
      const { data, error } = await this.supabase
        .from('resolution_votes')
        .select('*')
        .eq('resolution_id', resolutionId)
        .eq('voter_id', userId)
        .maybeSingle(); // Use maybeSingle instead of single to avoid errors when no rows found

      if (error) {
        console.error('Error fetching user vote:', error);
        return null;
      }

      console.log('Existing vote result:', data);
      return data;
    } catch (error) {
      console.error('Error in getUserVote:', error);
      return null;
    }
  }

  /**
   * Update vote counts for a resolution
   */
  async updateVoteCounts(resolutionId: string): Promise<void> {
    try {
      // Get vote counts
      const { data: votes, error } = await this.supabase
        .from('resolution_votes')
        .select('vote')
        .eq('resolution_id', resolutionId);

      if (error) {
        console.error('Error fetching votes for count update:', error);
        return;
      }

      const voteCounts = (votes || []).reduce((acc, vote) => {
        if (vote.vote) {
          acc[vote.vote] = (acc[vote.vote] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      console.log('Updating vote counts for resolution:', resolutionId, voteCounts);

      // Update resolution with new counts
      const { error: updateError } = await this.supabase
        .from('resolutions')
        .update({
          votes_for: voteCounts.for || 0,
          votes_against: voteCounts.against || 0,
          votes_abstain: voteCounts.abstain || 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', resolutionId);

      if (updateError) {
        console.error('Error updating vote counts:', updateError);
      }
    } catch (error) {
      console.error('Error in updateVoteCounts:', error);
    }
  }

  /**
   * Check voting status and update resolution status if voting is complete
   */
  async checkVotingStatus(resolutionId: string): Promise<void> {
    try {
      const resolution = await this.getResolution(resolutionId);
      if (!resolution || resolution.status !== 'voting') {
        return;
      }

      const totalVotes = (resolution.votes_for || 0) + (resolution.votes_against || 0) + (resolution.votes_abstain || 0);
      const totalEligibleVoters = resolution.total_eligible_voters || 1;
      const minimumQuorum = resolution.minimum_quorum || 50;
      const approvalThreshold = 75; // Default approval threshold

      // Check if all eligible voters have voted or deadline has passed
      const allVoted = totalVotes >= totalEligibleVoters;
      const deadlinePassed = resolution.voting_deadline && new Date(resolution.voting_deadline) < new Date();

      if (allVoted || deadlinePassed) {
        // Determine if resolution passes
        const quorumMet = (totalVotes / totalEligibleVoters) * 100 >= minimumQuorum;
        const approvalMet = ((resolution.votes_for || 0) / Math.max(1, totalVotes)) * 100 >= approvalThreshold;

        const updates: Partial<Resolution> = {
          updated_at: new Date().toISOString()
        };

        if (quorumMet && approvalMet) {
          updates.status = 'approved';
          updates.passed_at = new Date().toISOString();
          updates.is_unanimous = (resolution.votes_for || 0) === totalVotes && totalVotes > 0;
        } else {
          updates.status = 'rejected';
        }

        await this.updateResolution(resolutionId, updates);
      }
    } catch (error) {
      console.error('Error in checkVotingStatus:', error);
    }
  }

  /**
   * Get resolution comments and statistics (admin only)
   */
  async getResolutionComments(resolutionId: string, withComments?: boolean): Promise<{
    votes: VoteWithProfile[];
    statistics: CommentStatistics;
  }> {
    try {
      // Get all votes with voter profiles
      const { data: votes, error } = await this.supabase
        .from('resolution_votes')
        .select(`
          *,
          profiles:voter_id(id, full_name, email, position)
        `)
        .eq('resolution_id', resolutionId)
        .order('voted_at', { ascending: false });

      if (error) {
        console.error('Error fetching resolution comments:', error);
        return { votes: [], statistics: this.getEmptyStatistics() };
      }

      const votesWithProfiles: VoteWithProfile[] = (votes || []).map(vote => ({
        ...vote,
        voter: vote.profiles ? {
          id: vote.profiles.id,
          full_name: vote.profiles.full_name || 'Unknown',
          email: vote.profiles.email || '',
          position: vote.profiles.position || undefined
        } : {
          id: vote.voter_id,
          full_name: 'Unknown',
          email: '',
        }
      }));

      // Filter by comments if requested
      const filteredVotes = withComments 
        ? votesWithProfiles.filter(vote => vote.vote_reason && vote.vote_reason.trim().length > 0)
        : votesWithProfiles;

      // Calculate statistics
      const statistics = this.calculateCommentStatistics(votesWithProfiles);

      return { votes: filteredVotes, statistics };
    } catch (error) {
      console.error('Error in getResolutionComments:', error);
      return { votes: [], statistics: this.getEmptyStatistics() };
    }
  }

  /**
   * Calculate comment statistics
   */
  private calculateCommentStatistics(votes: VoteWithProfile[]): CommentStatistics {
    const totalVotes = votes.length;
    const votesWithComments = votes.filter(vote => vote.vote_reason && vote.vote_reason.trim().length > 0);
    const totalComments = votesWithComments.length;

    const commentsByVote = votes.reduce((acc, vote) => {
      if (vote.vote_reason && vote.vote_reason.trim().length > 0) {
        const voteType = vote.vote === 'for' ? 'approve' : vote.vote === 'against' ? 'reject' : 'abstain';
        acc[voteType] = (acc[voteType] || 0) + 1;
      }
      return acc;
    }, { approve: 0, reject: 0, abstain: 0 });

    const avgCommentLength = totalComments > 0 
      ? votesWithComments.reduce((sum, vote) => sum + (vote.vote_reason?.length || 0), 0) / totalComments
      : 0;

    const hasConcerns = commentsByVote.reject > 0;

    return {
      total_votes: totalVotes,
      total_comments: totalComments,
      comments_by_vote: commentsByVote,
      avg_comment_length: Math.round(avgCommentLength),
      has_concerns: hasConcerns
    };
  }

  /**
   * Get empty statistics object
   */
  private getEmptyStatistics(): CommentStatistics {
    return {
      total_votes: 0,
      total_comments: 0,
      comments_by_vote: { approve: 0, reject: 0, abstain: 0 },
      avg_comment_length: 0,
      has_concerns: false
    };
  }
}

// Type definitions for the new functionality
interface VoteWithProfile extends ResolutionVote {
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
