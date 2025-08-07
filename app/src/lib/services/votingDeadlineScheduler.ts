import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';
import { VotingCompletionDetector } from '../email/votingCompletionDetector';

export interface ScheduledJobResult {
  success: boolean;
  processedItems: number;
  expiredResolutions: string[];
  expiredMinutes: string[];
  errors: string[];
  executionTime: number;
}

export class VotingDeadlineScheduler {
  private supabase: SupabaseClient<Database>;
  private completionDetector: VotingCompletionDetector;
  private isRunning: boolean = false;
  private lastRunTime?: Date;
  private intervalId?: NodeJS.Timeout;

  constructor(supabase: SupabaseClient<Database>) {
    this.supabase = supabase;
    this.completionDetector = new VotingCompletionDetector(supabase);
  }

  /**
   * Start the scheduled job to check for expired voting deadlines
   * Runs every minute by default
   */
  startScheduledJob(intervalMinutes: number = 1): void {
    if (this.isRunning) {
      console.log('⚠️ Voting deadline scheduler is already running');
      return;
    }

    console.log(`🚀 Starting voting deadline scheduler (checking every ${intervalMinutes} minute(s))`);
    
    this.isRunning = true;
    
    // Run immediately on start
    this.checkExpiredDeadlines();
    
    // Set up recurring interval
    this.intervalId = setInterval(() => {
      this.checkExpiredDeadlines();
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Stop the scheduled job
   */
  stopScheduledJob(): void {
    if (!this.isRunning) {
      console.log('⚠️ Voting deadline scheduler is not running');
      return;
    }

    console.log('🛑 Stopping voting deadline scheduler');
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    
    this.isRunning = false;
  }

  /**
   * Check for expired voting deadlines and trigger summary emails
   */
  async checkExpiredDeadlines(): Promise<ScheduledJobResult> {
    if (this.isRunning && this.lastRunTime) {
      const timeSinceLastRun = Date.now() - this.lastRunTime.getTime();
      if (timeSinceLastRun < 30000) { // Prevent running more than once every 30 seconds
        console.log('⏳ Skipping deadline check - too soon since last run');
        return this.createEmptyResult();
      }
    }

    const startTime = Date.now();
    this.lastRunTime = new Date();
    
    console.log(`🕐 [${this.lastRunTime.toISOString()}] Checking for expired voting deadlines...`);

    try {
      const result = await this.completionDetector.checkExpiredDeadlines();
      const executionTime = Date.now() - startTime;

      const jobResult: ScheduledJobResult = {
        success: true,
        processedItems: result.totalProcessed,
        expiredResolutions: result.expiredResolutions,
        expiredMinutes: result.expiredMinutes,
        errors: [],
        executionTime
      };

      if (result.totalProcessed > 0) {
        console.log(`✅ Processed ${result.totalProcessed} expired voting items in ${executionTime}ms`);
        console.log(`   - Resolutions: ${result.expiredResolutions.length}`);
        console.log(`   - Minutes: ${result.expiredMinutes.length}`);
      } else {
        console.log(`✅ No expired voting deadlines found (${executionTime}ms)`);
      }

      // Log the job execution for monitoring
      await this.logJobExecution(jobResult);

      return jobResult;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      console.error(`❌ Error checking expired deadlines: ${errorMessage}`);

      const jobResult: ScheduledJobResult = {
        success: false,
        processedItems: 0,
        expiredResolutions: [],
        expiredMinutes: [],
        errors: [errorMessage],
        executionTime
      };

      await this.logJobExecution(jobResult);
      return jobResult;
    }
  }

  /**
   * Get the current status of the scheduler
   */
  getSchedulerStatus(): {
    isRunning: boolean;
    lastRunTime?: string;
    nextRunTime?: string;
    intervalMinutes?: number;
  } {
    const intervalMinutes = this.intervalId ? 1 : undefined; // Default interval
    const nextRunTime = this.isRunning && this.lastRunTime && intervalMinutes
      ? new Date(this.lastRunTime.getTime() + (intervalMinutes * 60 * 1000)).toISOString()
      : undefined;

    return {
      isRunning: this.isRunning,
      lastRunTime: this.lastRunTime?.toISOString(),
      nextRunTime,
      intervalMinutes
    };
  }

  /**
   * Manually trigger a deadline check (for testing or admin use)
   */
  async manualDeadlineCheck(): Promise<ScheduledJobResult> {
    console.log('🔧 Manual deadline check triggered');
    return await this.checkExpiredDeadlines();
  }

  /**
   * Check specific item for deadline expiration
   */
  async checkSpecificItemDeadline(
    type: 'resolution' | 'minutes',
    itemId: string
  ): Promise<{ expired: boolean; processed: boolean; error?: string }> {
    try {
      console.log(`🔍 Checking specific ${type} deadline: ${itemId}`);

      if (type === 'resolution') {
        const status = await this.completionDetector.checkResolutionCompletion(itemId);
        return {
          expired: status.deadlineExpired,
          processed: status.isComplete && status.reason === 'deadline_expired'
        };
      } else {
        const status = await this.completionDetector.checkMinutesCompletion(itemId);
        return {
          expired: status.deadlineExpired,
          processed: status.isComplete && status.reason === 'deadline_expired'
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error checking specific item deadline: ${errorMessage}`);
      return {
        expired: false,
        processed: false,
        error: errorMessage
      };
    }
  }

  /**
   * Get upcoming deadlines for monitoring
   */
  async getUpcomingDeadlines(hoursAhead: number = 24): Promise<{
    resolutions: Array<{ id: string; title: string; deadline: string; hoursRemaining: number }>;
    minutes: Array<{ id: string; title: string; deadline: string; hoursRemaining: number }>;
  }> {
    try {
      const now = new Date();
      const futureTime = new Date(now.getTime() + (hoursAhead * 60 * 60 * 1000));

      // Get upcoming resolution deadlines
      const { data: upcomingResolutions, error: resolutionError } = await this.supabase
        .from('resolutions')
        .select('id, title, voting_deadline')
        .eq('status', 'voting')
        .not('voting_deadline', 'is', null)
        .gte('voting_deadline', now.toISOString())
        .lte('voting_deadline', futureTime.toISOString())
        .order('voting_deadline', { ascending: true });

      if (resolutionError) {
        console.error('Error fetching upcoming resolution deadlines:', resolutionError);
      }

      // Get upcoming minutes deadlines
      const { data: upcomingMinutes, error: minutesError } = await this.supabase
        .from('minutes')
        .select('id, title, voting_deadline')
        .eq('status', 'voting')
        .not('voting_deadline', 'is', null)
        .gte('voting_deadline', now.toISOString())
        .lte('voting_deadline', futureTime.toISOString())
        .order('voting_deadline', { ascending: true });

      if (minutesError) {
        console.error('Error fetching upcoming minutes deadlines:', minutesError);
      }

      const formatDeadlines = (items: any[]) => 
        (items || []).map(item => ({
          id: item.id,
          title: item.title,
          deadline: item.voting_deadline,
          hoursRemaining: Math.round((new Date(item.voting_deadline).getTime() - now.getTime()) / (1000 * 60 * 60))
        }));

      return {
        resolutions: formatDeadlines(upcomingResolutions || []),
        minutes: formatDeadlines(upcomingMinutes || [])
      };
    } catch (error) {
      console.error('Error getting upcoming deadlines:', error);
      return { resolutions: [], minutes: [] };
    }
  }

  /**
   * Create empty result for skipped runs
   */
  private createEmptyResult(): ScheduledJobResult {
    return {
      success: true,
      processedItems: 0,
      expiredResolutions: [],
      expiredMinutes: [],
      errors: [],
      executionTime: 0
    };
  }

  /**
   * Log job execution for audit and monitoring
   */
  private async logJobExecution(result: ScheduledJobResult): Promise<void> {
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        jobType: 'voting_deadline_check',
        success: result.success,
        processedItems: result.processedItems,
        expiredResolutions: result.expiredResolutions.length,
        expiredMinutes: result.expiredMinutes.length,
        errors: result.errors,
        executionTimeMs: result.executionTime,
        schedulerStatus: this.getSchedulerStatus()
      };

      console.log('📋 Deadline scheduler job logged:', logEntry);
      
      // In a future implementation, this could be stored in a dedicated audit table
      // For now, we're logging to console for debugging and monitoring
    } catch (error) {
      console.error('Error logging job execution:', error);
    }
  }

  /**
   * Get job execution statistics
   */
  async getJobStatistics(hours: number = 24): Promise<{
    totalRuns: number;
    successfulRuns: number;
    failedRuns: number;
    totalProcessedItems: number;
    averageExecutionTime: number;
    lastError?: string;
  }> {
    // This would typically query an audit table
    // For now, return basic status information
    return {
      totalRuns: 0,
      successfulRuns: 0,
      failedRuns: 0,
      totalProcessedItems: 0,
      averageExecutionTime: 0,
      lastError: undefined
    };
  }

  /**
   * Cleanup method to ensure proper shutdown
   */
  cleanup(): void {
    this.stopScheduledJob();
    console.log('🧹 Voting deadline scheduler cleanup completed');
  }
}