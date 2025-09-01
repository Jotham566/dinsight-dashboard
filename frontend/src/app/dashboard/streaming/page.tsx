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
  CheckCircle
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
  const [plotElement, setPlotElement] = useState<any>(null);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Query for available dinsight datasets
  const { data: availableDinsightIds, isLoading: datasetsLoading, refetch: refetchDatasets } = useQuery<Dataset[]>({
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
  const plotLayout = useMemo(() => ({
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
      title: { text: 'D\'insight X Coordinate' },
      gridcolor: '#f1f5f9',
      zerolinecolor: '#e2e8f0',
    },
    yaxis: {
      title: { text: 'D\'insight Y Coordinate' },
      gridcolor: '#f1f5f9',
      zerolinecolor: '#e2e8f0',
    },
    height: 600,
    margin: { l: 60, r: 30, t: 30, b: 60 },
  }), []);

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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-accent-teal-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-accent-teal-950/20">
      {/* Notification */}
      {notification && (
        <div className={cn(
          'fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg border backdrop-blur-sm transition-all duration-300',
          notification.type === 'success' && 'bg-green-50/90 dark:bg-green-950/90 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200',
          notification.type === 'error' && 'bg-red-50/90 dark:bg-red-950/90 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200',
          notification.type === 'info' && 'bg-blue-50/90 dark:bg-blue-950/90 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200'
        )}>
          <p className="text-sm font-medium">{notification.message}</p>
        </div>
      )}

      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-gradient-to-br from-primary-500 to-accent-teal-600 rounded-xl text-white shadow-lg">
                  <Zap className="w-6 h-6" />
                </div>
                <h1 className="text-3xl font-bold gradient-text">Real-Time Streaming</h1>
                <Badge variant="outline" className="glass-card">
                  <Activity className="w-3 h-3 mr-1" />
                  Live
                </Badge>
              </div>
              <p className="text-gray-600 dark:text-gray-300">
                Monitor machine health in real-time with streaming sensor data
              </p>
            </div>
            <div className="flex items-center gap-3">
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
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold">Dataset</CardTitle>
            </CardHeader>
            <CardContent>
              <select
                value={selectedDinsightId || ''}
                onChange={(e) => setSelectedDinsightId(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 text-gray-900 dark:text-gray-100"
                disabled={datasetsLoading}
              >
                {selectedDinsightId === null && (
                  <option value="">Select dataset...</option>
                )}
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
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold">Controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
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
                  {isStreaming ? <Pause className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
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
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold">Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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

          {/* Status Overview */}
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold flex items-center">
                <Activity className="w-4 h-4 mr-2" />
                Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {streamingStatus ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Monitor Points:</span>
                    <Badge variant="secondary">
                      {streamingStatus.streamed_points}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Baseline Points:</span>
                    <Badge variant="outline">
                      {streamingStatus.baseline_points}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Status:</span>
                    <Badge className={cn(
                      isStreaming ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                                 : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                    )}>
                      {isStreaming ? (
                        <>
                          <Activity className="w-3 h-3 mr-1" />
                          Live
                        </>
                      ) : (
                        <>
                          <Pause className="w-3 h-3 mr-1" />
                          Paused
                        </>
                      )}
                    </Badge>
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Select a dataset to view status
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Visualization */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-primary-100 to-accent-teal-100 dark:from-primary-900 dark:to-accent-teal-900 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold gradient-text">
                    Real-Time Machine Health Monitor
                  </CardTitle>
                  <CardDescription className="text-gray-600 dark:text-gray-400 mt-1">
                    Live comparison of baseline reference data vs streaming sensor measurements
                  </CardDescription>
                </div>
              </div>
              {selectedDinsightId && (
                <div className="glass-card px-4 py-2 bg-gradient-to-r from-primary-100/80 to-accent-teal-100/60 dark:from-primary-900/50 dark:to-accent-teal-900/40 text-primary-700 dark:text-primary-300 text-sm font-semibold rounded-full border border-primary-200/50 dark:border-primary-700/50">
                  Dataset ID: {selectedDinsightId}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {dataLoading ? (
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-primary-100 to-accent-teal-100 dark:from-primary-900 dark:to-accent-teal-900 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl">
                    <RefreshCw className="w-8 h-8 text-primary-600 dark:text-primary-400 animate-spin" />
                  </div>
                  <h3 className="text-lg font-semibold gradient-text mb-2">Loading Streaming Data</h3>
                  <p className="text-gray-600 dark:text-gray-300">Fetching real-time coordinates...</p>
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
                  <h3 className="text-2xl font-bold gradient-text mb-3">
                    Select Dataset to Begin
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-sm leading-relaxed">
                    Choose a baseline dataset from the dropdown to start real-time streaming visualization.
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
            <Card className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2 text-blue-500" />
                  Baseline Reference
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Points:</span>
                    <span className="text-sm font-medium">{dinsightData.baseline.dinsight_x.length}</span>
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

            <Card className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold flex items-center">
                  <Activity className="w-4 h-4 mr-2 text-red-500" />
                  Live Monitoring
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Points:</span>
                    <span className="text-sm font-medium">{dinsightData.monitoring.dinsight_x.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Status:</span>
                    <Badge className={cn(
                      isStreaming 
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                    )}>
                      {isStreaming ? 'Streaming' : 'Paused'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold flex items-center">
                  <Clock className="w-4 h-4 mr-2 text-purple-500" />
                  Update Frequency
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Interval:</span>
                    <span className="text-sm font-medium">{refreshInterval / 1000}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Auto-refresh:</span>
                    <Badge variant={autoRefresh ? "default" : "secondary"}>
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
