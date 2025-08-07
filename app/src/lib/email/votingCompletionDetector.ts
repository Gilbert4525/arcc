import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';
import { VotingSummaryEmailService } from './votingSummaryService';

// Types for voting completion detection
export interface VotingCompletionStatus {
  isComplete: boolean;
  reason: 'all_voted' | 'deadline_expired' | 'manual_completion' | 'not_complete';
  completedAt?: string;
  totalVotes: number;
  totalEligibleVoters: number;
  participationRate: number;
  deadlineExpired: boolean;
}

export interface VotingItem {
  id: string;
  title: string;
  status: string;
  voting_deadline?: string | null;
  total_eligible_voters?: number;
  created_at: string;
  updated_at: string;
}

export class VotingCompletionDetector {
  private supabase: SupabaseClient<Database>;
  private emailService: VotingSummaryEmailService;

  constructor(supabase: SupabaseClient<Database>) {
    this.supabase = supabase;
    this.emailService = new VotingSummaryEmailService(supabase);
  }

  /**
   * Check if resolution voting is complete and trigger email if needed
   */
  async checkResolutionCompletion(resolutionId: string): Promise<VotingCompletionStatus> {
    try {
      console.log(`Checking resolution completion for: ${resolutionId}`);

      // Get resolution details
      const { data: resolution, error: resolutionError } = await this.supabase
        .from('resolutions')
        .select('*')
        .eq('id', resolutionId)
        .single();

      if (resolutionError || !resolution) {
        console.error('Error fetching resolution:', resolutionError);
        return this.createNotCompleteStatus();
      }

      // Only check voting resolutions
      if (resolution.status !== 'voting') {
        console.log(`Resolution ${resolutionId} is not in voting status: ${resolution.status}`);
        return this.createNotCompleteStatus();
      }

      // Get vote count
      const { data: votes, error: votesError } = await this.supabase
        .from('resolution_votes')
        .select('id')
        .eq('resolution_id', resolutionId);

      if (votesError) {
        console.error('Error fetching resolution votes:', votesError);
        return this.createNotCompleteStatus();
      }

      const totalVotes = votes?.length || 0;
      const totalEligibleVoters = await this.getTotalEligibleVoters();
      const participationRate = totalEligibleVoters > 0 ? (totalVotes / totalEligibleVoters) * 100 : 0;

      // Check completion conditions
      const completionStatus = this.determineCompletionStatus(
        totalVotes,
        totalEligibleVoters,
        resolution.voting_deadline,
        participationRate
      );

      if (completionStatus.isComplete) {
        console.log(`Resolution ${resolutionId} voting is complete: ${completionStatus.reason}`);
        
        // Update resolution status and trigger email
        await this.handleResolutionCompletion(resolutionId, completionStatus);
      }

      return completionStatus;
    } catch (error) {
      console.error('Error checking resolution completion:', error);
      return this.createNotCompleteStatus();
    }
  }

  /**
   * Check if minutes voting is complete and trigger email if needed
   */
  async checkMinutesCompletion(minutesId: string): Promise<VotingCompletionStatus> {
    try {
      console.log(`Checking minutes completion for: ${minutesId}`);

      // Get minutes details
      const { data: minutes, error: minutesError } = await this.supabase
        .from('minutes')
        .select('*')
        .eq('id', minutesId)
        .single();

      if (minutesError || !minutes) {
        console.error('Error fetching minutes:', minutesError);
        return this.createNotCompleteStatus();
      }

      // Only check voting minutes
      if (minutes.status !== 'voting') {
        console.log(`Minutes ${minutesId} is not in voting status: ${minutes.status}`);
        return this.createNotCompleteStatus();
      }

      // Get vote count
      const { data: votes, error: votesError } = await this.supabase
        .from('minutes_votes')
        .select('id')
        .eq('minutes_id', minutesId);

      if (votesError) {
        console.error('Error fetching minutes votes:', votesError);
        return this.createNotCompleteStatus();
      }

      const totalVotes = votes?.length || 0;
      const totalEligibleVoters = await this.getTotalEligibleVoters();
      const participationRate = totalEligibleVoters > 0 ? (totalVotes / totalEligibleVoters) * 100 : 0;

      // Check completion conditions
      const completionStatus = this.determineCompletionStatus(
        totalVotes,
        totalEligibleVoters,
        minutes.voting_deadline,
        participationRate
      );

      if (completionStatus.isComplete) {
        console.log(`Minutes ${minutesId} voting is complete: ${completionStatus.reason}`);
        
        // Update minutes status and trigger email
        await this.handleMinutesCompletion(minutesId, completionStatus);
      }

      return completionStatus;
    } catch (error) {
      console.error('Error checking minutes completion:', error);
      return this.createNotCompleteStatus();
    }
  }

  /**
   * Determine if voting is complete based on various conditions
   */
  private determineCompletionStatus(
    totalVotes: number,
    totalEligibleVoters: number,
    votingDeadline?: string | null,
    participationRate?: number
  ): VotingCompletionStatus {
    const now = new Date();
    const deadline = votingDeadline ? new Date(votingDeadline) : null;
    const deadlineExpired = deadline ? now >= deadline : false;
    const allVoted = totalVotes >= totalEligibleVoters;

    // Check if all eligible voters have voted
    if (allVoted && totalEligibleVoters > 0) {
      return {
        isComplete: true,
        reason: 'all_voted',
        completedAt: now.toISOString(),
        totalVotes,
        totalEligibleVoters,
        participationRate: participationRate || 100,
        deadlineExpired
      };
    }

    // Check if deadline has expired
    if (deadlineExpired) {
      return {
        isComplete: true,
        reason: 'deadline_expired',
        completedAt: deadline!.toISOString(),
        totalVotes,
        totalEligibleVoters,
        participationRate: participationRate || 0,
        deadlineExpired: true
      };
    }

    // Voting is not complete
    return {
      isComplete: false,
      reason: 'not_complete',
      totalVotes,
      totalEligibleVoters,
      participationRate: participationRate || 0,
      deadlineExpired
    };
  }

  /**
   * Handle resolution voting completion
   */
  private async handleResolutionCompletion(
    resolutionId: string,
    completionStatus: VotingCompletionStatus
  ): Promise<void> {
    try {
      // Update resolution status based on voting results
      const newStatus = await this.calculateResolutionOutcome(resolutionId);
      
      const { error: updateError } = await this.supabase
        .from('resolutions')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', resolutionId);

      if (updateError) {
        console.error('Error updating resolution status:', updateError);
        return;
      }

      console.log(`Resolution ${resolutionId} status updated to: ${newStatus}`);

      // Trigger voting summary email
      const emailSent = await this.emailService.sendResolutionVotingSummary(resolutionId);
      
      if (emailSent) {
        console.log(`✅ Voting summary email sent for resolution ${resolutionId}`);
        await this.logCompletionEvent('resolution', resolutionId, completionStatus, true);
      } else {
        console.error(`❌ Failed to send voting summary email for resolution ${resolutionId}`);
        await this.logCompletionEvent('resolution', resolutionId, completionStatus, false);
      }
    } catch (error) {
      console.error('Error handling resolution completion:', error);
      await this.logCompletionEvent('resolution', resolutionId, completionStatus, false);
    }
  }

  /**
   * Handle minutes voting completion
   */
  private async handleMinutesCompletion(
    minutesId: string,
    completionStatus: VotingCompletionStatus
  ): Promise<void> {
    try {
      // Update minutes status based on voting results
      const newStatus = await this.calculateMinutesOutcome(minutesId);
      
      const { error: updateError } = await this.supabase
        .from('minutes')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', minutesId);

      if (updateError) {
        console.error('Error updating minutes status:', updateError);
        return;
      }

      console.log(`Minutes ${minutesId} status updated to: ${newStatus}`);

      // Trigger voting summary email
      const emailSent = await this.emailService.sendMinutesVotingSummary(minutesId);
      
      if (emailSent) {
        console.log(`✅ Voting summary email sent for minutes ${minutesId}`);
        await this.logCompletionEvent('minutes', minutesId, completionStatus, true);
      } else {
        console.error(`❌ Failed to send voting summary email for minutes ${minutesId}`);
        await this.logCompletionEvent('minutes', minutesId, completionStatus, false);
      }
    } catch (error) {
      console.error('Error handling minutes completion:', error);
      await this.logCompletionEvent('minutes', minutesId, completionStatus, false);
    }
  }

  /**
   * Calculate resolution outcome based on votes
   */
  private async calculateResolutionOutcome(resolutionId: string): Promise<string> {
    try {
      const { data: resolution } = await this.supabase
        .from('resolutions')
        .select('votes_for, votes_against, votes_abstain, total_eligible_voters, minimum_quorum')
        .eq('id', resolutionId)
        .single();

      if (!resolution) return 'failed';

      const totalVotes = (resolution.votes_for || 0) + (resolution.votes_against || 0) + (resolution.votes_abstain || 0);
      const totalEligible = resolution.total_eligible_voters || await this.getTotalEligibleVoters();
      const participationRate = totalEligible > 0 ? (totalVotes / totalEligible) * 100 : 0;
      const approvalRate = totalVotes > 0 ? ((resolution.votes_for || 0) / totalVotes) * 100 : 0;
      
      const quorumMet = participationRate >= (resolution.minimum_quorum || 50);
      const approvalMet = approvalRate >= 75; // Default approval threshold

      if (quorumMet && approvalMet) {
        return 'approved';
      } else {
        return 'rejected';
      }
    } catch (error) {
      console.error('Error calculating resolution outcome:', error);
      return 'failed';
    }
  }

  /**
   * Calculate minutes outcome based on votes
   */
  private async calculateMinutesOutcome(minutesId: string): Promise<string> {
    try {
      // Get vote counts
      const { data: votes } = await this.supabase
        .from('minutes_votes')
        .select('vote')
        .eq('minutes_id', minutesId);

      if (!votes) return 'failed';

      const approveVotes = votes.filter(v => v.vote === 'approve').length;
      const rejectVotes = votes.filter(v => v.vote === 'reject').length;
      const abstainVotes = votes.filter(v => v.vote === 'abstain').length;
      const totalVotes = approveVotes + rejectVotes + abstainVotes;

      const totalEligible = await this.getTotalEligibleVoters();
      const participationRate = totalEligible > 0 ? (totalVotes / totalEligible) * 100 : 0;
      const approvalRate = totalVotes > 0 ? (approveVotes / totalVotes) * 100 : 0;
      
      const quorumMet = participationRate >= 50; // Default quorum
      const approvalMet = approvalRate >= 75; // Default approval threshold

      if (quorumMet && approvalMet) {
        return 'passed';
      } else {
        return 'failed';
      }
    } catch (error) {
      console.error('Error calculating minutes outcome:', error);
      return 'failed';
    }
  }

  /**
   * Get total number of eligible voters (board members and admins)
   */
  private async getTotalEligibleVoters(): Promise<number> {
    try {
      const { data: profiles, error } = await this.supabase
        .from('profiles')
        .select('id')
        .eq('is_active', true)
        .in('role', ['admin', 'board_member']);

      if (error) {
        console.error('Error fetching eligible voters:', error);
        return 0;
      }

      return profiles?.length || 0;
    } catch (error) {
      console.error('Error in getTotalEligibleVoters:', error);
      return 0;
    }
  }

  /**
   * Create a "not complete" status object
   */
  private createNotCompleteStatus(): VotingCompletionStatus {
    return {
      isComplete: false,
      reason: 'not_complete',
      totalVotes: 0,
      totalEligibleVoters: 0,
      participationRate: 0,
      deadlineExpired: false
    };
  }

  /**
   * Log voting completion event for audit purposes
   */
  private async logCompletionEvent(
    type: 'resolution' | 'minutes',
    itemId: string,
    completionStatus: VotingCompletionStatus,
    emailSent: boolean
  ): Promise<void> {
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        type,
        itemId,
        completionReason: completionStatus.reason,
        totalVotes: completionStatus.totalVotes,
        totalEligibleVoters: completionStatus.totalEligibleVoters,
        participationRate: completionStatus.participationRate,
        emailSent,
        completedAt: completionStatus.completedAt
      };

      console.log('📋 Voting completion event logged:', logEntry);
      
      // In a future implementation, this could be stored in a dedicated audit table
      // For now, we're logging to console for debugging and monitoring
    } catch (error) {
      console.error('Error logging completion event:', error);
    }
  }

  /**
   * Check for expired voting deadlines across all active votes
   */
  async checkExpiredDeadlines(): Promise<{
    expiredResolutions: string[];
    expiredMinutes: string[];
    totalProcessed: number;
  }> {
    try {
      console.log('🕐 Checking for expired voting deadlines...');
      const now = new Date().toISOString();
      
      // Check expired resolutions
      const { data: expiredResolutions, error: resolutionError } = await this.supabase
        .from('resolutions')
        .select('id, title, voting_deadline')
        .eq('status', 'voting')
        .not('voting_deadline', 'is', null)
        .lt('voting_deadline', now);

      if (resolutionError) {
        console.error('Error fetching expired resolutions:', resolutionError);
      }

      // Check expired minutes
      const { data: expiredMinutes, error: minutesError } = await this.supabase
        .from('minutes')
        .select('id, title, voting_deadline')
        .eq('status', 'voting')
        .not('voting_deadline', 'is', null)
        .lt('voting_deadline', now);

      if (minutesError) {
        console.error('Error fetching expired minutes:', minutesError);
      }

      const expiredResolutionIds: string[] = [];
      const expiredMinutesIds: string[] = [];

      // Process expired resolutions
      if (expiredResolutions && expiredResolutions.length > 0) {
        console.log(`Found ${expiredResolutions.length} expired resolution(s)`);
        
        for (const resolution of expiredResolutions) {
          console.log(`Processing expired resolution: ${resolution.title} (${resolution.id})`);
          const status = await this.checkResolutionCompletion(resolution.id);
          if (status.isComplete) {
            expiredResolutionIds.push(resolution.id);
          }
        }
      }

      // Process expired minutes
      if (expiredMinutes && expiredMinutes.length > 0) {
        console.log(`Found ${expiredMinutes.length} expired minutes`);
        
        for (const minutes of expiredMinutes) {
          console.log(`Processing expired minutes: ${minutes.title} (${minutes.id})`);
          const status = await this.checkMinutesCompletion(minutes.id);
          if (status.isComplete) {
            expiredMinutesIds.push(minutes.id);
          }
        }
      }

      const totalProcessed = expiredResolutionIds.length + expiredMinutesIds.length;
      
      console.log(`✅ Processed ${totalProcessed} expired voting items`);

      return {
        expiredResolutions: expiredResolutionIds,
        expiredMinutes: expiredMinutesIds,
        totalProcessed
      };
    } catch (error) {
      console.error('Error checking expired deadlines:', error);
      return {
        expiredResolutions: [],
        expiredMinutes: [],
        totalProcessed: 0
      };
    }
  }

  /**
   * Manual trigger for voting completion (admin use)
   */
  async manuallyCompleteVoting(
    type: 'resolution' | 'minutes',
    itemId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`Manual completion triggered for ${type}: ${itemId}`);

      if (type === 'resolution') {
        const status = await this.checkResolutionCompletion(itemId);
        if (status.isComplete) {
          return { success: true, message: 'Resolution voting completed and email sent' };
        } else {
          // Force completion
          await this.handleResolutionCompletion(itemId, {
            ...status,
            isComplete: true,
            reason: 'manual_completion',
            completedAt: new Date().toISOString()
          });
          return { success: true, message: 'Resolution voting manually completed and email sent' };
        }
      } else {
        const status = await this.checkMinutesCompletion(itemId);
        if (status.isComplete) {
          return { success: true, message: 'Minutes voting completed and email sent' };
        } else {
          // Force completion
          await this.handleMinutesCompletion(itemId, {
            ...status,
            isComplete: true,
            reason: 'manual_completion',
            completedAt: new Date().toISOString()
          });
          return { success: true, message: 'Minutes voting manually completed and email sent' };
        }
      }
    } catch (error) {
      console.error('Error in manual completion:', error);
      return { success: false, message: 'Failed to complete voting manually' };
    }
  }
}