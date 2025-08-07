import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { VotingSummaryEmailService } from '@/lib/email/votingSummaryService';

/**
 * POST /api/admin/test-voting-email
 * Test and preview voting summary email generation
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
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
    const { type, itemId, action = 'preview' } = body;

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

    if (!['preview', 'test_send'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'action must be "preview" or "test_send"' },
        { status: 400 }
      );
    }

    console.log(`🧪 Email test requested by ${profile.full_name} for ${type}: ${itemId} (${action})`);

    // Initialize email service
    const emailService = new VotingSummaryEmailService(supabase);

    try {
      // Generate voting summary data
      const summaryData = await emailService.generateVotingSummaryData(type, itemId);
      
      if (!summaryData) {
        return NextResponse.json(
          { success: false, error: `Failed to generate summary data for ${type}` },
          { status: 404 }
        );
      }

      if (action === 'preview') {
        // Generate email preview
        const emailPreview = emailService.generateEmailPreview(summaryData, type);
        
        return NextResponse.json({
          success: true,
          message: `Email preview generated for ${type}: ${summaryData.item.title || 'Unknown'}`,
          data: {
            type,
            itemId,
            itemTitle: summaryData.item.title || 'Unknown',
            preview: emailPreview,
            summaryStats: {
              totalVotes: summaryData.statistics.totalVotes,
              totalEligibleVoters: summaryData.statistics.totalEligibleVoters,
              participationRate: summaryData.statistics.participationRate,
              approvalPercentage: summaryData.statistics.approvalPercentage,
              passed: summaryData.outcome.passed,
              nonVotersCount: summaryData.nonVoters.length
            },
            generatedBy: profile.full_name,
            timestamp: new Date().toISOString()
          }
        });
      } else if (action === 'test_send') {
        // Send test email to the requesting admin only
        const testRecipient = {
          id: user.id,
          full_name: profile.full_name,
          email: user.email || '',
          position: 'Admin (Test)'
        };

        // Generate email template
        const emailService = new VotingSummaryEmailService(supabase);
        const emailTemplate = emailService.generateEmailPreview(summaryData, type);

        // Send test email using the existing email service
        const { EmailNotificationService } = await import('@/lib/email/notifications');
        const notificationService = new EmailNotificationService();

        const testEmailSent = await notificationService.sendNotificationEmail({
          userEmail: testRecipient.email,
          userName: testRecipient.full_name,
          title: `[TEST] ${emailTemplate.subject.replace('Arc Board Management - ', '')}`,
          message: `This is a test email for voting summary functionality.\n\n${emailTemplate.votingPeriod}\n\nOriginal email would be sent to all board members.`,
          type: 'system'
        });

        // Log the test email attempt
        await logTestEmail(supabase, {
          userId: user.id,
          userName: profile.full_name,
          userEmail: user.email || '',
          type,
          itemId,
          itemTitle: summaryData.item.title || 'Unknown',
          emailSent: testEmailSent,
          timestamp: new Date().toISOString()
        });

        if (testEmailSent) {
          return NextResponse.json({
            success: true,
            message: `Test email sent successfully to ${testRecipient.email}`,
            data: {
              type,
              itemId,
              itemTitle: summaryData.item.title || 'Unknown',
              testRecipient: testRecipient.email,
              summaryStats: {
                totalVotes: summaryData.statistics.totalVotes,
                totalEligibleVoters: summaryData.statistics.totalEligibleVoters,
                participationRate: summaryData.statistics.participationRate,
                approvalPercentage: summaryData.statistics.approvalPercentage,
                passed: summaryData.outcome.passed,
                nonVotersCount: summaryData.nonVoters.length
              },
              testedBy: profile.full_name,
              timestamp: new Date().toISOString()
            }
          });
        } else {
          return NextResponse.json(
            { 
              success: false, 
              error: 'Failed to send test email',
              data: {
                type,
                itemId,
                itemTitle: summaryData.item.title || 'Unknown',
                testRecipient: testRecipient.email,
                testedBy: profile.full_name,
                timestamp: new Date().toISOString()
              }
            },
            { status: 500 }
          );
        }
      }
    } catch (error) {
      console.error(`Error in email test (${action}):`, error);
      return NextResponse.json(
        { 
          success: false, 
          error: `Failed to ${action} email`,
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in test voting email endpoint:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process email test request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/test-voting-email
 * Get available items for email testing
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
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

    // Get recent items with votes for testing
    const testableItems = await getTestableItems(supabase);

    return NextResponse.json({
      success: true,
      data: testableItems
    });
  } catch (error) {
    console.error('Error getting testable items:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get testable items',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Get items suitable for email testing (items with votes)
 */
async function getTestableItems(supabase: any): Promise<{
  resolutions: Array<{ 
    id: string; 
    title: string; 
    status: string; 
    created_at: string; 
    vote_count: number;
  }>;
  minutes: Array<{ 
    id: string; 
    title: string; 
    status: string; 
    created_at: string; 
    vote_count: number;
  }>;
}> {
  try {
    // Get resolutions with vote counts
    const { data: resolutions, error: resolutionError } = await supabase
      .from('resolutions')
      .select(`
        id, 
        title, 
        status, 
        created_at,
        votes_for,
        votes_against,
        votes_abstain
      `)
      .order('created_at', { ascending: false })
      .limit(20);

    // Get minutes with vote counts (need to count from votes table)
    const { data: minutes, error: minutesError } = await supabase
      .from('minutes')
      .select('id, title, status, created_at')
      .order('created_at', { ascending: false })
      .limit(20);

    const result = {
      resolutions: [] as Array<{ 
        id: string; 
        title: string; 
        status: string; 
        created_at: string; 
        vote_count: number;
      }>,
      minutes: [] as Array<{ 
        id: string; 
        title: string; 
        status: string; 
        created_at: string; 
        vote_count: number;
      }>
    };

    // Process resolutions
    if (!resolutionError && resolutions) {
      result.resolutions = resolutions.map(resolution => ({
        id: resolution.id,
        title: resolution.title,
        status: resolution.status,
        created_at: resolution.created_at,
        vote_count: (resolution.votes_for || 0) + (resolution.votes_against || 0) + (resolution.votes_abstain || 0)
      }));
    }

    // Process minutes (get vote counts separately)
    if (!minutesError && minutes) {
      for (const minute of minutes) {
        const { data: voteCount } = await supabase
          .from('minutes_votes')
          .select('id')
          .eq('minutes_id', minute.id);

        result.minutes.push({
          id: minute.id,
          title: minute.title,
          status: minute.status,
          created_at: minute.created_at,
          vote_count: voteCount?.length || 0
        });
      }
    }

    return result;
  } catch (error) {
    console.error('Error getting testable items:', error);
    return { resolutions: [], minutes: [] };
  }
}

/**
 * Log test email attempt for audit purposes
 */
async function logTestEmail(supabase: any, logData: {
  userId: string;
  userName: string;
  userEmail: string;
  type: string;
  itemId: string;
  itemTitle: string;
  emailSent: boolean;
  timestamp: string;
}): Promise<void> {
  try {
    const auditEntry = {
      timestamp: logData.timestamp,
      action: 'test_voting_summary_email',
      userId: logData.userId,
      userName: logData.userName,
      userEmail: logData.userEmail,
      details: {
        type: logData.type,
        itemId: logData.itemId,
        itemTitle: logData.itemTitle,
        emailSent: logData.emailSent
      }
    };

    console.log('📋 Test voting summary email logged:', auditEntry);
    
    // In a future implementation, this could be stored in a dedicated audit table
  } catch (error) {
    console.error('Error logging test email:', error);
  }
}