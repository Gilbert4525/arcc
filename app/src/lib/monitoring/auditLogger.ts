import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

export interface AuditLogEntry {
  id?: string;
  timestamp: string;
  event_type: AuditEventType;
  user_id?: string;
  user_email?: string;
  user_name?: string;
  resource_type: 'resolution' | 'minutes' | 'email' | 'system' | 'user';
  resource_id?: string;
  action: string;
  details: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  success: boolean;
  error_message?: string;
  execution_time_ms?: number;
  metadata?: Record<string, any>;
}

export type AuditEventType = 
  | 'voting_completion'
  | 'email_sent'
  | 'email_failed'
  | 'manual_trigger'
  | 'scheduler_run'
  | 'preference_update'
  | 'recipient_update'
  | 'system_error'
  | 'authentication'
  | 'authorization'
  | 'data_access'
  | 'configuration_change';

export interface AuditQuery {
  event_types?: AuditEventType[];
  user_id?: string;
  resource_type?: string;
  resource_id?: string;
  start_date?: string;
  end_date?: string;
  severity?: string[];
  success?: boolean;
  limit?: number;
  offset?: number;
  sort_by?: 'timestamp' | 'event_type' | 'severity';
  sort_order?: 'asc' | 'desc';
}

export interface AuditStatistics {
  total_events: number;
  events_by_type: Record<AuditEventType, number>;
  events_by_severity: Record<string, number>;
  success_rate: number;
  error_rate: number;
  top_users: Array<{ user_id: string; user_name: string; event_count: number }>;
  top_resources: Array<{ resource_type: string; resource_id: string; event_count: number }>;
  timeline: Array<{ date: string; event_count: number; error_count: number }>;
}

export class AuditLogger {
  private supabase: SupabaseClient<Database>;
  private batchSize: number = 100;
  private batchTimeout: number = 5000; // 5 seconds
  private pendingLogs: AuditLogEntry[] = [];
  private batchTimer?: NodeJS.Timeout;

  constructor(supabase: SupabaseClient<Database>) {
    this.supabase = supabase;
  }

  /**
   * Log a voting completion event
   */
  async logVotingCompletion(
    userId: string,
    userEmail: string,
    userName: string,
    resourceType: 'resolution' | 'minutes',
    resourceId: string,
    details: {
      completion_reason: 'all_voted' | 'deadline_expired' | 'manual_completion';
      total_votes: number;
      total_eligible: number;
      participation_rate: number;
      outcome: string;
      email_triggered: boolean;
    },
    executionTime?: number
  ): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      event_type: 'voting_completion',
      user_id: userId,
      user_email: userEmail,
      user_name: userName,
      resource_type: resourceType,
      resource_id: resourceId,
      action: 'voting_completed',
      details,
      severity: 'info',
      success: true,
      execution_time_ms: executionTime
    });
  }

  /**
   * Log email sending events
   */
  async logEmailSent(
    userId: string,
    userEmail: string,
    userName: string,
    resourceType: 'resolution' | 'minutes',
    resourceId: string,
    details: {
      email_type: 'voting_summary' | 'voting_reminder' | 'manual_trigger';
      recipients_count: number;
      successful_deliveries: number;
      failed_deliveries: number;
      delivery_time_ms: number;
      bounce_rate: number;
      trigger_type: 'automatic' | 'manual' | 'scheduled';
    },
    success: boolean = true,
    errorMessage?: string
  ): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      event_type: success ? 'email_sent' : 'email_failed',
      user_id: userId,
      user_email: userEmail,
      user_name: userName,
      resource_type: resourceType,
      resource_id: resourceId,
      action: 'send_email',
      details,
      severity: success ? 'info' : 'error',
      success,
      error_message: errorMessage,
      execution_time_ms: details.delivery_time_ms
    });
  }

  /**
   * Log manual trigger events
   */
  async logManualTrigger(
    userId: string,
    userEmail: string,
    userName: string,
    action: string,
    resourceType: 'resolution' | 'minutes' | 'system',
    resourceId: string,
    details: Record<string, any>,
    success: boolean = true,
    errorMessage?: string,
    executionTime?: number
  ): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      event_type: 'manual_trigger',
      user_id: userId,
      user_email: userEmail,
      user_name: userName,
      resource_type: resourceType,
      resource_id: resourceId,
      action,
      details,
      severity: success ? 'info' : 'warning',
      success,
      error_message: errorMessage,
      execution_time_ms: executionTime
    });
  }

  /**
   * Log scheduler run events
   */
  async logSchedulerRun(
    details: {
      scheduler_type: 'deadline_checker' | 'email_processor' | 'cleanup';
      processed_items: number;
      successful_items: number;
      failed_items: number;
      execution_time_ms: number;
      next_run?: string;
    },
    success: boolean = true,
    errorMessage?: string
  ): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      event_type: 'scheduler_run',
      resource_type: 'system',
      action: 'scheduler_execution',
      details,
      severity: success ? 'info' : 'error',
      success,
      error_message: errorMessage,
      execution_time_ms: details.execution_time_ms
    });
  }

  /**
   * Log preference and recipient updates
   */
  async logPreferenceUpdate(
    userId: string,
    userEmail: string,
    userName: string,
    targetUserId: string,
    details: {
      updated_fields: string[];
      old_values: Record<string, any>;
      new_values: Record<string, any>;
      update_type: 'self' | 'admin';
    },
    success: boolean = true,
    errorMessage?: string
  ): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      event_type: 'preference_update',
      user_id: userId,
      user_email: userEmail,
      user_name: userName,
      resource_type: 'user',
      resource_id: targetUserId,
      action: 'update_preferences',
      details,
      severity: success ? 'info' : 'warning',
      success,
      error_message: errorMessage
    });
  }

  /**
   * Log system errors
   */
  async logSystemError(
    error: Error,
    context: {
      component: string;
      function: string;
      resource_type?: string;
      resource_id?: string;
      user_id?: string;
      additional_data?: Record<string, any>;
    },
    severity: 'warning' | 'error' | 'critical' = 'error'
  ): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      event_type: 'system_error',
      user_id: context.user_id,
      resource_type: context.resource_type || 'system',
      resource_id: context.resource_id,
      action: 'system_error',
      details: {
        component: context.component,
        function: context.function,
        error_name: error.name,
        error_stack: error.stack,
        ...context.additional_data
      },
      severity,
      success: false,
      error_message: error.message
    });
  }

  /**
   * Log authentication events
   */
  async logAuthentication(
    userId: string,
    userEmail: string,
    action: 'login' | 'logout' | 'failed_login' | 'password_change',
    details: {
      ip_address?: string;
      user_agent?: string;
      session_id?: string;
      failure_reason?: string;
    },
    success: boolean = true
  ): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      event_type: 'authentication',
      user_id: userId,
      user_email: userEmail,
      resource_type: 'user',
      resource_id: userId,
      action,
      details,
      ip_address: details.ip_address,
      user_agent: details.user_agent,
      session_id: details.session_id,
      severity: success ? 'info' : 'warning',
      success,
      error_message: details.failure_reason
    });
  }

  /**
   * Add log entry to batch (for high-volume logging)
   */
  private async log(entry: AuditLogEntry): Promise<void> {
    try {
      // Add to pending batch
      this.pendingLogs.push(entry);

      // If batch is full, flush immediately
      if (this.pendingLogs.length >= this.batchSize) {
        await this.flushBatch();
      } else {
        // Set timer to flush batch after timeout
        this.scheduleBatchFlush();
      }
    } catch (error) {
      console.error('Error adding audit log entry:', error);
      // Try to log directly if batching fails
      await this.logDirect(entry);
    }
  }

  /**
   * Log entry directly (bypass batching)
   */
  private async logDirect(entry: AuditLogEntry): Promise<void> {
    try {
      // In a full implementation, this would insert into audit_logs table
      console.log('📋 AUDIT LOG:', {
        timestamp: entry.timestamp,
        event: entry.event_type,
        user: entry.user_name || entry.user_email || 'System',
        resource: `${entry.resource_type}:${entry.resource_id || 'N/A'}`,
        action: entry.action,
        success: entry.success,
        severity: entry.severity,
        details: entry.details,
        error: entry.error_message,
        execution_time: entry.execution_time_ms ? `${entry.execution_time_ms}ms` : undefined
      });

      // Store in memory for demo purposes (in production, use database)
      this.storeInMemory(entry);
    } catch (error) {
      console.error('Error logging audit entry directly:', error);
    }
  }

  /**
   * Schedule batch flush
   */
  private scheduleBatchFlush(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }

    this.batchTimer = setTimeout(() => {
      this.flushBatch();
    }, this.batchTimeout);
  }

  /**
   * Flush pending logs batch
   */
  private async flushBatch(): Promise<void> {
    if (this.pendingLogs.length === 0) return;

    const logsToFlush = [...this.pendingLogs];
    this.pendingLogs = [];

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = undefined;
    }

    try {
      // In a full implementation, this would be a batch insert to audit_logs table
      console.log(`📋 AUDIT BATCH FLUSH: ${logsToFlush.length} entries`);
      
      for (const entry of logsToFlush) {
        await this.logDirect(entry);
      }
    } catch (error) {
      console.error('Error flushing audit log batch:', error);
      // Re-add failed logs to pending (with limit to prevent infinite growth)
      if (this.pendingLogs.length < this.batchSize * 2) {
        this.pendingLogs.unshift(...logsToFlush);
      }
    }
  }

  /**
   * Query audit logs with filtering
   */
  async queryLogs(query: AuditQuery): Promise<{
    logs: AuditLogEntry[];
    total: number;
    has_more: boolean;
  }> {
    try {
      // In a full implementation, this would query the audit_logs table
      // For now, return from in-memory storage
      const allLogs = this.getFromMemory();
      
      let filteredLogs = allLogs;

      // Apply filters
      if (query.event_types && query.event_types.length > 0) {
        filteredLogs = filteredLogs.filter(log => 
          query.event_types!.includes(log.event_type)
        );
      }

      if (query.user_id) {
        filteredLogs = filteredLogs.filter(log => log.user_id === query.user_id);
      }

      if (query.resource_type) {
        filteredLogs = filteredLogs.filter(log => log.resource_type === query.resource_type);
      }

      if (query.resource_id) {
        filteredLogs = filteredLogs.filter(log => log.resource_id === query.resource_id);
      }

      if (query.start_date) {
        filteredLogs = filteredLogs.filter(log => log.timestamp >= query.start_date!);
      }

      if (query.end_date) {
        filteredLogs = filteredLogs.filter(log => log.timestamp <= query.end_date!);
      }

      if (query.severity && query.severity.length > 0) {
        filteredLogs = filteredLogs.filter(log => 
          query.severity!.includes(log.severity)
        );
      }

      if (query.success !== undefined) {
        filteredLogs = filteredLogs.filter(log => log.success === query.success);
      }

      // Sort
      const sortBy = query.sort_by || 'timestamp';
      const sortOrder = query.sort_order || 'desc';
      
      filteredLogs.sort((a, b) => {
        const aVal = a[sortBy as keyof AuditLogEntry] || '';
        const bVal = b[sortBy as keyof AuditLogEntry] || '';
        
        if (sortOrder === 'asc') {
          return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        } else {
          return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
        }
      });

      // Pagination
      const limit = query.limit || 50;
      const offset = query.offset || 0;
      const total = filteredLogs.length;
      const paginatedLogs = filteredLogs.slice(offset, offset + limit);
      const hasMore = offset + limit < total;

      return {
        logs: paginatedLogs,
        total,
        has_more: hasMore
      };
    } catch (error) {
      console.error('Error querying audit logs:', error);
      return { logs: [], total: 0, has_more: false };
    }
  }

  /**
   * Get audit statistics
   */
  async getStatistics(days: number = 30): Promise<AuditStatistics> {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));

      const query: AuditQuery = {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        limit: 10000 // Get all for statistics
      };

      const { logs } = await this.queryLogs(query);

      // Calculate statistics
      const totalEvents = logs.length;
      const successfulEvents = logs.filter(log => log.success).length;
      const successRate = totalEvents > 0 ? (successfulEvents / totalEvents) * 100 : 0;
      const errorRate = 100 - successRate;

      // Events by type
      const eventsByType: Record<AuditEventType, number> = {} as Record<AuditEventType, number>;
      logs.forEach(log => {
        eventsByType[log.event_type] = (eventsByType[log.event_type] || 0) + 1;
      });

      // Events by severity
      const eventsBySeverity: Record<string, number> = {};
      logs.forEach(log => {
        eventsBySeverity[log.severity] = (eventsBySeverity[log.severity] || 0) + 1;
      });

      // Top users
      const userCounts: Record<string, { name: string; count: number }> = {};
      logs.forEach(log => {
        if (log.user_id) {
          if (!userCounts[log.user_id]) {
            userCounts[log.user_id] = { name: log.user_name || log.user_email || 'Unknown', count: 0 };
          }
          userCounts[log.user_id].count++;
        }
      });
      
      const topUsers = Object.entries(userCounts)
        .map(([userId, data]) => ({ user_id: userId, user_name: data.name, event_count: data.count }))
        .sort((a, b) => b.event_count - a.event_count)
        .slice(0, 10);

      // Top resources
      const resourceCounts: Record<string, number> = {};
      logs.forEach(log => {
        if (log.resource_id) {
          const key = `${log.resource_type}:${log.resource_id}`;
          resourceCounts[key] = (resourceCounts[key] || 0) + 1;
        }
      });
      
      const topResources = Object.entries(resourceCounts)
        .map(([key, count]) => {
          const [resourceType, resourceId] = key.split(':');
          return { resource_type: resourceType, resource_id: resourceId, event_count: count };
        })
        .sort((a, b) => b.event_count - a.event_count)
        .slice(0, 10);

      // Timeline (daily counts)
      const timeline: Array<{ date: string; event_count: number; error_count: number }> = [];
      const dailyCounts: Record<string, { total: number; errors: number }> = {};
      
      logs.forEach(log => {
        const date = log.timestamp.split('T')[0];
        if (!dailyCounts[date]) {
          dailyCounts[date] = { total: 0, errors: 0 };
        }
        dailyCounts[date].total++;
        if (!log.success) {
          dailyCounts[date].errors++;
        }
      });

      Object.entries(dailyCounts)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([date, counts]) => {
          timeline.push({
            date,
            event_count: counts.total,
            error_count: counts.errors
          });
        });

      return {
        total_events: totalEvents,
        events_by_type: eventsByType,
        events_by_severity: eventsBySeverity,
        success_rate: Math.round(successRate * 100) / 100,
        error_rate: Math.round(errorRate * 100) / 100,
        top_users: topUsers,
        top_resources: topResources,
        timeline
      };
    } catch (error) {
      console.error('Error getting audit statistics:', error);
      return {
        total_events: 0,
        events_by_type: {} as Record<AuditEventType, number>,
        events_by_severity: {},
        success_rate: 0,
        error_rate: 0,
        top_users: [],
        top_resources: [],
        timeline: []
      };
    }
  }

  /**
   * Cleanup old audit logs
   */
  async cleanupOldLogs(retentionDays: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - (retentionDays * 24 * 60 * 60 * 1000));
      
      // In a full implementation, this would delete from audit_logs table
      const memoryLogs = this.getFromMemory();
      const logsToKeep = memoryLogs.filter(log => new Date(log.timestamp) >= cutoffDate);
      const deletedCount = memoryLogs.length - logsToKeep.length;
      
      this.setInMemory(logsToKeep);
      
      console.log(`📋 Cleaned up ${deletedCount} old audit log entries (older than ${retentionDays} days)`);
      
      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up old audit logs:', error);
      return 0;
    }
  }

  /**
   * Force flush any pending logs (for shutdown)
   */
  async shutdown(): Promise<void> {
    await this.flushBatch();
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }
  }

  // In-memory storage for demo purposes (replace with database in production)
  private memoryStorage: AuditLogEntry[] = [];

  private storeInMemory(entry: AuditLogEntry): void {
    entry.id = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.memoryStorage.push(entry);
    
    // Keep only last 1000 entries in memory
    if (this.memoryStorage.length > 1000) {
      this.memoryStorage = this.memoryStorage.slice(-1000);
    }
  }

  private getFromMemory(): AuditLogEntry[] {
    return [...this.memoryStorage];
  }

  private setInMemory(logs: AuditLogEntry[]): void {
    this.memoryStorage = logs;
  }
}