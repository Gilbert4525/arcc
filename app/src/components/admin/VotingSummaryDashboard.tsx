'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Mail, 
  Users, 
  Settings, 
  BarChart3, 
  Clock, 
  Send,
  Eye,
  RefreshCw
} from 'lucide-react';

// Import existing components
import VotingSummaryManagement from './VotingSummaryManagement';
import ManualVotingEmailTrigger from './ManualVotingEmailTrigger';
import RecipientManagement from './RecipientManagement';
import VotingDeadlineSchedulerControl from './VotingDeadlineSchedulerControl';
import MonitoringDashboard from './MonitoringDashboard';

export default function VotingSummaryDashboard() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Voting Summary System</h1>
          <p className="text-muted-foreground">
            Comprehensive management of voting summary emails and system monitoring
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">
            <BarChart3 className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="management">
            <Mail className="h-4 w-4 mr-2" />
            Management
          </TabsTrigger>
          <TabsTrigger value="manual">
            <Send className="h-4 w-4 mr-2" />
            Manual Trigger
          </TabsTrigger>
          <TabsTrigger value="recipients">
            <Users className="h-4 w-4 mr-2" />
            Recipients
          </TabsTrigger>
          <TabsTrigger value="scheduler">
            <Clock className="h-4 w-4 mr-2" />
            Scheduler
          </TabsTrigger>
          <TabsTrigger value="monitoring">
            <Eye className="h-4 w-4 mr-2" />
            Monitoring
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">System Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium">Operational</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  All systems running normally
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Emails Today</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">12</div>
                <p className="text-xs text-muted-foreground">
                  +3 from yesterday
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">94.2%</div>
                <p className="text-xs text-muted-foreground">
                  Last 7 days average
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Active Recipients</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">15</div>
                <p className="text-xs text-muted-foreground">
                  Board members & admins
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Common voting summary management tasks
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div 
                  className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50"
                  onClick={() => setActiveTab('manual')}
                >
                  <div className="flex items-center space-x-3">
                    <Send className="h-5 w-5 text-blue-600" />
                    <div>
                      <div className="font-medium">Manual Email Trigger</div>
                      <div className="text-sm text-muted-foreground">Send voting summary emails manually</div>
                    </div>
                  </div>
                </div>

                <div 
                  className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50"
                  onClick={() => setActiveTab('recipients')}
                >
                  <div className="flex items-center space-x-3">
                    <Users className="h-5 w-5 text-green-600" />
                    <div>
                      <div className="font-medium">Manage Recipients</div>
                      <div className="text-sm text-muted-foreground">Configure email recipients and preferences</div>
                    </div>
                  </div>
                </div>

                <div 
                  className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50"
                  onClick={() => setActiveTab('scheduler')}
                >
                  <div className="flex items-center space-x-3">
                    <Clock className="h-5 w-5 text-purple-600" />
                    <div>
                      <div className="font-medium">Scheduler Control</div>
                      <div className="text-sm text-muted-foreground">Manage deadline checking and automation</div>
                    </div>
                  </div>
                </div>

                <div 
                  className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50"
                  onClick={() => setActiveTab('monitoring')}
                >
                  <div className="flex items-center space-x-3">
                    <Eye className="h-5 w-5 text-orange-600" />
                    <div>
                      <div className="font-medium">System Monitoring</div>
                      <div className="text-sm text-muted-foreground">View system health and performance metrics</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Latest voting summary email activities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">Resolution voting completed</div>
                      <div className="text-xs text-muted-foreground">Email sent to 10 recipients • 2 minutes ago</div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">Manual email triggered</div>
                      <div className="text-xs text-muted-foreground">Minutes summary sent • 1 hour ago</div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="h-2 w-2 bg-yellow-500 rounded-full"></div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">Deadline check completed</div>
                      <div className="text-xs text-muted-foreground">3 items processed • 2 hours ago</div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="h-2 w-2 bg-purple-500 rounded-full"></div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">Recipient preferences updated</div>
                      <div className="text-xs text-muted-foreground">2 users modified settings • 3 hours ago</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Management Tab */}
        <TabsContent value="management">
          <VotingSummaryManagement />
        </TabsContent>

        {/* Manual Trigger Tab */}
        <TabsContent value="manual">
          <ManualVotingEmailTrigger />
        </TabsContent>

        {/* Recipients Tab */}
        <TabsContent value="recipients">
          <RecipientManagement />
        </TabsContent>

        {/* Scheduler Tab */}
        <TabsContent value="scheduler">
          <VotingDeadlineSchedulerControl />
        </TabsContent>

        {/* Monitoring Tab */}
        <TabsContent value="monitoring">
          <MonitoringDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}