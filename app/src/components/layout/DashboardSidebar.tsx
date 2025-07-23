'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Users,
  FileText,
  Calendar,
  Gavel,
  BarChart3,
  Settings,
  Home,
  Upload,
  FolderOpen,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react';

const navigationItems = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: Home,
    roles: ['admin', 'board_member'],
  },
  {
    title: 'Documents',
    href: '/dashboard/documents',
    icon: FileText,
    roles: ['admin', 'board_member'],
  },
  {
    title: 'Upload Documents',
    href: '/dashboard/documents/upload',
    icon: Upload,
    roles: ['admin', 'board_member'],
  },
  {
    title: 'Meetings',
    href: '/dashboard/meetings',
    icon: Calendar,
    roles: ['admin', 'board_member'],
  },
  {
    title: 'Resolutions',
    href: '/dashboard/resolutions',
    icon: Gavel,
    roles: ['admin', 'board_member'],
  },
  {
    title: 'Categories',
    href: '/dashboard/categories',
    icon: FolderOpen,
    roles: ['admin'],
  },
  {
    title: 'User Management',
    href: '/admin/users',
    icon: Users,
    roles: ['admin'],
  },
  {
    title: 'Reports',
    href: '/admin/reports',
    icon: BarChart3,
    roles: ['admin'],
  },
  {
    title: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
    roles: ['admin', 'board_member'],
  },
];

export function DashboardSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const supabase = createClient();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/'); // Redirect to homepage
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const filteredItems = navigationItems.filter(item =>
    item.roles.includes(user?.role || 'board_member')
  );

  return (
    <div className={cn(
      'bg-white border-r border-gray-200 transition-all duration-300',
      isCollapsed ? 'w-16' : 'w-64'
    )}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {!isCollapsed && (
              <Link href="/" className="flex items-center space-x-2">
                <img 
                  src="/boardmix-logo.svg" 
                  alt="Arc Board Management" 
                  className="h-8 w-8"
                />
                <h2 className="text-lg font-semibold text-gray-900">
                  Arc Board Management
                </h2>
              </Link>
            )}
            {isCollapsed && (
              <Link href="/" className="flex items-center justify-center">
                <img 
                  src="/boardmix-logo.svg" 
                  alt="Arc Board Management" 
                  className="h-8 w-8"
                />
              </Link>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1"
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {filteredItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900',
                      isCollapsed && 'justify-center'
                    )}
                  >
                    <Icon className={cn('h-5 w-5', !isCollapsed && 'mr-3')} />
                    {!isCollapsed && <span>{item.title}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Info */}
        {!isCollapsed && user && (
          <div className="p-4 border-t border-gray-200 space-y-3">
            <div className="flex items-center">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.full_name || 'User'}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user.role === 'admin' ? 'Administrator' : 'Board Member'}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="w-full justify-start text-gray-700 hover:text-gray-900 hover:bg-gray-100"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        )}

        {/* Collapsed User Info with Logout */}
        {isCollapsed && user && (
          <div className="p-2 border-t border-gray-200">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="w-full justify-center text-gray-700 hover:text-gray-900 hover:bg-gray-100"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
