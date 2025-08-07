import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';
import { EmailNotificationService } from './notifications';
import { 
  VotingStatisticsCalculator, 
  type AdvancedVotingStatistics,
  type VoteRecord,
  type VotingConfiguration,
  type QuorumStatus,
  type VotingMargin,
  type CommentAnalysis
} from './votingStatisticsEngine';
import { VotingSummaryEmailTemplates } from './votingSummaryTemplates';
import { RecipientManager, type EmailRecipient } from './recipientManager';
import { BulkEmailDeliveryService, type BulkEmailResult, type EmailTemplate } from './bulkEmailDelivery';

// Type definitions for voting summary data
export interface VotingSummaryData {
  item: Resolution | MinutesWithVotingInfo;
  votes: VoteWithProfile[];
  statistics: VotingStatistics;
  nonVoters: BoardMember[];
  outcome: VotingOutcome;
}

// Re-export enhanced statistics interface
export type VotingStatistics = AdvancedVotingStatistics;

export interface VotingOutcome {
  passed: boolean;
  reason: string;
  finalStatus: string;
}

export interface VoteWithProfile {
  id: string;
  vote: 'approve' | 'reject' | 'abstain' | 'for' | 'against';
  vote_reason?: string | null;
  comments?: string | null;
  voted_at: string | null;
  voter: {
    id: string;
    full_name: string;
    email: string;
    position?: string;
  };
  hasComments: boolean;
}

export interface BoardMember {
  id: string;
  full_name: string;
  email: string;
  position?: string;
}

// Database types
type Resolution = Database['public']['Tables']['resolutions']['Row'];
type Minutes = Database['public']['Tables']['minutes']['Row'];

// Extended types for voting summary
interface MinutesWithVotingInfo extends Minutes {
  total_eligible_voters?: number;
  minimum_quorum?: number;
  approval_threshold?: number;
}

export class VotingSummaryEmailService {
  private supabase: SupabaseClient<Database>;
  private emailService: EmailNotificationService;
  private statisticsCalculator: VotingStatisticsCalculator;
  private templateEngine: VotingSummaryEmailTemplates;
  private recipientManager: RecipientManager;
  private bulkEmailService: BulkEmailDeliveryService;

  constructor(supabase: SupabaseClient<Database>) {
    this.supabase = supabase;
    this.emailService = new EmailNotificationService();
    this.statisticsCalculator = new VotingStatisticsCalculator(supabase);
    this.templateEngine = new VotingSummaryEmailTemplates();
    this.recipientManager = new RecipientManager(supabase);
    this.bulkEmailService = new BulkEmailDeliveryService(supabase);
  }

  /**
   * Send voting summary email for a resolution
   */
  async sendResolutionVotingSummary(resolutionId: string): Promise<boolean> {
    try {
      console.log(`Generating voting summary for resolution: ${resolutionId}`);
      
      const summaryData = await this.generateVotingSummaryData('resolution', resolutionId);
      if (!summaryData) {
        console.error('Failed to generate voting summary data for resolution');
        return false;
      }

      return await this.sendVotingSummaryEmail(summaryData, 'resolution');
    } catch (error) {
      console.error('Error sending resolution voting summary:', error);
      return false;
    }
  }

  /**
   * Send voting summary email for minutes
   */
  async sendMinutesVotingSummary(minutesId: string): Promise<boolean> {
    try {
      console.log(`Generating voting summary for minutes: ${minutesId}`);
      
      const summaryData = await this.generateVotingSummaryData('minutes', minutesId);
      if (!summaryData) {
        console.error('Failed to generate voting summary data for minutes');
        return false;
      }

      return await this.sendVotingSummaryEmail(summaryData, 'minutes');
    } catch (error) {
      console.error('Error sending minutes voting summary:', error);
      return false;
    }
  }

  /**
   * Generate comprehensive voting summary data
   */
  async generateVotingSummaryData(
    type: 'resolution' | 'minutes', 
    id: string
  ): Promise<VotingSummaryData | null> {
    try {
      if (type === 'resolution') {
        return await this.generateResolutionSummaryData(id);
      } else {
        return await this.generateMinutesSummaryData(id);
      }
    } catch (error) {
      console.error(`Error generating ${type} summary data:`, error);
      return null;
    }
  }

  /**
   * Generate resolution voting summary data
   */
  private async generateResolutionSummaryData(resolutionId: string): Promise<VotingSummaryData | null> {
    try {
      // Fetch resolution details
      const { data: resolution, error: resolutionError } = await this.supabase
        .from('resolutions')
        .select('*')
        .eq('id', resolutionId)
        .single();

      if (resolutionError || !resolution) {
        console.error('Error fetching resolution:', resolutionError);
        return null;
      }

      // Fetch votes with voter profiles
      const { data: votesData, error: votesError } = await this.supabase
        .from('resolution_votes')
        .select(`
          *,
          profiles:voter_id(id, full_name, email, position)
        `)
        .eq('resolution_id', resolutionId)
        .order('voted_at', { ascending: false });

      if (votesError) {
        console.error('Error fetching resolution votes:', votesError);
        return null;
      }

      // Transform votes data
      const votes: VoteWithProfile[] = (votesData || []).map(vote => ({
        id: vote.id,
        vote: vote.vote as 'approve' | 'reject' | 'abstain' | 'for' | 'against',
        vote_reason: vote.vote_reason,
        voted_at: vote.voted_at,
        voter: vote.profiles ? {
          id: vote.profiles.id,
          full_name: vote.profiles.full_name || 'Unknown',
          email: vote.profiles.email,
          position: vote.profiles.position || undefined
        } : {
          id: vote.voter_id,
          full_name: 'Unknown',
          email: '',
        },
        hasComments: !!(vote.vote_reason && vote.vote_reason.trim())
      }));

      // Get all board members to identify non-voters
      const allBoardMembers = await this.getAllBoardMembers();
      const nonVoters = this.statisticsCalculator.identifyNonVoters(allBoardMembers, votes);

      // Calculate enhanced statistics
      const votingConfig: VotingConfiguration = {
        totalEligibleVoters: resolution.total_eligible_voters || allBoardMembers.length,
        minimumQuorum: resolution.minimum_quorum || 50,
        approvalThreshold: 75, // Default for resolutions
        allowAbstentions: true
      };
      
      const statistics = this.statisticsCalculator.calculateAdvancedStatistics(votes, votingConfig);

      // Determine outcome
      const outcome = this.determineResolutionOutcome(resolution, statistics);

      return {
        item: resolution,
        votes,
        statistics,
        nonVoters,
        outcome
      };
    } catch (error) {
      console.error('Error generating resolution summary data:', error);
      return null;
    }
  }

  /**
   * Generate minutes voting summary data
   */
  private async generateMinutesSummaryData(minutesId: string): Promise<VotingSummaryData | null> {
    try {
      // Fetch minutes details
      const { data: minutes, error: minutesError } = await this.supabase
        .from('minutes')
        .select('*')
        .eq('id', minutesId)
        .single();

      if (minutesError || !minutes) {
        console.error('Error fetching minutes:', minutesError);
        return null;
      }

      // Extend minutes with voting info (using defaults if not present)
      const minutesWithVotingInfo: MinutesWithVotingInfo = {
        ...minutes,
        total_eligible_voters: 0, // Will be set to actual board member count
        minimum_quorum: 50, // Default quorum
        approval_threshold: 75 // Default approval threshold
      };

      // Fetch votes with voter profiles
      const { data: votesData, error: votesError } = await this.supabase
        .from('minutes_votes')
        .select(`
          *,
          profiles:user_id(id, full_name, email, position)
        `)
        .eq('minutes_id', minutesId)
        .order('voted_at', { ascending: false });

      if (votesError) {
        console.error('Error fetching minutes votes:', votesError);
        return null;
      }

      // Transform votes data
      const votes: VoteWithProfile[] = (votesData || []).map(vote => ({
        id: vote.id,
        vote: vote.vote as 'approve' | 'reject' | 'abstain',
        comments: vote.comments,
        voted_at: vote.voted_at,
        voter: vote.profiles ? {
          id: vote.profiles.id,
          full_name: vote.profiles.full_name || 'Unknown',
          email: vote.profiles.email,
          position: vote.profiles.position || undefined
        } : {
          id: vote.user_id,
          full_name: 'Unknown',
          email: '',
        },
        hasComments: !!(vote.comments && vote.comments.trim())
      }));

      // Get all board members to identify non-voters
      const allBoardMembers = await this.getAllBoardMembers();
      const nonVoters = this.statisticsCalculator.identifyNonVoters(allBoardMembers, votes);

      // Set the actual total eligible voters
      minutesWithVotingInfo.total_eligible_voters = allBoardMembers.length;

      // Calculate enhanced statistics
      const votingConfig: VotingConfiguration = {
        totalEligibleVoters: minutesWithVotingInfo.total_eligible_voters || allBoardMembers.length,
        minimumQuorum: minutesWithVotingInfo.minimum_quorum || 50,
        approvalThreshold: minutesWithVotingInfo.approval_threshold || 75,
        allowAbstentions: true
      };
      
      const statistics = this.statisticsCalculator.calculateAdvancedStatistics(votes, votingConfig);

      // Determine outcome
      const outcome = this.determineMinutesOutcome(minutesWithVotingInfo, statistics);

      return {
        item: minutesWithVotingInfo,
        votes,
        statistics,
        nonVoters,
        outcome
      };
    } catch (error) {
      console.error('Error generating minutes summary data:', error);
      return null;
    }
  }

  /**
   * Get all board members and admin users
   */
  private async getAllBoardMembers(): Promise<BoardMember[]> {
    try {
      const { data: profiles, error } = await this.supabase
        .from('profiles')
        .select('id, full_name, email, position, role')
        .eq('is_active', true)
        .in('role', ['admin', 'board_member']);

      if (error) {
        console.error('Error fetching board members:', error);
        return [];
      }

      return (profiles || []).map(profile => ({
        id: profile.id,
        full_name: profile.full_name || 'Unknown',
        email: profile.email,
        position: profile.position || undefined
      }));
    } catch (error) {
      console.error('Error in getAllBoardMembers:', error);
      return [];
    }
  }



  /**
   * Determine resolution voting outcome
   */
  private determineResolutionOutcome(resolution: Resolution, statistics: VotingStatistics): VotingOutcome {
    const status = resolution.status;
    const passed = statistics.passed;
    
    return {
      passed,
      reason: statistics.passedReason,
      finalStatus: status || 'unknown'
    };
  }

  /**
   * Determine minutes voting outcome
   */
  private determineMinutesOutcome(minutes: MinutesWithVotingInfo, statistics: VotingStatistics): VotingOutcome {
    const status = minutes.status;
    const passed = statistics.passed;
    
    return {
      passed,
      reason: statistics.passedReason,
      finalStatus: status || 'unknown'
    };
  }

  /**
   * Send voting summary email to all board members using enhanced bulk delivery
   */
  private async sendVotingSummaryEmail(
    summaryData: VotingSummaryData, 
    type: 'resolution' | 'minutes'
  ): Promise<boolean> {
    try {
      // Get all eligible recipients with preference filtering
      const recipients = await this.recipientManager.getVotingEmailRecipients();
      
      if (recipients.length === 0) {
        console.warn('No eligible recipients found for voting summary email');
        return false;
      }

      console.log(`📧 Sending voting summary email to ${recipients.length} recipients`);

      // Generate email template
      const emailTemplate = this.templateEngine.generateEmailTemplate(
        summaryData, 
        type, 
        'Board Member' // Default recipient name, will be personalized
      );

      // Create bulk email template
      const bulkTemplate: EmailTemplate = {
        subject: emailTemplate.subject,
        htmlContent: emailTemplate.html,
        textContent: emailTemplate.text,
        personalizedFields: ['recipient_name', 'recipient_position']
      };

      // Generate personalizations for each recipient
      const personalizations = recipients.map(recipient => {
        const personalizedContent = this.templateEngine.generatePersonalizedContent(
          summaryData,
          recipient.email
        );

        return {
          recipientId: recipient.id,
          customFields: {
            '{{recipient_name}}': recipient.full_name,
            '{{recipient_position}}': recipient.position || '',
            '{{participation_message}}': personalizedContent.participationMessage,
            '{{personal_note}}': personalizedContent.personalNote || ''
          }
        };
      });

      // Send bulk emails with enhanced options
      const bulkResult = await this.bulkEmailService.sendBulkEmails(
        recipients,
        bulkTemplate,
        {
          maxConcurrent: 3, // Conservative concurrency for voting emails
          retryAttempts: 3,
          retryDelay: 1000,
          respectPreferences: true,
          trackDelivery: true,
          batchSize: 10,
          delayBetweenBatches: 500
        },
        personalizations
      );

      // Log the bulk email delivery
      await this.logEnhancedEmailDelivery(summaryData.item.id, type, bulkResult);

      // Handle partial failures if needed
      if (bulkResult.failed_deliveries > 0 && bulkResult.failed_deliveries < bulkResult.total_recipients) {
        console.warn(`📧 ${bulkResult.failed_deliveries} email deliveries failed, but continuing`);
        
        // Log failed recipients for follow-up
        const failedRecipients = bulkResult.delivery_results
          .filter(r => !r.success)
          .map(r => ({ email: r.recipient.email, error: r.error }));
        
        console.warn('📧 Failed recipients:', failedRecipients);
      }

      // Consider successful if at least 70% of emails were sent (more lenient for bulk)
      const successRate = bulkResult.total_recipients > 0 
        ? bulkResult.successful_deliveries / bulkResult.total_recipients 
        : 0;

      console.log(`📧 Voting summary email delivery completed: ${Math.round(successRate * 100)}% success rate`);

      return successRate >= 0.7;
    } catch (error) {
      console.error('Error sending voting summary emails:', error);
      return false;
    }
  }

  /**
   * Send personalized email with retry logic
   */
  private async sendPersonalizedEmailWithRetry(
    recipient: BoardMember,
    summaryData: VotingSummaryData,
    type: 'resolution' | 'minutes',
    maxRetries: number = 3
  ): Promise<boolean> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Generate personalized email template
        const emailTemplate = this.templateEngine.generateEmailTemplate(
          summaryData, 
          type, 
          recipient.full_name
        );

        // Get personalized content
        const personalizedContent = this.templateEngine.generatePersonalizedContent(
          summaryData,
          recipient.email
        );

        // Send using the existing email service with enhanced content
        const success = await this.emailService.sendNotificationEmail({
          userEmail: recipient.email,
          userName: recipient.full_name,
          title: emailTemplate.subject.replace('Arc Board Management - ', ''),
          message: personalizedContent.participationMessage,
          type: 'system'
        });

        if (success) {
          console.log(`✅ Personalized voting summary sent to ${recipient.full_name} (${recipient.email})`);
          return true;
        }
      } catch (error) {
        console.error(`Email attempt ${attempt} failed for ${recipient.email}:`, error);
      }

      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }

    console.error(`Failed to send email to ${recipient.email} after ${maxRetries} attempts`);
    return false;
  }

  /**
   * Generate comprehensive email preview for testing
   */
  generateEmailPreview(summaryData: VotingSummaryData, type: 'resolution' | 'minutes'): {
    subject: string;
    html: string;
    text: string;
    votingPeriod: string;
  } {
    const template = this.templateEngine.generateEmailTemplate(summaryData, type, 'Preview User');
    const votingPeriod = this.templateEngine.generateVotingPeriodInfo(summaryData);
    
    return {
      subject: template.subject,
      html: template.html,
      text: template.text,
      votingPeriod
    };
  }

  /**
   * Log enhanced email delivery for audit purposes
   */
  private async logEnhancedEmailDelivery(
    itemId: string,
    type: 'resolution' | 'minutes',
    bulkResult: BulkEmailResult
  ): Promise<void> {
    try {
      const logEntry = {
        itemId,
        type,
        total_recipients: bulkResult.total_recipients,
        successful_deliveries: bulkResult.successful_deliveries,
        failed_deliveries: bulkResult.failed_deliveries,
        total_time: bulkResult.total_time,
        average_delivery_time: bulkResult.average_delivery_time,
        bounce_rate: bulkResult.bounce_rate,
        timestamp: new Date().toISOString()
      };

      console.log(`📧 Enhanced voting summary email delivery log:`, logEntry);
      
      // In a future implementation, this could be stored in a dedicated audit table
    } catch (error) {
      console.error('Error logging enhanced email delivery:', error);
    }
  }

  /**
   * Log email delivery attempt for audit purposes (legacy method)
   */
  private async logEmailDelivery(
    itemId: string,
    type: 'resolution' | 'minutes',
    successCount: number,
    failureCount: number
  ): Promise<void> {
    try {
      console.log(`Voting summary email delivery log:`, {
        itemId,
        type,
        successCount,
        failureCount,
        timestamp: new Date().toISOString()
      });
      
      // In a future implementation, this could be stored in a dedicated audit table
    } catch (error) {
      console.error('Error logging email delivery:', error);
    }
  }
}