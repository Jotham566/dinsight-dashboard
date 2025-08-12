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
    color: 'bg-blue-500 hover:bg-blue-600',
  },
  {
    title: 'Compare Data',
    description: 'Visualize and compare baseline vs monitoring datasets',
    href: '/dashboard/visualization',
    icon: LineChart,
    color: 'bg-green-500 hover:bg-green-600',
  },
  {
    title: 'Detect Anomalies',
    description: 'Run anomaly detection between datasets',
    href: '/dashboard/analysis',
    icon: Microscope,
    color: 'bg-purple-500 hover:bg-purple-600',
  },
  {
    title: 'Explore Features',
    description: 'Examine raw feature data with heatmaps',
    href: '/dashboard/features',
    icon: Database,
    color: 'bg-orange-500 hover:bg-orange-600',
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
      // Use existing endpoints that actually work
      const promises = [
        api.organizations.list().catch(() => ({ data: { data: [] } })),
        api.analysis.getConfig().catch(() => null),
      ];
      
      const [orgRes, configRes] = await Promise.allSettled(promises);
      
      // No mock data - show empty state until we have real activity tracking
      setData({
        organizations: orgRes.status === 'fulfilled' && orgRes.value ? orgRes.value.data.data : [],
        config: configRes.status === 'fulfilled' && configRes.value ? configRes.value.data.data : null,
        totalUploads: 0, // This would need a proper endpoint
        recentActivity: [], // Empty - no mock data
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
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'processing':
        return <Clock className="h-6 w-6 text-yellow-500 animate-pulse" />;
      case 'failed':
        return <AlertCircle className="h-6 w-6 text-red-500" />;
      default:
        return <Clock className="h-6 w-6 text-gray-500" />;
    }
  };
  
  const isLoading = Object.values(loading).some(Boolean);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}!
          </h1>
          <p className="text-gray-600 mt-2">
            Manage your DInsight predictive maintenance analysis workflows.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
            Refresh
          </Button>
          <Button asChild className="bg-blue-600 hover:bg-blue-700">
            <Link href="/dashboard/data-summary">
              <Plus className="w-4 h-4 mr-2" />
              New Analysis
            </Link>
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-gray-700">Organizations</CardTitle>
            <div className="p-2 bg-blue-100 rounded-lg">
              <Database className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            {loading.organizations ? (
              <div className="h-8 bg-gray-200 rounded animate-pulse" />
            ) : (
              <div className="text-3xl font-bold text-gray-900">
                {data.organizations.length}
              </div>
            )}
            <p className="text-sm text-gray-500 mt-2">
              Connected organizations
            </p>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-gray-700">System Status</CardTitle>
            <div className="p-2 bg-green-100 rounded-lg">
              <Activity className="h-5 w-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              Online
            </div>
            <p className="text-sm text-green-600 mt-2 flex items-center">
              <CheckCircle className="h-3 w-3 mr-1" />
              All systems operational
            </p>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-gray-700">Configuration</CardTitle>
            <div className="p-2 bg-purple-100 rounded-lg">
              <Settings className="h-5 w-5 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            {loading.config ? (
              <div className="h-8 bg-gray-200 rounded animate-pulse" />
            ) : (
              <div className="text-3xl font-bold text-gray-900">
                {data.config ? 'Set' : 'Default'}
              </div>
            )}
            <p className="text-sm text-gray-500 mt-2">
              Analysis configuration
            </p>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-gray-700">Recent Activity</CardTitle>
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Activity className="h-5 w-5 text-yellow-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              0
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Actions this period
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Card key={action.title} className="border border-gray-200 hover:border-gray-300 transition-colors">
                <CardContent className="p-6">
                  <Link href={action.href} className="block">
                    <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center mb-4', action.color)}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">{action.title}</h3>
                    <p className="text-sm text-gray-600">{action.description}</p>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest system activity and analysis results</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/analysis">View All</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.recentActivity.length === 0 ? (
                  <div className="text-center py-8">
                    <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Recent Activity</h3>
                    <p className="text-gray-500 mb-4">
                      Start by uploading your data to begin analysis.
                    </p>
                    <Button asChild>
                      <Link href="/dashboard/data-summary">
                        <Plus className="w-4 h-4 mr-2" />
                        Upload Data
                      </Link>
                    </Button>
                  </div>
                ) : (
                  data.recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          {getStatusIcon(activity.status)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {activity.action}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatRelativeTime(activity.timestamp)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href="/dashboard/visualization">
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* System Information */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>System Information</CardTitle>
              <CardDescription>Current system configuration and status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Analysis Engine</span>
                <span className="text-sm text-green-600 flex items-center">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Active
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Optimizer</span>
                <span className="text-sm text-gray-900">
                  {data.config?.optimizer || 'adam'}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Alpha Value</span>
                <span className="text-sm text-gray-900">
                  {data.config?.alpha || '0.1'}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Gamma0 Value</span>
                <span className="text-sm text-gray-900">
                  {data.config?.gamma0 || '1e-7'}
                </span>
              </div>
              
              <div className="pt-4 border-t">
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/dashboard/data-summary">
                    <Settings className="w-4 h-4 mr-2" />
                    Configure Analysis
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Getting Started Guide */}
      <Card>
        <CardHeader>
          <CardTitle>Getting Started with DInsight</CardTitle>
          <CardDescription>Follow these steps to begin your predictive maintenance analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Upload className="w-6 h-6 text-blue-600" />
                <span className="absolute -top-1 -right-1 w-6 h-6 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">1</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Upload Baseline Data</h3>
              <p className="text-sm text-gray-600 mb-4">
                Upload your baseline dataset to establish normal operational patterns
              </p>
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/data-summary">
                  Upload Data
                </Link>
              </Button>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 relative">
                <Database className="w-6 h-6 text-green-600" />
                <span className="absolute -top-1 -right-1 w-6 h-6 bg-green-600 text-white text-xs rounded-full flex items-center justify-center">2</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Add Monitoring Data</h3>
              <p className="text-sm text-gray-600 mb-4">
                Upload monitoring data from your equipment to compare against baseline
              </p>
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/visualization">
                  Compare Data
                </Link>
              </Button>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4 relative">
                <Microscope className="w-6 h-6 text-purple-600" />
                <span className="absolute -top-1 -right-1 w-6 h-6 bg-purple-600 text-white text-xs rounded-full flex items-center justify-center">3</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Detect Anomalies</h3>
              <p className="text-sm text-gray-600 mb-4">
                Run anomaly detection to identify potential equipment issues
              </p>
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/analysis">
                  Analyze
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}