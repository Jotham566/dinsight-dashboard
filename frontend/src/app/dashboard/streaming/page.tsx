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
  MousePointer2,
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
import { useMetadataHover } from '@/hooks/useMetadataHover';
import { MetadataEntry } from '@/types/metadata';
import { MetadataHoverControls } from '@/components/metadata-hover-controls';
import {
  normalizeMetadataArray,
  normalizeMetadataEntry,
  alignMetadataLength,
} from '@/utils/metadata';

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
    metadata: MetadataEntry[];
  };
  monitoring: {
    dinsight_x: number[];
    dinsight_y: number[];
    labels: string[];
    timestamps: string[];
    processOrders?: number[]; // Added for gradient coloring
    metadata: MetadataEntry[];
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

  // Manual selection state
  const [enableManualSelection, setEnableManualSelection] = useState<boolean>(true);
  const [selectionMode, setSelectionMode] = useState<'rectangle' | 'circle' | 'oval'>('rectangle');
  const [enableMultipleSelections, setEnableMultipleSelections] = useState<boolean>(false);
  const [manualSelectionBoundaries, setManualSelectionBoundaries] = useState<
    Array<{
      id: string;
      type: 'rectangle' | 'lasso' | 'circle' | 'oval';
      coordinates: number[][];
      center?: { x: number; y: number };
      radius?: number;
      radiusX?: number;
      radiusY?: number;
      name: string;
    }>
  >([]);
  const [manualSelectionBoundary, setManualSelectionBoundary] = useState<{
    type: 'rectangle' | 'lasso' | 'circle' | 'oval';
    coordinates: number[][];
    center?: { x: number; y: number };
    radius?: number;
    radiusX?: number;
    radiusY?: number;
  } | null>(null);
  const [manualClassification, setManualClassification] = useState<{
    normal_points: number[];
    anomaly_points: number[];
  } | null>(null);
  const [monitoringStarted, setMonitoringStarted] = useState(false);

  // Update refreshInterval when streamSpeed changes
  useEffect(() => {
    if (streamSpeed === '2x') setRefreshInterval(500);
    else if (streamSpeed === '0.5x') setRefreshInterval(2000);
    else setRefreshInterval(1000);
  }, [streamSpeed]);

  // Query for available dinsight datasets
  const {
    data: availableDinsightIds,
    isLoading: datasetsLoading,
    refetch: refetchDinsightIds,
  } = useQuery<Dataset[]>({
    queryKey: ['available-dinsight-ids'],
    refetchOnWindowFocus: true,
    refetchInterval: 30000,
    staleTime: 10000,
    queryFn: async (): Promise<Dataset[]> => {
      const validDatasets: Dataset[] = [];
      let id = 1;
      let consecutiveFailures = 0;
      const maxConsecutiveFailures = 5;
      const maxId = 1000;
      while (consecutiveFailures < maxConsecutiveFailures && id <= maxId) {
        try {
          const response = await apiClient.get(`/dinsight/${id}`);
          if (
            response.data.success &&
            response.data.data &&
            response.data.data.dinsight_x &&
            response.data.data.dinsight_y &&
            Array.isArray(response.data.data.dinsight_x) &&
            Array.isArray(response.data.data.dinsight_y) &&
            response.data.data.dinsight_x.length > 0 &&
            response.data.data.dinsight_y.length > 0
          ) {
            validDatasets.push({
              dinsight_id: id,
              name: `Dinsight ID ${id}`,
              records: response.data.data.dinsight_x.length,
            });
            consecutiveFailures = 0;
          } else {
            consecutiveFailures++;
          }
        } catch (error: any) {
          consecutiveFailures++;
        }
        id++;
      }
      return validDatasets;
    },
  });

  // Auto-select latest (highest ID) available dinsight ID when data loads
  useEffect(() => {
    if (availableDinsightIds && availableDinsightIds.length > 0 && selectedDinsightId === null) {
      const latestDataset = availableDinsightIds.reduce((latest, current) =>
        current.dinsight_id > latest.dinsight_id ? current : latest
      );
      setSelectedDinsightId(latestDataset.dinsight_id);
    }
  }, [availableDinsightIds, selectedDinsightId]);

  // Add manual refresh button handler
  const handleRefreshDinsightIds = () => {
    refetchDinsightIds();
  };

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
        const [baselineResponse, monitoringResponse] = await Promise.all([
          apiClient.get(`/dinsight/${selectedDinsightId}`),
          monitoringStarted
            ? api.monitoring.get(selectedDinsightId)
            : Promise.resolve({ data: [] as unknown[] }),
        ]);

        const baselinePayload = baselineResponse?.data?.data || {};
        const baselineX = Array.isArray(baselinePayload.dinsight_x)
          ? (baselinePayload.dinsight_x as number[])
          : [];
        const baselineY = Array.isArray(baselinePayload.dinsight_y)
          ? (baselinePayload.dinsight_y as number[])
          : [];
        const baselineMetadata = alignMetadataLength(
          normalizeMetadataArray(baselinePayload.point_metadata),
          baselineX.length
        );

        const monitoringPayload = monitoringResponse?.data;
        const monitoringRows: any[] = Array.isArray(monitoringPayload)
          ? monitoringPayload
          : Array.isArray(monitoringPayload?.data)
            ? monitoringPayload.data
            : [];

        const monitoringX = monitoringRows.map((row: any) =>
          typeof row?.dinsight_x === 'number' ? row.dinsight_x : Number(row?.dinsight_x ?? 0)
        );
        const monitoringY = monitoringRows.map((row: any) =>
          typeof row?.dinsight_y === 'number' ? row.dinsight_y : Number(row?.dinsight_y ?? 0)
        );
        const monitoringMetadataRaw = monitoringRows.map((row: any) =>
          normalizeMetadataEntry(row?.metadata)
        );
        const monitoringMetadata = alignMetadataLength(monitoringMetadataRaw, monitoringX.length);
        const monitoringLabels = monitoringX.map((_, index) => `monitor_${index}`);
        const monitoringTimestamps = monitoringRows.map((row: any) =>
          row?.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString()
        );
        const processOrders = monitoringRows.map((row: any, index: number) =>
          typeof row?.process_order === 'number'
            ? row.process_order
            : Number(row?.process_order ?? index + 1)
        );

        return {
          baseline: {
            dinsight_x: baselineX,
            dinsight_y: baselineY,
            labels: baselineX.map((_, index) => `baseline_${index}`),
            metadata: baselineMetadata,
          },
          monitoring: {
            dinsight_x: monitoringX,
            dinsight_y: monitoringY,
            labels: monitoringLabels,
            timestamps: monitoringTimestamps,
            processOrders,
            metadata: monitoringMetadata,
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

  const baselineMetadata = useMemo(
    () => dinsightData?.baseline.metadata ?? [],
    [dinsightData?.baseline.metadata]
  );
  const monitoringMetadata = useMemo(
    () => dinsightData?.monitoring.metadata ?? [],
    [dinsightData?.monitoring.metadata]
  );
  const metadataSources = useMemo(
    () => [baselineMetadata, monitoringMetadata],
    [baselineMetadata, monitoringMetadata]
  );

  const {
    metadataEnabled,
    setMetadataEnabled,
    selectedKeys: selectedMetadataKeys,
    toggleKey: toggleMetadataKey,
    selectAll: selectAllMetadataKeys,
    clearAll: clearMetadataKeys,
    availableKeys: availableMetadataKeys,
    buildHoverText,
    hasActiveMetadata,
  } = useMetadataHover({ metadataSources });

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

    // Check stream status for better user feedback
    const isStreamCompleted = streamingStatus?.status === 'completed';
    const analysisType = isStreamCompleted ? 'static dataset' : 'streaming data';

    setIsRunningAnomalyDetection(true);
    try {
      console.log(`Running anomaly detection for ${analysisType} with params:`, {
        baseline_dataset_id: selectedDinsightId,
        comparison_dataset_id: selectedDinsightId,
        sensitivity_factor: sensitivity,
        data_points: currentMonitoringLength,
        stream_status: streamingStatus?.status,
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
          message: `Anomaly detection completed for ${analysisType}: ${result.anomaly_count}/${result.total_points} anomalies found (${result.anomaly_percentage.toFixed(1)}%)`,
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
  }, [
    selectedDinsightId,
    enableAnomalyDetection,
    sensitivity,
    dinsightData?.monitoring.dinsight_x.length,
    streamingStatus,
  ]);

  // Auto-run anomaly detection when enabled or data changes
  useEffect(() => {
    if (!enableAnomalyDetection) {
      setAnomalyResults(null);
      return;
    }

    if (dinsightData && dinsightData.monitoring.dinsight_x.length > 0) {
      // Check if streaming is completed - if so, don't re-run analysis
      const isStreamCompleted =
        streamingStatus?.status === 'completed' || !streamingStatus?.is_active;

      // For completed streams with existing results, just keep them - no re-analysis needed
      if (
        isStreamCompleted &&
        anomalyResults &&
        anomalyResults.total_points === dinsightData.monitoring.dinsight_x.length
      ) {
        console.log('Stream completed - using existing anomaly results without re-analysis');
        return;
      }

      // Only run anomaly detection if:
      // 1. We don't have results yet, OR
      // 2. The monitoring data length has changed (new data streamed during active streaming), OR
      // 3. Stream is active and we need fresh analysis
      const shouldRun =
        !anomalyResults ||
        (streamingStatus?.is_active &&
          anomalyResults &&
          anomalyResults.total_points !== dinsightData.monitoring.dinsight_x.length);

      if (shouldRun && !isRunningAnomalyDetection) {
        console.log('Running anomaly detection:', {
          hasResults: !!anomalyResults,
          streamStatus: streamingStatus?.status,
          isActive: streamingStatus?.is_active,
          dataLength: dinsightData.monitoring.dinsight_x.length,
          resultPoints: anomalyResults?.total_points,
        });

        // Debounce to avoid too many API calls during rapid data changes
        const timeoutId = setTimeout(() => {
          runAnomalyDetection();
        }, 1000);
        return () => clearTimeout(timeoutId);
      }
    }
  }, [
    enableAnomalyDetection,
    dinsightData,
    streamingStatus,
    runAnomalyDetection,
    anomalyResults,
    isRunningAnomalyDetection,
  ]);

  // Separate effect for sensitivity changes (only re-run for active streams or user-initiated changes)
  useEffect(() => {
    if (
      enableAnomalyDetection &&
      dinsightData &&
      dinsightData.monitoring.dinsight_x.length > 0 &&
      anomalyResults
    ) {
      // Only re-run on sensitivity changes if:
      // 1. Stream is still active (real-time adjustments), OR
      // 2. User explicitly wants to re-analyze completed data with different sensitivity
      const isStreamActive = streamingStatus?.is_active;

      if (isStreamActive) {
        console.log('Sensitivity changed during active streaming - re-running analysis');
        const timeoutId = setTimeout(() => {
          runAnomalyDetection();
        }, 300);
        return () => clearTimeout(timeoutId);
      } else {
        // For completed streams, user can manually re-run if they want different sensitivity
        console.log('Sensitivity changed for completed stream - use manual re-run if needed');
      }
    }
  }, [
    sensitivity,
    enableAnomalyDetection,
    dinsightData,
    anomalyResults,
    runAnomalyDetection,
    streamingStatus,
  ]);

  // Manual selection functions
  const handleManualSelectionToggle = useCallback(() => {
    if (enableManualSelection) {
      // Turning OFF manual selection
      setEnableManualSelection(false);
      setManualSelectionBoundary(null);
      setManualClassification(null);
    } else {
      // Turning ON manual selection - ensure anomaly detection is OFF
      if (enableAnomalyDetection) {
        setEnableAnomalyDetection(false);
        setAnomalyResults(null);
      }
      setEnableManualSelection(true);
    }
  }, [enableManualSelection, enableAnomalyDetection]);

  // Point-in-rectangle check
  const isPointInRectangle = useCallback((x: number, y: number, bounds: number[][]) => {
    if (bounds.length < 2) return false;
    const [x1, y1] = bounds[0];
    const [x2, y2] = bounds[1];

    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);

    return x >= minX && x <= maxX && y >= minY && y <= maxY;
  }, []);

  // Point-in-polygon check using ray casting algorithm
  const isPointInPolygon = useCallback((x: number, y: number, polygon: number[][]) => {
    if (polygon.length < 3) return false;

    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0],
        yi = polygon[i][1];
      const xj = polygon[j][0],
        yj = polygon[j][1];

      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
    }
    return inside;
  }, []);

  // Point-in-circle check
  const isPointInCircle = useCallback(
    (x: number, y: number, center: { x: number; y: number }, radius: number) => {
      const dx = x - center.x;
      const dy = y - center.y;
      return dx * dx + dy * dy <= radius * radius;
    },
    []
  );

  // Point-in-oval check
  const isPointInOval = useCallback(
    (x: number, y: number, center: { x: number; y: number }, radiusX: number, radiusY: number) => {
      const dx = x - center.x;
      const dy = y - center.y;
      return (dx * dx) / (radiusX * radiusX) + (dy * dy) / (radiusY * radiusY) <= 1;
    },
    []
  );

  // Classify points based on manual selection
  const classifyPointsManually = useCallback(
    (boundary: {
      type: 'rectangle' | 'lasso' | 'circle' | 'oval';
      coordinates: number[][];
      center?: { x: number; y: number };
      radius?: number;
      radiusX?: number;
      radiusY?: number;
    }) => {
      if (!dinsightData?.monitoring.dinsight_x || !dinsightData?.monitoring.dinsight_y) {
        return null;
      }

      const normalPoints: number[] = [];
      const anomalyPoints: number[] = [];

      dinsightData.monitoring.dinsight_x.forEach((x, index) => {
        const y = dinsightData.monitoring.dinsight_y[index];

        let isInside = false;
        if (boundary.type === 'rectangle') {
          isInside = isPointInRectangle(x, y, boundary.coordinates);
        } else if (boundary.type === 'lasso') {
          isInside = isPointInPolygon(x, y, boundary.coordinates);
        } else if (boundary.type === 'circle' && boundary.center && boundary.radius) {
          isInside = isPointInCircle(x, y, boundary.center, boundary.radius);
        } else if (
          boundary.type === 'oval' &&
          boundary.center &&
          boundary.radiusX &&
          boundary.radiusY
        ) {
          isInside = isPointInOval(x, y, boundary.center, boundary.radiusX, boundary.radiusY);
        }

        if (isInside) {
          normalPoints.push(index);
        } else {
          anomalyPoints.push(index);
        }
      });

      return { normal_points: normalPoints, anomaly_points: anomalyPoints };
    },
    [dinsightData, isPointInRectangle, isPointInPolygon, isPointInCircle, isPointInOval]
  );

  // Real-time classification for streaming data using manual boundary(ies)
  const classifyStreamingPointsManually = useCallback(() => {
    if (!dinsightData?.monitoring.dinsight_x || !dinsightData?.monitoring.dinsight_y) {
      return null;
    }

    // Check if we have any boundaries to work with
    const hasMultipleBoundaries = enableMultipleSelections && manualSelectionBoundaries.length > 0;
    const hasSingleBoundary = !enableMultipleSelections && manualSelectionBoundary;

    if (!hasMultipleBoundaries && !hasSingleBoundary) {
      return null;
    }

    const normalPoints: number[] = [];
    const anomalyPoints: number[] = [];

    dinsightData.monitoring.dinsight_x.forEach((x, index) => {
      const y = dinsightData.monitoring.dinsight_y[index];
      let isInside = false;

      if (enableMultipleSelections) {
        // Check if point is inside any of the multiple boundaries
        for (const boundary of manualSelectionBoundaries) {
          if (boundary.type === 'rectangle') {
            isInside = isPointInRectangle(x, y, boundary.coordinates);
          } else if (boundary.type === 'lasso') {
            isInside = isPointInPolygon(x, y, boundary.coordinates);
          } else if (boundary.type === 'circle' && boundary.center && boundary.radius) {
            isInside = isPointInCircle(x, y, boundary.center, boundary.radius);
          } else if (
            boundary.type === 'oval' &&
            boundary.center &&
            boundary.radiusX &&
            boundary.radiusY
          ) {
            isInside = isPointInOval(x, y, boundary.center, boundary.radiusX, boundary.radiusY);
          }

          if (isInside) break; // If found in any boundary, it's normal
        }
      } else {
        // Single boundary mode (backward compatibility)
        if (manualSelectionBoundary!.type === 'rectangle') {
          isInside = isPointInRectangle(x, y, manualSelectionBoundary!.coordinates);
        } else if (manualSelectionBoundary!.type === 'lasso') {
          isInside = isPointInPolygon(x, y, manualSelectionBoundary!.coordinates);
        } else if (
          manualSelectionBoundary!.type === 'circle' &&
          manualSelectionBoundary!.center &&
          manualSelectionBoundary!.radius
        ) {
          isInside = isPointInCircle(
            x,
            y,
            manualSelectionBoundary!.center,
            manualSelectionBoundary!.radius
          );
        } else if (
          manualSelectionBoundary!.type === 'oval' &&
          manualSelectionBoundary!.center &&
          manualSelectionBoundary!.radiusX &&
          manualSelectionBoundary!.radiusY
        ) {
          isInside = isPointInOval(
            x,
            y,
            manualSelectionBoundary!.center,
            manualSelectionBoundary!.radiusX,
            manualSelectionBoundary!.radiusY
          );
        }
      }

      if (isInside) {
        normalPoints.push(index);
      } else {
        anomalyPoints.push(index);
      }
    });

    return { normal_points: normalPoints, anomaly_points: anomalyPoints };
  }, [
    dinsightData,
    enableMultipleSelections,
    manualSelectionBoundaries,
    manualSelectionBoundary,
    isPointInRectangle,
    isPointInPolygon,
    isPointInCircle,
    isPointInOval,
  ]);

  // Auto-update manual classification for streaming data
  useEffect(() => {
    if (
      enableManualSelection &&
      dinsightData &&
      dinsightData.monitoring.dinsight_x.length > 0 &&
      ((enableMultipleSelections && manualSelectionBoundaries.length > 0) ||
        (!enableMultipleSelections && manualSelectionBoundary))
    ) {
      // Re-classify all points (including new streaming data) when data changes
      const classification = classifyStreamingPointsManually();
      if (classification) {
        setManualClassification(classification);
        console.log('Updated manual classification for streaming data:', {
          normal: classification.normal_points.length,
          anomaly: classification.anomaly_points.length,
          total: dinsightData.monitoring.dinsight_x.length,
          mode: enableMultipleSelections ? 'multiple' : 'single',
          boundaries: enableMultipleSelections ? manualSelectionBoundaries.length : 1,
        });
      }
    }
  }, [
    enableManualSelection,
    enableMultipleSelections,
    manualSelectionBoundaries,
    manualSelectionBoundary,
    dinsightData,
    classifyStreamingPointsManually,
  ]);

  // Add current selection to multiple boundaries list
  const addSelectionToBoundaries = () => {
    if (!manualSelectionBoundary) return;

    const newBoundary = {
      id: `selection-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...manualSelectionBoundary,
      name: `${manualSelectionBoundary.type.charAt(0).toUpperCase() + manualSelectionBoundary.type.slice(1)} ${manualSelectionBoundaries.length + 1}`,
    };

    setManualSelectionBoundaries((prev) => {
      const updatedBoundaries = [...prev, newBoundary];

      // Force re-classification after state update
      setTimeout(() => {
        if (dinsightData?.monitoring.dinsight_x && dinsightData?.monitoring.dinsight_y) {
          const normalPoints: number[] = [];
          const anomalyPoints: number[] = [];

          dinsightData.monitoring.dinsight_x.forEach((x, index) => {
            const y = dinsightData.monitoring.dinsight_y[index];
            let isInside = false;

            // Check if point is inside any of the updated boundaries
            for (const boundary of updatedBoundaries) {
              if (boundary.type === 'rectangle') {
                isInside = isPointInRectangle(x, y, boundary.coordinates);
              } else if (boundary.type === 'lasso') {
                isInside = isPointInPolygon(x, y, boundary.coordinates);
              } else if (boundary.type === 'circle' && boundary.center && boundary.radius) {
                isInside = isPointInCircle(x, y, boundary.center, boundary.radius);
              } else if (
                boundary.type === 'oval' &&
                boundary.center &&
                boundary.radiusX &&
                boundary.radiusY
              ) {
                isInside = isPointInOval(x, y, boundary.center, boundary.radiusX, boundary.radiusY);
              }

              if (isInside) break; // If found in any boundary, it's normal
            }

            if (isInside) {
              normalPoints.push(index);
            } else {
              anomalyPoints.push(index);
            }
          });

          setManualClassification({ normal_points: normalPoints, anomaly_points: anomalyPoints });
        }
      }, 0);

      return updatedBoundaries;
    });

    setManualSelectionBoundary(null); // Clear current selection

    console.log('Added selection to boundaries:', newBoundary);
  };

  // Remove a specific boundary from multiple selections
  const removeBoundary = (id: string) => {
    setManualSelectionBoundaries((prev) => {
      const updatedBoundaries = prev.filter((boundary) => boundary.id !== id);

      // Force re-classification after removal
      setTimeout(() => {
        if (
          updatedBoundaries.length > 0 &&
          dinsightData?.monitoring.dinsight_x &&
          dinsightData?.monitoring.dinsight_y
        ) {
          const normalPoints: number[] = [];
          const anomalyPoints: number[] = [];

          dinsightData.monitoring.dinsight_x.forEach((x, index) => {
            const y = dinsightData.monitoring.dinsight_y[index];
            let isInside = false;

            // Check if point is inside any of the remaining boundaries
            for (const boundary of updatedBoundaries) {
              if (boundary.type === 'rectangle') {
                isInside = isPointInRectangle(x, y, boundary.coordinates);
              } else if (boundary.type === 'lasso') {
                isInside = isPointInPolygon(x, y, boundary.coordinates);
              } else if (boundary.type === 'circle' && boundary.center && boundary.radius) {
                isInside = isPointInCircle(x, y, boundary.center, boundary.radius);
              } else if (
                boundary.type === 'oval' &&
                boundary.center &&
                boundary.radiusX &&
                boundary.radiusY
              ) {
                isInside = isPointInOval(x, y, boundary.center, boundary.radiusX, boundary.radiusY);
              }

              if (isInside) break; // If found in any boundary, it's normal
            }

            if (isInside) {
              normalPoints.push(index);
            } else {
              anomalyPoints.push(index);
            }
          });

          setManualClassification({ normal_points: normalPoints, anomaly_points: anomalyPoints });
        } else if (updatedBoundaries.length === 0) {
          // No boundaries left, clear classification
          setManualClassification(null);
        }
      }, 0);

      return updatedBoundaries;
    });

    console.log('Removed boundary:', id);
  };

  // Clear all multiple boundaries
  const clearAllBoundaries = () => {
    setManualSelectionBoundaries([]);
    setManualSelectionBoundary(null);
    setManualClassification(null);
    console.log('Cleared all boundaries');
  };

  // Toggle multiple selections mode
  const toggleMultipleSelections = () => {
    const newMode = !enableMultipleSelections;
    setEnableMultipleSelections(newMode);

    if (newMode) {
      // Switching to multiple mode - if we have a current selection, add it to the list
      if (manualSelectionBoundary) {
        addSelectionToBoundaries();
      }
    } else {
      // Switching to single mode - clear multiple boundaries and keep only the current one
      setManualSelectionBoundaries([]);
    }

    console.log('Toggled multiple selections mode:', newMode);
  };

  // Handle plot selection event
  const handlePlotSelection = useCallback(
    (eventData: any) => {
      if (!enableManualSelection || !eventData?.range) return;

      // Extract selection bounds from Plotly event
      const range = eventData.range;
      if (range.x && range.y) {
        let boundary;

        if (selectionMode === 'rectangle') {
          // Rectangle selection (existing behavior)
          boundary = {
            type: 'rectangle' as const,
            coordinates: [
              [range.x[0], range.y[0]], // bottom-left
              [range.x[1], range.y[1]], // top-right
            ],
          };
        } else if (selectionMode === 'circle') {
          // Circle selection - use selection bounds to create circle
          const centerX = (range.x[0] + range.x[1]) / 2;
          const centerY = (range.y[0] + range.y[1]) / 2;
          const radiusX = Math.abs(range.x[1] - range.x[0]) / 2;
          const radiusY = Math.abs(range.y[1] - range.y[0]) / 2;
          const radius = Math.min(radiusX, radiusY); // Use smaller radius for perfect circle

          console.log('Circle mode - calculated values:', {
            centerX,
            centerY,
            radiusX,
            radiusY,
            radius,
          });

          // Generate circle coordinates for boundary visualization
          const circlePoints: number[][] = [];
          const numPoints = 64; // Number of points to approximate circle
          for (let i = 0; i <= numPoints; i++) {
            const angle = (i / numPoints) * 2 * Math.PI;
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            circlePoints.push([x, y]);
          }

          boundary = {
            type: 'circle' as const,
            coordinates: circlePoints,
            center: { x: centerX, y: centerY },
            radius: radius,
          };

          console.log('Circle boundary created:', boundary.type, 'radius:', boundary.radius);
        } else if (selectionMode === 'oval') {
          // Oval selection - use full selection bounds
          const centerX = (range.x[0] + range.x[1]) / 2;
          const centerY = (range.y[0] + range.y[1]) / 2;
          const radiusX = Math.abs(range.x[1] - range.x[0]) / 2;
          const radiusY = Math.abs(range.y[1] - range.y[0]) / 2;

          console.log('Oval mode - calculated values:', {
            centerX,
            centerY,
            radiusX,
            radiusY,
          });

          // Generate oval coordinates for boundary visualization
          const ovalPoints: number[][] = [];
          const numPoints = 64; // Number of points to approximate oval
          for (let i = 0; i <= numPoints; i++) {
            const angle = (i / numPoints) * 2 * Math.PI;
            const x = centerX + radiusX * Math.cos(angle);
            const y = centerY + radiusY * Math.sin(angle);
            ovalPoints.push([x, y]);
          }

          boundary = {
            type: 'oval' as const,
            coordinates: ovalPoints,
            center: { x: centerX, y: centerY },
            radiusX: radiusX,
            radiusY: radiusY,
          };

          console.log(
            'Oval boundary created:',
            boundary.type,
            'radiusX:',
            boundary.radiusX,
            'radiusY:',
            boundary.radiusY
          );
        }

        if (boundary) {
          setManualSelectionBoundary(boundary);
          const classification = classifyPointsManually(boundary);
          setManualClassification(classification);

          console.log(`${selectionMode} selection created:`, {
            selectionMode,
            boundaryType: boundary.type,
            center: boundary.center,
            radius: boundary.radius || 'N/A',
            radiusX: boundary.radiusX || 'N/A',
            radiusY: boundary.radiusY || 'N/A',
            coordinatesLength: boundary.coordinates.length,
            normal: classification?.normal_points.length,
            anomaly: classification?.anomaly_points.length,
          });
        }
      }
    },
    [enableManualSelection, selectionMode, classifyPointsManually]
  );

  // Handle plot deselection event (clear selection)
  const handlePlotDeselect = useCallback(() => {
    if (enableManualSelection) {
      setManualSelectionBoundary(null);
      setManualClassification(null);
      console.log('Manual selection cleared');
    }
  }, [enableManualSelection]);

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
          // Latest points: bright yellow/gold glowing edge for visibility
          lineColors[i] = '#FBBF24'; // Bright yellow/gold color
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

    const addMetadataToTemplate = (template: string, textArray?: string[]) => {
      if (!hasActiveMetadata || !textArray || textArray.length === 0) {
        return template;
      }

      const hasReadableContent = textArray.some((entry) => entry && entry.trim().length > 0);
      if (!hasReadableContent) {
        return template;
      }

      return template.replace('<extra></extra>', '<br>%{text}<extra></extra>');
    };

    const attachMetadata = (trace: any, textArray?: string[]) => {
      if (!hasActiveMetadata || !textArray || textArray.length === 0) {
        return trace;
      }

      return {
        ...trace,
        text: textArray,
        hovertemplate: addMetadataToTemplate(trace.hovertemplate, textArray),
      };
    };

    const baselineMetadataText = hasActiveMetadata
      ? buildHoverText(dinsightData.baseline.metadata)
      : undefined;
    const monitoringMetadataAll = hasActiveMetadata
      ? buildHoverText(dinsightData.monitoring.metadata)
      : undefined;
    const monitoringMetadataForIndices = (indices: number[]) =>
      hasActiveMetadata && indices.length > 0
        ? buildHoverText(dinsightData.monitoring.metadata, indices)
        : undefined;

    // Baseline data (always show)
    if (dinsightData.baseline.dinsight_x.length > 0) {
      const baselineTrace = attachMetadata(
        {
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
        },
        baselineMetadataText
      );
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

    // Streaming monitoring data with manual selection, anomaly detection, or simple mode
    if (monitoringStarted && dinsightData.monitoring.dinsight_x.length > 0) {
      const monitoringCount = dinsightData.monitoring.dinsight_x.length;

      if (enableManualSelection && manualSelectionBoundary && manualClassification) {
        // Manual streaming mode: classify streaming points based on manual boundary
        const normalIndices = new Set(manualClassification.normal_points);
        const anomalyIndices = new Set(manualClassification.anomaly_points);

        // Determine latest points for glow effect
        const latestGlowCount = streamingStatus?.latest_glow_count || 5;
        const latestPointIndices = new Set(
          Array.from(
            { length: Math.min(latestGlowCount, monitoringCount) },
            (_, i) => monitoringCount - 1 - i
          )
        );

        const normalX: number[] = [];
        const normalY: number[] = [];
        const normalXGlow: number[] = [];
        const normalYGlow: number[] = [];
        const anomalyX: number[] = [];
        const anomalyY: number[] = [];
        const anomalyXGlow: number[] = [];
        const anomalyYGlow: number[] = [];
        const normalIndicesList: number[] = [];
        const normalGlowIndicesList: number[] = [];
        const anomalyIndicesList: number[] = [];
        const anomalyGlowIndicesList: number[] = [];

        dinsightData.monitoring.dinsight_x.forEach((x, index) => {
          const y = dinsightData.monitoring.dinsight_y[index];
          const isLatest = latestPointIndices.has(index);

          if (normalIndices.has(index)) {
            if (isLatest) {
              normalXGlow.push(x);
              normalYGlow.push(y);
              normalGlowIndicesList.push(index);
            } else {
              normalX.push(x);
              normalY.push(y);
              normalIndicesList.push(index);
            }
          } else if (anomalyIndices.has(index)) {
            if (isLatest) {
              anomalyXGlow.push(x);
              anomalyYGlow.push(y);
              anomalyGlowIndicesList.push(index);
            } else {
              anomalyX.push(x);
              anomalyY.push(y);
              anomalyIndicesList.push(index);
            }
          }
        });

        // Add regular normal points (bright green)
        if (normalX.length > 0) {
          const trace = attachMetadata(
            {
              x: normalX,
              y: normalY,
              mode: 'markers' as const,
              type: 'scattergl' as const,
              name: `Normal Points (${normalX.length})`,
              marker: {
                color: '#22C55E', // Bright green for manual
                size: pointSize + 1,
                opacity: 0.8,
                line: { width: 2, color: '#16A34A' },
              },
              hovertemplate:
                '<b>Normal (Manual Stream)</b><br>X: %{x:.6f}<br>Y: %{y:.6f}<extra></extra>',
            },
            monitoringMetadataForIndices(normalIndicesList)
          );
          data.push(trace);
        }

        // Add glowing normal points (latest)
        if (normalXGlow.length > 0) {
          const trace = attachMetadata(
            {
              x: normalXGlow,
              y: normalYGlow,
              mode: 'markers' as const,
              type: 'scattergl' as const,
              name: `Normal (Latest ${normalXGlow.length})`,
              marker: {
                color: '#22C55E', // Bright green
                size: pointSize + 3,
                opacity: 0.9,
                line: { width: 4, color: '#FBBF24' }, // Gold glow
              },
              hovertemplate:
                '<b>Normal (Manual Stream, Latest)</b><br>X: %{x:.6f}<br>Y: %{y:.6f}<extra></extra>',
            },
            monitoringMetadataForIndices(normalGlowIndicesList)
          );
          data.push(trace);
        }

        // Add regular anomaly points (bright red)
        if (anomalyX.length > 0) {
          const trace = attachMetadata(
            {
              x: anomalyX,
              y: anomalyY,
              mode: 'markers' as const,
              type: 'scattergl' as const,
              name: `Anomaly Points (${anomalyX.length})`,
              marker: {
                color: '#EF4444', // Bright red for manual
                size: pointSize + 2,
                opacity: 0.9,
                line: { width: 3, color: '#DC2626' },
              },
              hovertemplate:
                '<b>Anomaly (Manual Stream)</b><br>X: %{x:.6f}<br>Y: %{y:.6f}<extra></extra>',
            },
            monitoringMetadataForIndices(anomalyIndicesList)
          );
          data.push(trace);
        }

        // Add glowing anomaly points (latest)
        if (anomalyXGlow.length > 0) {
          const trace = attachMetadata(
            {
              x: anomalyXGlow,
              y: anomalyYGlow,
              mode: 'markers' as const,
              type: 'scattergl' as const,
              name: `Anomaly (Latest ${anomalyXGlow.length})`,
              marker: {
                color: '#EF4444', // Bright red
                size: pointSize + 4,
                opacity: 0.95,
                line: { width: 4, color: '#FBBF24' }, // Gold glow
              },
              hovertemplate:
                '<b>Anomaly (Manual Stream, Latest)</b><br>X: %{x:.6f}<br>Y: %{y:.6f}<extra></extra>',
            },
            monitoringMetadataForIndices(anomalyGlowIndicesList)
          );
          data.push(trace);
        }

        // Add manual selection boundary
        if (manualSelectionBoundary.coordinates.length > 0) {
          const coords = manualSelectionBoundary.coordinates;
          let boundaryX: number[] = [];
          let boundaryY: number[] = [];
          let boundaryName = 'Manual Selection Boundary';

          if (manualSelectionBoundary.type === 'rectangle' && coords.length >= 2) {
            const [x1, y1] = coords[0];
            const [x2, y2] = coords[1];
            boundaryX = [x1, x2, x2, x1, x1];
            boundaryY = [y1, y1, y2, y2, y1];
            boundaryName = 'Rectangle Selection';
          } else if (manualSelectionBoundary.type === 'lasso') {
            boundaryX = [...coords.map(([x]) => x), coords[0][0]];
            boundaryY = [...coords.map(([, y]) => y), coords[0][1]];
            boundaryName = 'Lasso Selection';
          } else if (
            manualSelectionBoundary.type === 'circle' ||
            manualSelectionBoundary.type === 'oval'
          ) {
            // For circle and oval, coordinates already contain the boundary points
            boundaryX = coords.map(([x]) => x);
            boundaryY = coords.map(([, y]) => y);
            boundaryName =
              manualSelectionBoundary.type === 'circle' ? 'Circle Selection' : 'Oval Selection';
          }

          if (boundaryX.length > 2) {
            data.push({
              x: boundaryX,
              y: boundaryY,
              mode: 'lines' as const,
              type: 'scattergl' as const,
              name: boundaryName,
              line: {
                color: '#8B5CF6',
                width: 3,
                dash: 'dash',
              },
              hovertemplate: `<b>${boundaryName}</b><extra></extra>`,
              showlegend: true,
            });
          }
        }
      } else if (enableAnomalyDetection && anomalyResults) {
        // Anomaly detection mode: separate normal and anomalous points
        let normalPoints: AnomalyPoint[] = [];
        let anomalyPoints: AnomalyPoint[] = [];

        // Use manual classification if available, otherwise use algorithmic results
        if (
          manualClassification &&
          (manualClassification.normal_points.length > 0 ||
            manualClassification.anomaly_points.length > 0)
        ) {
          // Manual classification takes precedence
          anomalyResults.anomalous_points.forEach((point) => {
            if (manualClassification.normal_points.includes(point.index)) {
              normalPoints.push(point);
            } else if (manualClassification.anomaly_points.includes(point.index)) {
              anomalyPoints.push(point);
            } else {
              // If not manually classified, use algorithmic result
              if (point.is_anomaly) {
                anomalyPoints.push(point);
              } else {
                normalPoints.push(point);
              }
            }
          });
        } else {
          // Use algorithmic classification
          normalPoints = anomalyResults.anomalous_points.filter((p) => !p.is_anomaly);
          anomalyPoints = anomalyResults.anomalous_points.filter((p) => p.is_anomaly);
        }

        // Determine latest points for green glow effect
        const latestGlowCount = streamingStatus?.latest_glow_count || 5;
        const totalPoints = anomalyResults.total_points;
        const latestPointIndices = new Set(
          Array.from(
            { length: Math.min(latestGlowCount, totalPoints) },
            (_, i) => totalPoints - 1 - i
          )
        );

        // Helper function to determine if a point should have green glow
        const shouldHaveGlow = (point: AnomalyPoint) => latestPointIndices.has(point.index);

        // Separate normal points into glowing and non-glowing
        const normalPointsGlow = normalPoints.filter(shouldHaveGlow);
        const normalPointsRegular = normalPoints.filter((p) => !shouldHaveGlow(p));

        // Separate anomaly points into glowing and non-glowing
        const anomalyPointsGlow = anomalyPoints.filter(shouldHaveGlow);
        const anomalyPointsRegular = anomalyPoints.filter((p) => !shouldHaveGlow(p));

        // Add regular normal monitoring points (no glow)
        if (normalPointsRegular.length > 0) {
          const normalRegularTrace = attachMetadata(
            {
              x: normalPointsRegular.map((p) => p.x),
              y: normalPointsRegular.map((p) => p.y),
              mode: 'markers' as const,
              type: 'scattergl' as const,
              name: `Normal Points (${normalPointsRegular.length})`,
              marker: {
                color: manualClassification ? '#22C55E' : '#34A853', // Brighter green for manual selection
                size: pointSize,
                opacity: manualClassification ? 0.8 : 0.7, // Higher opacity for manual selection
                line: {
                  width: manualClassification ? 2 : 1,
                  color: manualClassification ? '#16A34A' : 'rgba(0,0,0,0.2)',
                },
              },
              hovertemplate: `<b>${manualClassification ? 'Normal (Manual)' : 'Normal'}</b><br>X: %{x:.6f}<br>Y: %{y:.6f}<br>M-Dist: %{customdata:.3f}<extra></extra>`,
              customdata: normalPointsRegular.map((p) => p.mahalanobis_distance),
            },
            monitoringMetadataForIndices(normalPointsRegular.map((p) => p.index))
          );
          data.push(normalRegularTrace);
        }

        // Add glowing normal monitoring points (latest points)
        if (normalPointsGlow.length > 0) {
          const normalGlowTrace = attachMetadata(
            {
              x: normalPointsGlow.map((p) => p.x),
              y: normalPointsGlow.map((p) => p.y),
              mode: 'markers' as const,
              type: 'scattergl' as const,
              name: `Normal (Latest ${normalPointsGlow.length})`,
              marker: {
                color: manualClassification ? '#22C55E' : '#34A853', // Brighter green for manual selection
                size: pointSize + 2, // Slightly larger for emphasis
                opacity: 0.9,
                line: { width: 4, color: '#FBBF24' }, // Bright yellow/gold glow effect for visibility
              },
              hovertemplate: `<b>${manualClassification ? 'Normal (Manual, Latest)' : 'Normal (Latest)'}</b><br>X: %{x:.6f}<br>Y: %{y:.6f}<br>M-Dist: %{customdata:.3f}<extra></extra>`,
              customdata: normalPointsGlow.map((p) => p.mahalanobis_distance),
            },
            monitoringMetadataForIndices(normalPointsGlow.map((p) => p.index))
          );
          data.push(normalGlowTrace);
        }

        // Add regular anomalous monitoring points (no glow)
        if (anomalyPointsRegular.length > 0) {
          const anomalyRegularTrace = attachMetadata(
            {
              x: anomalyPointsRegular.map((p) => p.x),
              y: anomalyPointsRegular.map((p) => p.y),
              mode: 'markers' as const,
              type: 'scattergl' as const,
              name: `Anomalies (${anomalyPointsRegular.length})`,
              marker: {
                color: manualClassification ? '#EF4444' : '#EA4335', // Brighter red for manual selection
                size: pointSize + (manualClassification ? 3 : 2), // Larger for manual selection emphasis
                opacity: manualClassification ? 0.9 : 0.9,
                symbol: 'circle',
                line: {
                  width: manualClassification ? 3 : 2,
                  color: manualClassification ? '#DC2626' : '#c62828',
                },
              },
              hovertemplate: `<b>${manualClassification ? 'Anomaly (Manual)' : 'Anomaly'}</b><br>X: %{x:.6f}<br>Y: %{y:.6f}<br>M-Dist: %{customdata:.3f}<extra></extra>`,
              customdata: anomalyPointsRegular.map((p) => p.mahalanobis_distance),
            },
            monitoringMetadataForIndices(anomalyPointsRegular.map((p) => p.index))
          );
          data.push(anomalyRegularTrace);
        }

        // Add glowing anomalous monitoring points (latest anomalies)
        if (anomalyPointsGlow.length > 0) {
          const anomalyGlowTrace = attachMetadata(
            {
              x: anomalyPointsGlow.map((p) => p.x),
              y: anomalyPointsGlow.map((p) => p.y),
              mode: 'markers' as const,
              type: 'scattergl' as const,
              name: `Anomalies (Latest ${anomalyPointsGlow.length})`,
              marker: {
                color: manualClassification ? '#EF4444' : '#EA4335', // Brighter red for manual selection
                size: pointSize + (manualClassification ? 4 : 2), // Even larger for manual selection + latest
                opacity: 0.9,
                symbol: 'circle',
                line: { width: 4, color: '#FBBF24' }, // Bright yellow/gold glow effect for consistency
              },
              hovertemplate: `<b>${manualClassification ? 'Anomaly (Manual, Latest)' : 'Anomaly (Latest)'}</b><br>X: %{x:.6f}<br>Y: %{y:.6f}<br>M-Dist: %{customdata:.3f}<extra></extra>`,
              customdata: anomalyPointsGlow.map((p) => p.mahalanobis_distance),
            },
            monitoringMetadataForIndices(anomalyPointsGlow.map((p) => p.index))
          );
          data.push(anomalyGlowTrace);
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

        // Add manual selection boundary if it exists
        if (manualSelectionBoundary && manualSelectionBoundary.coordinates.length > 0) {
          // Extract coordinates and close the polygon
          const coords = manualSelectionBoundary.coordinates;
          let boundaryX: number[] = [];
          let boundaryY: number[] = [];
          let boundaryName = 'Manual Selection Boundary';

          if (manualSelectionBoundary.type === 'rectangle' && coords.length >= 2) {
            // For rectangle: coords are [[x1, y1], [x2, y2]]
            const [x1, y1] = coords[0];
            const [x2, y2] = coords[1];
            boundaryX = [x1, x2, x2, x1, x1]; // Close the rectangle
            boundaryY = [y1, y1, y2, y2, y1];
            boundaryName = 'Rectangle Selection';
          } else if (manualSelectionBoundary.type === 'lasso') {
            // For lasso: coords are [[x1, y1], [x2, y2], ...]
            boundaryX = [...coords.map(([x]) => x), coords[0][0]]; // Close the polygon
            boundaryY = [...coords.map(([, y]) => y), coords[0][1]];
            boundaryName = 'Lasso Selection';
          } else if (
            manualSelectionBoundary.type === 'circle' ||
            manualSelectionBoundary.type === 'oval'
          ) {
            // For circle and oval, coordinates already contain the boundary points
            boundaryX = coords.map(([x]) => x);
            boundaryY = coords.map(([, y]) => y);
            boundaryName =
              manualSelectionBoundary.type === 'circle' ? 'Circle Selection' : 'Oval Selection';
          }

          if (boundaryX.length > 2) {
            data.push({
              x: boundaryX,
              y: boundaryY,
              mode: 'lines' as const,
              type: 'scattergl' as const,
              name: boundaryName,
              line: {
                color: '#8B5CF6', // Purple color to match the manual selection theme
                width: 3,
                dash: 'dash',
              },
              hovertemplate: `<b>${boundaryName}</b><extra></extra>`,
              showlegend: true,
            });
          }
        }
      } else {
        // Simple streaming mode: use gradient coloring with latest point highlighting
        // OR manual classification if available
        if (
          manualClassification &&
          (manualClassification.normal_points.length > 0 ||
            manualClassification.anomaly_points.length > 0)
        ) {
          // Manual classification in simple mode - create separate traces for normal/anomaly
          const normalIndices = new Set(manualClassification.normal_points);
          const anomalyIndices = new Set(manualClassification.anomaly_points);

          const normalX: number[] = [];
          const normalY: number[] = [];
          const anomalyX: number[] = [];
          const anomalyY: number[] = [];
          const unclassifiedX: number[] = [];
          const unclassifiedY: number[] = [];
          const manualNormalIndices: number[] = [];
          const manualAnomalyIndices: number[] = [];
          const manualUnclassifiedIndices: number[] = [];

          dinsightData.monitoring.dinsight_x.forEach((x, index) => {
            const y = dinsightData.monitoring.dinsight_y[index];
            if (normalIndices.has(index)) {
              normalX.push(x);
              normalY.push(y);
              manualNormalIndices.push(index);
            } else if (anomalyIndices.has(index)) {
              anomalyX.push(x);
              anomalyY.push(y);
              manualAnomalyIndices.push(index);
            } else {
              unclassifiedX.push(x);
              unclassifiedY.push(y);
              manualUnclassifiedIndices.push(index);
            }
          });

          // Add normal points (bright green)
          if (normalX.length > 0) {
            const normalManualTrace = attachMetadata(
              {
                x: normalX,
                y: normalY,
                mode: 'markers' as const,
                type: 'scattergl' as const,
                name: `Normal Points (${normalX.length})`,
                marker: {
                  color: '#22C55E', // Bright green
                  size: pointSize + 1,
                  opacity: 0.8,
                  line: { width: 2, color: '#16A34A' },
                },
                hovertemplate:
                  '<b>Normal (Manual)</b><br>X: %{x:.6f}<br>Y: %{y:.6f}<extra></extra>',
              },
              monitoringMetadataForIndices(manualNormalIndices)
            );
            data.push(normalManualTrace);
          }

          // Add anomaly points (bright red)
          if (anomalyX.length > 0) {
            const anomalyManualTrace = attachMetadata(
              {
                x: anomalyX,
                y: anomalyY,
                mode: 'markers' as const,
                type: 'scattergl' as const,
                name: `Anomaly Points (${anomalyX.length})`,
                marker: {
                  color: '#EF4444', // Bright red
                  size: pointSize + 2,
                  opacity: 0.9,
                  line: { width: 3, color: '#DC2626' },
                },
                hovertemplate:
                  '<b>Anomaly (Manual)</b><br>X: %{x:.6f}<br>Y: %{y:.6f}<extra></extra>',
              },
              monitoringMetadataForIndices(manualAnomalyIndices)
            );
            data.push(anomalyManualTrace);
          }

          // Add unclassified points (gray)
          if (unclassifiedX.length > 0) {
            const unclassifiedManualTrace = attachMetadata(
              {
                x: unclassifiedX,
                y: unclassifiedY,
                mode: 'markers' as const,
                type: 'scattergl' as const,
                name: `Unclassified (${unclassifiedX.length})`,
                marker: {
                  color: '#9CA3AF', // Gray
                  size: pointSize,
                  opacity: 0.5,
                  line: { width: 1, color: 'rgba(0,0,0,0.2)' },
                },
                hovertemplate: '<b>Unclassified</b><br>X: %{x:.6f}<br>Y: %{y:.6f}<extra></extra>',
              },
              monitoringMetadataForIndices(manualUnclassifiedIndices)
            );
            data.push(unclassifiedManualTrace);
          }

          // Add manual selection boundary
          if (manualSelectionBoundary && manualSelectionBoundary.coordinates.length > 0) {
            const coords = manualSelectionBoundary.coordinates;
            let boundaryX: number[] = [];
            let boundaryY: number[] = [];
            let boundaryName = 'Selection Boundary';

            if (manualSelectionBoundary.type === 'rectangle' && coords.length >= 2) {
              const [x1, y1] = coords[0];
              const [x2, y2] = coords[1];
              boundaryX = [x1, x2, x2, x1, x1];
              boundaryY = [y1, y1, y2, y2, y1];
              boundaryName = 'Rectangle Selection';
            } else if (manualSelectionBoundary.type === 'lasso') {
              boundaryX = [...coords.map(([x]) => x), coords[0][0]];
              boundaryY = [...coords.map(([, y]) => y), coords[0][1]];
              boundaryName = 'Lasso Selection';
            } else if (
              manualSelectionBoundary.type === 'circle' ||
              manualSelectionBoundary.type === 'oval'
            ) {
              // For circle and oval, coordinates already contain the boundary points
              boundaryX = coords.map(([x]) => x);
              boundaryY = coords.map(([, y]) => y);
              boundaryName =
                manualSelectionBoundary.type === 'circle' ? 'Circle Selection' : 'Oval Selection';
            }

            if (boundaryX.length > 2) {
              data.push({
                x: boundaryX,
                y: boundaryY,
                mode: 'lines' as const,
                type: 'scattergl' as const,
                name: boundaryName,
                line: {
                  color: '#8B5CF6',
                  width: 3,
                  dash: 'dash',
                },
                hovertemplate: `<b>${boundaryName}</b><extra></extra>`,
                showlegend: true,
              });
            }
          }
        } else {
          // Default simple streaming mode
          const { colors, sizes, lineColors, lineWidths } = generateSimpleMonitoringColors(
            monitoringCount,
            dinsightData.monitoring.processOrders,
            streamingStatus || undefined
          );

          const processInfo = dinsightData.monitoring.processOrders
            ? dinsightData.monitoring.processOrders.map((order, i) => {
                const totalPoints = monitoringCount;
                const relativePosition = dinsightData.monitoring.processOrders!.filter(
                  (o) => o <= order
                ).length;
                return `Point ${order} (${relativePosition}/${totalPoints})`;
              })
            : dinsightData.monitoring.dinsight_x.map((_, i) => `Point ${i + 1}/${monitoringCount}`);

          const monitoringTrace = attachMetadata(
            {
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
                '<b>Live Monitor</b><br>X: %{x:.6f}<br>Y: %{y:.6f}<br><i>%{customdata}</i><extra></extra>',
              customdata: processInfo,
            },
            monitoringMetadataAll
          );
          data.push(monitoringTrace);
        }
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
    enableManualSelection,
    anomalyResults,
    manualClassification,
    manualSelectionBoundary,
    monitoringStarted,
    buildHoverText,
    hasActiveMetadata,
  ]);

  // Helper function to create shape from boundary
  const createShapeFromBoundary = useCallback(
    (boundary: any, color: string, isMultiple: boolean, index?: number) => {
      if (boundary.type === 'rectangle') {
        const coords = boundary.coordinates;
        const x0 = Math.min(...coords.map((c: number[]) => c[0]));
        const x1 = Math.max(...coords.map((c: number[]) => c[0]));
        const y0 = Math.min(...coords.map((c: number[]) => c[1]));
        const y1 = Math.max(...coords.map((c: number[]) => c[1]));

        return {
          type: 'rect',
          x0,
          y0,
          x1,
          y1,
          line: { color, width: isMultiple ? 2 : 3, dash: isMultiple ? 'solid' : 'dot' },
          fillcolor: 'rgba(0,0,0,0)',
          layer: 'above',
        };
      } else if (boundary.type === 'circle' && boundary.center && boundary.radius) {
        return {
          type: 'circle',
          xref: 'x',
          yref: 'y',
          x0: boundary.center.x - boundary.radius,
          y0: boundary.center.y - boundary.radius,
          x1: boundary.center.x + boundary.radius,
          y1: boundary.center.y + boundary.radius,
          line: { color, width: isMultiple ? 2 : 3, dash: isMultiple ? 'solid' : 'dot' },
          fillcolor: 'rgba(0,0,0,0)',
          layer: 'above',
        };
      } else if (
        boundary.type === 'oval' &&
        boundary.center &&
        boundary.radiusX &&
        boundary.radiusY
      ) {
        // For ovals, instead of SVG path, use multiple line segments like circles
        const cx = boundary.center.x;
        const cy = boundary.center.y;
        const rx = boundary.radiusX;
        const ry = boundary.radiusY;

        // Generate oval points and create path using line segments
        const numPoints = 64;
        const ovalPoints: string[] = [];

        // Start with move command
        const startX = cx + rx * Math.cos(0);
        const startY = cy + ry * Math.sin(0);
        ovalPoints.push(`M ${startX} ${startY}`);

        // Add line segments for the oval
        for (let i = 1; i <= numPoints; i++) {
          const angle = (i / numPoints) * 2 * Math.PI;
          const x = cx + rx * Math.cos(angle);
          const y = cy + ry * Math.sin(angle);
          ovalPoints.push(`L ${x} ${y}`);
        }

        // Close the path
        ovalPoints.push('Z');

        return {
          type: 'path',
          path: ovalPoints.join(' '),
          line: { color, width: isMultiple ? 2 : 3, dash: isMultiple ? 'solid' : 'dot' },
          fillcolor: 'rgba(0,0,0,0)',
          layer: 'above',
        };
      }

      return null;
    },
    []
  );

  // Generate shapes for boundary visualization
  const generateBoundaryShapes = useCallback(() => {
    const shapes: any[] = [];

    // Add current single boundary if in single mode and exists
    if (!enableMultipleSelections && manualSelectionBoundary) {
      const shape = createShapeFromBoundary(manualSelectionBoundary, '#10b981', false);
      if (shape) {
        shapes.push(shape);
      }
    }

    // Add multiple boundaries if in multiple mode
    if (enableMultipleSelections) {
      manualSelectionBoundaries.forEach((boundary, index) => {
        const color = `hsl(${(index * 137.5) % 360}, 70%, 50%)`; // Golden ratio based colors
        const shape = createShapeFromBoundary(boundary, color, true, index);
        if (shape) {
          shapes.push(shape);
        }
      });

      // Add current drawing boundary with different style
      if (manualSelectionBoundary) {
        const shape = createShapeFromBoundary(manualSelectionBoundary, '#3b82f6', false);
        if (shape) {
          shapes.push(shape);
        }
      }
    }

    return shapes;
  }, [
    enableMultipleSelections,
    manualSelectionBoundary,
    manualSelectionBoundaries,
    createShapeFromBoundary,
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
      dragmode: enableManualSelection ? ('select' as const) : ('zoom' as const), // Always use select mode for manual selection - we interpret the rectangular selection based on selectionMode
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
        autoscale: true,
      },
      yaxis: {
        title: { text: "D'insight Y Coordinate" },
        gridcolor: '#f1f5f9',
        zerolinecolor: '#e2e8f0',
        autoscale: true,
      },
      height: 600,
      margin: { l: 60, r: 30, t: 30, b: 60 },
      shapes: generateBoundaryShapes(),
    }),
    [enableManualSelection, generateBoundaryShapes]
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
                onClick={() => setMonitoringStarted(true)}
                className={cn(
                  'transition-all duration-200',
                  'bg-blue-500 hover:bg-blue-600 text-white'
                )}
                disabled={!selectedDinsightId || monitoringStarted}
              >
                <Play className="w-4 h-4 mr-2" />
                Start Monitoring
              </Button>
              <Button
                onClick={toggleStreaming}
                className={cn(
                  'transition-all duration-200',
                  isStreaming
                    ? 'bg-orange-500 hover:bg-orange-600 text-white'
                    : 'bg-green-500 hover:bg-green-600 text-white'
                )}
                disabled={!selectedDinsightId || !monitoringStarted}
              >
                {isStreaming ? (
                  <Pause className="w-4 h-4 mr-2" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                {isStreaming ? 'Pause' : 'Start'}
              </Button>
              <Button
                onClick={stopStreaming}
                variant="outline"
                disabled={!selectedDinsightId || !monitoringStarted}
              >
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
                disabled={
                  !selectedDinsightId ||
                  !dinsightData?.monitoring.dinsight_x.length ||
                  enableManualSelection
                }
                className={cn(
                  'transition-all duration-200',
                  enableAnomalyDetection && 'bg-orange-500 hover:bg-orange-600 text-white'
                )}
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                {enableAnomalyDetection ? 'Auto Anomaly ON' : 'Auto Anomaly OFF'}
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

            {/* Manual Selection Controls */}
            <div className="flex items-center gap-2 border-l border-gray-200 dark:border-gray-700 pl-4">
              <Button
                variant={enableManualSelection ? 'default' : 'outline'}
                size="sm"
                onClick={handleManualSelectionToggle}
                disabled={!selectedDinsightId || !dinsightData?.monitoring.dinsight_x.length}
                className={cn(
                  'transition-all duration-200',
                  enableManualSelection && 'bg-purple-500 hover:bg-purple-600 text-white'
                )}
              >
                <MousePointer2 className="w-4 h-4 mr-2" />
                {enableManualSelection ? 'Manual Anomaly ON' : 'Manual Anomaly OFF'}
              </Button>

              {/* Selection Mode Controls */}
              {enableManualSelection && (
                <div className="flex items-center gap-1 ml-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">Mode:</span>
                  {(['rectangle', 'circle', 'oval'] as const).map((mode) => (
                    <Button
                      key={mode}
                      variant={selectionMode === mode ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setSelectionMode(mode);
                        // Clear existing selection when changing modes
                        setManualSelectionBoundary(null);
                        setManualClassification(null);
                      }}
                      className={cn(
                        'px-2 py-1 text-xs transition-all duration-200',
                        selectionMode === mode && 'bg-purple-500 hover:bg-purple-600 text-white'
                      )}
                      title={`${mode.charAt(0).toUpperCase() + mode.slice(1)} selection mode`}
                    >
                      {mode === 'rectangle' && '📦'}
                      {mode === 'circle' && '⭕'}
                      {mode === 'oval' && '🥚'}
                      <span className="ml-1 hidden sm:inline">{mode}</span>
                    </Button>
                  ))}
                </div>
              )}

              {/* Multiple Selection Controls */}
              {enableManualSelection && (
                <div className="flex items-center gap-2 ml-2">
                  <Button
                    onClick={toggleMultipleSelections}
                    variant={enableMultipleSelections ? 'default' : 'outline'}
                    size="sm"
                    className={cn(
                      'px-3 py-1 text-xs transition-all duration-200',
                      enableMultipleSelections && 'bg-blue-500 hover:bg-blue-600 text-white'
                    )}
                    title="Toggle multiple selections mode"
                  >
                    <div className="flex items-center gap-1">
                      {enableMultipleSelections ? '🔗' : '🔓'}
                      <span className="hidden sm:inline">
                        {enableMultipleSelections ? 'Multi' : 'Single'}
                      </span>
                    </div>
                  </Button>

                  {enableMultipleSelections && (
                    <>
                      {manualSelectionBoundary && (
                        <Button
                          onClick={addSelectionToBoundaries}
                          variant="outline"
                          size="sm"
                          className="px-2 py-1 text-xs bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700"
                          title="Add current selection to normal areas"
                        >
                          ➕ Add
                        </Button>
                      )}

                      {manualSelectionBoundaries.length > 0 && (
                        <Button
                          onClick={clearAllBoundaries}
                          variant="outline"
                          size="sm"
                          className="px-2 py-1 text-xs bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700"
                          title="Clear all selections"
                        >
                          🗑️ Clear All
                        </Button>
                      )}

                      {manualSelectionBoundaries.length > 0 && (
                        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                          <span className="font-medium">{manualSelectionBoundaries.length}</span>
                          <span>areas</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {enableManualSelection && (
                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                  {!manualClassification ? (
                    <span>
                      {selectionMode === 'rectangle' &&
                        'Use box select tool 📦 to drag and select rectangular area'}
                      {selectionMode === 'circle' &&
                        'Use box select tool 📦 to drag - creates circle from selection bounds'}
                      {selectionMode === 'oval' &&
                        'Use box select tool 📦 to drag - creates oval from selection bounds'}
                    </span>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="text-purple-600 dark:text-purple-400 font-medium">
                        ✓{' '}
                        {manualClassification.normal_points.length +
                          manualClassification.anomaly_points.length}{' '}
                        points classified
                        {enableMultipleSelections && manualSelectionBoundaries.length > 0 && (
                          <span className="ml-1">({manualSelectionBoundaries.length} areas)</span>
                        )}
                        {!enableMultipleSelections && (
                          <span className="ml-1">({selectionMode})</span>
                        )}
                      </span>
                      <div className="flex items-center gap-2 text-xs">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                          <span>{manualClassification.normal_points.length} normal</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-red-500"></div>
                          <span>{manualClassification.anomaly_points.length} anomaly</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Multiple Boundaries List */}
              {enableManualSelection &&
                enableMultipleSelections &&
                manualSelectionBoundaries.length > 0 && (
                  <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Normal Operating Areas ({manualSelectionBoundaries.length})
                      </h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {manualSelectionBoundaries.map((boundary, index) => {
                        const color = `hsl(${(index * 137.5) % 360}, 70%, 50%)`;
                        return (
                          <div
                            key={boundary.id}
                            className="flex items-center justify-between p-2 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600"
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded border-2 flex-shrink-0"
                                style={{ borderColor: color }}
                              ></div>
                              <div className="flex flex-col">
                                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                  {boundary.name}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {boundary.type}
                                </span>
                              </div>
                            </div>
                            <Button
                              onClick={() => removeBoundary(boundary.id)}
                              variant="ghost"
                              size="sm"
                              className="p-1 h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                              title="Remove this boundary"
                            >
                              ✕
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
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

          {/* Manual Selection Status Bar - Only when enabled */}
          {enableManualSelection && manualSelectionBoundary && (
            <div className="p-4 bg-gradient-to-r from-purple-50/50 to-indigo-50/50 dark:from-purple-950/30 dark:to-indigo-950/30 backdrop-blur-sm rounded-xl border border-purple-200/50 dark:border-purple-700/50 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <MousePointer2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      Manual Selection Status
                    </span>
                    {streamingStatus && (
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-xs',
                          streamingStatus.status === 'completed' &&
                            'bg-green-50 text-green-700 border-green-200',
                          streamingStatus.status === 'streaming' &&
                            'bg-purple-50 text-purple-700 border-purple-200',
                          streamingStatus.status === 'not_started' &&
                            'bg-gray-50 text-gray-700 border-gray-200'
                        )}
                      >
                        {streamingStatus.status === 'completed'
                          ? 'Classification Complete'
                          : streamingStatus.status === 'streaming'
                            ? 'Live Classification'
                            : 'Ready to Stream'}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  {manualClassification && (
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span className="text-gray-700 dark:text-gray-300">
                          Normal: {manualClassification.normal_points.length}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <span className="text-gray-700 dark:text-gray-300">
                          Anomalies: {manualClassification.anomaly_points.length}
                        </span>
                      </div>
                      <div className="text-gray-600 dark:text-gray-400">
                        Rate:{' '}
                        {(
                          (manualClassification.anomaly_points.length /
                            (manualClassification.normal_points.length +
                              manualClassification.anomaly_points.length)) *
                          100
                        ).toFixed(1)}
                        %
                      </div>
                      <div className="text-purple-600 dark:text-purple-400 font-medium">
                        Manual Mode
                      </div>
                    </div>
                  )}

                  {!manualClassification && (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Boundary set, ready to classify streaming data
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Sidebar with Controls and Info */}
          <div className="xl:col-span-1 space-y-6">
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
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <MetadataHoverControls
                    availableKeys={availableMetadataKeys}
                    selectedKeys={selectedMetadataKeys}
                    onToggleKey={toggleMetadataKey}
                    onSelectAll={selectAllMetadataKeys}
                    onClearAll={clearMetadataKeys}
                    metadataEnabled={metadataEnabled}
                    onToggleEnabled={setMetadataEnabled}
                    disabled={!dinsightData}
                  />
                </div>
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
                          <div className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                            <div className="w-3 h-3 rounded-full bg-green-500 border-2 border-yellow-400 shadow-lg shadow-yellow-500/50"></div>
                            <span className="text-xs text-gray-700 dark:text-gray-300">
                              Latest {streamingStatus?.latest_glow_count || 5} points (yellow glow)
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
                          <div className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                            <div className="w-3 h-3 rounded-full bg-red-600 border-2 border-yellow-400 shadow-lg shadow-yellow-500/50"></div>
                            <span className="text-xs text-gray-700 dark:text-gray-300">
                              Latest {streamingStatus?.latest_glow_count || 5} points (yellow glow)
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
          </div>

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
                        modeBarButtonsToRemove: enableManualSelection
                          ? ['pan2d', 'zoomIn2d', 'zoomOut2d', 'autoScale2d', 'zoom2d'] // Keep selection tools and resetScale2d, remove zoom/pan tools
                          : ['select2d', 'lasso2d'], // Remove selection tools when not in manual mode
                        toImageButtonOptions: {
                          format: 'png',
                          filename: `streaming_visualization_${selectedDinsightId}_${new Date().toISOString().split('T')[0]}`,
                          height: 700,
                          width: 1400,
                          scale: 2,
                        },
                        // Enable selection when in manual selection mode
                        scrollZoom: !enableManualSelection,
                        doubleClick: enableManualSelection ? 'reset' : 'reset+autosize', // Allow reset but not autosize in selection mode
                      }}
                      onInitialized={(figure, graphDiv) => setPlotElement(graphDiv)}
                      onSelected={enableManualSelection ? handlePlotSelection : undefined}
                      onDeselect={enableManualSelection ? handlePlotDeselect : undefined}
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
