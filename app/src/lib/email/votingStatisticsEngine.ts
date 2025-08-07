import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

// Types for voting statistics calculations
export interface VotingStatisticsEngine {
  calculateParticipationRate(totalVotes: number, totalEligibleVoters: number): number;
  calculateApprovalPercentage(approveVotes: number, totalVotes: number): number;
  calculateVotingMargin(approveVotes: number, rejectVotes: number): VotingMargin;
  isUnanimousVote(votes: VoteRecord[], totalVotes: number): boolean;
  checkQuorumMet(totalVotes: number, totalEligibleVoters: number, minimumQuorum: number): QuorumStatus;
  identifyNonVoters(allBoardMembers: BoardMember[], voters: VoteRecord[]): BoardMember[];
  analyzeCommentParticipation(votes: VoteRecord[]): CommentAnalysis;
  calculateAdvancedStatistics(votes: VoteRecord[], config: VotingConfiguration): AdvancedVotingStatistics;
}

export interface VoteRecord {
  id: string;
  vote: 'approve' | 'reject' | 'abstain' | 'for' | 'against';
  voter: {
    id: string;
    full_name: string;
    email: string;
    position?: string;
  };
  comments?: string | null;
  vote_reason?: string | null;
  voted_at: string | null;
  hasComments: boolean;
}

export interface BoardMember {
  id: string;
  full_name: string;
  email: string;
  position?: string;
}

export interface VotingConfiguration {
  totalEligibleVoters: number;
  minimumQuorum: number;
  approvalThreshold: number;
  requiresUnanimity?: boolean;
  allowAbstentions?: boolean;
}

export interface VotingMargin {
  absoluteMargin: number;
  percentageMargin: number;
  marginType: 'victory' | 'defeat' | 'tie';
  description: string;
}

export interface QuorumStatus {
  met: boolean;
  required: number;
  actual: number;
  percentage: number;
  shortfall?: number;
}

export interface CommentAnalysis {
  totalComments: number;
  commentsByVoteType: {
    approve: number;
    reject: number;
    abstain: number;
  };
  averageCommentLength: number;
  hasSignificantConcerns: boolean;
  concernKeywords: string[];
  participationWithComments: number; // percentage of voters who left comments
}

export interface AdvancedVotingStatistics {
  // Basic counts
  totalVotes: number;
  totalEligibleVoters: number;
  approveVotes: number;
  rejectVotes: number;
  abstainVotes: number;
  
  // Percentages
  participationRate: number;
  approvalPercentage: number;
  rejectionPercentage: number;
  abstentionPercentage: number;
  
  // Analysis
  isUnanimous: boolean;
  unanimousType?: 'approve' | 'reject';
  quorumStatus: QuorumStatus;
  votingMargin: VotingMargin;
  
  // Comments and engagement
  commentAnalysis: CommentAnalysis;
  
  // Outcome determination
  passed: boolean;
  passedReason: string;
  
  // Timing and participation patterns
  votingDuration?: number; // in hours
  lastMinuteVotes?: number; // votes cast in final 10% of voting period
  
  // Quality metrics
  engagementScore: number; // 0-100 based on participation and comments
  consensusLevel: 'high' | 'moderate' | 'low' | 'polarized';
}

export class VotingStatisticsCalculator implements VotingStatisticsEngine {
  private supabase: SupabaseClient<Database>;

  constructor(supabase: SupabaseClient<Database>) {
    this.supabase = supabase;
  }

  /**
   * Calculate participation rate as percentage
   */
  calculateParticipationRate(totalVotes: number, totalEligibleVoters: number): number {
    if (totalEligibleVoters === 0) return 0;
    return Math.round((totalVotes / totalEligibleVoters) * 100 * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Calculate approval percentage of cast votes
   */
  calculateApprovalPercentage(approveVotes: number, totalVotes: number): number {
    if (totalVotes === 0) return 0;
    return Math.round((approveVotes / totalVotes) * 100 * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Calculate voting margin with detailed analysis
   */
  calculateVotingMargin(approveVotes: number, rejectVotes: number): VotingMargin {
    const absoluteMargin = Math.abs(approveVotes - rejectVotes);
    const totalDecisiveVotes = approveVotes + rejectVotes;
    const percentageMargin = totalDecisiveVotes > 0 
      ? Math.round((absoluteMargin / totalDecisiveVotes) * 100 * 100) / 100 
      : 0;

    let marginType: 'victory' | 'defeat' | 'tie';
    let description: string;

    if (approveVotes > rejectVotes) {
      marginType = 'victory';
      description = `Passed by ${absoluteMargin} vote${absoluteMargin !== 1 ? 's' : ''} (${percentageMargin}% margin)`;
    } else if (rejectVotes > approveVotes) {
      marginType = 'defeat';
      description = `Failed by ${absoluteMargin} vote${absoluteMargin !== 1 ? 's' : ''} (${percentageMargin}% margin)`;
    } else {
      marginType = 'tie';
      description = 'Tied vote - no margin';
    }

    return {
      absoluteMargin,
      percentageMargin,
      marginType,
      description
    };
  }

  /**
   * Check if vote was unanimous
   */
  isUnanimousVote(votes: VoteRecord[], totalVotes: number): boolean {
    if (totalVotes === 0) return false;

    const approveCount = votes.filter(v => v.vote === 'approve' || v.vote === 'for').length;
    const rejectCount = votes.filter(v => v.vote === 'reject' || v.vote === 'against').length;

    return (approveCount === totalVotes && rejectCount === 0) || 
           (rejectCount === totalVotes && approveCount === 0);
  }

  /**
   * Check if quorum requirements are met
   */
  checkQuorumMet(totalVotes: number, totalEligibleVoters: number, minimumQuorum: number): QuorumStatus {
    const participationPercentage = this.calculateParticipationRate(totalVotes, totalEligibleVoters);
    const met = participationPercentage >= minimumQuorum;
    const requiredVotes = Math.ceil((minimumQuorum / 100) * totalEligibleVoters);
    
    return {
      met,
      required: requiredVotes,
      actual: totalVotes,
      percentage: participationPercentage,
      shortfall: met ? undefined : requiredVotes - totalVotes
    };
  }

  /**
   * Identify board members who didn't vote
   */
  identifyNonVoters(allBoardMembers: BoardMember[], voters: VoteRecord[]): BoardMember[] {
    const voterIds = new Set(voters.map(v => v.voter.id));
    return allBoardMembers.filter(member => !voterIds.has(member.id));
  }

  /**
   * Analyze comment participation and content
   */
  analyzeCommentParticipation(votes: VoteRecord[]): CommentAnalysis {
    const votesWithComments = votes.filter(v => v.hasComments);
    const totalComments = votesWithComments.length;

    const commentsByVoteType = {
      approve: votesWithComments.filter(v => v.vote === 'approve' || v.vote === 'for').length,
      reject: votesWithComments.filter(v => v.vote === 'reject' || v.vote === 'against').length,
      abstain: votesWithComments.filter(v => v.vote === 'abstain').length
    };

    // Calculate average comment length
    const totalCommentLength = votesWithComments.reduce((sum, vote) => {
      const comment = vote.comments || vote.vote_reason || '';
      return sum + comment.length;
    }, 0);
    const averageCommentLength = totalComments > 0 ? Math.round(totalCommentLength / totalComments) : 0;

    // Analyze for concerns
    const concernKeywords = ['concern', 'worried', 'issue', 'problem', 'disagree', 'oppose', 'against', 'risk'];
    const commentsText = votesWithComments.map(v => 
      ((v.comments || v.vote_reason || '').toLowerCase())
    ).join(' ');
    
    const foundConcerns = concernKeywords.filter(keyword => 
      commentsText.includes(keyword)
    );
    
    const hasSignificantConcerns = foundConcerns.length > 0 || commentsByVoteType.reject > 0;

    const participationWithComments = votes.length > 0 
      ? Math.round((totalComments / votes.length) * 100 * 100) / 100 
      : 0;

    return {
      totalComments,
      commentsByVoteType,
      averageCommentLength,
      hasSignificantConcerns,
      concernKeywords: foundConcerns,
      participationWithComments
    };
  }

  /**
   * Calculate comprehensive voting statistics
   */
  calculateAdvancedStatistics(votes: VoteRecord[], config: VotingConfiguration): AdvancedVotingStatistics {
    const totalVotes = votes.length;
    const { totalEligibleVoters, minimumQuorum, approvalThreshold } = config;

    // Basic vote counts
    const approveVotes = votes.filter(v => v.vote === 'approve' || v.vote === 'for').length;
    const rejectVotes = votes.filter(v => v.vote === 'reject' || v.vote === 'against').length;
    const abstainVotes = votes.filter(v => v.vote === 'abstain').length;

    // Calculate percentages
    const participationRate = this.calculateParticipationRate(totalVotes, totalEligibleVoters);
    const approvalPercentage = this.calculateApprovalPercentage(approveVotes, totalVotes);
    const rejectionPercentage = totalVotes > 0 ? Math.round((rejectVotes / totalVotes) * 100 * 100) / 100 : 0;
    const abstentionPercentage = totalVotes > 0 ? Math.round((abstainVotes / totalVotes) * 100 * 100) / 100 : 0;

    // Unanimity analysis
    const isUnanimous = this.isUnanimousVote(votes, totalVotes);
    const unanimousType = isUnanimous 
      ? (approveVotes === totalVotes ? 'approve' : 'reject')
      : undefined;

    // Quorum and margin analysis
    const quorumStatus = this.checkQuorumMet(totalVotes, totalEligibleVoters, minimumQuorum);
    const votingMargin = this.calculateVotingMargin(approveVotes, rejectVotes);

    // Comment analysis
    const commentAnalysis = this.analyzeCommentParticipation(votes);

    // Determine if passed
    const quorumMet = quorumStatus.met;
    const approvalMet = approvalPercentage >= approvalThreshold;
    const passed = quorumMet && approvalMet;

    let passedReason: string;
    if (!quorumMet) {
      passedReason = `Quorum not met (${quorumStatus.percentage}% participation, ${minimumQuorum}% required)`;
    } else if (!approvalMet) {
      passedReason = `Insufficient approval (${approvalPercentage}% approval, ${approvalThreshold}% required)`;
    } else if (isUnanimous && unanimousType === 'approve') {
      passedReason = 'Unanimous approval';
    } else {
      passedReason = `Majority approval (${approvalPercentage}% of votes)`;
    }

    // Calculate engagement score (0-100)
    const participationScore = Math.min(participationRate, 100);
    const commentScore = Math.min(commentAnalysis.participationWithComments * 2, 100); // Double weight for comments
    const engagementScore = Math.round((participationScore * 0.7 + commentScore * 0.3));

    // Determine consensus level
    let consensusLevel: 'high' | 'moderate' | 'low' | 'polarized';
    if (isUnanimous) {
      consensusLevel = 'high';
    } else if (votingMargin.percentageMargin >= 60) {
      consensusLevel = 'high';
    } else if (votingMargin.percentageMargin >= 30) {
      consensusLevel = 'moderate';
    } else if (votingMargin.percentageMargin >= 10) {
      consensusLevel = 'low';
    } else {
      consensusLevel = 'polarized';
    }

    return {
      totalVotes,
      totalEligibleVoters,
      approveVotes,
      rejectVotes,
      abstainVotes,
      participationRate,
      approvalPercentage,
      rejectionPercentage,
      abstentionPercentage,
      isUnanimous,
      unanimousType,
      quorumStatus,
      votingMargin,
      commentAnalysis,
      passed,
      passedReason,
      engagementScore,
      consensusLevel
    };
  }

  /**
   * Get voting timeline analysis (if voting start/end times are available)
   */
  async analyzeVotingTimeline(
    votes: VoteRecord[], 
    votingStartTime?: string, 
    votingEndTime?: string
  ): Promise<{
    votingDuration?: number;
    lastMinuteVotes?: number;
    votingPattern: 'early' | 'steady' | 'last-minute' | 'unknown';
  }> {
    if (!votingStartTime || !votingEndTime) {
      return { votingPattern: 'unknown' };
    }

    const startTime = new Date(votingStartTime);
    const endTime = new Date(votingEndTime);
    const votingDuration = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60); // hours

    // Calculate last-minute votes (final 10% of voting period)
    const lastMinuteThreshold = new Date(endTime.getTime() - (votingDuration * 0.1 * 60 * 60 * 1000));
    const lastMinuteVotes = votes.filter(vote => {
      if (!vote.voted_at) return false;
      return new Date(vote.voted_at) >= lastMinuteThreshold;
    }).length;

    // Determine voting pattern
    let votingPattern: 'early' | 'steady' | 'last-minute' | 'unknown';
    const lastMinutePercentage = votes.length > 0 ? (lastMinuteVotes / votes.length) * 100 : 0;

    if (lastMinutePercentage >= 50) {
      votingPattern = 'last-minute';
    } else if (lastMinutePercentage <= 20) {
      votingPattern = 'early';
    } else {
      votingPattern = 'steady';
    }

    return {
      votingDuration: Math.round(votingDuration * 100) / 100,
      lastMinuteVotes,
      votingPattern
    };
  }

  /**
   * Generate a comprehensive voting summary report
   */
  generateVotingSummaryReport(statistics: AdvancedVotingStatistics): string {
    const lines: string[] = [];
    
    lines.push(`Voting Summary Report`);
    lines.push(`=====================`);
    lines.push('');
    
    // Participation
    lines.push(`Participation: ${statistics.totalVotes}/${statistics.totalEligibleVoters} eligible voters (${statistics.participationRate}%)`);
    lines.push(`Quorum: ${statistics.quorumStatus.met ? 'MET' : 'NOT MET'} (${statistics.quorumStatus.percentage}% participation)`);
    lines.push('');
    
    // Results
    lines.push(`Result: ${statistics.passed ? 'PASSED' : 'FAILED'}`);
    lines.push(`Reason: ${statistics.passedReason}`);
    lines.push('');
    
    // Vote breakdown
    lines.push(`Vote Breakdown:`);
    lines.push(`  Approve: ${statistics.approveVotes} (${statistics.approvalPercentage}%)`);
    lines.push(`  Reject: ${statistics.rejectVotes} (${statistics.rejectionPercentage}%)`);
    lines.push(`  Abstain: ${statistics.abstainVotes} (${statistics.abstentionPercentage}%)`);
    lines.push('');
    
    // Analysis
    if (statistics.isUnanimous) {
      lines.push(`Unanimous ${statistics.unanimousType} vote`);
    } else {
      lines.push(`Margin: ${statistics.votingMargin.description}`);
    }
    lines.push(`Consensus Level: ${statistics.consensusLevel.toUpperCase()}`);
    lines.push(`Engagement Score: ${statistics.engagementScore}/100`);
    lines.push('');
    
    // Comments
    if (statistics.commentAnalysis.totalComments > 0) {
      lines.push(`Comments: ${statistics.commentAnalysis.totalComments} voters provided comments (${statistics.commentAnalysis.participationWithComments}%)`);
      if (statistics.commentAnalysis.hasSignificantConcerns) {
        lines.push(`⚠️  Significant concerns raised in comments`);
      }
    } else {
      lines.push(`No comments provided by voters`);
    }
    
    return lines.join('\n');
  }
}