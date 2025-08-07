import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';
import { AuditLogger, type AuditLogEntry, type AuditEventType, type AuditQuery, type AuditStatistics } from './auditLogger';
import { PerformanceMonitor, type PerformanceMetric, type PerformanceStats, type SystemHealthMetrics } from './performanceMonitor';

export interface MonitoringDashboard {
  system_health: SystemHealthMetrics;
  audit_summary: AuditStatistics;
  performance_summary: PerformanceStats[];
  recent_events: AuditLogEntry[];
  alerts: MonitoringAlert[];
  uptime_stats: UptimeStats;
}

export interface MonitoringAlert {
  id: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  category: 'performance' | 'security' | 'system' | 'business';
  title: string;
  message: string;
  component: string;
  timestamp: string;
  resolved: boolean;
  resolution_time?: string;
  metadata?: Record<string, any>;
}

export interface UptimeStats {
  uptime_percentage: number;
  total_downtime_minutes: number;
  incidents_count: number;
  last_incident?: string;
  availability_sla: number;
  current_status: 'operational' | 'degraded' | 'outage';
}

export interface MonitoringConfig {
  audit_retention_days: number;
  performance_retention_days: number;
  alert_thresholds: {
    response_time_warning: number;
    response_time_critical: number;
    error_rate_warning: number;
    error_rate_critical: number;
    email_delivery_warning: number;
    email_delivery_critical: number;
  };
  notification_settings: {
    email_alerts: boolean;
    webhook_url?: string;
    slack_webhook?: string;
  };
}

export class MonitoringService {
  private supabase: SupabaseClient<Database>;
  private auditLogger: AuditLogger;
  private performanceMonitor: PerformanceMonitor;
  private config: MonitoringConfig;
  private alerts: MonitoringAlert[] = [];
  private startTime: Date;

  constructor(supabase: SupabaseClient<Database>, config?: Partial<MonitoringConfig>) {
    this.supabase = supabase;
    this.auditLogger = new AuditLogger(supabase);
    this.performanceMonitor = new PerformanceMonitor(supabase);
    this.startTime = new Date();
    
    this.config = {
      audit_retention_days: 90,
      performance_retention_days: 30,
      alert_thresholds: {
        response_time_warning: 5000,
        response_time_critical: 10000,
        error_rate_warning: 10,
        error_rate_critical: 20,
        email_delivery_warning: 85,
        email_delivery_critical: 70
      },
      notification_settings: {
        email_alerts: true
      },
      ...config
    };
  }

  // Audit Logging Methods
  async logVotingCompletion(
    userId: string,
    userEmail: string,
    userName: string,
    resourceType: 'resolution' | 'minutes',
    resourceId: string,
    details: any,
    executionTime?: number
  ): Promise<void> {
    await this.auditLogger.logVotingCompletion(
      userId, userEmail, userName, resourceType, resourceId, details, executionTime
    );
  }

  async logEmailSent(
    userId: string,
    userEmail: string,
    userName: string,
    resourceType: 'resolution' | 'minutes',
    resourceId: string,
    details: any,
    success: boolean = true,
    errorMessage?: string
  ): Promise<void> {
    await this.auditLogger.logEmailSent(
      userId, userEmail, userName, resourceType, resourceId, details, success, errorMessage
    );

    // Check for email delivery alerts
    if (details.successful_deliveries && details.recipients_count) {
      const deliveryRate = (details.successful_deliveries / details.recipients_count) * 100;
      
      if (deliveryRate < this.config.alert_thresholds.email_delivery_critical) {
        await this.createAlert({
          severity: 'critical',
          category: 'business',
          title: 'Critical Email Delivery Failure',
          message: `Email delivery rate dropped to ${deliveryRate.toFixed(1)}% (${details.successful_deliveries}/${details.recipients_count})`,
          component: 'email_service',
          metadata: { delivery_rate: deliveryRate, ...details }
        });
      } else if (deliveryRate < this.config.alert_thresholds.email_delivery_warning) {
        await this.createAlert({
          severity: 'warning',
          category: 'business',
          title: 'Low Email Delivery Rate',
          message: `Email delivery rate is ${deliveryRate.toFixed(1)}% (${details.successful_deliveries}/${details.recipients_count})`,
          component: 'email_service',
          metadata: { delivery_rate: deliveryRate, ...details }
        });
      }
    }
  }

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
    await this.auditLogger.logManualTrigger(
      userId, userEmail, userName, action, resourceType, resourceId, details, success, errorMessage, executionTime
    );
  }

  async logSystemError(
    error: Error,
    context: any,
    severity: 'warning' | 'error' | 'critical' = 'error'
  ): Promise<void> {
    await this.auditLogger.logSystemError(error, context, severity);

    // Create alert for system errors
    await this.createAlert({
      severity: severity === 'warning' ? 'warning' : severity === 'critical' ? 'critical' : 'error',
      category: 'system',
      title: `System Error: ${error.name}`,
      message: error.message,
      component: context.component || 'system',
      metadata: { error_stack: error.stack, ...context }
    });
  }

  // Performance Monitoring Methods
  startOperation(operationId: string, component: string, operation: string, metadata?: Record<string, any>): void {
    this.performanceMonitor.startOperation(operationId, component, operation, metadata);
  }

  async endOperation(
    operationId: string,
    success: boolean = true,
    errorMessage?: string,
    additionalMetadata?: Record<string, any>
  ): Promise<void> {
    await this.performanceMonitor.endOperation(operationId, success, errorMessage, additionalMetadata);
  }

  async recordEmailGeneration(
    duration: number,
    success: boolean,
    details: any,
    errorMessage?: string
  ): Promise<void> {
    await this.performanceMonitor.recordEmailGeneration(duration, success, details, errorMessage);

    // Check for performance alerts
    if (duration > this.config.alert_thresholds.response_time_critical) {
      await this.createAlert({
        severity: 'critical',
        category: 'performance',
        title: 'Critical Email Generation Performance',
        message: `Email generation took ${duration}ms (critical threshold: ${this.config.alert_thresholds.response_time_critical}ms)`,
        component: 'email_service',
        metadata: { duration, ...details }
      });
    } else if (duration > this.config.alert_thresholds.response_time_warning) {
      await this.createAlert({
        severity: 'warning',
        category: 'performance',
        title: 'Slow Email Generation',
        message: `Email generation took ${duration}ms (warning threshold: ${this.config.alert_thresholds.response_time_warning}ms)`,
        component: 'email_service',
        metadata: { duration, ...details }
      });
    }
  }

  async recordEmailDelivery(
    duration: number,
    success: boolean,
    details: any,
    errorMessage?: string
  ): Promise<void> {
    await this.performanceMonitor.recordEmailDelivery(duration, success, details, errorMessage);
  }

  async recordDatabaseQuery(
    duration: number,
    success: boolean,
    details: any,
    errorMessage?: string
  ): Promise<void> {
    await this.performanceMonitor.recordDatabaseQuery(duration, success, details, errorMessage);
  }

  async recordVotingCalculation(
    duration: number,
    success: boolean,
    details: any,
    errorMessage?: string
  ): Promise<void> {
    await this.performanceMonitor.recordVotingCalculation(duration, success, details, errorMessage);
  }

  // Dashboard and Reporting Methods
  async getMonitoringDashboard(): Promise<MonitoringDashboard> {
    try {
      const [systemHealth, auditSummary, performanceStats, recentEvents] = await Promise.all([
        this.performanceMonitor.getSystemHealth(),
        this.auditLogger.getStatistics(7), // Last 7 days
        this.performanceMonitor.getPerformanceStats(undefined, undefined, 24), // Last 24 hours
        this.auditLogger.queryLogs({ limit: 20, sort_by: 'timestamp', sort_order: 'desc' })
      ]);

      const uptimeStats = this.calculateUptimeStats();
      const activeAlerts = this.getActiveAlerts();

      return {
        system_health: systemHealth,
        audit_summary: auditSummary,
        performance_summary: performanceStats.slice(0, 10), // Top 10 operations
        recent_events: recentEvents.logs,
        alerts: activeAlerts,
        uptime_stats: uptimeStats
      };
    } catch (error) {
      console.error('Error getting monitoring dashboard:', error);
      throw error;
    }
  }

  async getAuditLogs(query: AuditQuery): Promise<{ logs: AuditLogEntry[]; total: number; has_more: boolean }> {
    return await this.auditLogger.queryLogs(query);
  }

  async getPerformanceStats(
    component?: string,
    operation?: string,
    hours: number = 24
  ): Promise<PerformanceStats[]> {
    return await this.performanceMonitor.getPerformanceStats(component, operation, hours);
  }

  async getSystemHealth(): Promise<SystemHealthMetrics> {
    return await this.performanceMonitor.getSystemHealth();
  }

  // Alert Management
  private async createAlert(alertData: Omit<MonitoringAlert, 'id' | 'timestamp' | 'resolved'>): Promise<void> {
    const alert: MonitoringAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      resolved: false,
      ...alertData
    };

    this.alerts.push(alert);

    // Keep only last 100 alerts in memory
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }

    console.log(`🚨 MONITORING ALERT [${alert.severity.toUpperCase()}]:`, {
      title: alert.title,
      message: alert.message,
      component: alert.component,
      category: alert.category
    });

    // Send notifications if configured
    await this.sendAlertNotification(alert);
  }

  private async sendAlertNotification(alert: MonitoringAlert): Promise<void> {
    try {
      if (this.config.notification_settings.email_alerts) {
        // In a full implementation, send email notification
        console.log(`📧 Alert notification would be sent for: ${alert.title}`);
      }

      if (this.config.notification_settings.webhook_url) {
        // In a full implementation, send webhook notification
        console.log(`🔗 Webhook notification would be sent to: ${this.config.notification_settings.webhook_url}`);
      }

      if (this.config.notification_settings.slack_webhook) {
        // In a full implementation, send Slack notification
        console.log(`💬 Slack notification would be sent for: ${alert.title}`);
      }
    } catch (error) {
      console.error('Error sending alert notification:', error);
    }
  }

  async resolveAlert(alertId: string): Promise<boolean> {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolution_time = new Date().toISOString();
      console.log(`✅ Alert resolved: ${alert.title}`);
      return true;
    }
    return false;
  }

  getActiveAlerts(): MonitoringAlert[] {
    return this.alerts.filter(a => !a.resolved).sort((a, b) => {
      const severityOrder = { critical: 4, error: 3, warning: 2, info: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  getAllAlerts(limit: number = 50): MonitoringAlert[] {
    return this.alerts
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  // Uptime Calculation
  private calculateUptimeStats(): UptimeStats {
    const now = new Date();
    const uptimeMs = now.getTime() - this.startTime.getTime();
    const uptimeHours = uptimeMs / (1000 * 60 * 60);

    // In a full implementation, this would calculate based on actual downtime records
    const criticalAlerts = this.alerts.filter(a => a.severity === 'critical');
    const incidents = criticalAlerts.length;
    const estimatedDowntimeMinutes = incidents * 5; // Assume 5 minutes per critical incident

    const uptimePercentage = uptimeHours > 0 
      ? Math.max(0, ((uptimeHours * 60 - estimatedDowntimeMinutes) / (uptimeHours * 60)) * 100)
      : 100;

    const currentStatus = this.determineCurrentStatus();

    return {
      uptime_percentage: Math.round(uptimePercentage * 100) / 100,
      total_downtime_minutes: estimatedDowntimeMinutes,
      incidents_count: incidents,
      last_incident: criticalAlerts.length > 0 ? criticalAlerts[criticalAlerts.length - 1].timestamp : undefined,
      availability_sla: 99.9, // Target SLA
      current_status: currentStatus
    };
  }

  private determineCurrentStatus(): 'operational' | 'degraded' | 'outage' {
    const activeAlerts = this.getActiveAlerts();
    const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical');
    const warningAlerts = activeAlerts.filter(a => a.severity === 'warning' || a.severity === 'error');

    if (criticalAlerts.length > 0) {
      return 'outage';
    } else if (warningAlerts.length > 2) {
      return 'degraded';
    } else {
      return 'operational';
    }
  }

  // Maintenance and Cleanup
  async performMaintenance(): Promise<{
    audit_logs_cleaned: number;
    performance_metrics_cleaned: number;
    alerts_cleaned: number;
  }> {
    try {
      console.log('🧹 Starting monitoring system maintenance...');

      const [auditCleaned, alertsCleaned] = await Promise.all([
        this.auditLogger.cleanupOldLogs(this.config.audit_retention_days),
        this.cleanupOldAlerts()
      ]);

      // Performance metrics cleanup would be implemented here
      const performanceCleaned = 0;

      console.log(`✅ Maintenance completed: ${auditCleaned} audit logs, ${performanceCleaned} metrics, ${alertsCleaned} alerts cleaned`);

      return {
        audit_logs_cleaned: auditCleaned,
        performance_metrics_cleaned: performanceCleaned,
        alerts_cleaned: alertsCleaned
      };
    } catch (error) {
      console.error('Error during maintenance:', error);
      throw error;
    }
  }

  private async cleanupOldAlerts(): Promise<number> {
    const cutoffDate = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000)); // 30 days
    const initialCount = this.alerts.length;
    
    this.alerts = this.alerts.filter(alert => 
      new Date(alert.timestamp) >= cutoffDate || !alert.resolved
    );
    
    return initialCount - this.alerts.length;
  }

  // Configuration Management
  updateConfig(newConfig: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('📊 Monitoring configuration updated:', newConfig);
  }

  getConfig(): MonitoringConfig {
    return { ...this.config };
  }

  // Shutdown
  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down monitoring service...');
    
    await Promise.all([
      this.auditLogger.shutdown(),
      this.performanceMonitor.shutdown()
    ]);

    console.log('✅ Monitoring service shutdown complete');
  }

  // Health Check
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    components: {
      audit_logger: boolean;
      performance_monitor: boolean;
      alert_system: boolean;
    };
    uptime_seconds: number;
  }> {
    try {
      const uptimeSeconds = Math.floor((Date.now() - this.startTime.getTime()) / 1000);
      
      // Basic health checks
      const auditLoggerHealthy = true; // Would check actual health
      const performanceMonitorHealthy = true; // Would check actual health
      const alertSystemHealthy = this.alerts !== undefined;

      const allHealthy = auditLoggerHealthy && performanceMonitorHealthy && alertSystemHealthy;

      return {
        status: allHealthy ? 'healthy' : 'unhealthy',
        components: {
          audit_logger: auditLoggerHealthy,
          performance_monitor: performanceMonitorHealthy,
          alert_system: alertSystemHealthy
        },
        uptime_seconds: uptimeSeconds
      };
    } catch (error) {
      console.error('Error in monitoring health check:', error);
      return {
        status: 'unhealthy',
        components: {
          audit_logger: false,
          performance_monitor: false,
          alert_system: false
        },
        uptime_seconds: 0
      };
    }
  }
}