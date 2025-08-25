'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, Bell, Menu, User, LogOut, Settings, ChevronDown, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/utils/cn';

interface HeaderProps {
  onMenuClick: () => void;
  isSidebarOpen: boolean;
}

export function Header({ onMenuClick, isSidebarOpen }: HeaderProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  const getPageTitle = () => {
    const segments = pathname.split('/').filter(Boolean);
    const lastSegment = segments[segments.length - 1] || 'dashboard';
    return lastSegment
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl">
      <div className="flex h-16 items-center px-4 sm:px-6">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="mr-2 md:hidden hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>

        {/* Logo and Title */}
        <div className="flex items-center space-x-3">
          <Link href="/dashboard" className="flex items-center space-x-2 group">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-accent-purple-500 rounded-xl blur-lg opacity-75 group-hover:opacity-100 transition-opacity" />
              <div className="relative h-9 w-9 bg-gradient-to-br from-primary-500 to-accent-purple-500 rounded-xl flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="font-display font-bold text-lg bg-gradient-to-r from-primary-600 to-accent-purple-600 dark:from-primary-400 dark:to-accent-purple-400 bg-clip-text text-transparent">
                D'Insight
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">Predictive Analytics</span>
            </div>
          </Link>
        </div>

        {/* Search Bar */}
        <div className="flex-1 max-w-2xl mx-4 hidden md:flex">
          <div
            className={cn(
              'relative w-full transition-all duration-300',
              searchFocused && 'scale-[1.02]'
            )}
          >
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <input
              type="search"
              placeholder="Search analyses, datasets, or features..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              className={cn(
                'w-full rounded-xl border bg-gray-50 dark:bg-gray-900/50 pl-10 pr-4 py-2.5 text-sm',
                'focus:border-primary-500 focus:bg-white dark:focus:bg-gray-900',
                'focus:outline-none focus:ring-2 focus:ring-primary-500/20',
                'transition-all duration-200',
                'placeholder:text-gray-400 dark:placeholder:text-gray-500',
                'border-gray-200 dark:border-gray-800'
              )}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <span className="text-xs">ESC</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex-1" />

        {/* Right side actions */}
        <div className="flex items-center space-x-2">
          {/* Mobile search button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <Search className="h-5 w-5" />
            <span className="sr-only">Search</span>
          </Button>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <Bell className="h-5 w-5" />
                {/* Notification badge with pulse animation */}
                <span className="absolute -top-1 -right-1 flex h-5 w-5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-5 w-5 bg-gradient-to-r from-red-500 to-red-600 text-xs text-white items-center justify-center font-medium">
                    3
                  </span>
                </span>
                <span className="sr-only">Notifications</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="right" className="w-80 rounded-xl">
              <div className="px-4 py-3 border-b dark:border-gray-800">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Notifications</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  You have 3 unread notifications
                </p>
              </div>
              <div className="py-2">
                <DropdownMenuItem className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <div className="flex gap-3 w-full">
                    <div className="flex-shrink-0">
                      <div className="h-2 w-2 bg-red-500 rounded-full mt-1.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        High Anomaly Detected
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Dataset analysis - 18.5% anomaly rate
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">2 minutes ago</p>
                    </div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <div className="flex gap-3 w-full">
                    <div className="flex-shrink-0">
                      <div className="h-2 w-2 bg-green-500 rounded-full mt-1.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Analysis Complete
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Baseline data processing finished
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">1 hour ago</p>
                    </div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <div className="flex gap-3 w-full">
                    <div className="flex-shrink-0">
                      <div className="h-2 w-2 bg-yellow-500 rounded-full mt-1.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Maintenance Due
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        System maintenance scheduled
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">3 hours ago</p>
                    </div>
                  </div>
                </DropdownMenuItem>
              </div>
              <div className="border-t dark:border-gray-800 p-2">
                <Link
                  href="/dashboard/notifications"
                  className="flex items-center justify-center w-full px-3 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg transition-colors"
                >
                  View all notifications
                </Link>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-10 px-2 sm:px-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-purple-500 flex items-center justify-center shadow-md">
                      <span className="text-sm font-semibold text-white">
                        {user?.full_name
                          ?.split(' ')
                          .map((n) => n[0])
                          .join('') || 'U'}
                      </span>
                    </div>
                    <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 border-2 border-white dark:border-gray-950 rounded-full" />
                  </div>
                  <div className="hidden md:flex flex-col text-left">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {user?.full_name || 'User'}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {user?.role
                        ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
                        : 'Member'}
                    </span>
                  </div>
                  <ChevronDown className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="right" className="w-56 rounded-xl">
              <div className="px-3 py-2 border-b dark:border-gray-800">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {user?.full_name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
              </div>
              <div className="py-2">
                <Link href="/dashboard/profile">
                  <DropdownMenuItem className="px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                </Link>
                <Link href="/dashboard/settings">
                  <DropdownMenuItem className="px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                </Link>
              </div>
              <div className="border-t dark:border-gray-800 py-2">
                <DropdownMenuItem
                  onClick={logout}
                  className="px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
