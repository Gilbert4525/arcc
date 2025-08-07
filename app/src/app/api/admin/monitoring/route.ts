import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { MonitoringService } from '@/lib/monitoring/monitoringService';

// Global monitoring service instance
let globalMonitoringService: MonitoringService | null = null;

/**
 * GET /api/admin/monitoring
 * Get monitoring dashboard data
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Check if user is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Initialize monitoring service if not exists
    if (!globalMonitoringService) {
      globalMonitoringService = new MonitoringService(supabase);
    }

    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    const component = url.searchParams.get('component');
    const hours = parseInt(url.searchParams.get('hours') || '24');

    switch (action) {
      case 'dashboard':
        const dashboard = await globalMonitoringService.getMonitoringDashboard();
        return NextResponse.json({
          success: true,
          data: dashboard
        });

      case 'health':
        const health = await globalMonitoringService.getSystemHealth();
        return NextResponse.json({
          success: true,
          data: health
        });

      case 'performance':
        const performance = await globalMonitoringService.getPerformanceStats(component || undefined, undefined, hours);
        return NextResponse.json({
          success: true,
          data: performance
        });

      case 'audit':
        const limit = parseInt(url.searchParams.get('limit') || '50');
        const offset = parseInt(url.searchParams.get('offset') || '0');
        const eventTypes = url.searchParams.get('event_types')?.split(',');
        const severity = url.searchParams.get('severity')?.split(',');
        
        const auditLogs = await globalMonitoringService.getAuditLogs({
          event_types: eventTypes as any,
          severity,
          limit,
          offset,
          sort_by: 'timestamp',
          sort_order: 'desc'
        });
        
        return NextResponse.json({
          success: true,
          data: auditLogs
        });

      case 'alerts':
        const activeOnly = url.searchParams.get('active_only') === 'true';
        const alerts = activeOnly 
          ? globalMonitoringService.getActiveAlerts()
          : globalMonitoringService.getAllAlerts();
        
        return NextResponse.json({
          success: true,
          data: alerts
        });

      case 'health_check':
        const healthCheck = await globalMonitoringService.healthCheck();
        return NextResponse.json({
          success: true,
          data: healthCheck
        });

      default:
        // Default: return dashboard data
        const defaultDashboard = await globalMonitoringService.getMonitoringDashboard();
        return NextResponse.json({
          success: true,
          data: defaultDashboard
        });
    }
  } catch (error) {
    console.error('Error in monitoring GET:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get monitoring data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/monitoring
 * Control monitoring operations and log events
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Check if user is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Initialize monitoring service if not exists
    if (!globalMonitoringService) {
      globalMonitoringService = new MonitoringService(supabase);
    }

    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case 'log_manual_trigger':
        await globalMonitoringService.logManualTrigger(
          user.id,
          user.email || '',
          profile.full_name || 'Admin',
          params.trigger_action,
          params.resource_type,
          params.resource_id,
          params.details,
          params.success,
          params.error_message,
          params.execution_time
        );
        
        return NextResponse.json({
          success: true,
          message: 'Manual trigger logged successfully'
        });

      case 'log_email_sent':
        await globalMonitoringService.logEmailSent(
          user.id,
          user.email || '',
          profile.full_name || 'Admin',
          params.resource_type,
          params.resource_id,
          params.details,
          params.success,
          params.error_message
        );
        
        return NextResponse.json({
          success: true,
          message: 'Email event logged successfully'
        });

      case 'resolve_alert':
        const resolved = await globalMonitoringService.resolveAlert(params.alert_id);
        
        return NextResponse.json({
          success: resolved,
          message: resolved ? 'Alert resolved successfully' : 'Alert not found or already resolved'
        });

      case 'update_config':
        globalMonitoringService.updateConfig(params.config);
        
        return NextResponse.json({
          success: true,
          message: 'Monitoring configuration updated'
        });

      case 'maintenance':
        const maintenanceResult = await globalMonitoringService.performMaintenance();
        
        return NextResponse.json({
          success: true,
          message: 'Maintenance completed successfully',
          data: maintenanceResult
        });

      case 'record_performance':
        if (params.metric_type === 'email_generation') {
          await globalMonitoringService.recordEmailGeneration(
            params.duration,
            params.success,
            params.details,
            params.error_message
          );
        } else if (params.metric_type === 'email_delivery') {
          await globalMonitoringService.recordEmailDelivery(
            params.duration,
            params.success,
            params.details,
            params.error_message
          );
        } else if (params.metric_type === 'database_query') {
          await globalMonitoringService.recordDatabaseQuery(
            params.duration,
            params.success,
            params.details,
            params.error_message
          );
        } else if (params.metric_type === 'voting_calculation') {
          await globalMonitoringService.recordVotingCalculation(
            params.duration,
            params.success,
            params.details,
            params.error_message
          );
        }
        
        return NextResponse.json({
          success: true,
          message: 'Performance metric recorded successfully'
        });

      case 'start_operation':
        globalMonitoringService.startOperation(
          params.operation_id,
          params.component,
          params.operation,
          params.metadata
        );
        
        return NextResponse.json({
          success: true,
          message: 'Operation tracking started'
        });

      case 'end_operation':
        await globalMonitoringService.endOperation(
          params.operation_id,
          params.success,
          params.error_message,
          params.additional_metadata
        );
        
        return NextResponse.json({
          success: true,
          message: 'Operation tracking completed'
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error in monitoring POST:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process monitoring request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/monitoring
 * Cleanup and shutdown monitoring service
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Check if user is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    if (globalMonitoringService) {
      await globalMonitoringService.shutdown();
      globalMonitoringService = null;
    }

    return NextResponse.json({
      success: true,
      message: 'Monitoring service shutdown completed'
    });
  } catch (error) {
    console.error('Error in monitoring DELETE:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to shutdown monitoring service',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}