'use client';

import { useState, useEffect } from 'react';
import { Header } from './header';
import { Sidebar } from './sidebar';
import { useAuth, withAuth } from '@/context/auth-context';
import { ErrorBoundary } from '@/components/error-boundary';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

function DashboardLayoutComponent({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isLoading } = useAuth();

  // Handle responsive sidebar behavior
  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== 'undefined' && window.innerWidth >= 768) {
        setSidebarOpen(false);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-strong"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-canvas">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header onMenuClick={() => setSidebarOpen(true)} isSidebarOpen={sidebarOpen} />

        {/* Page content — wrapped so a render-time crash in one page surfaces
            the ErrorBoundary fallback instead of breaking the entire app shell. */}
        <main className="flex-1 overflow-y-auto bg-canvas">
          <div className="container mx-auto px-4 py-6 max-w-7xl">
            <ErrorBoundary>{children}</ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}

export const DashboardLayout = withAuth(DashboardLayoutComponent);
