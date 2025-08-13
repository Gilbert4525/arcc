import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DocumentsService, MeetingsService, ResolutionsService, NotificationsService } from '@/lib/database';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/auth/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profile?.role === 'admin') {
    redirect('/admin');
  }

  // Create service instances
  const documentsService = new DocumentsService(supabase);
  const meetingsService = new MeetingsService(supabase);
  const resolutionsService = new ResolutionsService(supabase);
  const notificationsService = new NotificationsService(supabase);

  // Fetch real data
  const [recentDocuments, upcomingMeetings, activeVotingResolutions, unreadNotifications] = await Promise.all([
    documentsService.getPublishedDocuments().then(docs => docs.slice(0, 5)), // Get latest 5
    meetingsService.getUpcomingMeetingsForUser(user.id, 5), // Get meetings user is invited to
    resolutionsService.getActiveVotingResolutions(), // Get resolutions open for voting
    notificationsService.getUserNotifications(user.id, 1, 10).then(result => result.notifications.filter(n => !n.is_read)), // Get unread notifications
  ]);

  // Calculate stats
  const recentDocumentsCount = recentDocuments.length;
  const upcomingMeetingsCount = upcomingMeetings.length;
  const pendingVotesCount = activeVotingResolutions.length;
  const unreadNotificationsCount = unreadNotifications.length;

  // Prepare data for client component
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

  return <DashboardClient data={dashboardData} />;
}

export const metadata = {
  title: 'Dashboard - BoardMix',
  description: 'Board member dashboard',
};
