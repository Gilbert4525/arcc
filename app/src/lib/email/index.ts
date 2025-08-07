export { EmailNotificationService, createEmailNotificationData } from './notifications';
export { 
  VotingSummaryEmailService,
  type VotingSummaryData,
  type VotingStatistics,
  type VotingOutcome,
  type VoteWithProfile,
  type BoardMember
} from './votingSummaryService';
export {
  VotingStatisticsCalculator,
  type AdvancedVotingStatistics,
  type VoteRecord,
  type VotingConfiguration,
  type QuorumStatus,
  type VotingMargin,
  type CommentAnalysis
} from './votingStatisticsEngine';
export {
  VotingSummaryEmailTemplates,
  type EmailTemplateData
} from './votingSummaryTemplates';
export {
  VotingCompletionDetector,
  type VotingCompletionStatus
} from './votingCompletionDetector';