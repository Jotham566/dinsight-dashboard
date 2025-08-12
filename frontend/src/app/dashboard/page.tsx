'use client';

import { useState } from 'react';
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
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';
import { formatRelativeTime } from '@/utils/format';

// Mock data - in a real app, this would come from APIs
const mockStats = {
  totalAnalyses: 24,
  systemUptime: 98.5,
  activeAlerts: 3,
};

const mockRecentAnalyses = [
  {
    id: 1,
    datasetName: 'Baseline Dataset 001',
    analysisType: 'Baseline Analysis',
    status: 'completed',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
  },
  {
    id: 2,
    datasetName: 'Monitoring Dataset 003',
    analysisType: 'Monitoring Update',
    status: 'completed',
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
  },
  {
    id: 3,
    datasetName: 'Comparison Dataset 002',
    analysisType: 'Anomaly Detection',
    status: 'processing',
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
  },
];

const mockActiveAlerts = [
  {
    id: 1,
    severity: 'high',
    title: 'Dataset Analysis - High Anomaly Rate',
    message: 'Anomaly percentage (18.5%) exceeded threshold (15%)',
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
  },
  {
    id: 2,
    severity: 'medium',
    title: 'Monitoring Data - Drift Detected',
    message: 'Data drift detected in monitoring results',
    createdAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(), // 1.5 hours ago
  },
  {
    id: 3,
    severity: 'low',
    title: 'System Maintenance - Due',
    message: 'Scheduled system maintenance reminder',
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
  },
];

const mockDatasetHealth = [
  {
    id: 1,
    name: 'Baseline Dataset 001',
    status: 'critical',
    lastAnalysis: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 2,
    name: 'Monitoring Dataset 003',
    status: 'warning',
    lastAnalysis: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 3,
    name: 'Comparison Dataset 002',
    status: 'healthy',
    lastAnalysis: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  },
];

export default function DashboardPage() {
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'critical':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'text-red-600 bg-red-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'low':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">
            Welcome back! Here's what's happening with your dataset analysis system.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          >
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>
          <Button asChild>
            <Link href="/dashboard/data-summary">
              <Plus className="w-4 h-4 mr-2" />
              Upload Data
            </Link>
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Analyses</CardTitle>
            <BarChart3 className="h-4 w-4 text-primary-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStats.totalAnalyses}</div>
            <p className="text-xs text-green-600 flex items-center mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStats.systemUptime}%</div>
            <p className="text-xs text-green-600 mt-1">All systems operational</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{mockStats.activeAlerts}</div>
            <p className="text-xs text-red-600 mt-1">1 critical, 2 moderate</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Analyses */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Analyses</CardTitle>
                <CardDescription>Latest dataset analysis results</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/analysis">View All</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockRecentAnalyses.map((analysis) => (
                  <div
                    key={analysis.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        {analysis.status === 'completed' ? (
                          <CheckCircle className="h-8 w-8 text-green-500" />
                        ) : (
                          <Clock className="h-8 w-8 text-yellow-500 animate-spin-slow" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {analysis.datasetName} - {analysis.analysisType}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatRelativeTime(analysis.createdAt)}
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
                      <Button variant="ghost" size="sm" asChild>
                        <Link href="/dashboard/visualization">
                          <LineChart className="h-4 w-4 mr-1" />
                          Visualize
                        </Link>
                      </Button>
                      <Button variant="ghost" size="sm">
                        <FileText className="h-4 w-4 mr-1" />
                        Report
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active Alerts */}
        <div>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Active Alerts</CardTitle>
                <CardDescription>Requires your attention</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/alerts">Manage All</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockActiveAlerts.map((alert) => (
                  <div key={alert.id} className="p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <span
                        className={cn(
                          'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                          getSeverityColor(alert.severity)
                        )}
                      >
                        {alert.severity.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatRelativeTime(alert.createdAt)}
                      </span>
                    </div>
                    <h4 className="text-sm font-medium text-gray-900 mb-1">{alert.title}</h4>
                    <p className="text-sm text-gray-600 mb-3">{alert.message}</p>
                    <Button variant="outline" size="sm" className="w-full">
                      Acknowledge
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dataset Health Overview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Dataset Health Overview</CardTitle>
            <CardDescription>Current status of all monitored datasets</CardDescription>
          </div>
          <Button variant="outline" asChild>
            <Link href="/dashboard/data-summary">
              <Plus className="w-4 h-4 mr-2" />
              Add Dataset
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mockDatasetHealth.map((dataset) => (
              <div key={dataset.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-900">{dataset.name}</h3>
                  <span
                    className={cn(
                      'w-3 h-3 rounded-full',
                      dataset.status === 'healthy'
                        ? 'bg-green-500'
                        : dataset.status === 'warning'
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                    )}
                  />
                </div>
                <p
                  className={cn(
                    'text-sm font-medium mb-2 capitalize',
                    dataset.status === 'healthy'
                      ? 'text-green-600'
                      : dataset.status === 'warning'
                        ? 'text-yellow-600'
                        : 'text-red-600'
                  )}
                >
                  {dataset.status}
                </p>
                <p className="text-xs text-gray-500 mb-3">
                  Last analysis: {formatRelativeTime(dataset.lastAnalysis)}
                </p>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/dashboard/visualization">
                      <Eye className="w-3 h-3 mr-1" />
                      View
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/dashboard/visualization">
                      <LineChart className="w-3 h-3 mr-1" />
                      Charts
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
