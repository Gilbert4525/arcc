import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { 
  Users, 
  FileText, 
  Calendar, 
  Vote, 
  Settings, 
  BarChart3,
  Plus,
  Activity
} from 'lucide-react';
import { getDatabaseServices } from '@/lib/database';
import { TestNotificationButton } from '@/components/admin/TestNotificationButton';
import { TestEmailButton } from '@/components/admin/TestEmailButton';
import { TestWebPushButton } from '@/components/admin/TestWebPushButton';
import { TestVotingSummaryButton } from '@/components/admin/TestVotingSummaryButton';
import { TestVotingStatisticsButton } from '@/components/admin/TestVotingStatisticsButton';
import { TestEmailTemplateButton } from '@/components/admin/TestEmailTemplateButton';
import { TestVotingCompletionButton } from '@/components/admin/TestVotingCompletionButton';
import FixNotificationSystemButton from '@/components/admin/FixNotificationSystemButton';
import { TestNotificationSystemButton } from '@/components/admin/TestNotificationSystemButton';
import { TestGmailButton } from '@/components/admin/TestGmailButton';
import { ValidateEmailConfigButton } from '@/components/admin/ValidateEmailConfigButton';
import TestProductionGmailButton from '@/components/admin/TestProductionGmailButton';

export default async function AdminPage() {
  const supabase = await createServerSupabaseClient();
  const db = getDatabaseServices(supabase);
  
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

  // Get real statistics
  const [users, documents, meetings, resolutions] = await Promise.all([
    db.profiles.getAllProfiles(),
    db.documents.getDocuments(1, 100),
    db.meetings.getMeetings(1, 100),
    db.resolutions.getResolutionStats()
  ]);

  const activeVotingResolutions = await db.resolutions.getActiveVotingResolutions();

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Admin Dashboard
            </h1>
            <p className="text-gray-600 mt-2">
              Manage the BoardMix System
            </p>
          </div>
          <div className="flex space-x-2">
            <Button asChild>
              <Link href="/dashboard/meetings">
                <Plus className="mr-2 h-4 w-4" />
                New Meeting
              </Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard/resolutions">
                <Plus className="mr-2 h-4 w-4" />
                Create Resolution
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard/documents/upload">
                <Plus className="mr-2 h-4 w-4" />
                Upload Document
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground">
              {users.filter(u => u.role === 'admin').length} admins, {users.filter(u => u.role === 'board_member').length} members
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{documents.total}</div>
            <p className="text-xs text-muted-foreground">
              {documents.documents.filter(d => d.is_published).length} published
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Meetings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{meetings.total}</div>
            <p className="text-xs text-muted-foreground">
              {meetings.meetings.filter(m => m.status === 'scheduled').length} scheduled
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Votes</CardTitle>
            <Vote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeVotingResolutions.length}</div>
            <p className="text-xs text-muted-foreground">
              {resolutions.voting} voting, {resolutions.passed} passed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="mr-2 h-5 w-5" />
              User Management
            </CardTitle>
            <CardDescription>
              Manage board members and administrators
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/admin/users">
                View All Users
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/admin/users">
                Add New User
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/admin/users">
                User Permissions
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="mr-2 h-5 w-5" />
              Content Management
            </CardTitle>
            <CardDescription>
              Manage documents and content
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/dashboard/documents">
                Document Library
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/dashboard/documents/upload">
                Upload Documents
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/dashboard/categories">
                Categories & Tags
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="mr-2 h-5 w-5" />
              Meeting Management
            </CardTitle>
            <CardDescription>
              Schedule and manage meetings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/dashboard/meetings">
                All Meetings
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/dashboard/meetings">
                Schedule Meeting
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/dashboard/resolutions">
                Meeting Templates
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity & System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="mr-2 h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              Latest actions in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div>
                    <p className="font-medium">Document uploaded</p>
                    <p className="text-sm text-muted-foreground">Q4 Financial Report by John Doe</p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">2h ago</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div>
                    <p className="font-medium">Meeting scheduled</p>
                    <p className="text-sm text-muted-foreground">Board Meeting for January 15</p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">4h ago</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <div>
                    <p className="font-medium">New user added</p>
                    <p className="text-sm text-muted-foreground">Jane Smith joined as board member</p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">1d ago</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <div>
                    <p className="font-medium">Resolution published</p>
                    <p className="text-sm text-muted-foreground">Budget Approval Resolution</p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">2d ago</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="mr-2 h-5 w-5" />
              System Overview
            </CardTitle>
            <CardDescription>
              System health and statistics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">System Status</span>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Operational
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Storage Used</span>
                <span className="text-sm text-muted-foreground">2.4 GB / 10 GB</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Active Sessions</span>
                <span className="text-sm text-muted-foreground">18 users online</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Last Backup</span>
                <span className="text-sm text-muted-foreground">2 hours ago</span>
              </div>
              <div className="pt-4 space-y-2">
                <Button variant="outline" className="w-full">
                  <Settings className="mr-2 h-4 w-4" />
                  System Settings
                </Button>
                <TestNotificationButton />
              </div>
            </div>
          </CardContent>
        </Card>

        <FixNotificationSystemButton />

        <Card>
          <CardHeader>
            <CardTitle>Email System Test</CardTitle>
            <CardDescription>
              Test the email notification system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TestEmailButton />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Web Push Test</CardTitle>
            <CardDescription>
              Test browser push notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TestWebPushButton />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Voting Summary Email Test</CardTitle>
            <CardDescription>
              Test voting summary email generation and delivery
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TestVotingSummaryButton />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Enhanced Voting Statistics Test</CardTitle>
            <CardDescription>
              Test the enhanced voting statistics calculation engine
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TestVotingStatisticsButton />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Enhanced Email Template Test</CardTitle>
            <CardDescription>
              Test the comprehensive voting summary email templates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TestEmailTemplateButton />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Voting Completion Detection Test</CardTitle>
            <CardDescription>
              Test the automatic voting completion detection and email triggering system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TestVotingCompletionButton />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notification System Debug</CardTitle>
            <CardDescription>
              Debug the notification system to identify email delivery issues
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TestNotificationSystemButton />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gmail SMTP Test</CardTitle>
            <CardDescription>
              Test the Gmail SMTP email service (Production Email System)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <TestGmailButton />
              <TestProductionGmailButton />
              <ValidateEmailConfigButton />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Vote className="mr-2 h-5 w-5" />
              Voting Summary Management
            </CardTitle>
            <CardDescription>
              Manage voting summary emails, templates, and system settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/admin/voting-summary">
                <Settings className="mr-2 h-4 w-4" />
                Manage Email System
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/admin/voting-summary">
                <BarChart3 className="mr-2 h-4 w-4" />
                View Analytics
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Additional Admin Tools */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common administrative tasks
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/admin/reports">
                <BarChart3 className="mr-2 h-4 w-4" />
                View Reports
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/dashboard/categories">
                <Settings className="mr-2 h-4 w-4" />
                Manage Categories
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Health</CardTitle>
            <CardDescription>
              Monitor system performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span>Database</span>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Healthy
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Email Service</span>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Connected
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Notifications</span>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Active
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export const metadata = {
  title: 'Admin Dashboard - BoardMix',
  description: 'Administrative dashboard for BoardMix System',
};
