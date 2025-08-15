'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Upload,
  LineChart,
  Microscope,
  Database,
  Plus,
  RefreshCw,
  Activity,
  CheckCircle,
  ArrowUpRight,
  BarChart3,
  Home,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { api } from '@/lib/api-client';

interface DashboardData {
  config: any | null;
  hasActivity: boolean;
}

// Core dashboard actions with updated colors to match design system
const quickActions = [
  {
    title: 'Upload Dataset',
    description: 'Upload baseline or monitoring data',
    href: '/dashboard/dinsight-analysis',
    icon: Upload,
    gradient: 'from-primary-500 to-primary-600',
    shadow: 'shadow-primary-500/25',
  },
  {
    title: 'Compare Data',
    description: 'Visualize dataset comparisons',
    href: '/dashboard/visualization',
    icon: LineChart,
    gradient: 'from-accent-teal-500 to-accent-teal-600',
    shadow: 'shadow-accent-teal-500/25',
  },
  {
    title: 'Detect Anomalies',
    description: 'Run anomaly detection analysis',
    href: '/dashboard/analysis',
    icon: Microscope,
    gradient: 'from-accent-purple-500 to-accent-purple-600',
    shadow: 'shadow-accent-purple-500/25',
  },
  {
    title: 'Explore Features',
    description: 'Examine feature data with heatmaps',
    href: '/dashboard/features',
    icon: Database,
    gradient: 'from-orange-500 to-orange-600',
    shadow: 'shadow-orange-500/25',
  },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [data, setData] = useState<DashboardData>({
    config: null,
    hasActivity: false,
  });
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const configRes = await api.analysis.getConfig().catch(() => null);
      setData({
        config: configRes?.data?.data || null,
        hasActivity: !!configRes?.data?.data,
      });
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchDashboardData();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Modern Header with Enhanced Gradient */}
      <div className="sticky top-0 z-10 glass-card backdrop-blur-xl bg-white/80 dark:bg-gray-950/80 border-b border-gray-200/50 dark:border-gray-700/50 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/25">
                <Home className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold gradient-text">
                  Welcome back{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}!
                </h1>
                <p className="text-gray-600 dark:text-gray-300 mt-1">
                  Predictive maintenance dashboard
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="glass-card hover:shadow-lg transition-all duration-200"
              >
                <RefreshCw className={cn('w-4 h-4 mr-2', isRefreshing && 'animate-spin')} />
                Refresh
              </Button>
              <Button asChild className="glass-card hover:shadow-lg transition-all duration-200">
                <Link href="/dashboard/dinsight-analysis">
                  <Plus className="w-4 h-4 mr-2" />
                  New Analysis
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* System Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="glass-card shadow-xl border-gray-200/50 dark:border-gray-700/50 card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 bg-gradient-to-r from-emerald-50/30 to-accent-teal-50/20 dark:from-emerald-950/30 dark:to-accent-teal-950/20 rounded-t-xl">
              <CardTitle className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
                  <Activity className="h-5 w-5 text-white" />
                </div>
                <span className="gradient-text">System Status</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-500" />
                <span className="text-base font-medium text-emerald-600 dark:text-emerald-400">
                  Operational
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card shadow-xl border-gray-200/50 dark:border-gray-700/50 card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 bg-gradient-to-r from-primary-50/30 to-accent-teal-50/20 dark:from-primary-950/30 dark:to-accent-teal-950/20 rounded-t-xl">
              <CardTitle className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/25">
                  <Database className="h-5 w-5 text-white" />
                </div>
                <span className="gradient-text">Configuration</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {loading ? (
                <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
              ) : (
                <span className="text-base font-medium text-gray-900 dark:text-gray-100">
                  {data.config ? 'Configured' : 'Default Settings'}
                </span>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card shadow-xl border-gray-200/50 dark:border-gray-700/50 card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 bg-gradient-to-r from-accent-purple-50/30 to-accent-pink-50/20 dark:from-accent-purple-950/30 dark:to-accent-pink-950/20 rounded-t-xl">
              <CardTitle className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-accent-purple-500 to-accent-pink-600 rounded-xl flex items-center justify-center shadow-lg shadow-accent-purple-500/25">
                  <BarChart3 className="h-5 w-5 text-white" />
                </div>
                <span className="gradient-text">Recent Activity</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <span className="text-base font-medium text-gray-900 dark:text-gray-100">
                {data.hasActivity ? 'Active' : 'No recent activity'}
              </span>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="glass-card shadow-xl border-gray-200/50 dark:border-gray-700/50 card-hover">
          <CardHeader className="border-b border-gray-100/50 dark:border-gray-700/50 bg-gradient-to-r from-primary-50/30 via-white/50 to-accent-purple-50/30 dark:from-gray-900/50 dark:via-gray-950/50 dark:to-gray-900/50 backdrop-blur-sm rounded-t-xl">
            <CardTitle className="text-2xl font-bold gradient-text">Quick Actions</CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400 mt-1">
              Get started with your predictive maintenance analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.title}
                    href={action.href}
                    className="group block p-6 rounded-xl border border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 glass-card card-hover"
                  >
                    <div
                      className={cn(
                        'w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-gradient-to-br shadow-lg transition-transform duration-300 group-hover:scale-110',
                        action.gradient,
                        action.shadow
                      )}
                    >
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-2 flex items-center text-lg">
                      {action.title}
                      <ArrowUpRight className="w-5 h-5 ml-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                      {action.description}
                    </p>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Getting Started */}
        {!data.hasActivity && (
          <Card className="glass-card shadow-xl border-gray-200/50 dark:border-gray-700/50 card-hover">
            <CardHeader className="border-b border-gray-100/50 dark:border-gray-700/50 bg-gradient-to-r from-primary-50/30 via-white/50 to-accent-teal-50/30 dark:from-gray-900/50 dark:via-gray-950/50 dark:to-accent-teal-900/50 backdrop-blur-sm rounded-t-xl">
              <CardTitle className="text-2xl font-bold gradient-text">Getting Started</CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400 mt-1">
                Follow these steps to begin your predictive maintenance analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="text-center group">
                  <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-500/25 transition-transform duration-300 group-hover:scale-110">
                    <Upload className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-3 text-lg">
                    1. Upload Baseline
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                    Upload your baseline dataset to establish normal patterns
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="glass-card hover:shadow-lg"
                  >
                    <Link href="/dashboard/dinsight-analysis">Get Started</Link>
                  </Button>
                </div>

                <div className="text-center group">
                  <div className="w-16 h-16 bg-gradient-to-br from-accent-teal-500 to-accent-teal-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-accent-teal-500/25 transition-transform duration-300 group-hover:scale-110">
                    <Database className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-3 text-lg">
                    2. Add Monitoring Data
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                    Upload monitoring data from your equipment
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="glass-card hover:shadow-lg"
                  >
                    <Link href="/dashboard/visualization">Compare Data</Link>
                  </Button>
                </div>

                <div className="text-center group">
                  <div className="w-16 h-16 bg-gradient-to-br from-accent-purple-500 to-accent-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-accent-purple-500/25 transition-transform duration-300 group-hover:scale-110">
                    <Microscope className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-3 text-lg">
                    3. Detect Issues
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                    Run anomaly detection to identify potential issues
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="glass-card hover:shadow-lg"
                  >
                    <Link href="/dashboard/analysis">Analyze Now</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Current Configuration */}
        {data.config && (
          <Card className="glass-card shadow-xl border-gray-200/50 dark:border-gray-700/50 card-hover">
            <CardHeader className="border-b border-gray-100/50 dark:border-gray-700/50 bg-gradient-to-r from-primary-50/30 via-white/50 to-accent-purple-50/30 dark:from-gray-900/50 dark:via-gray-950/50 dark:to-gray-900/50 backdrop-blur-sm rounded-t-xl">
              <CardTitle className="text-2xl font-bold gradient-text">
                Current Configuration
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400 mt-1">
                Analysis settings overview
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-card p-4 bg-gradient-to-br from-primary-50/50 to-primary-100/30 dark:from-primary-950/50 dark:to-primary-900/30 border border-primary-200/50 dark:border-primary-700/50 rounded-xl">
                  <span className="text-sm font-medium text-primary-700 dark:text-primary-300 block mb-1">
                    Optimizer
                  </span>
                  <span className="text-lg font-bold text-primary-900 dark:text-primary-100 capitalize">
                    {data.config.optimizer || 'adam'}
                  </span>
                </div>
                <div className="glass-card p-4 bg-gradient-to-br from-accent-teal-50/50 to-accent-teal-100/30 dark:from-accent-teal-950/50 dark:to-accent-teal-900/30 border border-accent-teal-200/50 dark:border-accent-teal-700/50 rounded-xl">
                  <span className="text-sm font-medium text-accent-teal-700 dark:text-accent-teal-300 block mb-1">
                    Alpha
                  </span>
                  <span className="text-lg font-bold text-accent-teal-900 dark:text-accent-teal-100">
                    {data.config.alpha || '0.1'}
                  </span>
                </div>
                <div className="glass-card p-4 bg-gradient-to-br from-accent-purple-50/50 to-accent-purple-100/30 dark:from-accent-purple-950/50 dark:to-accent-purple-900/30 border border-accent-purple-200/50 dark:border-accent-purple-700/50 rounded-xl">
                  <span className="text-sm font-medium text-accent-purple-700 dark:text-accent-purple-300 block mb-1">
                    Gamma0
                  </span>
                  <span className="text-lg font-bold text-accent-purple-900 dark:text-accent-purple-100 font-mono">
                    {data.config.gamma0 || '1e-7'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
