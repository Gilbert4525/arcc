'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, UserCheck, Shield } from 'lucide-react';

interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'board_member';
  is_active: boolean;
  last_login: string | null;
  created_at: string;
}

interface UserActivityChartProps {
  users: User[];
}

export function UserActivityChart({ users }: UserActivityChartProps) {
  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.is_active).length;
  const adminUsers = users.filter(u => u.role === 'admin').length;
  const boardMembers = users.filter(u => u.role === 'board_member').length;
  
  // Calculate recent activity (users who logged in within last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const recentlyActive = users.filter(u => 
    u.last_login && new Date(u.last_login) > thirtyDaysAgo
  ).length;

  const activityRate = totalUsers > 0 ? (recentlyActive / totalUsers) * 100 : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalUsers}</div>
          <p className="text-xs text-muted-foreground">
            Registered in system
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Users</CardTitle>
          <UserCheck className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{activeUsers}</div>
          <p className="text-xs text-muted-foreground">
            {((activeUsers / totalUsers) * 100).toFixed(1)}% of total
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
          <UserCheck className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">{recentlyActive}</div>
          <p className="text-xs text-muted-foreground">
            Active in last 30 days ({activityRate.toFixed(1)}%)
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">User Roles</CardTitle>
          <Shield className="h-4 w-4 text-purple-600" />
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2">
            <Badge variant="secondary">{adminUsers} Admin</Badge>
            <Badge variant="outline">{boardMembers} Members</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Role distribution
          </p>
        </CardContent>
      </Card>
    </div>
  );
}