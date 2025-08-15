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

// Core dashboard actions
const quickActions = [
  {
    title: 'Upload Dataset',
    description: 'Upload baseline or monitoring data',
    href: '/dashboard/dinsight-analysis',
    icon: Upload,
    color: 'bg-blue-500 hover:bg-blue-600',
  },
  {
    title: 'Compare Data',
    description: 'Visualize dataset comparisons',
    href: '/dashboard/visualization',
    icon: LineChart,
    color: 'bg-emerald-500 hover:bg-emerald-600',
  },
  {
    title: 'Detect Anomalies',
    description: 'Run anomaly detection analysis',
    href: '/dashboard/analysis',
    icon: Microscope,
    color: 'bg-purple-500 hover:bg-purple-600',
  },
  {
    title: 'Explore Features',
    description: 'Examine feature data with heatmaps',
    href: '/dashboard/features',
    icon: Database,
    color: 'bg-orange-500 hover:bg-orange-600',
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
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Welcome back{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}!
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Predictive maintenance dashboard</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="rounded-lg"
          >
            <RefreshCw className={cn('w-4 h-4 mr-2', isRefreshing && 'animate-spin')} />
            Refresh
          </Button>
          <Button asChild className="rounded-lg">
            <Link href="/dashboard/dinsight-analysis">
              <Plus className="w-4 h-4 mr-2" />
              New Analysis
            </Link>
          </Button>
        </div>
      </div>

      {/* System Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <Activity className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                Operational
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Configuration</CardTitle>
            <Database className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-5 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
            ) : (
              <span className="text-sm font-medium">
                {data.config ? 'Configured' : 'Default Settings'}
              </span>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
            <BarChart3 className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <span className="text-sm font-medium">
              {data.hasActivity ? 'Active' : 'No recent activity'}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.title}
                href={action.href}
                className="group block p-4 rounded-lg border border-gray-200 dark:border-gray-800 hover:shadow-md transition-all hover:-translate-y-0.5"
              >
                <div
                  className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center mb-3',
                    action.color
                  )}
                >
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1 flex items-center">
                  {action.title}
                  <ArrowUpRight className="w-4 h-4 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{action.description}</p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Getting Started */}
      {!data.hasActivity && (
        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>
              Follow these steps to begin your predictive maintenance analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Upload className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  1. Upload Baseline
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Upload your baseline dataset to establish normal patterns
                </p>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard/dinsight-analysis">Get Started</Link>
                </Button>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-emerald-500 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Database className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  2. Add Monitoring Data
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Upload monitoring data from your equipment
                </p>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard/visualization">Compare Data</Link>
                </Button>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Microscope className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  3. Detect Issues
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Run anomaly detection to identify potential issues
                </p>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard/analysis">Analyze Now</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Configuration */}
      {data.config && (
        <Card>
          <CardHeader>
            <CardTitle>Current Configuration</CardTitle>
            <CardDescription>Analysis settings overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex justify-between py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Optimizer
                </span>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {data.config.optimizer || 'adam'}
                </span>
              </div>
              <div className="flex justify-between py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Alpha</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {data.config.alpha || '0.1'}
                </span>
              </div>
              <div className="flex justify-between py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Gamma0</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {data.config.gamma0 || '1e-7'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
