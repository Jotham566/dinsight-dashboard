'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

// Icons
import {
  Activity,
  Play,
  Pause,
  Square,
  RefreshCw,
  Settings,
  BarChart3,
  Zap,
  Clock,
  Eye,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

// Utils and API
import { apiClient } from '@/lib/api-client';
import { cn } from '@/utils/cn';

// Dynamically import Plot to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

// Types
interface Dataset {
  dinsight_id: number;
  name: string;
  records: number;
}

interface StreamingStatus {
  baseline_id: number;
  total_points: number;
  streamed_points: number;
  progress_percentage: number;
  baseline_points: number;
  is_active: boolean;
  last_update: string;
  stream_start_time?: string;
}

interface DinsightData {
  baseline: {
    dinsight_x: number[];
    dinsight_y: number[];
    labels: string[];
  };
  monitoring: {
    dinsight_x: number[];
    dinsight_y: number[];
    labels: string[];
    timestamps: string[];
  };
}

export default function StreamingVisualizationPage() {
  // State management
  const [selectedDinsightId, setSelectedDinsightId] = useState<number | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingStatus, setStreamingStatus] = useState<StreamingStatus | null>(null);
  const [pointSize, setPointSize] = useState<number>(6);
  const [showContours, setShowContours] = useState<boolean>(false);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [refreshInterval, setRefreshInterval] = useState<number>(2000); // 2 seconds
  const [streamSpeed, setStreamSpeed] = useState<'0.5x' | '1x' | '2x'>('1x');
  const [batchSize, setBatchSize] = useState<number>(10);
  const [plotElement, setPlotElement] = useState<any>(null);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Update refreshInterval when streamSpeed changes
  useEffect(() => {
    if (streamSpeed === '2x') setRefreshInterval(1000);
    else if (streamSpeed === '0.5x') setRefreshInterval(4000);
    else setRefreshInterval(2000);
  }, [streamSpeed]);

  // Handler for batch size change
  const handleBatchSizeChange = (value: number) => {
    setBatchSize(value);
    setNotification({
      type: 'info',
      message: `Batch size set to ${value}`,
    });
    // Optionally, send batch size to backend if needed
  };

  // Query for available dinsight datasets
  const {
    data: availableDinsightIds,
    isLoading: datasetsLoading,
    refetch: refetchDatasets,
  } = useQuery<Dataset[]>({
    queryKey: ['available-dinsight-ids'],
    queryFn: async (): Promise<Dataset[]> => {
      try {
        const validDatasets: Dataset[] = [];
        for (let i = 1; i <= 10; i++) {
          try {
            const response = await apiClient.get(`/dinsight/${i}`);
            if (response.data.success && response.data.data) {
              const data = response.data.data;
              validDatasets.push({
                dinsight_id: i,
                name: `Dataset ${i}`,
                records: data.dinsight_x?.length || 0,
              });
            }
          } catch (error) {
            // Dataset doesn't exist, continue
          }
        }
        return validDatasets;
      } catch (error) {
        console.warn('Failed to fetch available dinsight IDs:', error);
        return [];
      }
    },
  });

  // Auto-select latest dataset
  useEffect(() => {
    if (availableDinsightIds && availableDinsightIds.length > 0 && selectedDinsightId === null) {
      const latestDataset = availableDinsightIds.reduce((latest, current) =>
        current.dinsight_id > latest.dinsight_id ? current : latest
      );
      setSelectedDinsightId(latestDataset.dinsight_id);
    }
  }, [availableDinsightIds, selectedDinsightId]);

  // Query for streaming status
  const { data: statusData, refetch: refetchStatus } = useQuery({
    queryKey: ['streaming-status', selectedDinsightId],
    queryFn: async () => {
      if (!selectedDinsightId) return null;

      try {
        const response = await apiClient.get(`/streaming/${selectedDinsightId}/status`);
        return response.data.success ? response.data.data : null;
      } catch (error) {
        console.warn('Failed to fetch streaming status:', error);
        return null;
      }
    },
    enabled: !!selectedDinsightId,
    refetchInterval: autoRefresh ? refreshInterval : false,
  });

  // Query for baseline and monitoring data
  const {
    data: dinsightData,
    isLoading: dataLoading,
    refetch: refetchData,
  } = useQuery({
    queryKey: ['streaming-dinsight-data', selectedDinsightId],
    queryFn: async (): Promise<DinsightData | null> => {
      if (!selectedDinsightId) return null;

      try {
        // Fetch baseline and monitoring data separately
        const [baselineResponse, monitoringResponse] = await Promise.all([
          apiClient.get(`/dinsight/${selectedDinsightId}`),
          apiClient.get(`/monitor/${selectedDinsightId}/coordinates`),
        ]);

        const baselineData = baselineResponse.data.data;
        const monitoringData = monitoringResponse.data;

        return {
          baseline: {
            dinsight_x: baselineData.dinsight_x || [],
            dinsight_y: baselineData.dinsight_y || [],
            labels: (baselineData.dinsight_x || []).map((_: any, i: number) => `baseline_${i}`),
          },
          monitoring: {
            dinsight_x: monitoringData.dinsight_x || [],
            dinsight_y: monitoringData.dinsight_y || [],
            labels: (monitoringData.dinsight_x || []).map((_: any, i: number) => `monitor_${i}`),
            timestamps: (monitoringData.dinsight_x || []).map(() => new Date().toISOString()),
          },
        };
      } catch (error) {
        console.warn(`Failed to fetch streaming data for ID ${selectedDinsightId}:`, error);
        return null;
      }
    },
    enabled: !!selectedDinsightId,
    refetchInterval: autoRefresh ? refreshInterval : false,
  });

  // Update streaming status when data changes
  useEffect(() => {
    if (statusData) {
      setStreamingStatus(statusData);
      setIsStreaming(statusData.is_active);
    }
  }, [statusData]);

  // Auto-hide notification after 3 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Create plot data
  const createPlotData = useCallback(() => {
    const data: any[] = [];

    if (!dinsightData) return data;

    // Baseline data (always show)
    if (dinsightData.baseline.dinsight_x.length > 0) {
      const baselineTrace = {
        x: dinsightData.baseline.dinsight_x,
        y: dinsightData.baseline.dinsight_y,
        mode: 'markers' as const,
        type: 'scattergl' as const,
        name: 'Baseline (Reference)',
        marker: {
          color: '#1A73E8',
          size: pointSize,
          opacity: 0.6,
          line: { width: 1, color: 'rgba(0,0,0,0.2)' },
        },
        hovertemplate: '<b>Baseline</b><br>X: %{x:.6f}<br>Y: %{y:.6f}<extra></extra>',
      };
      data.push(baselineTrace);

      // Add contour plot for baseline if enabled
      if (showContours && dinsightData.baseline.dinsight_x.length > 10) {
        data.push({
          x: dinsightData.baseline.dinsight_x,
          y: dinsightData.baseline.dinsight_y,
          type: 'histogram2dcontour',
          name: 'Baseline Density',
          showlegend: false,
          colorscale: [
            [0, 'rgba(59, 130, 246, 0)'],
            [1, 'rgba(59, 130, 246, 0.3)'],
          ],
          contours: {
            showlines: false,
          },
          hoverinfo: 'skip',
        });
      }
    }

    // Streaming monitoring data
    if (dinsightData.monitoring.dinsight_x.length > 0) {
      const monitoringTrace = {
        x: dinsightData.monitoring.dinsight_x,
        y: dinsightData.monitoring.dinsight_y,
        mode: 'markers' as const,
        type: 'scattergl' as const,
        name: `Live Monitoring (${dinsightData.monitoring.dinsight_x.length} points)`,
        marker: {
          color: '#DC2626',
          size: pointSize + 1,
          opacity: 0.8,
          line: { width: 1, color: 'rgba(255,255,255,0.8)' },
        },
        hovertemplate: '<b>Live Monitor</b><br>X: %{x:.6f}<br>Y: %{y:.6f}<extra></extra>',
      };
      data.push(monitoringTrace);

      // Add contour plot for monitoring if enabled
      if (showContours && dinsightData.monitoring.dinsight_x.length > 10) {
        data.push({
          x: dinsightData.monitoring.dinsight_x,
          y: dinsightData.monitoring.dinsight_y,
          type: 'histogram2dcontour',
          name: 'Monitoring Density',
          showlegend: false,
          colorscale: [
            [0, 'rgba(239, 68, 68, 0)'],
            [1, 'rgba(239, 68, 68, 0.3)'],
          ],
          contours: {
            showlines: false,
          },
          hoverinfo: 'skip',
        });
      }
    }

    return data;
  }, [dinsightData, pointSize, showContours]);

  // Plot layout configuration
  const plotLayout = useMemo(
    () => ({
      title: { text: '' },
      showlegend: true,
      hovermode: 'closest' as const,
      plot_bgcolor: 'white',
      paper_bgcolor: 'white',
      font: { family: 'Inter, sans-serif' },
      template: 'plotly_white' as any,
      legend: {
        orientation: 'h' as any,
        yanchor: 'bottom' as any,
        y: 1.02,
        xanchor: 'right' as any,
        x: 1,
      },
      xaxis: {
        title: { text: "D'insight X Coordinate" },
        gridcolor: '#f1f5f9',
        zerolinecolor: '#e2e8f0',
      },
      yaxis: {
        title: { text: "D'insight Y Coordinate" },
        gridcolor: '#f1f5f9',
        zerolinecolor: '#e2e8f0',
      },
      height: 600,
      margin: { l: 60, r: 30, t: 30, b: 60 },
    }),
    []
  );

  // Control functions
  const toggleStreaming = () => {
    setIsStreaming(!isStreaming);
    setAutoRefresh(!isStreaming);
    setNotification({
      type: 'info',
      message: isStreaming ? 'Streaming paused' : 'Streaming resumed',
    });
  };

  const stopStreaming = () => {
    setIsStreaming(false);
    setAutoRefresh(false);
    setNotification({
      type: 'info',
      message: 'Streaming stopped',
    });
  };

  const refreshData = () => {
    refetchData();
    refetchStatus();
    setNotification({
      type: 'success',
      message: 'Data refreshed',
    });
  };

  const resetStreaming = async () => {
    if (!selectedDinsightId) return;

    try {
      await apiClient.delete(`/streaming/${selectedDinsightId}/reset`);
      refetchData();
      refetchStatus();
      setNotification({
        type: 'success',
        message: 'Streaming data reset successfully',
      });
    } catch (error) {
      setNotification({
        type: 'error',
        message: 'Failed to reset streaming data',
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Notification */}
      {notification && (
        <div
          className={cn(
            'fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg border backdrop-blur-sm transition-all duration-300',
            notification.type === 'success' &&
              'bg-green-50/90 dark:bg-green-950/90 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200',
            notification.type === 'error' &&
              'bg-red-50/90 dark:bg-red-950/90 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200',
            notification.type === 'info' &&
              'bg-blue-50/90 dark:bg-blue-950/90 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200'
          )}
        >
          <p className="text-sm font-medium">{notification.message}</p>
        </div>
      )}

      {/* Modern Header with Enhanced Gradient - Consistent with Dashboard */}
      <div className="sticky top-0 z-10 glass-card backdrop-blur-xl bg-white/80 dark:bg-gray-950/80 border-b border-gray-200/50 dark:border-gray-700/50 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/25">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold gradient-text">Real-Time Streaming</h1>
                <p className="text-gray-600 dark:text-gray-300 mt-1">
                  Monitor machine health in real-time with streaming sensor data
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="glass-card">
                <Activity className="w-3 h-3 mr-1" />
                Live
              </Badge>
              <Button
                variant="outline"
                onClick={refreshData}
                className="glass-card hover:shadow-lg transition-all duration-200"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Control Panel Row */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Dataset Selection */}
          <Card className="glass-card shadow-xl border-gray-200/50 dark:border-gray-700/50 card-hover">
            <CardHeader className="pb-3 bg-gradient-to-r from-primary-50/30 to-accent-teal-50/20 dark:from-primary-950/30 dark:to-accent-teal-950/20 rounded-t-xl">
              <CardTitle className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center shadow-lg shadow-primary-500/25">
                  <BarChart3 className="h-4 w-4 text-white" />
                </div>
                <span className="gradient-text">Dataset</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <select
                value={selectedDinsightId || ''}
                onChange={(e) => setSelectedDinsightId(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 text-gray-900 dark:text-gray-100"
                disabled={datasetsLoading}
              >
                {selectedDinsightId === null && <option value="">Select dataset...</option>}
                {datasetsLoading ? (
                  <option>Loading datasets...</option>
                ) : (
                  availableDinsightIds?.map((dataset) => (
                    <option key={dataset.dinsight_id} value={dataset.dinsight_id}>
                      {dataset.name} ({dataset.records} points)
                    </option>
                  ))
                )}
              </select>
            </CardContent>
          </Card>

          {/* Streaming Controls */}
          <Card className="glass-card shadow-xl border-gray-200/50 dark:border-gray-700/50 card-hover">
            <CardHeader className="pb-3 bg-gradient-to-r from-accent-teal-50/30 to-emerald-50/20 dark:from-accent-teal-950/30 dark:to-emerald-950/20 rounded-t-xl">
              <CardTitle className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-accent-teal-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-lg shadow-accent-teal-500/25">
                  <Activity className="h-4 w-4 text-white" />
                </div>
                <span className="gradient-text">Controls</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {/* Pause/Resume/Stop */}
              <div className="flex gap-2 mb-2">
                <Button
                  onClick={toggleStreaming}
                  className={cn(
                    'flex-1 transition-all duration-200',
                    isStreaming
                      ? 'bg-orange-500 hover:bg-orange-600 text-white'
                      : 'bg-green-500 hover:bg-green-600 text-white'
                  )}
                  disabled={!selectedDinsightId}
                >
                  {isStreaming ? (
                    <Pause className="w-4 h-4 mr-1" />
                  ) : (
                    <Play className="w-4 h-4 mr-1" />
                  )}
                  {isStreaming ? 'Pause' : 'Start'}
                </Button>
                <Button
                  onClick={stopStreaming}
                  variant="outline"
                  className="px-3"
                  disabled={!selectedDinsightId}
                >
                  <Square className="w-4 h-4" />
                </Button>
              </div>
              {/* Speed Controls */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">Speed:</span>
                <Button
                  variant={streamSpeed === '0.5x' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStreamSpeed('0.5x')}
                  className="px-2"
                >
                  0.5x
                </Button>
                <Button
                  variant={streamSpeed === '1x' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStreamSpeed('1x')}
                  className="px-2"
                >
                  1x
                </Button>
                <Button
                  variant={streamSpeed === '2x' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStreamSpeed('2x')}
                  className="px-2"
                >
                  2x
                </Button>
              </div>
              {/* Batch Size Controls */}
              <div className="mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Batch Size: {batchSize}
                </label>
                <input
                  type="range"
                  min={1}
                  max={100}
                  value={batchSize}
                  onChange={e => handleBatchSizeChange(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                />
              </div>
              <Button
                onClick={resetStreaming}
                variant="outline"
                className="w-full text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950"
                disabled={!selectedDinsightId}
              >
                Reset Data
              </Button>
            </CardContent>
          </Card>

          {/* Visualization Settings */}
          <Card className="glass-card shadow-xl border-gray-200/50 dark:border-gray-700/50 card-hover">
            <CardHeader className="pb-3 bg-gradient-to-r from-accent-purple-50/30 to-accent-pink-50/20 dark:from-accent-purple-950/30 dark:to-accent-pink-950/20 rounded-t-xl">
              <CardTitle className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-accent-purple-500 to-accent-pink-600 rounded-lg flex items-center justify-center shadow-lg shadow-accent-purple-500/25">
                  <Settings className="h-4 w-4 text-white" />
                </div>
                <span className="gradient-text">Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Point Size: {pointSize}px
                </label>
                <input
                  type="range"
                  min="2"
                  max="12"
                  value={pointSize}
                  onChange={(e) => setPointSize(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="contours"
                  checked={showContours}
                  onChange={(e) => setShowContours(e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <label htmlFor="contours" className="text-sm text-gray-700 dark:text-gray-300">
                  Show Density Contours
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="autoRefresh"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <label htmlFor="autoRefresh" className="text-sm text-gray-700 dark:text-gray-300">
                  Auto-refresh ({refreshInterval / 1000}s)
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Streaming Status */}
          <Card className="glass-card shadow-xl border-gray-200/50 dark:border-gray-700/50 card-hover">
            <CardHeader className="pb-3 bg-gradient-to-r from-orange-50/30 to-yellow-50/20 dark:from-orange-950/30 dark:to-yellow-950/20 rounded-t-xl">
              <CardTitle className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-yellow-600 rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/25">
                  <Clock className="h-4 w-4 text-white" />
                </div>
                <span className="gradient-text">Status</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {statusData ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Progress:</span>
                    <Badge
                      className={cn(
                        statusData.is_active
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                      )}
                    >
                      {statusData.progress_percentage?.toFixed(1)}%
                    </Badge>
                  </div>
                  <Progress value={statusData.progress_percentage || 0} className="w-full" />
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="text-center">
                      <div className="text-gray-500 dark:text-gray-400">Streamed</div>
                      <div className="font-semibold">{statusData.streamed_points || 0}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-500 dark:text-gray-400">Total</div>
                      <div className="font-semibold">{statusData.total_points || 0}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center py-4">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    No streaming data
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Visualization */}
        <Card className="glass-card shadow-xl border-gray-200/50 dark:border-gray-700/50 card-hover">
          <CardHeader className="border-b border-gray-100/50 dark:border-gray-700/50 bg-gradient-to-r from-primary-50/30 via-white/50 to-accent-purple-50/30 dark:from-gray-900/50 dark:via-gray-950/50 dark:to-gray-900/50 backdrop-blur-sm rounded-t-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/25">
                  <Eye className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold gradient-text">
                    Streaming Visualization
                  </CardTitle>
                  <CardDescription className="text-gray-600 dark:text-gray-300 mt-1">
                    Real-time sensor data visualization and monitoring
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedDinsightId && (
                  <Badge variant="outline" className="glass-card">
                    Dataset {selectedDinsightId}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {dataLoading ? (
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-primary-100 to-accent-teal-100 dark:from-primary-900 dark:to-accent-teal-900 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl">
                    <RefreshCw className="w-8 h-8 text-primary-600 dark:text-primary-400 animate-spin" />
                  </div>
                  <h3 className="text-lg font-semibold gradient-text mb-2">
                    Loading Streaming Data
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Fetching real-time coordinates...
                  </p>
                </div>
              </div>
            ) : dinsightData ? (
              <div className="relative">
                <Plot
                  data={createPlotData()}
                  layout={plotLayout}
                  style={{ width: '100%', height: '600px' }}
                  config={{
                    displayModeBar: true,
                    displaylogo: false,
                    modeBarButtonsToRemove: ['select2d', 'lasso2d'],
                    toImageButtonOptions: {
                      format: 'png',
                      filename: `streaming_visualization_${selectedDinsightId}_${new Date().toISOString().split('T')[0]}`,
                      height: 600,
                      width: 1200,
                      scale: 2,
                    },
                  }}
                  onInitialized={(figure, graphDiv) => setPlotElement(graphDiv)}
                />
                {isStreaming && (
                  <div className="absolute top-4 right-4 flex items-center gap-2 glass-card px-3 py-2 bg-green-50/90 dark:bg-green-950/90 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200 rounded-lg">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium">Live Streaming</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-xl">
                    <Eye className="w-10 h-10 text-gray-400 dark:text-gray-500" />
                  </div>
                  <h3 className="text-2xl font-bold gradient-text mb-3">Select Dataset to Begin</h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-sm leading-relaxed">
                    Choose a baseline dataset from the dropdown to start real-time streaming
                    visualization.
                  </p>
                  <Link href="/dashboard/dinsight-analysis">
                    <Button className="bg-gradient-to-r from-primary-600 to-accent-teal-600 hover:from-primary-700 hover:to-accent-teal-700 text-white shadow-lg shadow-primary-500/25">
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Upload Data
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Information Panel */}
        {selectedDinsightId && dinsightData && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="glass-card shadow-xl border-gray-200/50 dark:border-gray-700/50 card-hover">
              <CardHeader className="pb-3 bg-gradient-to-r from-emerald-50/30 to-accent-teal-50/20 dark:from-emerald-950/30 dark:to-accent-teal-950/20 rounded-t-xl">
                <CardTitle className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/25">
                    <CheckCircle className="h-4 w-4 text-white" />
                  </div>
                  <span className="gradient-text">Baseline Reference</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Points:</span>
                    <span className="text-sm font-medium">
                      {dinsightData.baseline.dinsight_x.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Status:</span>
                    <Badge variant="outline" className="text-blue-600 border-blue-200">
                      Stable Reference
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card shadow-xl border-gray-200/50 dark:border-gray-700/50 card-hover">
              <CardHeader className="pb-3 bg-gradient-to-r from-red-50/30 to-orange-50/20 dark:from-red-950/30 dark:to-orange-950/20 rounded-t-xl">
                <CardTitle className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-orange-600 rounded-lg flex items-center justify-center shadow-lg shadow-red-500/25">
                    <Activity className="h-4 w-4 text-white" />
                  </div>
                  <span className="gradient-text">Live Monitoring</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Points:</span>
                    <span className="text-sm font-medium">
                      {dinsightData.monitoring.dinsight_x.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Status:</span>
                    <Badge
                      className={cn(
                        isStreaming
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                      )}
                    >
                      {isStreaming ? 'Streaming' : 'Paused'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card shadow-xl border-gray-200/50 dark:border-gray-700/50 card-hover">
              <CardHeader className="pb-3 bg-gradient-to-r from-accent-purple-50/30 to-accent-pink-50/20 dark:from-accent-purple-950/30 dark:to-accent-pink-950/20 rounded-t-xl">
                <CardTitle className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-accent-purple-500 to-accent-pink-600 rounded-lg flex items-center justify-center shadow-lg shadow-accent-purple-500/25">
                    <Clock className="h-4 w-4 text-white" />
                  </div>
                  <span className="gradient-text">Update Frequency</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Interval:</span>
                    <span className="text-sm font-medium">{refreshInterval / 1000}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Auto-refresh:</span>
                    <Badge variant={autoRefresh ? 'default' : 'secondary'}>
                      {autoRefresh ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
