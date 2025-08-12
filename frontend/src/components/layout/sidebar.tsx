'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { X, ChevronRight, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { mainNavItems, bottomNavItems } from '@/lib/navigation';
import { cn } from '@/utils/cn';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  const isActiveLink = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  const hasPermission = (item: (typeof mainNavItems)[0]) => {
    if (!item.requiresAuth) return true;
    if (!user) return false;
    if (!item.requiredRoles) return true;
    return item.requiredRoles.includes(user.role);
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-900/50 backdrop-blur-sm transition-opacity md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0',
          'bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Sidebar header */}
          <div className="flex h-16 items-center justify-between border-b border-gray-200 dark:border-gray-800 px-4">
            <Link href="/dashboard" className="flex items-center space-x-3 group" onClick={onClose}>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-accent-purple-500 rounded-xl blur-lg opacity-75 group-hover:opacity-100 transition-opacity" />
                <div className="relative h-10 w-10 bg-gradient-to-br from-primary-500 to-accent-purple-500 rounded-xl flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="font-display font-bold text-xl bg-gradient-to-r from-primary-600 to-accent-purple-600 dark:from-primary-400 dark:to-accent-purple-400 bg-clip-text text-transparent">
                  D'insight
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Analytics Platform
                </span>
              </div>
            </Link>
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors" 
              onClick={onClose}
            >
              <X className="h-5 w-5" />
              <span className="sr-only">Close sidebar</span>
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4 overflow-y-auto scrollbar-thin">
            {/* Main navigation */}
            <div className="space-y-1">
              <h3 className="px-3 mb-2 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                Main Menu
              </h3>
              {mainNavItems.filter(hasPermission).map((item) => {
                const isActive = isActiveLink(item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      'group flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-gradient-to-r from-primary-500/10 to-accent-purple-500/10 text-primary-600 dark:text-primary-400 border border-primary-500/20'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-100'
                    )}
                    title={item.description}
                  >
                    <div className={cn(
                      'mr-3 rounded-lg p-1.5 transition-colors',
                      isActive 
                        ? 'bg-gradient-to-br from-primary-500 to-accent-purple-500 text-white shadow-md' 
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 group-hover:bg-gray-200 dark:group-hover:bg-gray-700'
                    )}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold rounded-full bg-red-500 text-white">
                        {item.badge}
                      </span>
                    )}
                    {isActive && (
                      <ChevronRight className="h-4 w-4 text-primary-500" />
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Divider */}
            <div className="my-6 border-t border-gray-200 dark:border-gray-800" />

            {/* Quick Actions */}
            <div className="space-y-3">
              <h3 className="px-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                Quick Actions
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  asChild
                  className="rounded-lg border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <Link href="/dashboard/data-summary" onClick={onClose}>
                    <span className="mr-1">📊</span> Upload
                  </Link>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  asChild
                  className="rounded-lg border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <Link href="/dashboard/analysis" onClick={onClose}>
                    <span className="mr-1">🔬</span> Analyze
                  </Link>
                </Button>
              </div>
            </div>

            {/* Stats Widget */}
            <div className="mt-6">
              <div className="rounded-xl bg-gradient-to-br from-primary-500/10 to-accent-purple-500/10 border border-primary-500/20 p-4">
                <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">
                  System Status
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600 dark:text-gray-400">API Status</span>
                    <span className="flex items-center text-xs">
                      <span className="h-2 w-2 bg-green-500 rounded-full mr-1 animate-pulse"></span>
                      <span className="text-green-600 dark:text-green-400 font-medium">Online</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Processing</span>
                    <span className="text-xs font-medium text-gray-900 dark:text-gray-100">Ready</span>
                  </div>
                </div>
              </div>
            </div>
          </nav>

          {/* Bottom navigation */}
          <div className="border-t border-gray-200 dark:border-gray-800 p-4">
            <div className="space-y-1 mb-4">
              {bottomNavItems.filter(hasPermission).map((item) => {
                const isActive = isActiveLink(item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      'group flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-gradient-to-r from-primary-500/10 to-accent-purple-500/10 text-primary-600 dark:text-primary-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/50'
                    )}
                    title={item.description}
                  >
                    <Icon className="mr-3 h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>

            {/* User info */}
            <div className="rounded-xl bg-gray-100 dark:bg-gray-800/50 p-3">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary-500 to-accent-purple-500 flex items-center justify-center shadow-md">
                    <span className="text-sm font-semibold text-white">
                      {user?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                    </span>
                  </div>
                  <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 border-2 border-white dark:border-gray-950 rounded-full" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {user?.full_name || 'User'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}