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
import { api } from '@/lib/api-client';
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
  latest_glow_count: number;
  is_streaming: boolean;
  status: 'not_started' | 'streaming' | 'completed';
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
    processOrders?: number[]; // Added for gradient coloring
  };
}

interface AnomalyPoint {
  index: number;
  x: number;
  y: number;
  mahalanobis_distance: number;
  is_anomaly: boolean;
}

interface AnomalyDetectionResult {
  anomalous_points: AnomalyPoint[];
  total_points: number;
  anomaly_count: number;
  anomaly_percentage: number;
  anomaly_threshold: number;
  sensitivity_factor: number;
  sensitivity_level: string;
  baseline_centroid: { x: number; y: number };
  comparison_centroid: { x: number; y: number };
  centroid_distance: number;
  statistics: {
    baseline_mean: number;
    baseline_std_dev: number;
    comparison_mean: number;
    comparison_std_dev: number;
    max_mahalanobis_distance: number;
    mean_mahalanobis_distance: number;
  };
}

export default function StreamingVisualizationPage() {
  // State management
  const [selectedDinsightId, setSelectedDinsightId] = useState<number | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingStatus, setStreamingStatus] = useState<StreamingStatus | null>(null);
  const [pointSize, setPointSize] = useState<number>(12);
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

  // Anomaly detection state
  const [enableAnomalyDetection, setEnableAnomalyDetection] = useState<boolean>(false);
  const [sensitivity, setSensitivity] = useState<number>(3.0);
  const [anomalyResults, setAnomalyResults] = useState<AnomalyDetectionResult | null>(null);
  const [isRunningAnomalyDetection, setIsRunningAnomalyDetection] = useState<boolean>(false);

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

  // Smart refresh interval - reduce refresh when anomaly detection is on and streaming is complete
  const smartRefreshInterval = useMemo(() => {
    if (!autoRefresh) return false;

    // If streaming is complete and anomaly detection is enabled, refresh less frequently
    if (enableAnomalyDetection && streamingStatus && streamingStatus.status === 'completed') {
      return 10000; // 10 seconds when completed and anomaly detection is on
    }

    // If streaming is active, use the selected refresh rate
    if (streamingStatus && streamingStatus.is_active) {
      return refreshInterval;
    }

    // Default refresh rate for other states
    return refreshInterval;
  }, [autoRefresh, enableAnomalyDetection, streamingStatus, refreshInterval]);

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
            // Generate process orders since API returns data already ordered by process_order
            processOrders: (monitoringData.dinsight_x || []).map((_: any, i: number) => i + 1),
          },
        };
      } catch (error) {
        console.warn(`Failed to fetch streaming data for ID ${selectedDinsightId}:`, error);
        return null;
      }
    },
    enabled: !!selectedDinsightId,
    refetchInterval: smartRefreshInterval,
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

  // Anomaly detection function
  const runAnomalyDetection = useCallback(async () => {
    if (!selectedDinsightId || !enableAnomalyDetection) {
      return;
    }

    // Get current monitoring data length to avoid stale closures
    const currentMonitoringLength = dinsightData?.monitoring.dinsight_x.length || 0;
    if (currentMonitoringLength === 0) {
      console.log('No monitoring data available for anomaly detection');
      return;
    }

    setIsRunningAnomalyDetection(true);
    try {
      console.log('Running anomaly detection for streaming data with params:', {
        baseline_dataset_id: selectedDinsightId,
        comparison_dataset_id: selectedDinsightId,
        sensitivity_factor: sensitivity,
      });

      const response = await api.anomaly.detect({
        baseline_dataset_id: selectedDinsightId,
        comparison_dataset_id: selectedDinsightId, // Backend uses baseline ID to find monitoring data
        sensitivity_factor: sensitivity,
      });

      if (response?.data?.success && response.data.data) {
        const result = response.data.data as AnomalyDetectionResult;
        setAnomalyResults(result);
        console.log('Streaming anomaly detection completed:', result);

        setNotification({
          type: 'success',
          message: `Anomaly detection completed: ${result.anomaly_count}/${result.total_points} anomalies found (${result.anomaly_percentage.toFixed(1)}%)`,
        });
      } else {
        throw new Error('Invalid API response');
      }
    } catch (error: any) {
      console.error('Error running anomaly detection:', error);
      setAnomalyResults(null);

      let errorMessage = 'Failed to run anomaly detection';
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      setNotification({
        type: 'error',
        message: errorMessage,
      });
    } finally {
      setIsRunningAnomalyDetection(false);
    }
  }, [selectedDinsightId, enableAnomalyDetection, sensitivity]); // Removed dinsightData dependency

  // Auto-run anomaly detection when enabled or data changes
  useEffect(() => {
    if (!enableAnomalyDetection) {
      setAnomalyResults(null);
      return;
    }

    if (dinsightData && dinsightData.monitoring.dinsight_x.length > 0) {
      // Only run anomaly detection if:
      // 1. We don't have results yet, OR
      // 2. The monitoring data length has changed (new data streamed), OR
      // 3. The sensitivity has changed
      const shouldRun =
        !anomalyResults ||
        (anomalyResults &&
          anomalyResults.total_points !== dinsightData.monitoring.dinsight_x.length);

      if (shouldRun && !isRunningAnomalyDetection) {
        // Debounce to avoid too many API calls during rapid data changes
        const timeoutId = setTimeout(() => {
          runAnomalyDetection();
        }, 1000); // Increased debounce time
        return () => clearTimeout(timeoutId);
      }
    }
  }, [
    enableAnomalyDetection,
    dinsightData?.monitoring.dinsight_x.length,
    runAnomalyDetection,
    anomalyResults,
    isRunningAnomalyDetection,
  ]);

  // Separate effect for sensitivity changes (immediate update)
  useEffect(() => {
    if (
      enableAnomalyDetection &&
      dinsightData &&
      dinsightData.monitoring.dinsight_x.length > 0 &&
      anomalyResults
    ) {
      // When sensitivity changes and we already have data, re-run immediately
      const timeoutId = setTimeout(() => {
        runAnomalyDetection();
      }, 300); // Shorter timeout for sensitivity changes
      return () => clearTimeout(timeoutId);
    }
  }, [sensitivity]); // Only sensitivity as dependency

  // Helper function to generate simple coloring for monitoring points
  const generateSimpleMonitoringColors = useCallback(
    (
      count: number,
      processOrders?: number[],
      streamingStatus?: StreamingStatus
    ): {
      colors: string[];
      sizes: number[];
      lineColors: string[];
      lineWidths: number[];
    } => {
      if (count === 0) return { colors: [], sizes: [], lineColors: [], lineWidths: [] };

      // All points are red
      const colors = new Array(count).fill('#DC2626'); // Red color for all points
      const sizes = new Array(count).fill(pointSize);
      const lineColors: string[] = new Array(count);
      const lineWidths: number[] = new Array(count);

      // Use the latest_glow_count from streaming status if available, otherwise default to 5
      const latestGlowCount = streamingStatus?.latest_glow_count || 5;
      const latestCount = Math.min(latestGlowCount, count);

      // Always highlight the latest points (assuming array order = chronological order)
      for (let i = 0; i < count; i++) {
        if (i >= count - latestCount) {
          // Latest points: green glowing edge
          lineColors[i] = '#10B981'; // Green color
          lineWidths[i] = 3; // Thicker border for glow effect
        } else {
          // Regular points: subtle border
          lineColors[i] = 'rgba(0,0,0,0.1)';
          lineWidths[i] = 1;
        }
      }

      return { colors, sizes, lineColors, lineWidths };
    },
    [pointSize]
  );

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

    // Streaming monitoring data with anomaly detection support
    if (dinsightData.monitoring.dinsight_x.length > 0) {
      const monitoringCount = dinsightData.monitoring.dinsight_x.length;

      if (enableAnomalyDetection && anomalyResults) {
        // Anomaly detection mode: separate normal and anomalous points
        const normalPoints = anomalyResults.anomalous_points.filter((p) => !p.is_anomaly);
        const anomalyPoints = anomalyResults.anomalous_points.filter((p) => p.is_anomaly);

        // Determine latest points for green glow effect
        const latestGlowCount = streamingStatus?.latest_glow_count || 5;
        const totalPoints = anomalyResults.total_points;
        const latestPointIndices = new Set(
          Array.from({ length: Math.min(latestGlowCount, totalPoints) }, (_, i) => totalPoints - 1 - i)
        );

        // Helper function to determine if a point should have green glow
        const shouldHaveGlow = (point: AnomalyPoint) => latestPointIndices.has(point.index);

        // Separate normal points into glowing and non-glowing
        const normalPointsGlow = normalPoints.filter(shouldHaveGlow);
        const normalPointsRegular = normalPoints.filter(p => !shouldHaveGlow(p));

        // Separate anomaly points into glowing and non-glowing
        const anomalyPointsGlow = anomalyPoints.filter(shouldHaveGlow);
        const anomalyPointsRegular = anomalyPoints.filter(p => !shouldHaveGlow(p));

        // Add regular normal monitoring points (no glow)
        if (normalPointsRegular.length > 0) {
          data.push({
            x: normalPointsRegular.map((p) => p.x),
            y: normalPointsRegular.map((p) => p.y),
            mode: 'markers' as const,
            type: 'scattergl' as const,
            name: `Normal Points (${normalPointsRegular.length})`,
            marker: {
              color: '#34A853', // Green for normal points
              size: pointSize,
              opacity: 0.7,
              line: { width: 1, color: 'rgba(0,0,0,0.2)' },
            },
            hovertemplate:
              '<b>Normal</b><br>X: %{x:.6f}<br>Y: %{y:.6f}<br>M-Dist: %{customdata:.3f}<extra></extra>',
            customdata: normalPointsRegular.map((p) => p.mahalanobis_distance),
          });
        }

        // Add glowing normal monitoring points (latest points)
        if (normalPointsGlow.length > 0) {
          data.push({
            x: normalPointsGlow.map((p) => p.x),
            y: normalPointsGlow.map((p) => p.y),
            mode: 'markers' as const,
            type: 'scattergl' as const,
            name: `Normal (Latest ${normalPointsGlow.length})`,
            marker: {
              color: '#34A853', // Green for normal points
              size: pointSize,
              opacity: 0.8,
              line: { width: 3, color: '#10B981' }, // Green glow effect
            },
            hovertemplate:
              '<b>Normal (Latest)</b><br>X: %{x:.6f}<br>Y: %{y:.6f}<br>M-Dist: %{customdata:.3f}<extra></extra>',
            customdata: normalPointsGlow.map((p) => p.mahalanobis_distance),
          });
        }

        // Add regular anomalous monitoring points (no glow)
        if (anomalyPointsRegular.length > 0) {
          data.push({
            x: anomalyPointsRegular.map((p) => p.x),
            y: anomalyPointsRegular.map((p) => p.y),
            mode: 'markers' as const,
            type: 'scattergl' as const,
            name: `Anomalies (${anomalyPointsRegular.length})`,
            marker: {
              color: '#EA4335', // Red for anomalies
              size: pointSize + 2, // Slightly larger for emphasis
              opacity: 0.9,
              symbol: 'circle',
              line: { width: 2, color: '#c62828' },
            },
            hovertemplate:
              '<b>Anomaly</b><br>X: %{x:.6f}<br>Y: %{y:.6f}<br>M-Dist: %{customdata:.3f}<extra></extra>',
            customdata: anomalyPointsRegular.map((p) => p.mahalanobis_distance),
          });
        }

        // Add glowing anomalous monitoring points (latest anomalies)
        if (anomalyPointsGlow.length > 0) {
          data.push({
            x: anomalyPointsGlow.map((p) => p.x),
            y: anomalyPointsGlow.map((p) => p.y),
            mode: 'markers' as const,
            type: 'scattergl' as const,
            name: `Anomalies (Latest ${anomalyPointsGlow.length})`,
            marker: {
              color: '#EA4335', // Red for anomalies
              size: pointSize + 2, // Slightly larger for emphasis
              opacity: 0.9,
              symbol: 'circle',
              line: { width: 4, color: '#10B981' }, // Green glow effect even for anomalies
            },
            hovertemplate:
              '<b>Anomaly (Latest)</b><br>X: %{x:.6f}<br>Y: %{y:.6f}<br>M-Dist: %{customdata:.3f}<extra></extra>',
            customdata: anomalyPointsGlow.map((p) => p.mahalanobis_distance),
          });
        }

        // Add baseline and comparison centroids if anomaly detection is active
        if (anomalyResults.baseline_centroid) {
          data.push({
            x: [anomalyResults.baseline_centroid.x],
            y: [anomalyResults.baseline_centroid.y],
            mode: 'markers' as const,
            type: 'scattergl' as const,
            name: 'Baseline Centroid',
            marker: {
              color: '#1A73E8',
              size: 12,
              symbol: 'star',
              opacity: 1.0,
              line: { width: 2, color: 'white' },
            },
            hovertemplate: `<b>Baseline Centroid</b><br>X: ${anomalyResults.baseline_centroid.x.toFixed(4)}<br>Y: ${anomalyResults.baseline_centroid.y.toFixed(4)}<extra></extra>`,
          });
        }

        if (anomalyResults.comparison_centroid) {
          data.push({
            x: [anomalyResults.comparison_centroid.x],
            y: [anomalyResults.comparison_centroid.y],
            mode: 'markers' as const,
            type: 'scattergl' as const,
            name: 'Monitor Centroid',
            marker: {
              color: '#FBBC04',
              size: 12,
              symbol: 'star',
              opacity: 1.0,
              line: { width: 2, color: 'white' },
            },
            hovertemplate: `<b>Monitor Centroid</b><br>X: ${anomalyResults.comparison_centroid.x.toFixed(4)}<br>Y: ${anomalyResults.comparison_centroid.y.toFixed(4)}<extra></extra>`,
          });
        }
      } else {
        // Simple streaming mode: use gradient coloring with latest point highlighting
        const { colors, sizes, lineColors, lineWidths } = generateSimpleMonitoringColors(
          monitoringCount,
          dinsightData.monitoring.processOrders,
          streamingStatus || undefined
        );

        const monitoringTrace = {
          x: dinsightData.monitoring.dinsight_x,
          y: dinsightData.monitoring.dinsight_y,
          mode: 'markers' as const,
          type: 'scattergl' as const,
          name: `Live Monitoring (${monitoringCount} points)`,
          marker: {
            color: colors,
            size: sizes,
            opacity: 0.8,
            line: {
              width: lineWidths,
              color: lineColors,
            },
          },
          hovertemplate:
            '<b>Live Monitor</b><br>X: %{x:.6f}<br>Y: %{y:.6f}<br><i>%{text}</i><extra></extra>',
          text: dinsightData.monitoring.processOrders
            ? dinsightData.monitoring.processOrders.map((order, i) => {
                const totalPoints = monitoringCount;
                const relativePosition = dinsightData.monitoring.processOrders!.filter(
                  (o) => o <= order
                ).length;
                return `Point ${order} (${relativePosition}/${totalPoints})`;
              })
            : dinsightData.monitoring.dinsight_x.map((_, i) => `Point ${i + 1}/${monitoringCount}`),
        };
        data.push(monitoringTrace);
      }

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
  }, [
    dinsightData,
    pointSize,
    showContours,
    generateSimpleMonitoringColors,
    streamingStatus,
    enableAnomalyDetection,
    anomalyResults,
  ]);

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

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Compact Control Bar */}
        <div className="space-y-4 mb-8">
          {/* Main Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50 shadow-lg">
            {/* Dataset Selection - Compact */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center shadow-lg shadow-primary-500/25">
                <BarChart3 className="h-4 w-4 text-white" />
              </div>
              <select
                value={selectedDinsightId || ''}
                onChange={(e) => setSelectedDinsightId(Number(e.target.value))}
                className="px-3 py-2 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 text-gray-900 dark:text-gray-100 min-w-[200px]"
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
            </div>

            {/* Streaming Controls - Horizontal */}
            <div className="flex items-center gap-2">
              <Button
                onClick={toggleStreaming}
                className={cn(
                  'transition-all duration-200',
                  isStreaming
                    ? 'bg-orange-500 hover:bg-orange-600 text-white'
                    : 'bg-green-500 hover:bg-green-600 text-white'
                )}
                disabled={!selectedDinsightId}
              >
                {isStreaming ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                {isStreaming ? 'Pause' : 'Start'}
              </Button>
              <Button onClick={stopStreaming} variant="outline" disabled={!selectedDinsightId}>
                <Square className="w-4 h-4" />
              </Button>
            </div>

            {/* Speed Controls */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">Speed:</span>
              {['0.5x', '1x', '2x'].map((speed) => (
                <Button
                  key={speed}
                  variant={streamSpeed === speed ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStreamSpeed(speed as any)}
                  className="px-3 py-1"
                >
                  {speed}
                </Button>
              ))}
            </div>

            {/* Anomaly Detection Controls */}
            <div className="flex items-center gap-2 border-l border-gray-200 dark:border-gray-700 pl-4">
              <Button
                variant={enableAnomalyDetection ? 'default' : 'outline'}
                size="sm"
                onClick={() => setEnableAnomalyDetection(!enableAnomalyDetection)}
                disabled={!selectedDinsightId || !dinsightData?.monitoring.dinsight_x.length}
                className={cn(
                  'transition-all duration-200',
                  enableAnomalyDetection && 'bg-orange-500 hover:bg-orange-600 text-white'
                )}
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                {enableAnomalyDetection ? 'Anomaly ON' : 'Anomaly OFF'}
              </Button>
              {enableAnomalyDetection && (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Sensitivity:</span>
                    <input
                      type="range"
                      min="0.5"
                      max="5.0"
                      step="0.1"
                      value={sensitivity}
                      onChange={(e) => setSensitivity(parseFloat(e.target.value))}
                      className="w-16"
                    />
                    <span className="text-xs text-gray-600 dark:text-gray-300 font-mono min-w-[2rem]">
                      {sensitivity.toFixed(1)}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={runAnomalyDetection}
                    disabled={
                      isRunningAnomalyDetection || !dinsightData?.monitoring.dinsight_x.length
                    }
                    className="ml-2"
                  >
                    {isRunningAnomalyDetection ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                  </Button>
                </>
              )}
            </div>

            {/* Settings Toggle */}
            <Button
              onClick={refreshData}
              variant="outline"
              className="glass-card hover:shadow-lg transition-all duration-200"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Anomaly Detection Status Bar - Only when enabled */}
          {enableAnomalyDetection && (
            <div className="p-4 bg-gradient-to-r from-orange-50/50 to-red-50/50 dark:from-orange-950/30 dark:to-red-950/30 backdrop-blur-sm rounded-xl border border-orange-200/50 dark:border-orange-700/50 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      Anomaly Detection Status
                    </span>
                    {streamingStatus && (
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-xs',
                          streamingStatus.status === 'completed' &&
                            'bg-green-50 text-green-700 border-green-200',
                          streamingStatus.status === 'streaming' &&
                            'bg-blue-50 text-blue-700 border-blue-200',
                          streamingStatus.status === 'not_started' &&
                            'bg-gray-50 text-gray-700 border-gray-200'
                        )}
                      >
                        {streamingStatus.status === 'completed'
                          ? 'Stream Complete'
                          : streamingStatus.status === 'streaming'
                            ? 'Live Stream'
                            : 'Not Started'}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  {isRunningAnomalyDetection && (
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span className="text-sm">
                        Analyzing {dinsightData?.monitoring.dinsight_x.length || 0} points...
                      </span>
                    </div>
                  )}

                  {anomalyResults && (
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span className="text-gray-700 dark:text-gray-300">
                          Normal: {anomalyResults.total_points - anomalyResults.anomaly_count}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <span className="text-gray-700 dark:text-gray-300">
                          Anomalies: {anomalyResults.anomaly_count}
                        </span>
                      </div>
                      <div className="text-gray-600 dark:text-gray-400">
                        Rate: {anomalyResults.anomaly_percentage.toFixed(1)}%
                      </div>
                      <div className="text-gray-600 dark:text-gray-400">
                        Sensitivity: {anomalyResults.sensitivity_level}
                      </div>
                    </div>
                  )}

                  {!anomalyResults && !isRunningAnomalyDetection && (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {dinsightData?.monitoring.dinsight_x.length === 0
                        ? 'No monitoring data available'
                        : `Ready to analyze ${dinsightData?.monitoring.dinsight_x.length} points`}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Main Visualization - Center Stage */}
          <div className="xl:col-span-3">
            <Card className="glass-card shadow-xl border-gray-200/50 dark:border-gray-700/50 card-hover">
              <CardHeader className="border-b border-gray-100/50 dark:border-gray-700/50 bg-gradient-to-r from-primary-50/30 via-white/50 to-accent-purple-50/30 dark:from-gray-900/50 dark:via-gray-950/50 dark:to-gray-900/50 backdrop-blur-sm rounded-t-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/25">
                      <Eye className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl font-bold gradient-text">
                        Real-Time Streaming Visualization
                      </CardTitle>
                      <CardDescription className="text-gray-600 dark:text-gray-300 mt-1">
                        Live sensor data monitoring and anomaly detection
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedDinsightId && (
                      <Badge variant="outline" className="glass-card">
                        Dataset {selectedDinsightId}
                      </Badge>
                    )}
                    {isStreaming && (
                      <div className="flex items-center gap-2 glass-card px-3 py-2 bg-green-50/90 dark:bg-green-950/90 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200 rounded-lg">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-sm font-medium">Live</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {dataLoading ? (
                  <div className="flex items-center justify-center h-[600px]">
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
                      layout={{
                        ...plotLayout,
                        height: 700, // Larger height for center stage
                        margin: { l: 60, r: 30, t: 50, b: 60 },
                      }}
                      style={{ width: '100%', height: '700px' }}
                      config={{
                        displayModeBar: true,
                        displaylogo: false,
                        modeBarButtonsToRemove: ['select2d', 'lasso2d'],
                        toImageButtonOptions: {
                          format: 'png',
                          filename: `streaming_visualization_${selectedDinsightId}_${new Date().toISOString().split('T')[0]}`,
                          height: 700,
                          width: 1400,
                          scale: 2,
                        },
                      }}
                      onInitialized={(figure, graphDiv) => setPlotElement(graphDiv)}
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[600px]">
                    <div className="text-center">
                      <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-xl">
                        <Eye className="w-10 h-10 text-gray-400 dark:text-gray-500" />
                      </div>
                      <h3 className="text-2xl font-bold gradient-text mb-3">
                        Select Dataset to Begin
                      </h3>
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
          </div>

          {/* Sidebar with Controls and Info */}
          <div className="space-y-6">
            {/* Visualization Settings */}
            <Card className="glass-card shadow-xl border-gray-200/50 dark:border-gray-700/50 card-hover">
              <CardHeader className="pb-3 bg-gradient-to-r from-accent-purple-50/30 to-accent-pink-50/20 dark:from-accent-purple-950/30 dark:to-accent-pink-950/20 rounded-t-xl">
                <CardTitle className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                  <div className="w-6 h-6 bg-gradient-to-br from-accent-purple-500 to-accent-pink-600 rounded-lg flex items-center justify-center shadow-lg">
                    <Settings className="h-3 w-3 text-white" />
                  </div>
                  <span className="gradient-text text-base">Settings</span>
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
                    max="20"
                    value={pointSize}
                    onChange={(e) => setPointSize(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Batch Size: {batchSize}
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={100}
                    value={batchSize}
                    onChange={(e) => handleBatchSizeChange(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  />
                </div>
                <div className="space-y-2">
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
                    <label
                      htmlFor="autoRefresh"
                      className="text-sm text-gray-700 dark:text-gray-300"
                    >
                      Auto-refresh ({refreshInterval / 1000}s)
                    </label>
                  </div>
                </div>
                <Button
                  onClick={resetStreaming}
                  variant="outline"
                  className="w-full text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950 mt-4"
                  disabled={!selectedDinsightId}
                >
                  Reset Data
                </Button>
              </CardContent>
            </Card>

            {/* Streaming Status */}
            <Card className="glass-card shadow-xl border-gray-200/50 dark:border-gray-700/50 card-hover">
              <CardHeader className="pb-3 bg-gradient-to-r from-orange-50/30 to-yellow-50/20 dark:from-orange-950/30 dark:to-yellow-950/20 rounded-t-xl">
                <CardTitle className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                  <div className="w-6 h-6 bg-gradient-to-br from-orange-500 to-yellow-600 rounded-lg flex items-center justify-center shadow-lg">
                    <Clock className="h-3 w-3 text-white" />
                  </div>
                  <span className="gradient-text text-base">Status</span>
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

            {/* Color Legend for Streaming Points */}
            {selectedDinsightId &&
              dinsightData &&
              dinsightData.monitoring.dinsight_x.length > 0 && (
                <Card className="glass-card shadow-xl border-gray-200/50 dark:border-gray-700/50 card-hover">
                  <CardHeader className="pb-3 bg-gradient-to-r from-indigo-50/30 to-purple-50/20 dark:from-indigo-950/30 dark:to-purple-950/20 rounded-t-xl">
                    <CardTitle className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                      <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
                        <Eye className="h-3 w-3 text-white" />
                      </div>
                      <span className="gradient-text text-base">Legend</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        Point indicators:
                      </div>
                      
                      {enableAnomalyDetection && anomalyResults ? (
                        // Anomaly detection mode legend
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            <span className="text-xs text-gray-700 dark:text-gray-300">
                              Normal points
                            </span>
                          </div>
                          <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                            <span className="text-xs text-gray-700 dark:text-gray-300">
                              Anomalous points
                            </span>
                          </div>
                          <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <div className="w-3 h-3 rounded-full bg-green-500 border-2 border-green-400 shadow-lg shadow-green-500/50"></div>
                            <span className="text-xs text-gray-700 dark:text-gray-300">
                              Latest {streamingStatus?.latest_glow_count || 5} points (green glow)
                            </span>
                          </div>
                          <div className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                            <div className="text-yellow-500 text-sm">⭐</div>
                            <span className="text-xs text-gray-700 dark:text-gray-300">
                              Centroids
                            </span>
                          </div>
                        </div>
                      ) : (
                        // Simple streaming mode legend
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                            <div className="w-3 h-3 rounded-full bg-red-600 border border-gray-300 dark:border-gray-600"></div>
                            <span className="text-xs text-gray-700 dark:text-gray-300">
                              Monitoring data
                            </span>
                          </div>
                          <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <div className="w-3 h-3 rounded-full bg-red-600 border-2 border-green-500 shadow-lg shadow-green-500/50"></div>
                            <span className="text-xs text-gray-700 dark:text-gray-300">
                              Latest {streamingStatus?.latest_glow_count || 5} points (green glow)
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
          </div>
        </div>

        {/* Bottom Information Panel */}
        {selectedDinsightId && dinsightData && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <Card className="glass-card shadow-lg border-gray-200/50 dark:border-gray-700/50">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-6 h-6 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-lg">
                    <CheckCircle className="h-3 w-3 text-white" />
                  </div>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    Baseline Reference
                  </span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Points:</span>
                    <span className="font-medium">{dinsightData.baseline.dinsight_x.length}</span>
                  </div>
                  <Badge variant="outline" className="text-blue-600 border-blue-200 text-xs">
                    Stable Reference
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card shadow-lg border-gray-200/50 dark:border-gray-700/50">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-6 h-6 bg-gradient-to-br from-red-500 to-orange-600 rounded-lg flex items-center justify-center shadow-lg">
                    <Activity className="h-3 w-3 text-white" />
                  </div>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    Live Monitoring
                  </span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Points:</span>
                    <span className="font-medium">{dinsightData.monitoring.dinsight_x.length}</span>
                  </div>
                  <Badge
                    className={cn(
                      'text-xs',
                      isStreaming
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                    )}
                  >
                    {isStreaming ? 'Streaming' : 'Paused'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card shadow-lg border-gray-200/50 dark:border-gray-700/50">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-6 h-6 bg-gradient-to-br from-accent-purple-500 to-accent-pink-600 rounded-lg flex items-center justify-center shadow-lg">
                    <Clock className="h-3 w-3 text-white" />
                  </div>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    Update Frequency
                  </span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Interval:</span>
                    <span className="font-medium">{refreshInterval / 1000}s</span>
                  </div>
                  <Badge variant={autoRefresh ? 'default' : 'secondary'} className="text-xs">
                    {autoRefresh ? 'Auto-refresh' : 'Manual'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
