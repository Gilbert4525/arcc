import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { RecipientManager } from '@/lib/email/recipientManager';

/**
 * GET /api/admin/recipients
 * Get recipients with filtering options
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
    const action = url.searchParams.get('action');
    const includeAdmins = url.searchParams.get('includeAdmins') !== 'false';
    const includeBoardMembers = url.searchParams.get('includeBoardMembers') !== 'false';
    const votingEmailsOnly = url.searchParams.get('votingEmailsOnly') === 'true';
    const activeOnly = url.searchParams.get('activeOnly') !== 'false';

    const recipientManager = new RecipientManager(supabase);

    switch (action) {
      case 'stats':
        const stats = await recipientManager.getSystemEmailStats();
        return NextResponse.json({
          success: true,
          data: stats
        });

      case 'voting':
        const votingRecipients = await recipientManager.getVotingEmailRecipients();
        return NextResponse.json({
          success: true,
          data: votingRecipients
        });

      case 'filtered':
        const filteredRecipients = await recipientManager.getFilteredRecipients({
          includeAdmins,
          includeBoardMembers,
          votingEmailsOnly,
          activeOnly
        });
        return NextResponse.json({
          success: true,
          data: filteredRecipients
        });

      default:
        // Default: return all recipients
        const allRecipients = await recipientManager.getAllVotingEmailRecipients();
        return NextResponse.json({
          success: true,
          data: allRecipients
        });
    }
  } catch (error) {
    console.error('Error in recipients GET:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get recipients',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/recipients
 * Update recipient preferences
 */
export async function PUT(request: NextRequest) {
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

    const body = await request.json();
    const { recipientId, preferences } = body;

    if (!recipientId || !preferences) {
      return NextResponse.json(
        { success: false, error: 'recipientId and preferences are required' },
        { status: 400 }
      );
    }

    const recipientManager = new RecipientManager(supabase);
    const success = await recipientManager.updateRecipientPreferences(recipientId, preferences);

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Recipient preferences updated successfully'
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to update recipient preferences' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in recipients PUT:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update recipient preferences',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/recipients
 * Handle recipient actions (validate, bounce handling, etc.)
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
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, recipientId, recipientIds, bounceType, bounceReason } = body;

    const recipientManager = new RecipientManager(supabase);

    switch (action) {
      case 'validate':
        if (!recipientIds || !Array.isArray(recipientIds)) {
          return NextResponse.json(
            { success: false, error: 'recipientIds array is required for validation' },
            { status: 400 }
          );
        }

        // Get recipients by IDs
        const recipients = await Promise.all(
          recipientIds.map(id => recipientManager.getRecipientById(id))
        );
        const validRecipients = recipients.filter(r => r !== null);

        const validation = await recipientManager.validateRecipientEmails(validRecipients);
        
        return NextResponse.json({
          success: true,
          data: {
            valid: validation.valid.length,
            invalid: validation.invalid.length,
            details: validation
          }
        });

      case 'handle_bounce':
        if (!recipientId || !bounceType || !bounceReason) {
          return NextResponse.json(
            { success: false, error: 'recipientId, bounceType, and bounceReason are required' },
            { status: 400 }
          );
        }

        await recipientManager.handleEmailBounce(recipientId, bounceType, bounceReason);
        
        return NextResponse.json({
          success: true,
          message: `Email bounce handled for recipient ${recipientId}`
        });

      case 'get_stats':
        if (!recipientId) {
          return NextResponse.json(
            { success: false, error: 'recipientId is required for stats' },
            { status: 400 }
          );
        }

        const stats = await recipientManager.getRecipientEmailStats(recipientId);
        
        return NextResponse.json({
          success: true,
          data: stats
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error in recipients POST:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process recipient action',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}