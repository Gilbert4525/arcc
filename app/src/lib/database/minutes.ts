import { SupabaseClient } from '@supabase/supabase-js';

export interface Minutes {
  id: string;
  title: string;
  meeting_date: string;
  meeting_id?: string;
  content: string;
  key_decisions?: any[];
  action_items?: any[];
  category_id?: string;
  status: 'draft' | 'published' | 'voting' | 'passed' | 'failed' | 'cancelled';
  voting_deadline?: string;
  total_eligible_voters: number;
  requires_majority: boolean;
  minimum_quorum: number;
  approval_threshold: number;
  total_votes: number;
  approve_votes: number;
  reject_votes: number;
  abstain_votes: number;
  attachments?: any[];
  tags?: string[];
  notes?: string;
  created_by: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

export interface MinutesVote {
  id: string;
  minutes_id: string;
  user_id: string;
  vote: 'approve' | 'reject' | 'abstain';
  comments?: string;
  voted_at: string;
  created_at: string;
}

export interface VoteWithProfile extends MinutesVote {
  voter: {
    id: string;
    full_name: string;
    email: string;
    position?: string;
  };
}

export interface MinutesWithComments {
  minutes: Minutes;
  votes: VoteWithProfile[];
  userVote: MinutesVote | null;
  statistics: {
    total_votes: number;
    approve_votes: number;
    reject_votes: number;
    abstain_votes: number;
    comments_count: number;
    approval_percentage: number;
    participation_percentage: number;
    total_eligible_voters: number;
  };
}

export interface CreateMinutesData {
  title: string;
  meeting_date: string;
  meeting_id?: string;
  content: string;
  key_decisions?: any[];
  action_items?: any[];
  category_id?: string;
  voting_deadline?: string;
  minimum_quorum?: number;
  approval_threshold?: number;
  attachments?: any[];
  tags?: string[];
  notes?: string;
  created_by: string; // Add the required created_by field
}

export interface UpdateMinutesData {
  title?: string;
  meeting_date?: string;
  meeting_id?: string;
  content?: string;
  key_decisions?: any[];
  action_items?: any[];
  category_id?: string;
  status?: Minutes['status'];
  voting_deadline?: string;
  minimum_quorum?: number;
  approval_threshold?: number;
  attachments?: any[];
  tags?: string[];
  notes?: string;
}

export interface MinutesStats {
  total: number;
  draft: number;
  published: number;
  voting: number;
  passed: number;
  failed: number;
  cancelled: number;
}

export class MinutesService {
  constructor(private supabase: SupabaseClient) {}

  // Get minutes with pagination
  async getMinutes(page: number = 1, limit: number = 20): Promise<{
    minutes: Minutes[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const offset = (page - 1) * limit;

      const { data, error, count } = await this.supabase
        .from('minutes')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      const total = count || 0;
      const hasMore = total > page * limit;

      return {
        minutes: data || [],
        total,
        hasMore,
      };
    } catch (error) {
      console.error('Error fetching minutes:', error);
      throw error;
    }
  }

  // Get minutes with creator information
  async getMinutesWithCreator(page: number = 1, limit: number = 20): Promise<{
    minutes: (Minutes & { creator?: { full_name: string; email: string } })[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const offset = (page - 1) * limit;

      const { data, error, count } = await this.supabase
        .from('minutes')
        .select(`
          *,
          profiles!minutes_created_by_fkey(full_name, email)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      // Transform data to include creator information
      const minutesWithCreator = (data || []).map(minutes => {
        const { profiles, ...minutesData } = minutes as any;
        return {
          ...minutesData,
          creator: profiles ? {
            full_name: profiles.full_name,
            email: profiles.email,
          } : null,
        };
      });

      const total = count || 0;
      const hasMore = total > page * limit;

      return {
        minutes: minutesWithCreator,
        total,
        hasMore,
      };
    } catch (error) {
      console.error('Error fetching minutes with creator:', error);
      throw error;
    }
  }

  // Get minutes by status
  async getMinutesByStatus(status: Minutes['status']): Promise<Minutes[]> {
    try {
      const { data, error } = await this.supabase
        .from('minutes')
        .select('*')
        .eq('status', status)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching minutes by status:', error);
      throw error;
    }
  }

  // Get active voting minutes
  async getActiveVotingMinutes(): Promise<Minutes[]> {
    try {
      const { data, error } = await this.supabase
        .from('minutes')
        .select('*')
        .eq('status', 'voting')
        .gt('voting_deadline', new Date().toISOString())
        .order('voting_deadline', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching active voting minutes:', error);
      throw error;
    }
  }

  // Get minutes statistics
  async getMinutesStats(): Promise<MinutesStats> {
    try {
      const { data, error } = await this.supabase
        .from('minutes')
        .select('status');

      if (error) throw error;

      const stats: MinutesStats = {
        total: data?.length || 0,
        draft: 0,
        published: 0,
        voting: 0,
        passed: 0,
        failed: 0,
        cancelled: 0,
      };

      data?.forEach((minutes) => {
        stats[minutes.status as keyof MinutesStats]++;
      });

      return stats;
    } catch (error) {
      console.error('Error fetching minutes statistics:', error);
      throw error;
    }
  }

  // Get single minutes by ID
  async getMinutesById(id: string, includeComments: boolean = false): Promise<Minutes | null> {
    try {
      let selectQuery = '*';
      
      if (includeComments) {
        selectQuery = `
          *,
          minutes_votes(
            id,
            user_id,
            vote,
            comments,
            voted_at,
            created_at,
            profiles!minutes_votes_user_id_fkey(
              id,
              full_name,
              email,
              position
            )
          )
        `;
      }

      const { data, error } = await this.supabase
        .from('minutes')
        .select(selectQuery)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data ? (data as unknown as Minutes) : null;
    } catch (error) {
      console.error('Error fetching minutes by ID:', error);
      throw error;
    }
  }

  // Create new minutes
  async createMinutes(minutesData: CreateMinutesData): Promise<Minutes | null> {
    try {
      const { data, error } = await this.supabase
        .from('minutes')
        .insert({
          ...minutesData,
          approval_threshold: minutesData.approval_threshold || 75,
          minimum_quorum: minutesData.minimum_quorum || 50,
          updated_by: minutesData.created_by, // Set updated_by to the same as created_by initially
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating minutes:', error);
      throw error;
    }
  }

  // Update minutes
  async updateMinutes(id: string, updates: UpdateMinutesData): Promise<Minutes | null> {
    try {
      const { data, error } = await this.supabase
        .from('minutes')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating minutes:', error);
      throw error;
    }
  }

  // Delete minutes
  async deleteMinutes(id: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('minutes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting minutes:', error);
      throw error;
    }
  }

  // Publish minutes for voting
  async publishMinutesForVoting(id: string, votingDeadline: string): Promise<Minutes | null> {
    try {
      const { data, error } = await this.supabase
        .from('minutes')
        .update({
          status: 'voting',
          voting_deadline: votingDeadline,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error publishing minutes for voting:', error);
      throw error;
    }
  }

  // Vote on minutes
  async voteOnMinutes(
    minutesId: string,
    vote: 'approve' | 'reject' | 'abstain',
    comments?: string
  ): Promise<MinutesVote | null> {
    try {
      // Get current user with proper error handling
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();
      
      if (authError || !user) {
        console.error('Authentication error in voteOnMinutes:', authError);
        throw new Error('User not authenticated');
      }

      console.log('Voting on minutes:', { minutesId, vote, comments, userId: user.id });

      // Use upsert to handle both insert and update in a single operation
      const { data, error } = await this.supabase
        .from('minutes_votes')
        .upsert({
          minutes_id: minutesId,
          user_id: user.id,
          vote,
          comments: comments || null,
          voted_at: new Date().toISOString(),
        }, {
          onConflict: 'minutes_id,user_id',
          ignoreDuplicates: false
        })
        .select()
        .single();

      if (error) {
        console.error('Database error in voteOnMinutes:', error);
        throw error;
      }

      console.log('Vote successfully saved:', data);
      return data;
    } catch (error) {
      console.error('Error voting on minutes:', error);
      throw error;
    }
  }

  // Get user's vote for specific minutes
  async getUserVote(minutesId: string): Promise<MinutesVote | null> {
    try {
      // Get current user with proper error handling
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();
      
      if (authError || !user) {
        console.error('Authentication error in getUserVote:', authError);
        return null; // Return null instead of throwing for unauthenticated users
      }

      const { data, error } = await this.supabase
        .from('minutes_votes')
        .select('*')
        .eq('minutes_id', minutesId)
        .eq('user_id', user.id)
        .single();

      // PGRST116 means no rows returned, which is expected when user hasn't voted
      if (error && error.code !== 'PGRST116') {
        console.error('Database error in getUserVote:', error);
        throw error;
      }
      
      return data || null;
    } catch (error) {
      console.error('Error fetching user vote:', error);
      throw error;
    }
  }

  // Get all votes for specific minutes
  async getMinutesVotes(minutesId: string): Promise<MinutesVote[]> {
    try {
      const { data, error } = await this.supabase
        .from('minutes_votes')
        .select(`
          *,
          profiles:user_id (
            full_name,
            email
          )
        `)
        .eq('minutes_id', minutesId)
        .order('voted_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching minutes votes:', error);
      throw error;
    }
  }

  // Get votes with profile information (admin only)
  async getMinutesVotesWithProfiles(minutesId: string): Promise<VoteWithProfile[]> {
    try {
      const { data, error } = await this.supabase
        .from('minutes_votes')
        .select(`
          *,
          profiles:user_id (
            id,
            full_name,
            email,
            position
          )
        `)
        .eq('minutes_id', minutesId)
        .order('voted_at', { ascending: false });

      if (error) throw error;

      // Transform the data to match our interface
      return (data || []).map(vote => ({
        ...vote,
        voter: vote.profiles as any
      }));
    } catch (error) {
      console.error('Error fetching minutes votes with profiles:', error);
      throw error;
    }
  }

  // Get minutes with comprehensive comment details (admin only)
  async getMinutesWithComments(minutesId: string): Promise<MinutesWithComments | null> {
    try {
      const [minutes, votesWithProfiles, userVote] = await Promise.all([
        this.getMinutesById(minutesId),
        this.getMinutesVotesWithProfiles(minutesId),
        this.getUserVote(minutesId),
      ]);

      if (!minutes) return null;

      // Calculate statistics
      const totalVotes = votesWithProfiles.length;
      const approveVotes = votesWithProfiles.filter(v => v.vote === 'approve').length;
      const rejectVotes = votesWithProfiles.filter(v => v.vote === 'reject').length;
      const abstainVotes = votesWithProfiles.filter(v => v.vote === 'abstain').length;
      const commentsCount = votesWithProfiles.filter(v => v.comments && v.comments.trim()).length;
      
      const approvalPercentage = totalVotes > 0 ? (approveVotes / totalVotes) * 100 : 0;
      const participationPercentage = minutes.total_eligible_voters > 0 
        ? (totalVotes / minutes.total_eligible_voters) * 100 
        : 0;

      const statistics = {
        total_votes: totalVotes,
        approve_votes: approveVotes,
        reject_votes: rejectVotes,
        abstain_votes: abstainVotes,
        comments_count: commentsCount,
        approval_percentage: approvalPercentage,
        participation_percentage: participationPercentage,
        total_eligible_voters: minutes.total_eligible_voters,
      };

      return {
        minutes,
        votes: votesWithProfiles,
        userVote,
        statistics,
      };
    } catch (error) {
      console.error('Error fetching minutes with comments:', error);
      throw error;
    }
  }

  // Get minutes with voting details
  async getMinutesWithVotingDetails(minutesId: string): Promise<{
    minutes: Minutes;
    votes: MinutesVote[];
    userVote: MinutesVote | null;
  } | null> {
    try {
      const [minutes, votes, userVote] = await Promise.all([
        this.getMinutesById(minutesId),
        this.getMinutesVotes(minutesId),
        this.getUserVote(minutesId),
      ]);

      if (!minutes) return null;

      return {
        minutes,
        votes,
        userVote,
      };
    } catch (error) {
      console.error('Error fetching minutes with voting details:', error);
      throw error;
    }
  }

  // Search minutes
  async searchMinutes(query: string): Promise<Minutes[]> {
    try {
      const { data, error } = await this.supabase
        .from('minutes')
        .select('*')
        .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching minutes:', error);
      throw error;
    }
  }

  // Get minutes comments for admin (admin only)
  async getMinutesComments(minutesId: string, withCommentsOnly: boolean = false): Promise<{
    votes: VoteWithProfile[];
    statistics: {
      total_votes: number;
      total_comments: number;
      comments_by_vote: {
        approve: number;
        reject: number;
        abstain: number;
      };
      avg_comment_length: number;
      has_concerns: boolean;
    };
  }> {
    try {
      console.log(`Fetching comments for minutes ${minutesId}, withCommentsOnly: ${withCommentsOnly}`);

      const { data, error } = await this.supabase
        .from('minutes_votes')
        .select(`
          id,
          minutes_id,
          user_id,
          vote,
          comments,
          voted_at,
          created_at,
          profiles!minutes_votes_user_id_fkey(
            id,
            full_name,
            email,
            position
          )
        `)
        .eq('minutes_id', minutesId)
        .order('voted_at', { ascending: false });

      if (error) {
        console.error('Database error fetching votes:', error);
        throw error;
      }

      // Transform all votes first
      const allVotes = (data || []).map(vote => ({
        ...vote,
        voter: vote.profiles as any,
      })) as VoteWithProfile[];

      console.log(`Found ${allVotes.length} total votes for minutes ${minutesId}`);

      // Calculate statistics based on ALL votes, not filtered ones
      const totalVotes = allVotes.length;
      const votesWithComments = allVotes.filter(vote => vote.comments && vote.comments.trim());
      const totalComments = votesWithComments.length;
      
      console.log(`${totalComments} votes have comments out of ${totalVotes} total votes`);
      
      const commentsByVote = {
        approve: votesWithComments.filter(vote => vote.vote === 'approve').length,
        reject: votesWithComments.filter(vote => vote.vote === 'reject').length,
        abstain: votesWithComments.filter(vote => vote.vote === 'abstain').length,
      };

      const avgCommentLength = totalComments > 0 
        ? votesWithComments.reduce((sum, vote) => sum + (vote.comments?.length || 0), 0) / totalComments
        : 0;

      const hasConcerns = commentsByVote.reject > 0 || 
        votesWithComments.some(vote => 
          vote.comments && (
            vote.comments.toLowerCase().includes('concern') ||
            vote.comments.toLowerCase().includes('issue') ||
            vote.comments.toLowerCase().includes('problem')
          )
        );

      // Filter votes for display AFTER calculating statistics
      const displayVotes = withCommentsOnly 
        ? allVotes.filter(vote => vote.comments && vote.comments.trim())
        : allVotes;

      console.log(`Returning ${displayVotes.length} votes for display (filtered: ${withCommentsOnly})`);

      return {
        votes: displayVotes,
        statistics: {
          total_votes: totalVotes,
          total_comments: totalComments,
          comments_by_vote: commentsByVote,
          avg_comment_length: avgCommentLength,
          has_concerns: hasConcerns,
        },
      };
    } catch (error) {
      console.error('Error fetching minutes comments:', error);
      throw error;
    }
  }

  // Get minutes with comment counts (admin only)
  async getMinutesWithCommentCounts(page: number = 1, limit: number = 20): Promise<{
    minutes: (Minutes & { comment_count: number; has_comments: boolean })[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      console.log(`Fetching minutes with comment counts: page=${page}, limit=${limit}`);
      const offset = (page - 1) * limit;

      const { data, error, count } = await this.supabase
        .from('minutes')
        .select(`
          *,
          minutes_votes(comments),
          profiles!minutes_created_by_fkey(full_name, email)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Database error in getMinutesWithCommentCounts:', error);
        throw error;
      }

      console.log(`Found ${data?.length || 0} minutes records`);

      // Calculate comment counts for each minutes
      const minutesWithCounts = (data || []).map((minutes, index) => {
        const votes = (minutes as any).minutes_votes || [];
        const commentCount = votes.filter((vote: any) => vote.comments && vote.comments.trim()).length;
        const hasComments = commentCount > 0;
        
        console.log(`Minutes ${index + 1} (${minutes.id}): ${votes.length} votes, ${commentCount} comments`);
        
        // Remove the votes data and add comment count
        const { minutes_votes, profiles, ...minutesData } = minutes as any;
        return {
          ...minutesData,
          comment_count: commentCount,
          has_comments: hasComments,
          creator: profiles ? {
            full_name: profiles.full_name,
            email: profiles.email,
          } : null,
        };
      });

      const total = count || 0;
      const hasMore = total > page * limit;

      console.log(`Returning ${minutesWithCounts.length} minutes with comment counts`);

      return {
        minutes: minutesWithCounts,
        total,
        hasMore,
      };
    } catch (error) {
      console.error('Error fetching minutes with comment counts:', error);
      throw error;
    }
  }
}