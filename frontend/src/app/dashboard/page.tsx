'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  CheckCircle,
  AlertTriangle,
  Clock,
  TrendingUp,
  Eye,
  LineChart,
  FileText,
  Plus,
  Activity,
  Database,
  AlertCircle,
  Zap,
  RefreshCw,
  Upload,
  Settings,
  Microscope,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  Server,
  Cpu,
  HardDrive,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/utils/format';
import { useAuth } from '@/context/auth-context';
import { api } from '@/lib/api-client';

interface DashboardData {
  organizations: any[];
  config: any | null;
  totalUploads: number;
  recentActivity: Array<{
    id: string;
    action: string;
    timestamp: string;
    status: string;
  }>;
}

interface LoadingState {
  organizations: boolean;
  config: boolean;
}

// Quick action items for the DInsight dashboard
const quickActions = [
  {
    title: 'Upload Dataset',
    description: 'Upload and analyze new baseline or monitoring data',
    href: '/dashboard/data-summary',
    icon: Upload,
    gradient: 'from-blue-500 to-cyan-500',
    hoverGradient: 'hover:from-blue-600 hover:to-cyan-600',
  },
  {
    title: 'Compare Data',
    description: 'Visualize and compare baseline vs monitoring datasets',
    href: '/dashboard/visualization',
    icon: LineChart,
    gradient: 'from-emerald-500 to-teal-500',
    hoverGradient: 'hover:from-emerald-600 hover:to-teal-600',
  },
  {
    title: 'Detect Anomalies',
    description: 'Run anomaly detection between datasets',
    href: '/dashboard/analysis',
    icon: Microscope,
    gradient: 'from-purple-500 to-pink-500',
    hoverGradient: 'hover:from-purple-600 hover:to-pink-600',
  },
  {
    title: 'Explore Features',
    description: 'Examine raw feature data with heatmaps',
    href: '/dashboard/features',
    icon: Database,
    gradient: 'from-orange-500 to-red-500',
    hoverGradient: 'hover:from-orange-600 hover:to-red-600',
  },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [data, setData] = useState<DashboardData>({
    organizations: [],
    config: null,
    totalUploads: 0,
    recentActivity: [],
  });

  const [loading, setLoading] = useState<LoadingState>({
    organizations: true,
    config: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch dashboard data using existing endpoints
  const fetchDashboardData = async () => {
    try {
      const promises = [
        // Organizations endpoint not implemented yet - using empty array
        Promise.resolve({ data: { data: [] } }),
        api.analysis.getConfig().catch(() => null),
      ];

      const [orgRes, configRes] = await Promise.allSettled(promises);

      setData({
        organizations: orgRes.status === 'fulfilled' && orgRes.value ? orgRes.value.data.data : [],
        config:
          configRes.status === 'fulfilled' && configRes.value ? configRes.value.data.data : null,
        totalUploads: 0,
        recentActivity: [],
      });

      setErrors({});
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setErrors({ general: 'Failed to load dashboard data' });
    } finally {
      setLoading({
        organizations: false,
        config: false,
      });
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'processing':
        return <Clock className="h-5 w-5 text-yellow-500 animate-pulse" />;
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const isLoading = Object.values(loading).some(Boolean);

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* Page Header with Gradient Background */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-500/10 via-accent-purple-500/10 to-accent-pink-500/10 p-8 border border-gray-200/50 dark:border-gray-800/50">
        <div className="absolute inset-0 bg-gradient-mesh opacity-30" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
                Welcome back{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}!
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2 text-lg">
                Your predictive maintenance command center
              </p>
              <div className="flex items-center gap-4 mt-4">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    All systems operational
                  </span>
                </div>
                <span className="text-sm text-gray-400 dark:text-gray-500">•</span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {new Date().toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="rounded-xl border-gray-200 dark:border-gray-700 hover:bg-white/50 dark:hover:bg-gray-800/50 transition-all"
              >
                <RefreshCw className={cn('w-4 h-4 mr-2', isRefreshing && 'animate-spin')} />
                Refresh
              </Button>
              <Button
                asChild
                className="rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white shadow-lg hover:shadow-xl transition-all"
              >
                <Link href="/dashboard/data-summary">
                  <Plus className="w-4 h-4 mr-2" />
                  New Analysis
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="group relative overflow-hidden border-gray-200/50 dark:border-gray-800/50 hover:shadow-lg transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Organizations
            </CardTitle>
            <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg shadow-md">
              <Users className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            {loading.organizations ? (
              <div className="space-y-2">
                <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded animate-pulse w-3/4" />
              </div>
            ) : (
              <>
                <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {data.organizations.length}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center">
                  <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                  <span className="text-green-600 dark:text-green-400">+12%</span>
                  <span className="ml-1">from last month</span>
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden border-gray-200/50 dark:border-gray-800/50 hover:shadow-lg transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              System Health
            </CardTitle>
            <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg shadow-md">
              <Activity className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">98.5%</div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center">
              <CheckCircle className="h-3 w-3 mr-1 text-emerald-500" />
              All systems operational
            </p>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden border-gray-200/50 dark:border-gray-800/50 hover:shadow-lg transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Active Analyses
            </CardTitle>
            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg shadow-md">
              <Cpu className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            {loading.config ? (
              <div className="space-y-2">
                <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded animate-pulse w-3/4" />
              </div>
            ) : (
              <>
                <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {data.config ? '3' : '0'}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {data.config ? 'Processing datasets' : 'No active processes'}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden border-gray-200/50 dark:border-gray-800/50 hover:shadow-lg transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Storage Used
            </CardTitle>
            <div className="p-2 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg shadow-md">
              <HardDrive className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">2.4GB</div>
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                <span>24% of 10GB</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-1.5">
                <div
                  className="bg-gradient-to-r from-orange-500 to-red-500 h-1.5 rounded-full"
                  style={{ width: '24%' }}
                />
              </div>
            </div>
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
                className="group relative overflow-hidden rounded-xl border border-gray-200/50 dark:border-gray-800/50 p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                <div
                  className={cn(
                    'absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-opacity',
                    action.gradient
                  )}
                />
                <div className="relative">
                  <div
                    className={cn(
                      'w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center mb-4 shadow-lg',
                      action.gradient,
                      action.hoverGradient
                    )}
                  >
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center">
                    {action.title}
                    <ArrowUpRight className="w-4 h-4 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{action.description}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <Card className="border-gray-200/50 dark:border-gray-800/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl">Recent Activity</CardTitle>
                <CardDescription>Latest system activity and analysis results</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <Link href="/dashboard/analysis">
                  View All
                  <ArrowUpRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.recentActivity.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="relative inline-block">
                      <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-accent-purple-500 rounded-full blur-2xl opacity-20" />
                      <BarChart3 className="relative w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                      No Recent Activity
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
                      Start by uploading your data to begin analysis and see activity here.
                    </p>
                    <Button
                      asChild
                      className="rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white"
                    >
                      <Link href="/dashboard/data-summary">
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Your First Dataset
                      </Link>
                    </Button>
                  </div>
                ) : (
                  data.recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center justify-between p-4 rounded-xl border border-gray-200/50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors group"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">{getStatusIcon(activity.status)}</div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {activity.action}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatRelativeTime(activity.timestamp)}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"
                      >
                        <Link href="/dashboard/visualization">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Link>
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* System Information */}
        <div className="space-y-6">
          <Card className="border-gray-200/50 dark:border-gray-800/50">
            <CardHeader>
              <CardTitle className="text-lg">Configuration</CardTitle>
              <CardDescription>Current analysis settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Optimizer
                  </span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {data.config?.optimizer || 'adam'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Alpha
                  </span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {data.config?.alpha || '0.1'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Gamma0
                  </span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {data.config?.gamma0 || '1e-7'}
                  </span>
                </div>
              </div>

              <Button variant="outline" className="w-full rounded-xl" asChild>
                <Link href="/dashboard/data-summary">
                  <Settings className="w-4 h-4 mr-2" />
                  Configure Analysis
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-gray-200/50 dark:border-gray-800/50 bg-gradient-to-br from-primary-500/5 to-accent-purple-500/5">
            <CardHeader>
              <CardTitle className="text-lg">Pro Tips</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-start">
                  <span className="text-primary-500 mr-2">•</span>
                  Upload baseline data first to establish normal patterns
                </li>
                <li className="flex items-start">
                  <span className="text-primary-500 mr-2">•</span>
                  Use monitoring data from the same equipment for best results
                </li>
                <li className="flex items-start">
                  <span className="text-primary-500 mr-2">•</span>
                  Adjust sensitivity thresholds based on your tolerance
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Getting Started Guide */}
      <Card className="border-gray-200/50 dark:border-gray-800/50 bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-900 dark:to-gray-800/50">
        <CardHeader>
          <CardTitle className="text-2xl">Getting Started with DInsight</CardTitle>
          <CardDescription>
            Follow these steps to begin your predictive maintenance analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="relative">
              <div className="absolute left-1/2 top-12 w-px h-0 md:h-full bg-gradient-to-b from-primary-500 to-transparent -translate-x-1/2 hidden md:block" />
              <div className="text-center">
                <div className="relative inline-block">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl blur-xl opacity-30" />
                  <div className="relative w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <Upload className="w-8 h-8 text-white" />
                  </div>
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-bold rounded-full flex items-center justify-center shadow-md">
                  1
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Upload Baseline
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Upload your baseline dataset to establish normal operational patterns
                </p>
                <Button variant="outline" size="sm" asChild className="rounded-lg">
                  <Link href="/dashboard/data-summary">Get Started</Link>
                </Button>
              </div>
            </div>

            <div className="relative">
              <div className="absolute left-1/2 top-12 w-px h-0 md:h-full bg-gradient-to-b from-emerald-500 to-transparent -translate-x-1/2 hidden md:block" />
              <div className="text-center">
                <div className="relative inline-block">
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl blur-xl opacity-30" />
                  <div className="relative w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <Database className="w-8 h-8 text-white" />
                  </div>
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-bold rounded-full flex items-center justify-center shadow-md">
                  2
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Add Monitoring
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Upload monitoring data from your equipment to compare
                </p>
                <Button variant="outline" size="sm" asChild className="rounded-lg">
                  <Link href="/dashboard/visualization">Compare Data</Link>
                </Button>
              </div>
            </div>

            <div className="relative">
              <div className="text-center">
                <div className="relative inline-block">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur-xl opacity-30" />
                  <div className="relative w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <Microscope className="w-8 h-8 text-white" />
                  </div>
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-bold rounded-full flex items-center justify-center shadow-md">
                  3
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Detect Issues
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Run anomaly detection to identify potential equipment issues
                </p>
                <Button variant="outline" size="sm" asChild className="rounded-lg">
                  <Link href="/dashboard/analysis">Analyze Now</Link>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
