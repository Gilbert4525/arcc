# Monitoring and Audit System Guide

## Overview

The Monitoring and Audit System provides comprehensive logging, performance monitoring, and system health tracking for the voting summary email system. It includes real-time monitoring, audit trails, performance metrics, and alerting capabilities.

## Architecture

### Core Components

1. **AuditLogger** (`/src/lib/monitoring/auditLogger.ts`)
   - Comprehensive audit logging with batching
   - Event categorization and filtering
   - Statistics and reporting
   - Automatic cleanup and retention

2. **PerformanceMonitor** (`/src/lib/monitoring/performanceMonitor.ts`)
   - Real-time performance tracking
   - Operation timing and metrics
   - System health monitoring
   - Resource usage tracking

3. **MonitoringService** (`/src/lib/monitoring/monitoringService.ts`)
   - Unified monitoring interface
   - Alert management and notifications
   - Dashboard data aggregation
   - Configuration management

4. **Admin Dashboard** (`/src/components/admin/MonitoringDashboard.tsx`)
   - Real-time monitoring interface
   - Performance visualization
   - Audit log browsing
   - Alert management

5. **API Endpoints** (`/src/app/api/admin/monitoring/route.ts`)
   - RESTful monitoring API
   - Data retrieval and control
   - Configuration management

## Features

### Audit Logging
- **Comprehensive Event Tracking**: All system events are logged with context
- **Batch Processing**: High-performance batched logging
- **Event Categorization**: Events categorized by type and severity
- **Filtering and Search**: Advanced filtering and search capabilities
- **Retention Management**: Automatic cleanup of old logs

### Performance Monitoring
- **Operation Timing**: Track duration of all operations
- **Resource Usage**: Monitor memory, CPU, and database usage
- **System Health**: Real-time health status of components
- **Performance Statistics**: Detailed performance analytics
- **Threshold Monitoring**: Automatic alerts for performance issues

### Alerting System
- **Real-time Alerts**: Immediate notifications for critical issues
- **Severity Levels**: Info, warning, error, and critical alerts
- **Alert Categories**: Performance, security, system, and business alerts
- **Notification Channels**: Email, webhook, and Slack integration
- **Alert Resolution**: Track alert resolution and response times

### Dashboard and Reporting
- **Real-time Dashboard**: Live system status and metrics
- **Historical Analysis**: Trend analysis and historical data
- **Component Health**: Individual component status monitoring
- **Performance Trends**: Performance trend analysis
- **Audit Trail**: Complete audit trail with search and filtering

## Usage

### Admin Dashboard

#### Accessing the Dashboard
1. Navigate to the admin dashboard
2. Go to "System Monitoring" section
3. Use the four tabs: Overview, Performance, Audit Logs, Alerts

#### Overview Tab
- **System Health**: Overall system status and component health
- **Key Metrics**: Response times, error rates, throughput
- **Component Status**: Individual component health indicators
- **Recent Alerts**: Latest system alerts and notifications

#### Performance Tab
- **Operation Statistics**: Detailed performance metrics per operation
- **Success Rates**: Success and failure rates for operations
- **Response Times**: Average, P95, and P99 response times
- **Throughput**: Operations per hour and minute

#### Audit Logs Tab
- **Event Summary**: Total events and success rates
- **Event Types**: Breakdown by event type
- **Top Users**: Most active users in the system
- **Timeline**: Event timeline and trends

#### Alerts Tab
- **Active Alerts**: Current unresolved alerts
- **Alert History**: Historical alert data
- **Alert Resolution**: Mark alerts as resolved
- **Alert Details**: Detailed alert information

### API Usage

#### Get Monitoring Dashboard

**Endpoint**: `GET /api/admin/monitoring?action=dashboard`

**Response**:
```json
{
  "success": true,
  "data": {
    "system_health": {
      "overall_health": "healthy",
      "components": {
        "email_service": {
          "status": "healthy",
          "response_time_ms": 1250,
          "error_rate": 2.1,
          "last_check": "2024-01-15T10:30:00Z",
          "issues": []
        }
      },
      "performance_summary": {
        "average_response_time": 1346,
        "error_rate": 2.2,
        "throughput_per_minute": 45,
        "active_operations": 3
      }
    },
    "audit_summary": {
      "total_events": 1247,
      "success_rate": 96.8,
      "error_rate": 3.2
    },
    "alerts": []
  }
}
```

#### Get System Health

**Endpoint**: `GET /api/admin/monitoring?action=health`

**Response**:
```json
{
  "success": true,
  "data": {
    "overall_health": "healthy",
    "components": {
      "email_service": {
        "status": "healthy",
        "response_time_ms": 1250,
        "error_rate": 2.1,
        "issues": []
      }
    },
    "alerts": []
  }
}
```

#### Get Performance Statistics

**Endpoint**: `GET /api/admin/monitoring?action=performance&component=email_service&hours=24`

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "component": "email_service",
      "operation": "generate_email",
      "total_executions": 456,
      "success_rate": 97.6,
      "average_duration_ms": 1250,
      "p95_duration_ms": 2100,
      "error_rate": 2.4
    }
  ]
}
```

#### Get Audit Logs

**Endpoint**: `GET /api/admin/monitoring?action=audit&limit=50&offset=0`

**Response**:
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "audit_123",
        "timestamp": "2024-01-15T10:30:00Z",
        "event_type": "email_sent",
        "user_name": "Admin User",
        "resource_type": "resolution",
        "resource_id": "res_123",
        "action": "send_email",
        "success": true,
        "details": {
          "recipients_count": 10,
          "successful_deliveries": 9
        }
      }
    ],
    "total": 1247,
    "has_more": true
  }
}
```

#### Log Manual Trigger

**Endpoint**: `POST /api/admin/monitoring`

**Request Body**:
```json
{
  "action": "log_manual_trigger",
  "trigger_action": "send_voting_summary",
  "resource_type": "resolution",
  "resource_id": "res_123",
  "details": {
    "forced": true,
    "recipients_count": 10
  },
  "success": true,
  "execution_time": 2500
}
```

#### Record Performance Metric

**Endpoint**: `POST /api/admin/monitoring`

**Request Body**:
```json
{
  "action": "record_performance",
  "metric_type": "email_generation",
  "duration": 1250,
  "success": true,
  "details": {
    "email_type": "voting_summary",
    "recipients_count": 10,
    "template_size": 15000
  }
}
```

### Programmatic Usage

#### Initialize Monitoring Service

```typescript
import { MonitoringService } from '@/lib/monitoring/monitoringService';

const monitoring = new MonitoringService(supabase, {
  audit_retention_days: 90,
  performance_retention_days: 30,
  alert_thresholds: {
    response_time_warning: 5000,
    response_time_critical: 10000,
    error_rate_warning: 10,
    error_rate_critical: 20
  }
});
```

#### Log Events

```typescript
// Log voting completion
await monitoring.logVotingCompletion(
  userId,
  userEmail,
  userName,
  'resolution',
  resolutionId,
  {
    completion_reason: 'all_voted',
    total_votes: 10,
    total_eligible: 12,
    participation_rate: 83.3,
    outcome: 'passed',
    email_triggered: true
  }
);

// Log email sending
await monitoring.logEmailSent(
  userId,
  userEmail,
  userName,
  'resolution',
  resolutionId,
  {
    email_type: 'voting_summary',
    recipients_count: 10,
    successful_deliveries: 9,
    failed_deliveries: 1,
    delivery_time_ms: 2500,
    bounce_rate: 10,
    trigger_type: 'automatic'
  }
);

// Log system error
await monitoring.logSystemError(
  new Error('Database connection failed'),
  {
    component: 'database',
    function: 'getVotingData',
    resource_type: 'resolution',
    resource_id: resolutionId
  },
  'critical'
);
```

#### Track Performance

```typescript
// Start operation tracking
const operationId = 'email_gen_' + Date.now();
monitoring.startOperation(operationId, 'email_service', 'generate_email', {
  recipients_count: 10
});

try {
  // Perform operation
  await generateEmail();
  
  // End successful operation
  await monitoring.endOperation(operationId, true);
} catch (error) {
  // End failed operation
  await monitoring.endOperation(operationId, false, error.message);
}

// Record specific metrics
await monitoring.recordEmailGeneration(
  1250, // duration in ms
  true, // success
  {
    email_type: 'voting_summary',
    recipients_count: 10,
    template_size: 15000
  }
);
```

#### Get Monitoring Data

```typescript
// Get dashboard data
const dashboard = await monitoring.getMonitoringDashboard();

// Get system health
const health = await monitoring.getSystemHealth();

// Get performance statistics
const stats = await monitoring.getPerformanceStats('email_service', undefined, 24);

// Get audit logs
const logs = await monitoring.getAuditLogs({
  event_types: ['email_sent', 'voting_completion'],
  limit: 50,
  sort_by: 'timestamp',
  sort_order: 'desc'
});
```

## Configuration

### Monitoring Configuration

```typescript
interface MonitoringConfig {
  audit_retention_days: number;        // Audit log retention (default: 90)
  performance_retention_days: number;  // Performance metric retention (default: 30)
  alert_thresholds: {
    response_time_warning: number;      // Warning threshold in ms (default: 5000)
    response_time_critical: number;     // Critical threshold in ms (default: 10000)
    error_rate_warning: number;         // Warning error rate % (default: 10)
    error_rate_critical: number;        // Critical error rate % (default: 20)
    email_delivery_warning: number;     // Warning delivery rate % (default: 85)
    email_delivery_critical: number;    // Critical delivery rate % (default: 70)
  };
  notification_settings: {
    email_alerts: boolean;              // Enable email notifications
    webhook_url?: string;               // Webhook URL for alerts
    slack_webhook?: string;             // Slack webhook URL
  };
}
```

### Alert Thresholds

Configure when alerts are triggered:

- **Response Time**: Alerts when operations exceed time thresholds
- **Error Rate**: Alerts when error rates exceed percentage thresholds
- **Email Delivery**: Alerts when email delivery rates drop below thresholds
- **System Health**: Alerts when components become unhealthy

### Retention Policies

- **Audit Logs**: Configurable retention period (default: 90 days)
- **Performance Metrics**: Configurable retention period (default: 30 days)
- **Alerts**: Automatic cleanup of resolved alerts after 30 days

## Event Types

### Audit Event Types

- **voting_completion**: Voting process completion events
- **email_sent**: Email sending success events
- **email_failed**: Email sending failure events
- **manual_trigger**: Manual admin actions
- **scheduler_run**: Scheduled job executions
- **preference_update**: User preference changes
- **recipient_update**: Recipient management changes
- **system_error**: System error events
- **authentication**: Login/logout events
- **authorization**: Access control events
- **data_access**: Data access events
- **configuration_change**: System configuration changes

### Performance Metric Types

- **email_generation**: Email template generation performance
- **email_delivery**: Email delivery performance
- **database_query**: Database query performance
- **api_request**: API request performance
- **voting_calculation**: Voting statistics calculation performance
- **template_rendering**: Template rendering performance
- **bulk_operation**: Bulk operation performance
- **scheduler_job**: Scheduled job performance
- **system_health**: System health check performance

## Monitoring Best Practices

### Logging Guidelines

1. **Log All Critical Events**: Ensure all important system events are logged
2. **Include Context**: Provide sufficient context for troubleshooting
3. **Use Appropriate Severity**: Choose correct severity levels
4. **Batch for Performance**: Use batching for high-volume logging
5. **Regular Cleanup**: Implement retention policies

### Performance Monitoring

1. **Track Key Operations**: Monitor all critical system operations
2. **Set Realistic Thresholds**: Configure appropriate alert thresholds
3. **Monitor Trends**: Look for performance trends over time
4. **Resource Monitoring**: Track system resource usage
5. **Regular Review**: Regularly review performance metrics

### Alert Management

1. **Prioritize Alerts**: Focus on critical and high-impact alerts
2. **Avoid Alert Fatigue**: Don't create too many low-priority alerts
3. **Quick Resolution**: Resolve alerts promptly
4. **Root Cause Analysis**: Investigate recurring alerts
5. **Documentation**: Document alert resolution procedures

## Troubleshooting

### Common Issues

1. **High Memory Usage**
   - Check batch sizes in audit logger
   - Review retention policies
   - Monitor for memory leaks

2. **Performance Degradation**
   - Check alert thresholds
   - Review system resource usage
   - Analyze performance trends

3. **Missing Audit Logs**
   - Verify logging is enabled
   - Check batch flushing
   - Review error logs

4. **Alert Spam**
   - Adjust alert thresholds
   - Review alert conditions
   - Implement alert grouping

### Debugging Tools

1. **Health Check Endpoint**: `/api/admin/monitoring?action=health_check`
2. **System Status**: Real-time system health monitoring
3. **Performance Metrics**: Detailed operation performance data
4. **Audit Trail**: Complete event history
5. **Alert History**: Historical alert data

## Security Considerations

### Access Control
- **Admin Only**: All monitoring endpoints require admin access
- **Audit Trail**: All access is logged for compliance
- **Data Privacy**: Sensitive data is protected in logs

### Data Protection
- **Encryption**: Audit logs are encrypted at rest
- **Access Logging**: All monitoring access is logged
- **Retention Limits**: Automatic cleanup of old data
- **Secure Transmission**: All data transmitted over HTTPS

## Integration

### With Existing Systems
- **Voting System**: Automatic logging of voting events
- **Email Service**: Performance monitoring of email operations
- **Database**: Query performance monitoring
- **Scheduler**: Job execution monitoring

### External Integrations
- **Webhook Notifications**: Send alerts to external systems
- **Slack Integration**: Real-time alerts in Slack channels
- **Email Notifications**: Email alerts for critical issues
- **Metrics Export**: Export metrics to external monitoring systems

## Maintenance

### Regular Tasks

1. **Log Cleanup**: Automatic cleanup based on retention policies
2. **Performance Review**: Regular review of system performance
3. **Alert Review**: Review and tune alert thresholds
4. **Health Checks**: Regular system health verification
5. **Configuration Updates**: Update monitoring configuration as needed

### Maintenance API

```bash
# Perform system maintenance
curl -X POST /api/admin/monitoring \
  -H "Content-Type: application/json" \
  -d '{"action": "maintenance"}'

# Update configuration
curl -X POST /api/admin/monitoring \
  -H "Content-Type: application/json" \
  -d '{
    "action": "update_config",
    "config": {
      "alert_thresholds": {
        "response_time_warning": 6000
      }
    }
  }'
```

## Support

For monitoring system issues:

1. **Admin Dashboard**: Use the monitoring dashboard for real-time status
2. **Health Check**: Use the health check endpoint for system status
3. **API Documentation**: Reference API endpoints for integration
4. **Logs**: Check application logs for detailed error information
5. **Alerts**: Monitor system alerts for proactive issue detection