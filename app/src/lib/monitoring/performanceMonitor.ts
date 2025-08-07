import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

export interface PerformanceMetric {
  id?: string;
  timestamp: string;
  metric_type: MetricType;
  component: string;
  operation: string;
  duration_ms: number;
  success: boolean;
  error_message?: string;
  metadata?: Record<string, any>;
  resource_usage?: {
    memory_mb?: number;
    cpu_percent?: number;
    db_queries?: number;
    api_calls?: number;
  };
}

export type MetricType = 
  | 'email_generation'
  | 'email_delivery'
  | 'database_query'
  | 'api_request'
  | 'voting_calculation'
  | 'template_rendering'
  | 'bulk_operation'
  | 'scheduler_job'
  | 'system_health';

export interface PerformanceStats {
  component: string;
  operation: string;
  total_executions: number;
  successful_executions: number;
  failed_executions: number;
  success_rate: number;
  average_duration_ms: number;
  min_duration_ms: number;
  max_duration_ms: number;
  p50_duration_ms: number;
  p95_duration_ms: number;
  p99_duration_ms: number;
  total_duration_ms: number;
  executions_per_hour: number;
  error_rate: number;
  last_execution: string;
}

export interface SystemHealthMetrics {
  timestamp: string;
  overall_health: 'healthy' | 'degraded' | 'unhealthy';
  components: {
    email_service: ComponentHealth;
    database: ComponentHealth;
    voting_system: ComponentHealth;
    scheduler: ComponentHealth;
  };
  performance_summary: {
    average_response_time: number;
    error_rate: number;
    throughput_per_minute: number;
    active_operations: number;
  };
  alerts: HealthAlert[];
}

export interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  response_time_ms: number;
  error_rate: number;
  last_check: string;
  issues: string[];
}

export interface HealthAlert {
  severity: 'info' | 'warning' | 'critical';
  component: string;
  message: string;
  timestamp: string;
  resolved: boolean;
}

export class PerformanceMonitor {
  private supabase: SupabaseClient<Database>;
  private activeOperations: Map<string, { start: number; metadata: any }> = new Map();
  private metricsBuffer: PerformanceMetric[] = [];
  private bufferSize: number = 100;
  private flushInterval: number = 30000; // 30 seconds
  private flushTimer?: NodeJS.Timeout;

  constructor(supabase: SupabaseClient<Database>) {
    this.supabase = supabase;
    this.startPeriodicFlush();
  }

  /**
   * Start timing an operation
   */
  startOperation(
    operationId: string,
    component: string,
    operation: string,
    metadata?: Record<string, any>
  ): void {
    this.activeOperations.set(operationId, {
      start: Date.now(),
      metadata: { component, operation, ...metadata }
    });
  }

  /**
   * End timing an operation and record metric
   */
  async endOperation(
    operationId: string,
    success: boolean = true,
    errorMessage?: string,
    additionalMetadata?: Record<string, any>
  ): Promise<void> {
    const operation = this.activeOperations.get(operationId);
    if (!operation) {
      console.warn(`Performance monitor: Operation ${operationId} not found`);
      return;
    }

    const duration = Date.now() - operation.start;
    this.activeOperations.delete(operationId);

    const metric: PerformanceMetric = {
      timestamp: new Date().toISOString(),
      metric_type: this.getMetricType(operation.metadata.component, operation.metadata.operation),
      component: operation.metadata.component,
      operation: operation.metadata.operation,
      duration_ms: duration,
      success,
      error_message: errorMessage,
      metadata: { ...operation.metadata, ...additionalMetadata },
      resource_usage: await this.getResourceUsage()
    };

    await this.recordMetric(metric);
  }

  /**
   * Record a metric directly (for operations that don't use start/end pattern)
   */
  async recordMetric(metric: PerformanceMetric): Promise<void> {
    try {
      this.metricsBuffer.push(metric);

      // Log immediately for critical operations or errors
      if (metric.duration_ms > 10000 || !metric.success) {
        console.log(`📊 PERFORMANCE METRIC:`, {
          component: metric.component,
          operation: metric.operation,
          duration: `${metric.duration_ms}ms`,
          success: metric.success,
          error: metric.error_message,
          metadata: metric.metadata
        });
      }

      // Flush buffer if it's full
      if (this.metricsBuffer.length >= this.bufferSize) {
        await this.flushMetrics();
      }
    } catch (error) {
      console.error('Error recording performance metric:', error);
    }
  }

  /**
   * Record email generation performance
   */
  async recordEmailGeneration(
    duration: number,
    success: boolean,
    details: {
      email_type: string;
      recipients_count: number;
      template_size?: number;
      personalization_count?: number;
    },
    errorMessage?: string
  ): Promise<void> {
    await this.recordMetric({
      timestamp: new Date().toISOString(),
      metric_type: 'email_generation',
      component: 'email_service',
      operation: 'generate_email',
      duration_ms: duration,
      success,
      error_message: errorMessage,
      metadata: details
    });
  }

  /**
   * Record email delivery performance
   */
  async recordEmailDelivery(
    duration: number,
    success: boolean,
    details: {
      delivery_type: 'single' | 'bulk';
      recipients_count: number;
      successful_deliveries: number;
      failed_deliveries: number;
      retry_attempts?: number;
    },
    errorMessage?: string
  ): Promise<void> {
    await this.recordMetric({
      timestamp: new Date().toISOString(),
      metric_type: 'email_delivery',
      component: 'email_service',
      operation: 'deliver_email',
      duration_ms: duration,
      success,
      error_message: errorMessage,
      metadata: details
    });
  }

  /**
   * Record database query performance
   */
  async recordDatabaseQuery(
    duration: number,
    success: boolean,
    details: {
      query_type: 'select' | 'insert' | 'update' | 'delete';
      table_name: string;
      rows_affected?: number;
      query_complexity?: 'simple' | 'complex';
    },
    errorMessage?: string
  ): Promise<void> {
    await this.recordMetric({
      timestamp: new Date().toISOString(),
      metric_type: 'database_query',
      component: 'database',
      operation: `${details.query_type}_${details.table_name}`,
      duration_ms: duration,
      success,
      error_message: errorMessage,
      metadata: details
    });
  }

  /**
   * Record voting calculation performance
   */
  async recordVotingCalculation(
    duration: number,
    success: boolean,
    details: {
      calculation_type: 'statistics' | 'completion_check' | 'outcome_determination';
      votes_processed: number;
      complexity_score?: number;
    },
    errorMessage?: string
  ): Promise<void> {
    await this.recordMetric({
      timestamp: new Date().toISOString(),
      metric_type: 'voting_calculation',
      component: 'voting_system',
      operation: details.calculation_type,
      duration_ms: duration,
      success,
      error_message: errorMessage,
      metadata: details
    });
  }

  /**
   * Get performance statistics for a component/operation
   */
  async getPerformanceStats(
    component?: string,
    operation?: string,
    hours: number = 24
  ): Promise<PerformanceStats[]> {
    try {
      // In a full implementation, this would query a performance_metrics table
      // For now, use in-memory buffer and simulate data
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - (hours * 60 * 60 * 1000));

      let metrics = this.metricsBuffer.filter(m => 
        new Date(m.timestamp) >= startTime &&
        new Date(m.timestamp) <= endTime
      );

      if (component) {
        metrics = metrics.filter(m => m.component === component);
      }

      if (operation) {
        metrics = metrics.filter(m => m.operation === operation);
      }

      // Group by component and operation
      const groups: Record<string, PerformanceMetric[]> = {};
      metrics.forEach(metric => {
        const key = `${metric.component}:${metric.operation}`;
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(metric);
      });

      // Calculate statistics for each group
      const stats: PerformanceStats[] = [];
      Object.entries(groups).forEach(([key, groupMetrics]) => {
        const [comp, op] = key.split(':');
        const durations = groupMetrics.map(m => m.duration_ms).sort((a, b) => a - b);
        const successfulExecutions = groupMetrics.filter(m => m.success).length;
        const totalExecutions = groupMetrics.length;

        stats.push({
          component: comp,
          operation: op,
          total_executions: totalExecutions,
          successful_executions: successfulExecutions,
          failed_executions: totalExecutions - successfulExecutions,
          success_rate: totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0,
          average_duration_ms: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
          min_duration_ms: durations.length > 0 ? durations[0] : 0,
          max_duration_ms: durations.length > 0 ? durations[durations.length - 1] : 0,
          p50_duration_ms: durations.length > 0 ? durations[Math.floor(durations.length * 0.5)] : 0,
          p95_duration_ms: durations.length > 0 ? durations[Math.floor(durations.length * 0.95)] : 0,
          p99_duration_ms: durations.length > 0 ? durations[Math.floor(durations.length * 0.99)] : 0,
          total_duration_ms: durations.reduce((a, b) => a + b, 0),
          executions_per_hour: totalExecutions / hours,
          error_rate: totalExecutions > 0 ? ((totalExecutions - successfulExecutions) / totalExecutions) * 100 : 0,
          last_execution: groupMetrics.length > 0 ? groupMetrics[groupMetrics.length - 1].timestamp : ''
        });
      });

      return stats.sort((a, b) => b.total_executions - a.total_executions);
    } catch (error) {
      console.error('Error getting performance stats:', error);
      return [];
    }
  }

  /**
   * Get system health metrics
   */
  async getSystemHealth(): Promise<SystemHealthMetrics> {
    try {
      const now = new Date().toISOString();
      const stats = await this.getPerformanceStats(undefined, undefined, 1); // Last hour

      // Calculate component health
      const emailHealth = this.calculateComponentHealth('email_service', stats);
      const databaseHealth = this.calculateComponentHealth('database', stats);
      const votingHealth = this.calculateComponentHealth('voting_system', stats);
      const schedulerHealth = this.calculateComponentHealth('scheduler', stats);

      // Overall health
      const componentHealthScores = [emailHealth, databaseHealth, votingHealth, schedulerHealth];
      const unhealthyCount = componentHealthScores.filter(h => h.status === 'unhealthy').length;
      const degradedCount = componentHealthScores.filter(h => h.status === 'degraded').length;

      let overallHealth: 'healthy' | 'degraded' | 'unhealthy';
      if (unhealthyCount > 0) {
        overallHealth = 'unhealthy';
      } else if (degradedCount > 0) {
        overallHealth = 'degraded';
      } else {
        overallHealth = 'healthy';
      }

      // Performance summary
      const totalExecutions = stats.reduce((sum, s) => sum + s.total_executions, 0);
      const totalErrors = stats.reduce((sum, s) => sum + s.failed_executions, 0);
      const avgResponseTime = stats.length > 0 
        ? stats.reduce((sum, s) => sum + s.average_duration_ms, 0) / stats.length 
        : 0;

      // Generate alerts
      const alerts = this.generateHealthAlerts(componentHealthScores, stats);

      return {
        timestamp: now,
        overall_health: overallHealth,
        components: {
          email_service: emailHealth,
          database: databaseHealth,
          voting_system: votingHealth,
          scheduler: schedulerHealth
        },
        performance_summary: {
          average_response_time: Math.round(avgResponseTime),
          error_rate: totalExecutions > 0 ? Math.round((totalErrors / totalExecutions) * 100 * 100) / 100 : 0,
          throughput_per_minute: Math.round(totalExecutions / 60),
          active_operations: this.activeOperations.size
        },
        alerts
      };
    } catch (error) {
      console.error('Error getting system health:', error);
      return {
        timestamp: new Date().toISOString(),
        overall_health: 'unhealthy',
        components: {
          email_service: { status: 'unhealthy', response_time_ms: 0, error_rate: 100, last_check: '', issues: ['Health check failed'] },
          database: { status: 'unhealthy', response_time_ms: 0, error_rate: 100, last_check: '', issues: ['Health check failed'] },
          voting_system: { status: 'unhealthy', response_time_ms: 0, error_rate: 100, last_check: '', issues: ['Health check failed'] },
          scheduler: { status: 'unhealthy', response_time_ms: 0, error_rate: 100, last_check: '', issues: ['Health check failed'] }
        },
        performance_summary: {
          average_response_time: 0,
          error_rate: 100,
          throughput_per_minute: 0,
          active_operations: 0
        },
        alerts: [{
          severity: 'critical',
          component: 'system',
          message: 'System health check failed',
          timestamp: new Date().toISOString(),
          resolved: false
        }]
      };
    }
  }

  /**
   * Calculate component health based on performance stats
   */
  private calculateComponentHealth(component: string, stats: PerformanceStats[]): ComponentHealth {
    const componentStats = stats.filter(s => s.component === component);
    
    if (componentStats.length === 0) {
      return {
        status: 'healthy',
        response_time_ms: 0,
        error_rate: 0,
        last_check: new Date().toISOString(),
        issues: []
      };
    }

    const avgResponseTime = componentStats.reduce((sum, s) => sum + s.average_duration_ms, 0) / componentStats.length;
    const avgErrorRate = componentStats.reduce((sum, s) => sum + s.error_rate, 0) / componentStats.length;
    const lastCheck = componentStats.reduce((latest, s) => 
      s.last_execution > latest ? s.last_execution : latest, ''
    );

    const issues: string[] = [];
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    // Check response time thresholds
    if (avgResponseTime > 10000) {
      issues.push('High response time (>10s)');
      status = 'unhealthy';
    } else if (avgResponseTime > 5000) {
      issues.push('Elevated response time (>5s)');
      if (status === 'healthy') status = 'degraded';
    }

    // Check error rate thresholds
    if (avgErrorRate > 20) {
      issues.push('High error rate (>20%)');
      status = 'unhealthy';
    } else if (avgErrorRate > 10) {
      issues.push('Elevated error rate (>10%)');
      if (status === 'healthy') status = 'degraded';
    }

    // Check for recent activity
    const lastCheckTime = new Date(lastCheck).getTime();
    const now = Date.now();
    if (now - lastCheckTime > 60 * 60 * 1000) { // No activity in last hour
      issues.push('No recent activity');
      if (status === 'healthy') status = 'degraded';
    }

    return {
      status,
      response_time_ms: Math.round(avgResponseTime),
      error_rate: Math.round(avgErrorRate * 100) / 100,
      last_check: lastCheck || new Date().toISOString(),
      issues
    };
  }

  /**
   * Generate health alerts based on component health and stats
   */
  private generateHealthAlerts(
    componentHealths: ComponentHealth[], 
    stats: PerformanceStats[]
  ): HealthAlert[] {
    const alerts: HealthAlert[] = [];
    const now = new Date().toISOString();

    // Component-specific alerts
    componentHealths.forEach((health, index) => {
      const componentNames = ['email_service', 'database', 'voting_system', 'scheduler'];
      const componentName = componentNames[index];

      if (health.status === 'unhealthy') {
        alerts.push({
          severity: 'critical',
          component: componentName,
          message: `Component is unhealthy: ${health.issues.join(', ')}`,
          timestamp: now,
          resolved: false
        });
      } else if (health.status === 'degraded') {
        alerts.push({
          severity: 'warning',
          component: componentName,
          message: `Component performance degraded: ${health.issues.join(', ')}`,
          timestamp: now,
          resolved: false
        });
      }
    });

    // System-wide alerts
    const totalErrors = stats.reduce((sum, s) => sum + s.failed_executions, 0);
    const totalExecutions = stats.reduce((sum, s) => sum + s.total_executions, 0);
    const systemErrorRate = totalExecutions > 0 ? (totalErrors / totalExecutions) * 100 : 0;

    if (systemErrorRate > 15) {
      alerts.push({
        severity: 'critical',
        component: 'system',
        message: `System-wide error rate is high: ${systemErrorRate.toFixed(1)}%`,
        timestamp: now,
        resolved: false
      });
    }

    return alerts;
  }

  /**
   * Get metric type based on component and operation
   */
  private getMetricType(component: string, operation: string): MetricType {
    if (component === 'email_service') {
      if (operation.includes('generate')) return 'email_generation';
      if (operation.includes('deliver') || operation.includes('send')) return 'email_delivery';
    }
    
    if (component === 'database') return 'database_query';
    if (component === 'voting_system') return 'voting_calculation';
    if (component === 'scheduler') return 'scheduler_job';
    if (operation.includes('template')) return 'template_rendering';
    if (operation.includes('bulk')) return 'bulk_operation';
    
    return 'api_request';
  }

  /**
   * Get current resource usage
   */
  private async getResourceUsage(): Promise<PerformanceMetric['resource_usage']> {
    try {
      // In a full implementation, this would get actual system metrics
      // For now, return simulated data
      return {
        memory_mb: Math.round(Math.random() * 100 + 50),
        cpu_percent: Math.round(Math.random() * 30 + 10),
        db_queries: Math.round(Math.random() * 5 + 1),
        api_calls: Math.round(Math.random() * 3 + 1)
      };
    } catch (error) {
      console.error('Error getting resource usage:', error);
      return {};
    }
  }

  /**
   * Start periodic metric flushing
   */
  private startPeriodicFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flushMetrics();
    }, this.flushInterval);
  }

  /**
   * Flush metrics buffer to storage
   */
  private async flushMetrics(): Promise<void> {
    if (this.metricsBuffer.length === 0) return;

    const metricsToFlush = [...this.metricsBuffer];
    this.metricsBuffer = [];

    try {
      // In a full implementation, this would batch insert to performance_metrics table
      console.log(`📊 PERFORMANCE METRICS FLUSH: ${metricsToFlush.length} metrics`);
      
      // For now, just log summary
      const summary = metricsToFlush.reduce((acc, metric) => {
        const key = `${metric.component}:${metric.operation}`;
        if (!acc[key]) {
          acc[key] = { count: 0, totalDuration: 0, errors: 0 };
        }
        acc[key].count++;
        acc[key].totalDuration += metric.duration_ms;
        if (!metric.success) acc[key].errors++;
        return acc;
      }, {} as Record<string, { count: number; totalDuration: number; errors: number }>);

      Object.entries(summary).forEach(([key, data]) => {
        const avgDuration = Math.round(data.totalDuration / data.count);
        const errorRate = Math.round((data.errors / data.count) * 100);
        console.log(`📊 ${key}: ${data.count} ops, ${avgDuration}ms avg, ${errorRate}% errors`);
      });
    } catch (error) {
      console.error('Error flushing performance metrics:', error);
      // Re-add failed metrics to buffer (with limit)
      if (this.metricsBuffer.length < this.bufferSize) {
        this.metricsBuffer.unshift(...metricsToFlush.slice(0, this.bufferSize - this.metricsBuffer.length));
      }
    }
  }

  /**
   * Cleanup resources
   */
  async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    await this.flushMetrics();
  }
}