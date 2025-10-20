'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  FileCheck,
  ChevronDown,
  ScrollText,
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
    roles: ['admin'],
  },
  {
    title: 'Meetings',
    href: '/dashboard/meetings',
    icon: Calendar,
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
    title: 'Admin Minutes',
    href: '/admin/minutes',
    icon: FileCheck,
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

const resolutionItems = [
  {
    title: 'Pending Resolution',
    href: '/dashboard/resolutions',
    icon: Gavel,
    roles: ['admin', 'board_member'],
  },
  {
    title: 'Passed Resolution Documents',
    href: '/dashboard/resolutions/documents',
    icon: ScrollText,
    roles: ['admin', 'board_member'],
  },
  {
    title: 'Upload Resolution Documents',
    href: '/dashboard/resolutions/documents/upload',
    icon: Upload,
    roles: ['admin'],
  },
];

const minutesItems = [
  {
    title: 'Minutes Management',
    href: '/dashboard/minutes',
    icon: FileCheck,
    roles: ['admin', 'board_member'],
  },
  {
    title: 'Minutes Documents',
    href: '/dashboard/minutes/documents',
    icon: FileText,
    roles: ['admin', 'board_member'],
  },
  {
    title: 'Upload Minutes Documents',
    href: '/dashboard/minutes/documents/upload',
    icon: Upload,
    roles: ['admin'],
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

            {/* Resolutions Dropdown */}
            <li>
              {isCollapsed ? (
                <Link
                  href="/dashboard/resolutions"
                  className={cn(
                    'flex items-center justify-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                    pathname.startsWith('/dashboard/resolutions')
                      ? 'bg-primary text-primary-foreground'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  )}
                >
                  <Gavel className="h-5 w-5" />
                </Link>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className={cn(
                        'w-full justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                        pathname.startsWith('/dashboard/resolutions')
                          ? 'bg-primary text-primary-foreground'
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                      )}
                    >
                      <div className="flex items-center">
                        <Gavel className="h-5 w-5 mr-3" />
                        <span>Resolutions</span>
                      </div>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    {resolutionItems
                      .filter(item => item.roles.includes(user?.role || 'board_member'))
                      .map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;

                        return (
                          <DropdownMenuItem key={item.href} asChild>
                            <Link
                              href={item.href}
                              className={cn(
                                'flex items-center px-2 py-2 text-sm cursor-pointer',
                                isActive && 'bg-primary/10 text-primary font-medium'
                              )}
                            >
                              <Icon className="h-4 w-4 mr-3" />
                              <span>{item.title}</span>
                            </Link>
                          </DropdownMenuItem>
                        );
                      })}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </li>

            {/* Minutes Dropdown */}
            <li>
              {isCollapsed ? (
                <Link
                  href="/dashboard/minutes"
                  className={cn(
                    'flex items-center justify-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                    pathname.startsWith('/dashboard/minutes')
                      ? 'bg-primary text-primary-foreground'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  )}
                >
                  <FileCheck className="h-5 w-5" />
                </Link>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className={cn(
                        'w-full justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                        pathname.startsWith('/dashboard/minutes')
                          ? 'bg-primary text-primary-foreground'
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                      )}
                    >
                      <div className="flex items-center">
                        <FileCheck className="h-5 w-5 mr-3" />
                        <span>Minutes</span>
                      </div>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    {minutesItems
                      .filter(item => item.roles.includes(user?.role || 'board_member'))
                      .map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;

                        return (
                          <DropdownMenuItem key={item.href} asChild>
                            <Link
                              href={item.href}
                              className={cn(
                                'flex items-center px-2 py-2 text-sm cursor-pointer',
                                isActive && 'bg-primary/10 text-primary font-medium'
                              )}
                            >
                              <Icon className="h-4 w-4 mr-3" />
                              <span>{item.title}</span>
                            </Link>
                          </DropdownMenuItem>
                        );
                      })}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </li>
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
