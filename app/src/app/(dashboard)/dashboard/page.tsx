import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Calendar, Vote, Bell } from 'lucide-react';
import { DocumentsService, MeetingsService, ResolutionsService } from '@/lib/database';

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

  // Fetch real data
  const [recentDocuments, upcomingMeetings, activeVotingResolutions] = await Promise.all([
    documentsService.getPublishedDocuments().then(docs => docs.slice(0, 5)), // Get latest 5
    meetingsService.getUpcomingMeetingsForUser(user.id, 5), // Get meetings user is invited to
    resolutionsService.getActiveVotingResolutions(), // Get resolutions open for voting
  ]);

  // Calculate stats
  const recentDocumentsCount = recentDocuments.length;
  const upcomingMeetingsCount = upcomingMeetings.length;
  const pendingVotesCount = activeVotingResolutions.length;

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {profile?.full_name || profile?.email}
        </h1>
        <p className="text-gray-600 mt-2">
          Here&apos;s what&apos;s happening with the board today.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentDocumentsCount}</div>
            <p className="text-xs text-muted-foreground">
              Published documents available
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Meetings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingMeetingsCount}</div>
            <p className="text-xs text-muted-foreground">
              {upcomingMeetings.length > 0
                ? `Next: ${new Date(upcomingMeetings[0].meeting_date).toLocaleDateString()}`
                : 'No upcoming meetings'
              }
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Votes</CardTitle>
            <Vote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingVotesCount}</div>
            <p className="text-xs text-muted-foreground">
              {pendingVotesCount > 0 ? 'Requires your attention' : 'No pending votes'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Notifications</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              No new notifications
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Documents</CardTitle>
            <CardDescription>
              Latest documents published for board members
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentDocuments.length > 0 ? (
                recentDocuments.map((document) => (
                  <div key={document.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{document.title}</p>
                      <p className="text-sm text-muted-foreground">
                        Published {new Date(document.published_at || document.created_at || '').toLocaleDateString()}
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      View
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">No documents available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Meetings</CardTitle>
            <CardDescription>
              Your scheduled board meetings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingMeetings.length > 0 ? (
                upcomingMeetings.map((meeting) => (
                  <div key={meeting.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{meeting.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(meeting.meeting_date).toLocaleDateString()} at{' '}
                        {new Date(meeting.meeting_date).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      Details
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">No upcoming meetings</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export const metadata = {
  title: 'Dashboard - Arc Board Management',
  description: 'Board member dashboard',
};
