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
   * Cast vote on resolution
   */
  async castVote(vote: ResolutionVoteInsert): Promise<ResolutionVote | null> {
    const { data, error } = await this.supabase
      .from('resolution_votes')
      .upsert(vote, { onConflict: 'resolution_id,voter_id' })
      .select()
      .single();

    if (error) {
      console.error('Error casting vote:', error);
      return null;
    }

    // Update vote counts
    await this.updateVoteCounts(vote.resolution_id);

    return data;
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
    const { data, error } = await this.supabase
      .from('resolution_votes')
      .select('*')
      .eq('resolution_id', resolutionId)
      .eq('voter_id', userId)
      .single();

    if (error) {
      return null;
    }

    return data;
  }

  /**
   * Update vote counts for a resolution
   */
  private async updateVoteCounts(resolutionId: string): Promise<void> {
    // Get vote counts
    const { data: votes } = await this.supabase
      .from('resolution_votes')
      .select('vote')
      .eq('resolution_id', resolutionId);

    if (!votes) return;

    const voteCounts = votes.reduce((acc, vote) => {
      if (vote.vote) {
        acc[vote.vote] = (acc[vote.vote] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    // Update resolution with new counts
    await this.supabase
      .from('resolutions')
      .update({
        votes_for: voteCounts.for || 0,
        votes_against: voteCounts.against || 0,
        votes_abstain: voteCounts.abstain || 0
      })
      .eq('id', resolutionId);
  }

  // Removed duplicate functions
}
