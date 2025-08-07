'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Database, 
  Mail, 
  RefreshCw, 
  Server, 
  TrendingUp,
  Users,
  Zap,
  BarChart3,
  Shield,
  Bell,
  Eye
} from 'lucide-react';

interface SystemHealth {
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

interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  response_time_ms: number;
  error_rate: number;
  last_check: string;
  issues: string[];
}

interface HealthAlert {
  severity: 'info' | 'warning' | 'critical';
  component: string;
  message: string;
  timestamp: string;
  resolved: boolean;
}

interface AuditSummary {
  total_events: number;
  events_by_type: Record<string, number>;
  events_by_severity: Record<string, number>;
  success_rate: number;
  error_rate: number;
  top_users: Array<{ user_id: string; user_name: string; event_count: number }>;
  timeline: Array<{ date: string; event_count: number; error_count: number }>;
}

interface PerformanceStats {
  component: string;
  operation: string;
  total_executions: number;
  successful_executions: number;
  failed_executions: number;
  success_rate: number;
  average_duration_ms: number;
  p95_duration_ms: number;
  executions_per_hour: number;
  error_rate: number;
}

interface MonitoringAlert {
  id: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  category: 'performance' | 'security' | 'system' | 'business';
  title: string;
  message: string;
  component: string;
  timestamp: string;
  resolved: boolean;
}

export default function MonitoringDashboard() {
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [auditSummary, setAuditSummary] = useState<AuditSummary | null>(null);
  const [performanceStats, setPerformanceStats] = useState<PerformanceStats[]>([]);
  const [alerts, setAlerts] = useState<MonitoringAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch monitoring data
  const fetchMonitoringData = async () => {
    setLoading(true);
    try {
      // In a real implementation, these would be API calls
      // For now, we'll simulate the data structure
      const mockSystemHealth: SystemHealth = {
        overall_health: 'healthy',
        components: {
          email_service: {
            status: 'healthy',
            response_time_ms: 1250,
            error_rate: 2.1,
            last_check: new Date().toISOString(),
            issues: []
          },
          database: {
            status: 'healthy',
            response_time_ms: 45,
            error_rate: 0.5,
            last_check: new Date().toISOString(),
            issues: []
          },
          voting_system: {
            status: 'degraded',
            response_time_ms: 3200,
            error_rate: 5.2,
            last_check: new Date().toISOString(),
            issues: ['Elevated response time']
          },
          scheduler: {
            status: 'healthy',
            response_time_ms: 890,
            error_rate: 1.0,
            last_check: new Date().toISOString(),
            issues: []
          }
        },
        performance_summary: {
          average_response_time: 1346,
          error_rate: 2.2,
          throughput_per_minute: 45,
          active_operations: 3
        },
        alerts: [
          {
            severity: 'warning',
            component: 'voting_system',
            message: 'Response time elevated above normal',
            timestamp: new Date().toISOString(),
            resolved: false
          }
        ]
      };

      const mockAuditSummary: AuditSummary = {
        total_events: 1247,
        events_by_type: {
          'email_sent': 456,
          'voting_completion': 123,
          'manual_trigger': 45,
          'scheduler_run': 234,
          'system_error': 12
        },
        events_by_severity: {
          'info': 1100,
          'warning': 89,
          'error': 45,
          'critical': 13
        },
        success_rate: 96.8,
        error_rate: 3.2,
        top_users: [
          { user_id: '1', user_name: 'Admin User', event_count: 234 },
          { user_id: '2', user_name: 'John Smith', event_count: 156 },
          { user_id: '3', user_name: 'Jane Doe', event_count: 89 }
        ],
        timeline: [
          { date: '2024-01-10', event_count: 145, error_count: 5 },
          { date: '2024-01-11', event_count: 167, error_count: 8 },
          { date: '2024-01-12', event_count: 189, error_count: 3 },
          { date: '2024-01-13', event_count: 156, error_count: 12 },
          { date: '2024-01-14', event_count: 178, error_count: 7 }
        ]
      };

      const mockPerformanceStats: PerformanceStats[] = [
        {
          component: 'email_service',
          operation: 'generate_email',
          total_executions: 456,
          successful_executions: 445,
          failed_executions: 11,
          success_rate: 97.6,
          average_duration_ms: 1250,
          p95_duration_ms: 2100,
          executions_per_hour: 19,
          error_rate: 2.4
        },
        {
          component: 'voting_system',
          operation: 'calculate_statistics',
          total_executions: 234,
          successful_executions: 222,
          failed_executions: 12,
          success_rate: 94.9,
          average_duration_ms: 3200,
          p95_duration_ms: 5600,
          executions_per_hour: 9.8,
          error_rate: 5.1
        }
      ];

      const mockAlerts: MonitoringAlert[] = [
        {
          id: '1',
          severity: 'warning',
          category: 'performance',
          title: 'Elevated Response Time',
          message: 'Voting system response time is above normal thresholds',
          component: 'voting_system',
          timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          resolved: false
        },
        {
          id: '2',
          severity: 'info',
          category: 'system',
          title: 'Scheduled Maintenance',
          message: 'System maintenance completed successfully',
          component: 'system',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          resolved: true
        }
      ];

      setSystemHealth(mockSystemHealth);
      setAuditSummary(mockAuditSummary);
      setPerformanceStats(mockPerformanceStats);
      setAlerts(mockAlerts);
      setMessage({ type: 'success', text: 'Monitoring data refreshed' });
    } catch (error) {
      console.error('Error fetching monitoring data:', error);
      setMessage({ type: 'error', text: 'Failed to load monitoring data' });
    } finally {
      setLoading(false);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'degraded': return 'text-yellow-600';
      case 'unhealthy': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  // Get status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'healthy': return 'default';
      case 'degraded': return 'secondary';
      case 'unhealthy': return 'destructive';
      default: return 'outline';
    }
  };

  // Get severity badge variant
  const getSeverityBadgeVariant = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'error': return 'destructive';
      case 'warning': return 'secondary';
      case 'info': return 'outline';
      default: return 'outline';
    }
  };

  // Auto-refresh effect
  useEffect(() => {
    fetchMonitoringData();
    
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(fetchMonitoringData, 30000); // Refresh every 30 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">System Monitoring</h2>
          <p className="text-muted-foreground">
            Real-time system health, performance metrics, and audit logs
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Activity className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-pulse' : ''}`} />
            Auto-refresh {autoRefresh ? 'On' : 'Off'}
          </Button>
          <Button 
            variant="outline" 
            onClick={fetchMonitoringData}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {message && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">
            <BarChart3 className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="performance">
            <TrendingUp className="h-4 w-4 mr-2" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="audit">
            <Shield className="h-4 w-4 mr-2" />
            Audit Logs
          </TabsTrigger>
          <TabsTrigger value="alerts">
            <Bell className="h-4 w-4 mr-2" />
            Alerts
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {/* System Health Overview */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">System Health</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  {systemHealth?.overall_health === 'healthy' ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : systemHealth?.overall_health === 'degraded' ? (
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  )}
                  <span className={`font-medium capitalize ${getStatusColor(systemHealth?.overall_health || '')}`}>
                    {systemHealth?.overall_health || 'Unknown'}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Response Time */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {systemHealth?.performance_summary.average_response_time || 0}ms
                </div>
                <p className="text-xs text-muted-foreground">
                  Across all components
                </p>
              </CardContent>
            </Card>

            {/* Error Rate */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {systemHealth?.performance_summary.error_rate || 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Last 24 hours
                </p>
              </CardContent>
            </Card>

            {/* Active Operations */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Active Operations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {systemHealth?.performance_summary.active_operations || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Currently running
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Component Health */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Component Health</CardTitle>
              <CardDescription>
                Status and performance of system components
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {systemHealth && Object.entries(systemHealth.components).map(([name, health]) => (
                  <div key={name} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {name === 'email_service' && <Mail className="h-5 w-5" />}
                      {name === 'database' && <Database className="h-5 w-5" />}
                      {name === 'voting_system' && <Users className="h-5 w-5" />}
                      {name === 'scheduler' && <Clock className="h-5 w-5" />}
                      <div>
                        <div className="font-medium capitalize">
                          {name.replace('_', ' ')}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {health.response_time_ms}ms • {health.error_rate}% errors
                        </div>
                      </div>
                    </div>
                    <Badge variant={getStatusBadgeVariant(health.status)}>
                      {health.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Alerts */}
          {alerts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Alerts</CardTitle>
                <CardDescription>
                  Latest system alerts and notifications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {alerts.slice(0, 5).map((alert) => (
                    <div key={alert.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Badge variant={getSeverityBadgeVariant(alert.severity)}>
                          {alert.severity}
                        </Badge>
                        <div>
                          <div className="font-medium">{alert.title}</div>
                          <div className="text-sm text-muted-foreground">{alert.message}</div>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(alert.timestamp)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Performance Statistics</CardTitle>
              <CardDescription>
                Detailed performance metrics for system operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {performanceStats.map((stat, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="font-medium">
                          {stat.component} • {stat.operation}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {stat.total_executions} executions • {stat.executions_per_hour.toFixed(1)}/hour
                        </div>
                      </div>
                      <Badge variant={stat.success_rate >= 95 ? 'default' : stat.success_rate >= 90 ? 'secondary' : 'destructive'}>
                        {stat.success_rate.toFixed(1)}% success
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Avg Duration</div>
                        <div className="font-medium">{stat.average_duration_ms}ms</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">P95 Duration</div>
                        <div className="font-medium">{stat.p95_duration_ms}ms</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Error Rate</div>
                        <div className="font-medium">{stat.error_rate.toFixed(1)}%</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Failed</div>
                        <div className="font-medium">{stat.failed_executions}</div>
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Success Rate</span>
                        <span>{stat.success_rate.toFixed(1)}%</span>
                      </div>
                      <Progress value={stat.success_rate} className="h-2" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Tab */}
        <TabsContent value="audit">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Events</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {auditSummary?.total_events || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Last 7 days
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {auditSummary?.success_rate.toFixed(1) || 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Event success rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {auditSummary?.error_rate.toFixed(1) || 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Event error rate
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Events by Type */}
            <Card>
              <CardHeader>
                <CardTitle>Events by Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {auditSummary && Object.entries(auditSummary.events_by_type).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-sm capitalize">{type.replace('_', ' ')}</span>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Users */}
            <Card>
              <CardHeader>
                <CardTitle>Top Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {auditSummary?.top_users.map((user, index) => (
                    <div key={user.user_id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">#{index + 1}</span>
                        <span className="text-sm">{user.user_name}</span>
                      </div>
                      <Badge variant="outline">{user.event_count} events</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle>System Alerts</CardTitle>
              <CardDescription>
                All system alerts and notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alerts.map((alert) => (
                  <div key={alert.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <Badge variant={getSeverityBadgeVariant(alert.severity)}>
                          {alert.severity}
                        </Badge>
                        <div>
                          <div className="font-medium">{alert.title}</div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {alert.message}
                          </div>
                          <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                            <span>Component: {alert.component}</span>
                            <span>Category: {alert.category}</span>
                            <span>{formatDate(alert.timestamp)}</span>
                          </div>
                        </div>
                      </div>
                      <Badge variant={alert.resolved ? 'default' : 'destructive'}>
                        {alert.resolved ? 'Resolved' : 'Active'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>

              {alerts.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No alerts to display.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}