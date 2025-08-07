import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { VotingSummaryEmailService } from '@/lib/email/votingSummaryService';

/**
 * POST /api/admin/manual-voting-summary
 * Manually trigger voting summary emails for specific items
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

    const body = await request.json();
    const { type, itemId, force = false } = body;

    // Validate input
    if (!type || !itemId) {
      return NextResponse.json(
        { success: false, error: 'type and itemId are required' },
        { status: 400 }
      );
    }

    if (!['resolution', 'minutes'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'type must be "resolution" or "minutes"' },
        { status: 400 }
      );
    }

    console.log(`📧 Manual voting summary email triggered by ${profile.full_name} for ${type}: ${itemId}`);

    // Check if item exists and get its current status
    const itemStatus = await checkItemStatus(supabase, type, itemId);
    if (!itemStatus.exists) {
      return NextResponse.json(
        { success: false, error: `${type} not found` },
        { status: 404 }
      );
    }

    // Check if email should be sent based on status
    if (!force && !shouldSendEmail(itemStatus.status || '')) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Cannot send email for ${type} with status "${itemStatus.status}". Use force=true to override.`,
          itemStatus: itemStatus.status
        },
        { status: 400 }
      );
    }

    // Check for duplicate email prevention
    const duplicateCheck = await checkForRecentEmail(supabase, type, itemId);
    if (!force && duplicateCheck.recentEmailSent) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Email already sent recently for this ${type}. Use force=true to override.`,
          lastEmailSent: duplicateCheck.lastEmailTime
        },
        { status: 409 }
      );
    }

    // Initialize email service and send summary
    const emailService = new VotingSummaryEmailService(supabase);
    let emailSent = false;
    let emailError = null;

    try {
      if (type === 'resolution') {
        emailSent = await emailService.sendResolutionVotingSummary(itemId);
      } else {
        emailSent = await emailService.sendMinutesVotingSummary(itemId);
      }
    } catch (error) {
      emailError = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error sending manual voting summary email:`, error);
    }

    // Log the manual trigger attempt
    await logManualTrigger(supabase, {
      userId: user.id,
      userName: profile.full_name || '',
      userEmail: user.email || '',
      type,
      itemId,
      itemTitle: itemStatus.title,
      itemStatus: itemStatus.status,
      force,
      emailSent,
      emailError,
      timestamp: new Date().toISOString()
    });

    if (emailSent) {
      return NextResponse.json({
        success: true,
        message: `Voting summary email sent successfully for ${type}: ${itemStatus.title}`,
        data: {
          type,
          itemId,
          itemTitle: itemStatus.title,
          itemStatus: itemStatus.status,
          triggeredBy: profile.full_name,
          timestamp: new Date().toISOString(),
          forced: force
        }
      });
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: `Failed to send voting summary email: ${emailError || 'Unknown error'}`,
          data: {
            type,
            itemId,
            itemTitle: itemStatus.title,
            itemStatus: itemStatus.status,
            triggeredBy: profile.full_name,
            timestamp: new Date().toISOString(),
            forced: force
          }
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in manual voting summary trigger:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to trigger manual voting summary',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/manual-voting-summary
 * Get information about items available for manual email triggering
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

    const url = new URL(request.url);
    const type = url.searchParams.get('type');
    const status = url.searchParams.get('status');

    // Get available items for manual email triggering
    const availableItems = await getAvailableItems(supabase, type, status);

    return NextResponse.json({
      success: true,
      data: availableItems
    });
  } catch (error) {
    console.error('Error getting available items:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get available items',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Check if an item exists and get its status
 */
async function checkItemStatus(
  supabase: any, 
  type: string, 
  itemId: string
): Promise<{ exists: boolean; status?: string; title?: string }> {
  try {
    if (type === 'resolution') {
      const { data: resolution, error } = await supabase
        .from('resolutions')
        .select('id, title, status')
        .eq('id', itemId)
        .single();

      if (error || !resolution) {
        return { exists: false };
      }

      return {
        exists: true,
        status: resolution.status,
        title: resolution.title
      };
    } else {
      const { data: minutes, error } = await supabase
        .from('minutes')
        .select('id, title, status')
        .eq('id', itemId)
        .single();

      if (error || !minutes) {
        return { exists: false };
      }

      return {
        exists: true,
        status: minutes.status,
        title: minutes.title
      };
    }
  } catch (error) {
    console.error('Error checking item status:', error);
    return { exists: false };
  }
}

/**
 * Determine if email should be sent based on item status
 */
function shouldSendEmail(status: string): boolean {
  // Allow emails for completed voting statuses
  const allowedStatuses = [
    'approved', 'rejected', 'failed', 'passed', 
    'voting', // Allow for testing or urgent cases
    'expired'
  ];
  
  return allowedStatuses.includes(status);
}

/**
 * Check for recent email sends to prevent duplicates
 */
async function checkForRecentEmail(
  supabase: any, 
  type: string, 
  itemId: string
): Promise<{ recentEmailSent: boolean; lastEmailTime?: string }> {
  try {
    // This would typically check an email_log table
    // For now, we'll implement a basic check based on audit logs or timestamps
    
    // Check if there's been a recent manual trigger (within last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    // In a full implementation, this would check a dedicated email log table
    // For now, we'll be permissive and allow re-sending
    return { recentEmailSent: false };
  } catch (error) {
    console.error('Error checking for recent emails:', error);
    return { recentEmailSent: false };
  }
}

/**
 * Get available items for manual email triggering
 */
async function getAvailableItems(
  supabase: any, 
  type?: string | null, 
  status?: string | null
): Promise<{
  resolutions: Array<{ id: string; title: string; status: string; created_at: string }>;
  minutes: Array<{ id: string; title: string; status: string; created_at: string }>;
}> {
  try {
    const result = {
      resolutions: [] as Array<{ id: string; title: string; status: string; created_at: string }>,
      minutes: [] as Array<{ id: string; title: string; status: string; created_at: string }>
    };

    // Get resolutions if requested or no specific type
    if (!type || type === 'resolution') {
      let query = supabase
        .from('resolutions')
        .select('id, title, status, created_at')
        .order('created_at', { ascending: false })
        .limit(50);

      if (status) {
        query = query.eq('status', status);
      }

      const { data: resolutions, error: resolutionError } = await query;
      
      if (!resolutionError && resolutions) {
        result.resolutions = resolutions;
      }
    }

    // Get minutes if requested or no specific type
    if (!type || type === 'minutes') {
      let query = supabase
        .from('minutes')
        .select('id, title, status, created_at')
        .order('created_at', { ascending: false })
        .limit(50);

      if (status) {
        query = query.eq('status', status);
      }

      const { data: minutes, error: minutesError } = await query;
      
      if (!minutesError && minutes) {
        result.minutes = minutes;
      }
    }

    return result;
  } catch (error) {
    console.error('Error getting available items:', error);
    return { resolutions: [], minutes: [] };
  }
}

/**
 * Log manual trigger attempt for audit purposes
 */
async function logManualTrigger(supabase: any, logData: {
  userId: string;
  userName: string;
  userEmail: string;
  type: string;
  itemId: string;
  itemTitle?: string;
  itemStatus?: string;
  force: boolean;
  emailSent: boolean;
  emailError?: string | null;
  timestamp: string;
}): Promise<void> {
  try {
    const auditEntry = {
      timestamp: logData.timestamp,
      action: 'manual_voting_summary_email',
      userId: logData.userId,
      userName: logData.userName,
      userEmail: logData.userEmail,
      details: {
        type: logData.type,
        itemId: logData.itemId,
        itemTitle: logData.itemTitle,
        itemStatus: logData.itemStatus,
        force: logData.force,
        emailSent: logData.emailSent,
        emailError: logData.emailError
      }
    };

    console.log('📋 Manual voting summary trigger logged:', auditEntry);
    
    // In a future implementation, this could be stored in a dedicated audit table
    // For now, we're logging to console for debugging and monitoring
  } catch (error) {
    console.error('Error logging manual trigger:', error);
  }
}