import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3, 
  Users, 
  FileText, 
  Calendar, 
  Vote, 
  TrendingUp, 
  Download,
  Eye,
  Clock,
  CheckCircle
} from 'lucide-react';
import { getDatabaseServices } from '@/lib/database';

export default async function ReportsPage() {
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

  if (profile?.role !== 'admin') {
    redirect('/dashboard');
  }

  // Get database services
  const db = getDatabaseServices(supabase);

  // Fetch comprehensive data for reports
  const [
    allUsers,
    allDocuments,
    allMeetings,
    resolutionStats,
    activeVotingResolutions
  ] = await Promise.all([
    db.profiles.getAllProfiles(),
    db.documents.getDocuments(1, 1000), // Get all documents
    db.meetings.getMeetings(1, 1000), // Get all meetings
    db.resolutions.getResolutionStats(),
    db.resolutions.getActiveVotingResolutions()
  ]);

  // Calculate statistics
  const totalUsers = allUsers.length;
  const activeUsers = allUsers.filter(u => u.is_active).length;
  const adminUsers = allUsers.filter(u => u.role === 'admin').length;
  const boardMembers = allUsers.filter(u => u.role === 'board_member').length;

  const totalDocuments = allDocuments.total;
  const publishedDocuments = allDocuments.documents.filter(d => d.is_published).length;
  const unpublishedDocuments = totalDocuments - publishedDocuments;

  const totalMeetings = allMeetings.total;
  const scheduledMeetings = allMeetings.meetings.filter(m => m.status === 'scheduled').length;
  const completedMeetings = allMeetings.meetings.filter(m => m.status === 'completed').length;

  const totalResolutions = resolutionStats.total;
  const activeVoting = activeVotingResolutions.length;

  // Calculate engagement metrics
  const documentEngagement = totalDocuments > 0 ? (publishedDocuments / totalDocuments) * 100 : 0;
  const meetingCompletion = totalMeetings > 0 ? (completedMeetings / totalMeetings) * 100 : 0;
  const userActivity = totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0;

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
            <p className="text-gray-600 mt-2">
              Comprehensive insights into board management system usage and performance
            </p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export Report
            </Button>
            <Button>
              <BarChart3 className="mr-2 h-4 w-4" />
              Generate Custom Report
            </Button>
          </div>
        </div>
      </div>

      {/* Overview Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {activeUsers} active • {adminUsers} admins • {boardMembers} members
            </p>
            <div className="mt-2">
              <Progress value={userActivity} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {userActivity.toFixed(1)}% active users
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDocuments}</div>
            <p className="text-xs text-muted-foreground">
              {publishedDocuments} published • {unpublishedDocuments} draft
            </p>
            <div className="mt-2">
              <Progress value={documentEngagement} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {documentEngagement.toFixed(1)}% published
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Meetings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMeetings}</div>
            <p className="text-xs text-muted-foreground">
              {scheduledMeetings} scheduled • {completedMeetings} completed
            </p>
            <div className="mt-2">
              <Progress value={meetingCompletion} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {meetingCompletion.toFixed(1)}% completion rate
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolutions</CardTitle>
            <Vote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalResolutions}</div>
            <p className="text-xs text-muted-foreground">
              {activeVoting} active voting • {resolutionStats.passed} passed
            </p>
            <div className="flex items-center mt-2">
              <Badge variant="secondary" className="text-xs">
                {resolutionStats.voting} voting open
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* User Activity Report */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="mr-2 h-5 w-5" />
              User Activity Report
            </CardTitle>
            <CardDescription>
              User engagement and activity metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                  <span className="text-sm font-medium">Active Users</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold">{activeUsers}</span>
                  <span className="text-xs text-muted-foreground ml-1">
                    ({((activeUsers / totalUsers) * 100).toFixed(1)}%)
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                  <span className="text-sm font-medium">Administrators</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold">{adminUsers}</span>
                  <span className="text-xs text-muted-foreground ml-1">
                    ({((adminUsers / totalUsers) * 100).toFixed(1)}%)
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-purple-500 rounded-full mr-3"></div>
                  <span className="text-sm font-medium">Board Members</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold">{boardMembers}</span>
                  <span className="text-xs text-muted-foreground ml-1">
                    ({((boardMembers / totalUsers) * 100).toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>
            
            <div className="mt-6">
              <Button variant="outline" className="w-full">
                <Eye className="mr-2 h-4 w-4" />
                View Detailed User Report
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Document Analytics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="mr-2 h-5 w-5" />
              Document Analytics
            </CardTitle>
            <CardDescription>
              Document usage and engagement statistics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-3" />
                  <span className="text-sm font-medium">Published Documents</span>
                </div>
                <span className="text-sm font-bold">{publishedDocuments}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Clock className="w-4 h-4 text-yellow-500 mr-3" />
                  <span className="text-sm font-medium">Draft Documents</span>
                </div>
                <span className="text-sm font-bold">{unpublishedDocuments}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Download className="w-4 h-4 text-blue-500 mr-3" />
                  <span className="text-sm font-medium">Total Downloads</span>
                </div>
                <span className="text-sm font-bold">
                  {allDocuments.documents.reduce((sum, doc) => sum + (doc.download_count || 0), 0)}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Eye className="w-4 h-4 text-purple-500 mr-3" />
                  <span className="text-sm font-medium">Total Views</span>
                </div>
                <span className="text-sm font-bold">
                  {allDocuments.documents.reduce((sum, doc) => sum + (doc.view_count || 0), 0)}
                </span>
              </div>
            </div>
            
            <div className="mt-6">
              <Button variant="outline" className="w-full">
                <BarChart3 className="mr-2 h-4 w-4" />
                View Document Analytics
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Meeting & Resolution Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Meeting Report */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="mr-2 h-5 w-5" />
              Meeting Report
            </CardTitle>
            <CardDescription>
              Meeting scheduling and attendance overview
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{scheduledMeetings}</div>
                  <div className="text-xs text-muted-foreground">Scheduled</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{completedMeetings}</div>
                  <div className="text-xs text-muted-foreground">Completed</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Completion Rate</span>
                  <span className="font-medium">{meetingCompletion.toFixed(1)}%</span>
                </div>
                <Progress value={meetingCompletion} className="h-2" />
              </div>
              
              <Button variant="outline" className="w-full">
                <Calendar className="mr-2 h-4 w-4" />
                View Meeting Analytics
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Resolution Report */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Vote className="mr-2 h-5 w-5" />
              Resolution Report
            </CardTitle>
            <CardDescription>
              Voting and resolution decision tracking
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center">
                  <div className="text-lg font-bold text-orange-600">{resolutionStats.voting}</div>
                  <div className="text-xs text-muted-foreground">Voting</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">{resolutionStats.passed}</div>
                  <div className="text-xs text-muted-foreground">Passed</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-600">{resolutionStats.archived}</div>
                  <div className="text-xs text-muted-foreground">Archived</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Active Voting</span>
                  <Badge variant="secondary">{activeVoting} open</Badge>
                </div>
              </div>
              
              <Button variant="outline" className="w-full">
                <Vote className="mr-2 h-4 w-4" />
                View Voting Analytics
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export const metadata = {
  title: 'Reports - BoardMix',
  description: 'System reports and analytics dashboard',
};