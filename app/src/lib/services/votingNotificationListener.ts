import { Client } from 'pg';
import { VotingCompletionDetector } from '@/lib/email/votingCompletionDetector';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

interface NotificationPayload {
  action: string;
  type: 'resolution' | 'minutes';
  id: string;
  timestamp: string;
}

export class VotingNotificationListener {
  private pgClient: Client;
  private supabaseClient: any;
  private completionDetector: VotingCompletionDetector;
  private isListening: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private reconnectDelay: number = 5000; // 5 seconds

  constructor() {
    // Initialize PostgreSQL client for listening to notifications
    this.pgClient = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    // Initialize Supabase client
    this.supabaseClient = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Initialize completion detector
    this.completionDetector = new VotingCompletionDetector(this.supabaseClient);

    // Set up error handlers
    this.pgClient.on('error', this.handleConnectionError.bind(this));
    this.pgClient.on('end', this.handleConnectionEnd.bind(this));
  }

  /**
   * Start listening for voting completion notifications
   */
  async startListening(): Promise<void> {
    try {
      console.log('🎧 Starting voting notification listener...');
      
      // Connect to PostgreSQL
      await this.pgClient.connect();
      console.log('✅ Connected to PostgreSQL for notifications');

      // Listen to both notification channels
      await this.pgClient.query('LISTEN voting_completion');
      await this.pgClient.query('LISTEN voting_summary_email');
      console.log('🔔 Listening for voting completion and summary email notifications');

      // Set up notification handler
      this.pgClient.on('notification', this.handleNotification.bind(this));

      this.isListening = true;
      this.reconnectAttempts = 0;

      console.log('🚀 Voting notification listener is active');
    } catch (error) {
      console.error('❌ Failed to start voting notification listener:', error);
      await this.handleReconnect();
    }
  }

  /**
   * Stop listening for notifications
   */
  async stopListening(): Promise<void> {
    try {
      console.log('🛑 Stopping voting notification listener...');
      
      this.isListening = false;
      
      if (this.pgClient) {
        await this.pgClient.query('UNLISTEN voting_completion');
        await this.pgClient.query('UNLISTEN voting_summary_email');
        await this.pgClient.end();
      }
      
      console.log('✅ Voting notification listener stopped');
    } catch (error) {
      console.error('❌ Error stopping voting notification listener:', error);
    }
  }

  /**
   * Handle incoming notifications from the database
   */
  private async handleNotification(msg: any): Promise<void> {
    try {
      console.log(`📨 Received notification on channel "${msg.channel}":`, msg.payload);

      // Parse the notification payload
      const payload = JSON.parse(msg.payload);

      // Handle different notification channels
      if (msg.channel === 'voting_completion') {
        // Validate payload for voting completion
        if (!this.isValidPayload(payload)) {
          console.error('❌ Invalid voting completion payload:', payload);
          return;
        }
        
        // Process the voting completion notification
        await this.processVotingCompletion(payload);
      } else if (msg.channel === 'voting_summary_email') {
        // Handle direct voting summary email notifications
        await this.processDirectEmailNotification(payload);
      } else {
        console.warn(`⚠️ Unknown notification channel: ${msg.channel}`);
      }
    } catch (error) {
      console.error('❌ Error handling notification:', error);
    }
  }

  /**
   * Process direct voting summary email notification
   */
  private async processDirectEmailNotification(payload: any): Promise<void> {
    try {
      console.log(`📧 Processing direct email notification for ${payload.type} ${payload.id}`);

      // Validate required fields
      if (!payload.type || !payload.id || !payload.action) {
        console.error('❌ Invalid direct email notification payload:', payload);
        return;
      }

      if (payload.action === 'send_summary') {
        // Directly trigger the voting summary email without completion check
        await this.triggerVotingSummaryEmail(payload.type, payload.id, {
          isComplete: true,
          reason: 'direct_trigger',
          participationRate: 0, // Will be calculated by the email service
          source: 'database_trigger'
        });
      } else {
        console.warn(`⚠️ Unknown email notification action: ${payload.action}`);
      }
    } catch (error) {
      console.error(`❌ Error processing direct email notification:`, error);
    }
  }

  /**
   * Validate notification payload
   */
  private isValidPayload(payload: any): payload is NotificationPayload {
    return (
      payload &&
      typeof payload.action === 'string' &&
      (payload.type === 'resolution' || payload.type === 'minutes') &&
      typeof payload.id === 'string' &&
      typeof payload.timestamp === 'string'
    );
  }

  /**
   * Process voting completion notification
   */
  private async processVotingCompletion(payload: NotificationPayload): Promise<void> {
    try {
      console.log(`🎯 Processing ${payload.type} voting completion: ${payload.id}`);

      // Use the completion detector to handle the completion
      let result;
      if (payload.type === 'resolution') {
        const status = await this.completionDetector.checkResolutionCompletion(payload.id);
        result = { success: status.isComplete, status };
      } else {
        const status = await this.completionDetector.checkMinutesCompletion(payload.id);
        result = { success: status.isComplete, status };
      }

      if (result.success) {
        console.log(`✅ Successfully processed ${payload.type} completion: ${payload.id}`);
        console.log(`📊 Completion reason: ${result.status.reason}`);
        console.log(`📈 Participation: ${result.status.participationRate.toFixed(1)}%`);
        
        // Trigger the actual voting summary email
        await this.triggerVotingSummaryEmail(payload.type, payload.id, result.status);
      } else {
        console.log(`⚠️ ${payload.type} ${payload.id} is not yet complete`);
      }
    } catch (error) {
      console.error(`❌ Error processing ${payload.type} completion:`, error);
      
      // Log the error for monitoring but don't throw to avoid crashing the listener
      await this.logProcessingError(payload, error);
    }
  }

  /**
   * Trigger voting summary email via API call
   */
  private async triggerVotingSummaryEmail(
    type: 'resolution' | 'minutes', 
    id: string, 
    completionStatus: any
  ): Promise<void> {
    try {
      console.log(`📧 Triggering voting summary email for ${type} ${id}`);

      // Call our voting summary API endpoint
      const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/voting-summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({
          type,
          id,
          trigger: 'automatic',
          completionStatus,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`API call failed: ${response.status} - ${errorData.error || response.statusText}`);
      }

      const result = await response.json();
      console.log(`✅ Voting summary email triggered successfully for ${type} ${id}:`, result);

      // Log success to audit
      await this.logEmailTriggerSuccess(type, id, result);
    } catch (error) {
      console.error(`❌ Failed to trigger voting summary email for ${type} ${id}:`, error);
      
      // Log the error but don't throw to avoid crashing the listener
      await this.logEmailTriggerError(type, id, error);
    }
  }

  /**
   * Log successful email trigger to audit logs
   */
  private async logEmailTriggerSuccess(type: string, id: string, result: any): Promise<void> {
    try {
      await this.supabaseClient
        .from('audit_logs')
        .insert({
          user_id: null, // System action
          action: 'VOTING_SUMMARY_EMAIL_SENT',
          table_name: type === 'resolution' ? 'resolutions' : 'minutes',
          record_id: id,
          new_values: {
            trigger_source: 'notification_listener',
            result,
            timestamp: new Date().toISOString()
          }
        });
    } catch (error) {
      console.error('Failed to log email trigger success:', error);
    }
  }

  /**
   * Log email trigger error to audit logs
   */
  private async logEmailTriggerError(type: string, id: string, error: any): Promise<void> {
    try {
      await this.supabaseClient
        .from('audit_logs')
        .insert({
          user_id: null, // System action
          action: 'VOTING_SUMMARY_EMAIL_FAILED',
          table_name: type === 'resolution' ? 'resolutions' : 'minutes',
          record_id: id,
          new_values: {
            trigger_source: 'notification_listener',
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            timestamp: new Date().toISOString()
          }
        });
    } catch (auditError) {
      console.error('Failed to log email trigger error:', auditError);
    }
  }

  /**
   * Handle connection errors
   */
  private handleConnectionError(error: Error): void {
    console.error('❌ PostgreSQL connection error:', error);
    this.isListening = false;
    
    // Attempt to reconnect
    setTimeout(() => {
      this.handleReconnect();
    }, this.reconnectDelay);
  }

  /**
   * Handle connection end
   */
  private handleConnectionEnd(): void {
    console.warn('⚠️ PostgreSQL connection ended');
    this.isListening = false;
    
    // Attempt to reconnect if we were supposed to be listening
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      setTimeout(() => {
        this.handleReconnect();
      }, this.reconnectDelay);
    }
  }

  /**
   * Handle reconnection attempts
   */
  private async handleReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached. Stopping listener.');
      return;
    }

    this.reconnectAttempts++;
    console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    try {
      // Close existing connection if it exists
      if (this.pgClient) {
        try {
          await this.pgClient.end();
        } catch (error) {
          // Ignore errors when closing
        }
      }

      // Create new client
      this.pgClient = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      });

      // Set up error handlers
      this.pgClient.on('error', this.handleConnectionError.bind(this));
      this.pgClient.on('end', this.handleConnectionEnd.bind(this));

      // Restart listening
      await this.startListening();
    } catch (error) {
      console.error(`❌ Reconnection attempt ${this.reconnectAttempts} failed:`, error);
      
      // Exponential backoff for reconnection delay
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 60000); // Max 1 minute
      
      setTimeout(() => {
        this.handleReconnect();
      }, this.reconnectDelay);
    }
  }

  /**
   * Log processing errors for monitoring
   */
  private async logProcessingError(payload: NotificationPayload, error: any): Promise<void> {
    const errorLog = {
      timestamp: new Date().toISOString(),
      payload,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    };

    console.error('📋 Voting completion processing error logged:', errorLog);
    
    // In a production environment, you might want to send this to a monitoring service
    // or store it in a dedicated error logging table
  }

  /**
   * Get listener status
   */
  getStatus(): {
    isListening: boolean;
    reconnectAttempts: number;
    maxReconnectAttempts: number;
    reconnectDelay: number;
  } {
    return {
      isListening: this.isListening,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
      reconnectDelay: this.reconnectDelay
    };
  }

  /**
   * Process expired voting deadlines manually
   */
  async processExpiredDeadlines(): Promise<{
    processed: number;
    errors: number;
    results: any[];
  }> {
    try {
      console.log('⏰ Processing expired voting deadlines...');

      // Call the database function to get expired items
      const { data, error } = await this.supabaseClient
        .rpc('process_expired_voting_deadlines');

      if (error) {
        console.error('❌ Error calling process_expired_voting_deadlines:', error);
        return { processed: 0, errors: 1, results: [] };
      }

      const results = data || [];
      console.log(`📊 Found ${results.length} expired voting items`);

      // Process each expired item
      let processed = 0;
      let errors = 0;

      for (const item of results) {
        try {
          await this.processVotingCompletion({
            action: 'trigger_email',
            type: item.item_type,
            id: item.item_id,
            timestamp: item.expired_at
          });
          processed++;
        } catch (error) {
          console.error(`❌ Error processing expired ${item.item_type} ${item.item_id}:`, error);
          errors++;
        }
      }

      console.log(`✅ Processed ${processed} expired items, ${errors} errors`);
      
      return { processed, errors, results };
    } catch (error) {
      console.error('❌ Error in processExpiredDeadlines:', error);
      return { processed: 0, errors: 1, results: [] };
    }
  }
}

// Singleton instance for the notification listener
let notificationListener: VotingNotificationListener | null = null;

/**
 * Get or create the notification listener instance
 */
export function getNotificationListener(): VotingNotificationListener {
  if (!notificationListener) {
    notificationListener = new VotingNotificationListener();
  }
  return notificationListener;
}

/**
 * Start the voting notification listener service
 */
export async function startVotingNotificationService(): Promise<void> {
  const listener = getNotificationListener();
  await listener.startListening();
}

/**
 * Stop the voting notification listener service
 */
export async function stopVotingNotificationService(): Promise<void> {
  if (notificationListener) {
    await notificationListener.stopListening();
    notificationListener = null;
  }
}