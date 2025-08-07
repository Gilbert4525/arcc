import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';
import { EmailNotificationService } from './notifications';
import { RecipientManager, EmailRecipient, EmailDeliveryResult, BulkEmailResult } from './recipientManager';

export interface EmailTemplate {
  subject: string;
  htmlContent: string;
  textContent: string;
  personalizedFields?: string[]; // Fields that can be personalized per recipient
}

export interface BulkEmailOptions {
  maxConcurrent?: number; // Maximum concurrent email sends
  retryAttempts?: number; // Number of retry attempts for failed sends
  retryDelay?: number; // Delay between retries in milliseconds
  respectPreferences?: boolean; // Whether to respect recipient preferences
  trackDelivery?: boolean; // Whether to track delivery status
  batchSize?: number; // Size of batches for processing
  delayBetweenBatches?: number; // Delay between batches in milliseconds
}

export interface EmailPersonalization {
  recipientId: string;
  personalizedSubject?: string;
  personalizedContent?: string;
  customFields?: Record<string, string>;
}

export class BulkEmailDeliveryService {
  private supabase: SupabaseClient<Database>;
  private emailService: EmailNotificationService;
  private recipientManager: RecipientManager;

  constructor(supabase: SupabaseClient<Database>) {
    this.supabase = supabase;
    this.emailService = new EmailNotificationService();
    this.recipientManager = new RecipientManager(supabase);
  }

  /**
   * Send bulk emails to multiple recipients with advanced options
   */
  async sendBulkEmails(
    recipients: EmailRecipient[],
    template: EmailTemplate,
    options: BulkEmailOptions = {},
    personalizations: EmailPersonalization[] = []
  ): Promise<BulkEmailResult> {
    const startTime = Date.now();
    
    // Set default options
    const opts: Required<BulkEmailOptions> = {
      maxConcurrent: 5,
      retryAttempts: 3,
      retryDelay: 1000,
      respectPreferences: true,
      trackDelivery: true,
      batchSize: 10,
      delayBetweenBatches: 500,
      ...options
    };

    console.log(`📧 Starting bulk email delivery to ${recipients.length} recipients`);

    // Filter recipients based on preferences if enabled
    let eligibleRecipients = recipients;
    if (opts.respectPreferences) {
      eligibleRecipients = recipients.filter(recipient => 
        this.recipientManager.shouldReceiveVotingEmails(recipient)
      );
      
      if (eligibleRecipients.length < recipients.length) {
        console.log(`📧 Filtered ${recipients.length - eligibleRecipients.length} recipients based on preferences`);
      }
    }

    // Validate email addresses
    const { valid: validRecipients, invalid: invalidRecipients } = 
      await this.recipientManager.validateRecipientEmails(eligibleRecipients);

    if (invalidRecipients.length > 0) {
      console.warn(`📧 Found ${invalidRecipients.length} invalid email addresses`);
      invalidRecipients.forEach(({ recipient, reason }) => {
        console.warn(`   - ${recipient.email}: ${reason}`);
      });
    }

    // Process emails in batches
    const deliveryResults: EmailDeliveryResult[] = [];
    const batches = this.createBatches(validRecipients, opts.batchSize);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`📧 Processing batch ${i + 1}/${batches.length} (${batch.length} recipients)`);

      // Process batch with concurrency control
      const batchResults = await this.processBatch(
        batch,
        template,
        personalizations,
        opts
      );

      deliveryResults.push(...batchResults);

      // Delay between batches (except for the last batch)
      if (i < batches.length - 1 && opts.delayBetweenBatches > 0) {
        await this.delay(opts.delayBetweenBatches);
      }
    }

    // Add failed results for invalid recipients
    for (const { recipient, reason } of invalidRecipients) {
      deliveryResults.push({
        recipient,
        success: false,
        error: reason,
        delivery_time: 0
      });
    }

    // Calculate final statistics
    const totalTime = Date.now() - startTime;
    const successfulDeliveries = deliveryResults.filter(r => r.success).length;
    const failedDeliveries = deliveryResults.length - successfulDeliveries;
    const averageDeliveryTime = deliveryResults.length > 0 
      ? deliveryResults.reduce((sum, r) => sum + r.delivery_time, 0) / deliveryResults.length
      : 0;
    const bounceRate = deliveryResults.length > 0 
      ? (failedDeliveries / deliveryResults.length) * 100
      : 0;

    const result: BulkEmailResult = {
      total_recipients: recipients.length,
      successful_deliveries: successfulDeliveries,
      failed_deliveries: failedDeliveries,
      delivery_results: deliveryResults,
      total_time: totalTime,
      average_delivery_time: Math.round(averageDeliveryTime),
      bounce_rate: Math.round(bounceRate * 100) / 100
    };

    console.log(`📧 Bulk email delivery completed:`, {
      total: result.total_recipients,
      successful: result.successful_deliveries,
      failed: result.failed_deliveries,
      totalTime: `${result.total_time}ms`,
      averageTime: `${result.average_delivery_time}ms`,
      bounceRate: `${result.bounce_rate}%`
    });

    // Log bulk email delivery for audit
    await this.logBulkEmailDelivery(result, template.subject);

    return result;
  }

  /**
   * Process a batch of recipients with concurrency control
   */
  private async processBatch(
    recipients: EmailRecipient[],
    template: EmailTemplate,
    personalizations: EmailPersonalization[],
    options: Required<BulkEmailOptions>
  ): Promise<EmailDeliveryResult[]> {
    // Create semaphore for concurrency control
    const semaphore = new Semaphore(options.maxConcurrent);
    
    // Process all recipients in the batch concurrently (with limit)
    const promises = recipients.map(recipient => 
      semaphore.acquire().then(async (release) => {
        try {
          return await this.sendSingleEmailWithRetry(
            recipient,
            template,
            options,
            personalizations.find(p => p.recipientId === recipient.id)
          );
        } finally {
          release();
        }
      })
    );

    return Promise.all(promises);
  }

  /**
   * Send email to a single recipient with retry logic
   */
  private async sendSingleEmailWithRetry(
    recipient: EmailRecipient,
    template: EmailTemplate,
    options: Required<BulkEmailOptions>,
    personalization?: EmailPersonalization
  ): Promise<EmailDeliveryResult> {
    const startTime = Date.now();
    let lastError: string | undefined;

    for (let attempt = 1; attempt <= options.retryAttempts; attempt++) {
      try {
        const success = await this.sendSingleEmail(recipient, template, personalization);
        
        const deliveryTime = Date.now() - startTime;
        
        if (success) {
          // Record successful delivery
          if (options.trackDelivery) {
            await this.recipientManager.recordEmailDelivery(
              recipient.id,
              'voting_summary',
              true
            );
          }

          return {
            recipient,
            success: true,
            delivery_time: deliveryTime
          };
        } else {
          lastError = 'Email service returned false';
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Email attempt ${attempt} failed for ${recipient.email}:`, error);
      }

      // Wait before retry (except for the last attempt)
      if (attempt < options.retryAttempts) {
        await this.delay(options.retryDelay * attempt); // Exponential backoff
      }
    }

    // All attempts failed
    const deliveryTime = Date.now() - startTime;
    
    if (options.trackDelivery) {
      await this.recipientManager.recordEmailDelivery(
        recipient.id,
        'voting_summary',
        false,
        lastError
      );
    }

    return {
      recipient,
      success: false,
      error: lastError || 'All retry attempts failed',
      delivery_time: deliveryTime
    };
  }

  /**
   * Send email to a single recipient
   */
  private async sendSingleEmail(
    recipient: EmailRecipient,
    template: EmailTemplate,
    personalization?: EmailPersonalization
  ): Promise<boolean> {
    // Personalize content if provided
    const subject = personalization?.personalizedSubject || 
                   this.personalizeContent(template.subject, recipient, personalization?.customFields);
    
    const content = personalization?.personalizedContent || 
                   this.personalizeContent(template.textContent, recipient, personalization?.customFields);

    // Send using the existing email service
    return await this.emailService.sendNotificationEmail({
      userEmail: recipient.email,
      userName: recipient.full_name,
      title: subject.replace('Arc Board Management - ', ''),
      message: content,
      type: 'system'
    });
  }

  /**
   * Personalize email content with recipient data
   */
  private personalizeContent(
    content: string,
    recipient: EmailRecipient,
    customFields?: Record<string, string>
  ): string {
    let personalizedContent = content;

    // Replace standard placeholders
    const replacements: Record<string, string> = {
      '{{recipient_name}}': recipient.full_name,
      '{{recipient_email}}': recipient.email,
      '{{recipient_position}}': recipient.position || '',
      '{{recipient_role}}': recipient.role,
      ...customFields
    };

    for (const [placeholder, value] of Object.entries(replacements)) {
      personalizedContent = personalizedContent.replace(
        new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
        value
      );
    }

    return personalizedContent;
  }

  /**
   * Create batches from recipients array
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Delay execution for specified milliseconds
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Handle partial delivery failures gracefully
   */
  async handlePartialFailures(
    result: BulkEmailResult,
    retryFailedOnly: boolean = false
  ): Promise<BulkEmailResult | null> {
    if (result.failed_deliveries === 0) {
      console.log('📧 No failed deliveries to handle');
      return null;
    }

    if (!retryFailedOnly) {
      console.log(`📧 ${result.failed_deliveries} deliveries failed, but not retrying`);
      return null;
    }

    console.log(`📧 Retrying ${result.failed_deliveries} failed deliveries`);

    // Get failed recipients
    const failedRecipients = result.delivery_results
      .filter(r => !r.success)
      .map(r => r.recipient);

    // Create a simple template for retry (would need actual template data)
    const retryTemplate: EmailTemplate = {
      subject: 'Retry Email',
      htmlContent: 'Retry content',
      textContent: 'Retry content'
    };

    // Retry with more conservative options
    const retryOptions: BulkEmailOptions = {
      maxConcurrent: 2,
      retryAttempts: 2,
      retryDelay: 2000,
      respectPreferences: false, // Already filtered
      trackDelivery: true,
      batchSize: 5,
      delayBetweenBatches: 1000
    };

    return await this.sendBulkEmails(failedRecipients, retryTemplate, retryOptions);
  }

  /**
   * Get delivery statistics for monitoring
   */
  async getDeliveryStatistics(days: number = 7): Promise<{
    total_emails_sent: number;
    successful_deliveries: number;
    failed_deliveries: number;
    average_delivery_time: number;
    bounce_rate: number;
    top_failure_reasons: Array<{ reason: string; count: number }>;
  }> {
    // In a full implementation, this would query email delivery logs
    // For now, return basic statistics
    return {
      total_emails_sent: 0,
      successful_deliveries: 0,
      failed_deliveries: 0,
      average_delivery_time: 0,
      bounce_rate: 0,
      top_failure_reasons: []
    };
  }

  /**
   * Log bulk email delivery for audit purposes
   */
  private async logBulkEmailDelivery(
    result: BulkEmailResult,
    subject: string
  ): Promise<void> {
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        action: 'bulk_email_delivery',
        subject,
        total_recipients: result.total_recipients,
        successful_deliveries: result.successful_deliveries,
        failed_deliveries: result.failed_deliveries,
        total_time: result.total_time,
        average_delivery_time: result.average_delivery_time,
        bounce_rate: result.bounce_rate
      };

      console.log('📋 Bulk email delivery logged:', logEntry);
      
      // In a future implementation, this could be stored in a dedicated audit table
    } catch (error) {
      console.error('Error logging bulk email delivery:', error);
    }
  }
}

/**
 * Simple semaphore implementation for concurrency control
 */
class Semaphore {
  private permits: number;
  private waitQueue: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<() => void> {
    return new Promise((resolve) => {
      if (this.permits > 0) {
        this.permits--;
        resolve(() => this.release());
      } else {
        this.waitQueue.push(() => {
          this.permits--;
          resolve(() => this.release());
        });
      }
    });
  }

  private release(): void {
    this.permits++;
    if (this.waitQueue.length > 0) {
      const next = this.waitQueue.shift();
      if (next) next();
    }
  }
}