import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { DocumentsService, MeetingsService, ResolutionsService, NotificationsService } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Create service instances
    const documentsService = new DocumentsService(supabase);
    const meetingsService = new MeetingsService(supabase);
    const resolutionsService = new ResolutionsService(supabase);
    const notificationsService = new NotificationsService(supabase);

    // Fetch fresh data with proper ordering
    const [recentDocuments, upcomingMeetings, activeVotingResolutions, unreadNotifications] = await Promise.all([
      documentsService.getPublishedDocuments().then(docs => docs.slice(0, 5)), // Get latest 5 (now properly ordered by published_at DESC)
      meetingsService.getUpcomingMeetingsForUser(user.id, 5), // Get next 5 upcoming meetings (now properly ordered by meeting_date ASC)
      resolutionsService.getActiveVotingResolutions(), // Get resolutions open for voting
      notificationsService.getUserNotifications(user.id, 1, 10).then(result => result.notifications.filter(n => !n.is_read)), // Get unread notifications
    ]);

    // Calculate stats
    const recentDocumentsCount = recentDocuments.length;
    const upcomingMeetingsCount = upcomingMeetings.length;
    const pendingVotesCount = activeVotingResolutions.length;
    const unreadNotificationsCount = unreadNotifications.length;

    // Prepare fresh dashboard data
    const dashboardData = {
      profile,
      stats: {
        recentDocumentsCount,
        upcomingMeetingsCount,
        pendingVotesCount,
        unreadNotificationsCount,
        nextMeetingDate: upcomingMeetings.length > 0 ? upcomingMeetings[0].meeting_date : null,
      },
      recentDocuments,
      upcomingMeetings,
      unreadNotifications: unreadNotifications.slice(0, 5), // Show latest 5 notifications
    };

    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error('Error refreshing dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to refresh dashboard data' },
      { status: 500 }
    );
  }
}