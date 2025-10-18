'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import {
  Settings2,
  Play,
  TrendingUp,
  AlertTriangle,
  Activity,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api-client';
import { ErrorBoundary } from '@/components/error-boundary';
import { useMetadataHover } from '@/hooks/useMetadataHover';
import { MetadataHoverControls } from '@/components/metadata-hover-controls';
import { MetadataEntry } from '@/types/metadata';
import {
  normalizeMetadataArray,
  normalizeMetadataEntry,
  alignMetadataLength,
} from '@/utils/metadata';

// Dynamic import for Plotly to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

// Types
interface DinsightDataset {
  dinsight_id: number;
  name: string;
  type: 'dinsight';
  records?: number;
  created_at?: string;
}

interface AvailableMonitoringDataset {
  dinsight_data_id: number;
  monitor_count: number;
}

interface DinsightData {
  dinsight_x: number[];
  dinsight_y: number[];
  metadata: MetadataEntry[];
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

type DetectionMethod = 'mahalanobis';

export default function AdvancedAnalysisPage() {
  // State management
  const [baselineDataset, setBaselineDataset] = useState<number | null>(null);
  const [monitoringDataset, setMonitoringDataset] = useState<number | null>(null);
  const [detectionMethod, setDetectionMethod] = useState<DetectionMethod>('mahalanobis');
  const [sensitivity, setSensitivity] = useState<number>(3.0); // Changed to match backend sensitivity_factor (0.5-5.0)
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [anomalyResults, setAnomalyResults] = useState<AnomalyDetectionResult | null>(null);
  const [baselineData, setBaselineData] = useState<DinsightData | null>(null);
  const [monitoringData, setMonitoringData] = useState<DinsightData | null>(null);
  const [manualBaselineId, setManualBaselineId] = useState<string>('');
  const [isLoadingBaseline, setIsLoadingBaseline] = useState<boolean>(false);
  const [baselineError, setBaselineError] = useState<string | null>(null);
  const [isLoadingMonitoring, setIsLoadingMonitoring] = useState<boolean>(false);
  const [monitoringError, setMonitoringError] = useState<string | null>(null);
  const [monitoringRefreshKey, setMonitoringRefreshKey] = useState<number>(0);
  const [hasAppliedBaselineParam, setHasAppliedBaselineParam] = useState<boolean>(false);

  const searchParams = useSearchParams();

  // Query for available monitoring datasets (baseline IDs that have monitoring data)
  const { data: availableMonitoringDatasets, isLoading: monitoringLoading } = useQuery<
    AvailableMonitoringDataset[]
  >({
    queryKey: ['available-monitoring-datasets'],
    retry: false,
    refetchOnWindowFocus: true, // Automatically refetch when window regains focus to pick up new uploads
    refetchInterval: 60 * 1000, // Poll every 60 seconds for new datasets
    staleTime: 30 * 1000, // Reduce cache time to 30 seconds for faster refresh
    queryFn: async (): Promise<AvailableMonitoringDataset[]> => {
      console.log('🔍 Fetching available monitoring datasets...');
      try {
        const response = await api.monitoring.getAvailable();
        console.log('📊 Monitoring datasets response:', response);
        if (response.data.success && response.data.data) {
          return response.data.data;
        }
        return [];
      } catch (error) {
        console.warn('Failed to fetch available monitoring datasets:', error);
        return [];
      }
    },
  });

  // Query for available dinsight datasets (all baseline datasets)
  const {
    data: availableDinsightIds,
    isLoading: datasetsLoading,
    refetch: refetchDinsightIds,
  } = useQuery<DinsightDataset[]>({
    queryKey: ['available-dinsight-ids'],
    retry: false, // Don't retry failed requests automatically
    refetchOnWindowFocus: true, // Automatically refetch when window regains focus to pick up new uploads
    refetchInterval: 60 * 1000, // Poll every 60 seconds for new datasets
    staleTime: 30 * 1000, // Reduce cache time to 30 seconds for faster refresh
    queryFn: async (): Promise<DinsightDataset[]> => {
      console.log('🔍 Starting to fetch available datasets...');
      try {
        const validDatasets: DinsightDataset[] = [];
        const seenDinsightIds = new Set<number>();
        let consecutiveNotFound = 0;
        const maxConsecutiveNotFound = 3; // Stop after 3 consecutive 404s
        const maxCheckLimit = 20; // Reduce from 100 to 20 to minimize API calls

        // Start checking from ID 1 and continue until we find no more data
        for (let id = 1; id <= maxCheckLimit; id++) {
          try {
            console.log(`📡 Checking dataset ID ${id}...`);
            const response = await api.analysis.getDinsight(id);
            const payload = response?.data?.data;
            const resolvedId =
              payload && typeof payload.dinsight_id === 'number' && payload.dinsight_id > 0
                ? payload.dinsight_id
                : id;

            // Validate this is a proper dinsight record with coordinates
            if (
              response.data.success &&
              payload?.dinsight_x &&
              payload?.dinsight_y &&
              Array.isArray(payload.dinsight_x) &&
              Array.isArray(payload.dinsight_y) &&
              payload.dinsight_x.length > 0 &&
              payload.dinsight_y.length > 0
            ) {
              if (!seenDinsightIds.has(resolvedId)) {
                validDatasets.push({
                  dinsight_id: resolvedId,
                  name: `Dataset ID ${resolvedId}`,
                  type: 'dinsight' as const,
                  records: payload.dinsight_x.length,
                });
                seenDinsightIds.add(resolvedId);
              }
              consecutiveNotFound = 0; // Reset counter on successful find
            }
          } catch (error: any) {
            // If we get a 404, this ID doesn't exist
            if (error?.response?.status === 404) {
              consecutiveNotFound++;

              // If we've found some datasets and hit multiple consecutive 404s, stop
              if (validDatasets.length > 0 && consecutiveNotFound >= maxConsecutiveNotFound) {
                break;
              }

              // If we haven't found any datasets yet, continue checking a few more IDs
              if (validDatasets.length === 0 && id <= 5) {
                continue;
              }
            } else {
              // For other errors, log but don't increment consecutive counter
              console.warn(`Error checking dinsight ID ${id}:`, error);
            }
          }
        }

        console.log(
          `Found ${validDatasets.length} valid dinsight datasets:`,
          validDatasets.map((d) => d.dinsight_id)
        );
        return validDatasets;
      } catch (error) {
        // Don't use console.error here as it triggers React error boundaries
        console.warn('Failed to fetch available dinsight IDs:', error);
        // Don't throw here, just return empty array
        return [];
      }
    },
  });

  useEffect(() => {
    if (!searchParams || hasAppliedBaselineParam) {
      return;
    }

    const baselineParam = searchParams.get('baselineId');
    if (baselineParam) {
      const parsed = Number(baselineParam);
      if (!Number.isNaN(parsed) && parsed > 0) {
        setBaselineDataset(parsed);
        setManualBaselineId(baselineParam);
      }
    }

    setHasAppliedBaselineParam(true);
  }, [searchParams, hasAppliedBaselineParam]);

  // Auto-select latest (highest ID) available dinsight ID when data loads
  useEffect(() => {
    if (!availableDinsightIds || availableDinsightIds.length === 0) {
      return;
    }

    if (!hasAppliedBaselineParam) {
      return;
    }

    if (baselineDataset !== null) {
      return;
    }

    const latestDataset = availableDinsightIds.reduce((latest, current) =>
      current.dinsight_id > latest.dinsight_id ? current : latest
    );
    setBaselineDataset(latestDataset.dinsight_id);
  }, [availableDinsightIds, baselineDataset, hasAppliedBaselineParam]);

  // Add manual refresh button handler
  const handleRefreshDinsightIds = () => {
    refetchDinsightIds();
    setMonitoringRefreshKey((prev) => prev + 1);
  };

  const handleManualBaselineLoad = () => {
    const trimmedId = manualBaselineId.trim();
    if (!trimmedId) {
      return;
    }

    const parsed = Number(trimmedId);
    if (Number.isNaN(parsed) || parsed <= 0) {
      setBaselineError('Enter a valid baseline DInsight ID.');
      return;
    }

    setBaselineError(null);
    setMonitoringError(null);
    setAnomalyResults(null);
    setBaselineDataset(parsed);
    setMonitoringRefreshKey((prev) => prev + 1);
    refetchDinsightIds();
  };

  // Filter baseline datasets to only those with monitoring data
  useEffect(() => {
    setMonitoringDataset(null);
  }, [baselineDataset]);

  useEffect(() => {
    if (!baselineDataset) {
      setBaselineData(null);
      setBaselineError(null);
      return;
    }

    let isCancelled = false;

    const fetchBaseline = async () => {
      setIsLoadingBaseline(true);
      setBaselineError(null);

      try {
        const response = await api.analysis.getDinsight(baselineDataset);
        const data = response?.data?.data;

        if (!isCancelled) {
          if (
            response?.data?.success &&
            data?.dinsight_x &&
            data?.dinsight_y &&
            Array.isArray(data.dinsight_x) &&
            Array.isArray(data.dinsight_y) &&
            data.dinsight_x.length > 0 &&
            data.dinsight_y.length > 0
          ) {
            const baselineMetadata = alignMetadataLength(
              normalizeMetadataArray(data.point_metadata),
              data.dinsight_x.length
            );
            setBaselineData({
              dinsight_x: data.dinsight_x,
              dinsight_y: data.dinsight_y,
              metadata: baselineMetadata,
            });
            setBaselineError(null);
          } else {
            setBaselineData(null);
            setBaselineError('Baseline dataset does not contain valid coordinates yet.');
          }
        }
      } catch (error: any) {
        if (!isCancelled) {
          console.warn('Failed to fetch baseline dataset:', error);
          setBaselineData(null);
          const message =
            error?.response?.data?.message || error?.message || 'Unable to load baseline dataset.';
          setBaselineError(message);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingBaseline(false);
        }
      }
    };

    fetchBaseline();

    return () => {
      isCancelled = true;
    };
  }, [baselineDataset]);

  useEffect(() => {
    if (!baselineDataset) {
      setMonitoringData(null);
      setMonitoringError(null);
      setMonitoringDataset(null);
      return;
    }

    let isCancelled = false;

    const fetchMonitoring = async () => {
      setIsLoadingMonitoring(true);
      setMonitoringError(null);

      try {
        const response = await api.monitoring.get(baselineDataset);
        const payload = response?.data;

        let rows: any[] = [];
        if (Array.isArray(payload)) {
          rows = payload;
        } else if (Array.isArray(payload?.data)) {
          rows = payload.data;
        } else if (Array.isArray(payload?.dinsight_x) && Array.isArray(payload?.dinsight_y)) {
          rows = payload.dinsight_x.map((value: unknown, index: number) => ({
            dinsight_x: value,
            dinsight_y: payload.dinsight_y[index],
            metadata: payload?.metadata?.[index],
          }));
        }

        if (!isCancelled) {
          if (rows.length > 0) {
            const xValues = rows.map((row: any) =>
              typeof row?.dinsight_x === 'number' ? row.dinsight_x : Number(row?.dinsight_x ?? 0)
            );
            const yValues = rows.map((row: any) =>
              typeof row?.dinsight_y === 'number' ? row.dinsight_y : Number(row?.dinsight_y ?? 0)
            );
            const metadata = alignMetadataLength(
              rows.map((row: any) => normalizeMetadataEntry(row?.metadata)),
              xValues.length
            );

            if (xValues.length > 0 && yValues.length > 0) {
              setMonitoringData({
                dinsight_x: xValues,
                dinsight_y: yValues,
                metadata,
              });
              setMonitoringDataset(baselineDataset);
            } else {
              setMonitoringData(null);
              setMonitoringDataset(null);
              setMonitoringError('Monitoring data not available for this baseline yet.');
            }
          } else {
            setMonitoringData(null);
            setMonitoringDataset(null);
            setMonitoringError('Monitoring data not available for this baseline yet.');
          }
        }
      } catch (error: any) {
        if (!isCancelled) {
          console.warn('Failed to fetch monitoring dataset:', error);
          setMonitoringData(null);
          setMonitoringDataset(null);
          const status = error?.response?.status;
          const message =
            status === 404
              ? 'Monitoring data not found for this baseline. Upload monitoring data to continue.'
              : error?.response?.data?.message ||
                error?.message ||
                'Unable to load monitoring data.';
          setMonitoringError(message);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingMonitoring(false);
        }
      }
    };

    fetchMonitoring();

    return () => {
      isCancelled = true;
    };
  }, [baselineDataset, monitoringRefreshKey]);

  useEffect(() => {
    if (baselineDataset) {
      setManualBaselineId(String(baselineDataset));
    } else {
      setManualBaselineId('');
    }
  }, [baselineDataset]);

  useEffect(() => {
    setAnomalyResults(null);
  }, [baselineDataset]);

  const baselineMetadata = useMemo(() => baselineData?.metadata ?? [], [baselineData?.metadata]);
  const monitoringMetadata = useMemo(
    () => monitoringData?.metadata ?? [],
    [monitoringData?.metadata]
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

  // Define handleRunAnalysis with useCallback to prevent unnecessary re-renders
  const handleRunAnalysis = useCallback(async () => {
    if (!baselineDataset) {
      console.warn('Select a baseline dataset before running analysis.');
      return;
    }

    if (
      !baselineData ||
      baselineData.dinsight_x.length === 0 ||
      baselineData.dinsight_y.length === 0
    ) {
      console.warn('Baseline data is not ready yet.');
      return;
    }

    if (
      !monitoringData ||
      monitoringData.dinsight_x.length === 0 ||
      monitoringData.dinsight_y.length === 0
    ) {
      console.warn('Monitoring data is not available for the selected baseline.');
      return;
    }

    console.log('🔄 Starting anomaly analysis...');
    setIsAnalyzing(true);
    try {
      const response = await api.anomaly.detect({
        baseline_dataset_id: baselineDataset,
        comparison_dataset_id: baselineDataset,
        sensitivity_factor: sensitivity,
        detection_method: detectionMethod,
      });

      console.log('Full API response:', response);

      if (response?.data?.success && response.data.data) {
        const result = response.data.data;
        if (typeof result === 'object' && result !== null) {
          const requiredFields = ['total_points', 'anomaly_count', 'anomaly_percentage'];
          const missingFields = requiredFields.filter((field) => !(field in result));

          if (missingFields.length > 0) {
            throw new Error(`Missing required fields in API response: ${missingFields.join(', ')}`);
          }

          setAnomalyResults(result as AnomalyDetectionResult);
          console.log('Anomaly detection completed successfully:', result);
        } else {
          throw new Error('API returned invalid data structure');
        }
      } else {
        throw new Error(`Invalid API response: ${response?.data?.message || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.warn('Error running anomaly detection:', error);

      let errorMessage = 'An unexpected error occurred during analysis';
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      alert(`Analysis Error: ${errorMessage}`);
      setAnomalyResults(null);
    } finally {
      setIsAnalyzing(false);
    }
  }, [baselineDataset, baselineData, monitoringData, sensitivity, detectionMethod]);

  // Create the scatter plot visualization - memoized to prevent infinite loops
  const createAnomalyVisualization = useCallback(() => {
    if (
      !baselineData ||
      baselineData.dinsight_x.length === 0 ||
      baselineData.dinsight_y.length === 0
    ) {
      return null;
    }

    const addMetadataToTemplate = (template: string, textArray?: string[]) => {
      if (!hasActiveMetadata || !textArray || textArray.length === 0) {
        return template;
      }

      const hasContent = textArray.some((entry) => entry && entry.trim().length > 0);
      if (!hasContent) {
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
      ? buildHoverText(baselineData.metadata)
      : undefined;
    const monitoringMetadataText =
      hasActiveMetadata && monitoringData ? buildHoverText(monitoringData.metadata) : undefined;
    const monitoringMetadataForIndices = (indices: number[]) =>
      hasActiveMetadata && monitoringData && indices.length > 0
        ? buildHoverText(monitoringData.metadata, indices)
        : undefined;

    const traces: any[] = [
      attachMetadata(
        {
          x: baselineData.dinsight_x,
          y: baselineData.dinsight_y,
          mode: 'markers' as const,
          type: 'scattergl' as const,
          name: 'Baseline Dataset',
          marker: {
            color: '#1A73E8',
            size: 6,
            opacity: 0.5,
            line: { width: 1, color: 'rgba(0,0,0,0.2)' },
          },
          hovertemplate: '<b>Baseline</b><br>X: %{x:.6f}<br>Y: %{y:.6f}<extra></extra>',
        },
        baselineMetadataText
      ),
    ];

    const hasMonitoringPoints =
      monitoringData &&
      monitoringData.dinsight_x.length > 0 &&
      monitoringData.dinsight_y.length > 0;

    if (anomalyResults && anomalyResults.anomalous_points?.length) {
      const normalPoints = anomalyResults.anomalous_points.filter((point) => !point.is_anomaly);
      const anomalyPoints = anomalyResults.anomalous_points.filter((point) => point.is_anomaly);

      if (normalPoints.length > 0) {
        traces.push(
          attachMetadata(
            {
              x: normalPoints.map((point) => point.x),
              y: normalPoints.map((point) => point.y),
              mode: 'markers' as const,
              type: 'scattergl' as const,
              name: 'Normal Points',
              marker: {
                color: '#34A853',
                size: 6,
                opacity: 0.7,
                line: { width: 1, color: 'rgba(0,0,0,0.2)' },
              },
              hovertemplate:
                '<b>Normal</b><br>X: %{x:.6f}<br>Y: %{y:.6f}<br>M-Dist: %{customdata:.3f}<extra></extra>',
              customdata: normalPoints.map((point) => point.mahalanobis_distance),
            },
            monitoringMetadataForIndices(normalPoints.map((point) => point.index))
          )
        );
      }

      if (anomalyPoints.length > 0) {
        traces.push(
          attachMetadata(
            {
              x: anomalyPoints.map((point) => point.x),
              y: anomalyPoints.map((point) => point.y),
              mode: 'markers' as const,
              type: 'scattergl' as const,
              name: 'Anomalies',
              marker: {
                color: '#EA4335',
                size: 8,
                opacity: 0.9,
                symbol: 'circle',
                line: { width: 2, color: '#c62828' },
              },
              hovertemplate:
                '<b>Anomaly</b><br>X: %{x:.6f}<br>Y: %{y:.6f}<br>M-Dist: %{customdata:.3f}<extra></extra>',
              customdata: anomalyPoints.map((point) => point.mahalanobis_distance),
            },
            monitoringMetadataForIndices(anomalyPoints.map((point) => point.index))
          )
        );
      }

      traces.push({
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

      traces.push({
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
    } else if (hasMonitoringPoints && monitoringData) {
      traces.push(
        attachMetadata(
          {
            x: monitoringData.dinsight_x,
            y: monitoringData.dinsight_y,
            mode: 'markers' as const,
            type: 'scattergl' as const,
            name: 'Monitoring Dataset',
            marker: {
              color: '#34A853',
              size: 6,
              opacity: 0.6,
              line: { width: 1, color: 'rgba(0,0,0,0.2)' },
            },
            hovertemplate: '<b>Monitoring</b><br>X: %{x:.6f}<br>Y: %{y:.6f}<extra></extra>',
          },
          monitoringMetadataText
        )
      );
    }

    const titleText = anomalyResults
      ? 'Anomaly Detection Analysis - Baseline vs Monitor'
      : hasMonitoringPoints
        ? 'Baseline vs Monitoring Scatter'
        : 'Baseline Scatter';

    return {
      data: traces,
      layout: {
        title: { text: titleText },
        xaxis: { title: { text: 'Dinsight X' }, range: [-1, 1] },
        yaxis: { title: { text: 'Dinsight Y' }, range: [-1, 1] },
        height: 700,
        template: 'plotly_white' as any,
        legend: {
          orientation: 'h' as any,
          yanchor: 'bottom' as any,
          y: 1.02,
          xanchor: 'right' as any,
          x: 1,
        },
        plot_bgcolor: 'white',
        paper_bgcolor: 'white',
        showlegend: true,
        hovermode: 'closest' as any,
      },
      config: {
        displayModeBar: true,
        responsive: true,
        scrollZoom: false,
      },
    };
  }, [baselineData, monitoringData, anomalyResults, buildHoverText, hasActiveMetadata]);

  const monitoringCounts = useMemo(() => {
    const map = new Map<number, number>();
    availableMonitoringDatasets?.forEach((item) => {
      map.set(item.dinsight_data_id, item.monitor_count);
    });
    return map;
  }, [availableMonitoringDatasets]);

  const baselineOptions = availableDinsightIds ?? [];
  const isDatasetListLoading = datasetsLoading || monitoringLoading;

  const baselinePointCount =
    baselineData?.dinsight_x?.length && baselineData?.dinsight_y?.length
      ? Math.min(baselineData.dinsight_x.length, baselineData.dinsight_y.length)
      : 0;
  const monitoringPointCount =
    monitoringData?.dinsight_x?.length && monitoringData?.dinsight_y?.length
      ? Math.min(monitoringData.dinsight_x.length, monitoringData.dinsight_y.length)
      : 0;

  const hasBaselineData = baselinePointCount > 0;
  const hasMonitoringData = monitoringPointCount > 0;

  // Auto-rerun analysis when sensitivity changes (for real-time updates)
  // Note: We intentionally exclude anomalyResults from dependencies to prevent infinite loops
  useEffect(() => {
    // Only re-run if we have existing results and sensitivity changed
    if (
      anomalyResults &&
      baselineDataset &&
      monitoringDataset &&
      hasMonitoringData &&
      !isAnalyzing
    ) {
      // Debounce the analysis to avoid too many API calls
      const timeoutId = setTimeout(async () => {
        if (!baselineDataset || !monitoringDataset) return;

        setIsAnalyzing(true);
        try {
          // Run anomaly detection with updated sensitivity
          const response = await api.anomaly.detect({
            baseline_dataset_id: baselineDataset,
            comparison_dataset_id: baselineDataset,
            sensitivity_factor: sensitivity,
            detection_method: detectionMethod,
          });

          if (response?.data?.success && response.data.data) {
            const result: AnomalyDetectionResult = response.data.data;
            setAnomalyResults(result);
          }
        } catch (error) {
          console.warn('Error during auto-rerun analysis:', error);
        } finally {
          setIsAnalyzing(false);
        }
      }, 500); // 500ms debounce

      return () => clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sensitivity, detectionMethod]); // Only depend on the parameters that should trigger re-runs

  // Calculate analysis statistics from backend results
  const totalSamples = anomalyResults ? anomalyResults.total_points : monitoringPointCount;
  const anomalyCount = anomalyResults ? anomalyResults.anomaly_count : 0;

  // Calculate "Critical" as anomalies in top 25% of distance/score values among all anomalous points
  const criticalCount = (() => {
    if (!anomalyResults?.anomalous_points) return 0;

    const anomalousPoints = anomalyResults.anomalous_points.filter((p) => p.is_anomaly);
    if (anomalousPoints.length === 0) return 0;

    // Sort anomalous points by distance/score (highest first)
    const sortedAnomalies = anomalousPoints.sort(
      (a, b) => b.mahalanobis_distance - a.mahalanobis_distance
    );

    // Calculate the actual COUNT of critical anomalies (top 25%)
    const criticalThresholdCount = Math.max(1, Math.ceil(sortedAnomalies.length * 0.25));
    return criticalThresholdCount;
  })();

  const detectionRate = anomalyResults ? anomalyResults.anomaly_percentage : 0;

  const sampleCount = monitoringPointCount > 0 ? monitoringPointCount : baselinePointCount;
  const sampleTitle = monitoringPointCount > 0 ? 'Monitoring Samples' : 'Baseline Samples';
  const sampleSubtitle =
    monitoringPointCount > 0
      ? 'Total monitoring data points loaded'
      : 'Baseline data points available';

  const displayAnomalyCount = anomalyResults ? anomalyCount.toLocaleString() : '--';
  const displayCriticalCount =
    anomalyResults && anomalyResults.anomalous_points?.some((p) => p.is_anomaly)
      ? criticalCount.toLocaleString()
      : '--';
  const displayDetectionRate = anomalyResults ? `${detectionRate.toFixed(1)}%` : '--';

  const selectedMonitoringCount =
    baselineDataset !== null ? (monitoringCounts.get(baselineDataset) ?? 0) : 0;

  const visualization = createAnomalyVisualization();

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
        {/* Modern Header with Enhanced Gradient */}
        <div className="sticky top-0 z-10 glass-card backdrop-blur-xl bg-white/80 dark:bg-gray-950/80 border-b border-gray-200/50 dark:border-gray-700/50 shadow-lg">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-accent-purple-500 to-accent-pink-600 rounded-xl flex items-center justify-center shadow-lg shadow-accent-purple-500/25">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold gradient-text">Anomaly Detection</h1>
                  <p className="text-gray-600 dark:text-gray-300 mt-1">
                    Detect anomalies between baseline and monitoring datasets
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={handleRefreshDinsightIds}
                  className="glass-card hover:shadow-lg transition-all duration-200"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Data
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
          {/* Modern Layout: Sidebar + Main Content */}
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
            {/* Control Sidebar */}
            <div className="xl:col-span-1 space-y-6">
              {/* Analysis Configuration Card */}
              <Card className="glass-card shadow-xl border-gray-200/50 dark:border-gray-700/50 card-hover">
                <CardHeader className="pb-4 bg-gradient-to-r from-primary-50/30 to-accent-teal-50/20 dark:from-primary-950/30 dark:to-accent-teal-950/20 rounded-t-xl">
                  <CardTitle className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/25">
                      <Settings2 className="w-5 h-5 text-white" />
                    </div>
                    <span className="gradient-text">Configuration</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Baseline Dataset
                      </label>
                      <select
                        value={baselineDataset !== null ? String(baselineDataset) : ''}
                        onChange={(event) => {
                          const value = event.target.value;
                          if (value === '') {
                            setBaselineDataset(null);
                            return;
                          }
                          setBaselineDataset(Number(value));
                        }}
                        className="w-full px-4 py-3 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 shadow-sm hover:shadow-md text-gray-900 dark:text-gray-100"
                        disabled={isDatasetListLoading}
                      >
                        {baselineDataset === null && (
                          <option value="">Select baseline dataset...</option>
                        )}
                        {isDatasetListLoading ? (
                          <option>Loading datasets...</option>
                        ) : (
                          <>
                            {baselineDataset !== null &&
                              !baselineOptions.some(
                                (dataset) => dataset.dinsight_id === baselineDataset
                              ) && (
                                <option value={String(baselineDataset)}>
                                  Dataset ID {baselineDataset} (manual entry)
                                </option>
                              )}
                            {baselineOptions.map((dataset) => {
                              const monitorCount = monitoringCounts.get(dataset.dinsight_id) ?? 0;
                              const baselineLabel =
                                dataset.records !== undefined
                                  ? `${dataset.records} baseline`
                                  : 'baseline count n/a';
                              const monitoringLabel =
                                monitorCount > 0
                                  ? `${monitorCount} monitoring`
                                  : 'no monitoring yet';

                              return (
                                <option
                                  key={dataset.dinsight_id}
                                  value={String(dataset.dinsight_id)}
                                >
                                  {dataset.name} ({baselineLabel}, {monitoringLabel})
                                </option>
                              );
                            })}
                            {baselineOptions.length === 0 && (
                              <option disabled>No baseline datasets available</option>
                            )}
                          </>
                        )}
                      </select>
                      <div className="mt-4 space-y-3">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                          <Input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={manualBaselineId}
                            onChange={(event) =>
                              setManualBaselineId(event.target.value.replace(/[^0-9]/g, ''))
                            }
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                event.preventDefault();
                                handleManualBaselineLoad();
                              }
                            }}
                            className="flex-1 min-w-[160px]"
                            placeholder="Enter baseline DInsight ID"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleManualBaselineLoad}
                            className="flex items-center gap-2"
                            disabled={!manualBaselineId || isLoadingBaseline}
                          >
                            Load ID
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleRefreshDinsightIds}
                            className="flex items-center gap-2"
                            disabled={!baselineDataset || isLoadingMonitoring}
                          >
                            <RefreshCw className="w-4 h-4" />
                            Refresh Monitoring
                          </Button>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                          Use the baseline ID from a previous upload to visualize results
                          immediately. Refresh monitoring data after uploading new monitoring files.
                        </p>
                        {baselineDataset && (
                          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-800 dark:text-blue-200">
                            {isLoadingBaseline
                              ? 'Loading baseline coordinates...'
                              : baselineError
                                ? baselineError
                                : hasBaselineData
                                  ? `Baseline dataset ready with ${baselinePointCount.toLocaleString()} points.`
                                  : 'Baseline coordinates are not available yet. Processing may still be in progress.'}
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Monitoring Dataset
                      </label>
                      <div className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl">
                        {baselineDataset ? (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-700 dark:text-gray-300">
                              Monitoring data for Dataset ID {baselineDataset}
                            </span>
                            <span
                              className={`text-sm px-2 py-1 rounded-md ${
                                hasMonitoringData
                                  ? 'text-accent-teal-600 dark:text-accent-teal-400 bg-accent-teal-100 dark:bg-accent-teal-900/30'
                                  : 'text-yellow-700 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900/30'
                              }`}
                            >
                              {hasMonitoringData ? 'Ready' : 'Pending'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-500 dark:text-gray-400">
                            Select baseline dataset first
                          </span>
                        )}
                      </div>
                      <div className="glass-card px-4 py-3 mt-3 bg-gradient-to-r from-primary-100/80 to-accent-teal-100/60 dark:from-primary-900/50 dark:to-accent-teal-900/40 border border-primary-200/50 dark:border-primary-700/50 rounded-xl">
                        <p className="text-xs text-primary-800 dark:text-primary-200 leading-relaxed">
                          {selectedMonitoringCount > 0 || hasMonitoringData
                            ? 'Monitoring data is linked to this baseline. You can rerun anomaly detection as needed.'
                            : 'Upload monitoring data for this baseline or refresh once new monitoring files are processed.'}
                        </p>
                      </div>
                      {baselineDataset && (
                        <div
                          className={`mt-3 p-3 rounded-lg border text-sm ${
                            isLoadingMonitoring
                              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200'
                              : monitoringError
                                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
                                : hasMonitoringData
                                  ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                                  : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200'
                          }`}
                        >
                          {isLoadingMonitoring
                            ? 'Loading monitoring data...'
                            : monitoringError
                              ? monitoringError
                              : hasMonitoringData
                                ? `Monitoring dataset ready with ${monitoringPointCount.toLocaleString()} points.`
                                : 'No monitoring points available yet. Upload monitoring data or refresh after processing completes.'}
                        </div>
                      )}
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
                      disabled={!baselineData && !monitoringData}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Detection Parameters Card */}
              <Card className="glass-card shadow-xl border-gray-200/50 dark:border-gray-700/50 card-hover">
                <CardHeader className="pb-4 bg-gradient-to-r from-accent-purple-50/30 to-accent-pink-50/20 dark:from-accent-purple-950/30 dark:to-accent-pink-950/20 rounded-t-xl">
                  <CardTitle className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-accent-purple-500 to-accent-pink-600 rounded-xl flex items-center justify-center shadow-lg shadow-accent-purple-500/25">
                      <TrendingUp className="w-5 h-5 text-white" />
                    </div>
                    <span className="gradient-text">Parameters</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Detection Method
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary-300 dark:hover:border-primary-600">
                        <input
                          type="radio"
                          value="mahalanobis"
                          checked={detectionMethod === 'mahalanobis'}
                          onChange={(e) => setDetectionMethod(e.target.value as DetectionMethod)}
                          className="w-4 h-4 text-primary-600 border-gray-300 dark:border-gray-600 focus:ring-primary-500 dark:bg-gray-700"
                        />
                        <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                          Mahalanobis Distance
                        </span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Sensitivity Factor: {sensitivity.toFixed(1)}
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="5.0"
                      step="0.1"
                      value={sensitivity}
                      onChange={(e) => setSensitivity(Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                      style={{
                        background: `linear-gradient(to right, rgb(59, 130, 246) 0%, rgb(59, 130, 246) ${((sensitivity - 0.5) / 4.5) * 100}%, rgb(229, 231, 235) ${((sensitivity - 0.5) / 4.5) * 100}%, rgb(229, 231, 235) 100%)`,
                      }}
                    />
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
                      <span>0.5 (Low Sensitivity)</span>
                      <span>5.0 (High Sensitivity)</span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                      Higher values detect more anomalies
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Key Statistics Card */}
              {anomalyResults && (
                <Card className="glass-card shadow-xl border-gray-200/50 dark:border-gray-700/50 card-hover">
                  <CardHeader className="pb-3 bg-gradient-to-r from-accent-orange-50/30 to-accent-pink-50/20 dark:from-accent-orange-950/30 dark:to-accent-pink-950/20 rounded-t-xl">
                    <CardTitle className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-accent-orange-500 to-accent-pink-600 rounded-lg flex items-center justify-center shadow-lg">
                        <TrendingUp className="w-4 h-4 text-white" />
                      </div>
                      <span className="gradient-text text-base">Key Metrics</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Detection Rate:
                        </span>
                        <span className="font-semibold text-accent-purple-600 dark:text-accent-purple-400">
                          {detectionRate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Sensitivity:
                        </span>
                        <span className="font-semibold text-accent-teal-600 dark:text-accent-teal-400">
                          {anomalyResults.sensitivity_level}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Threshold:</span>
                        <span className="font-semibold text-primary-600 dark:text-primary-400">
                          {anomalyResults.anomaly_threshold.toFixed(3)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Max Distance:
                        </span>
                        <span className="font-semibold text-accent-orange-600 dark:text-accent-orange-400">
                          {anomalyResults.statistics.max_mahalanobis_distance.toFixed(3)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Run Analysis Button */}
              <Card className="glass-card shadow-xl border-gray-200/50 dark:border-gray-700/50 card-hover">
                <CardContent className="p-6">
                  <Button
                    onClick={handleRunAnalysis}
                    disabled={
                      isAnalyzing || !baselineDataset || !hasBaselineData || !hasMonitoringData
                    }
                    className="w-full bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed h-12 text-base font-semibold"
                  >
                    {isAnalyzing ? (
                      <>
                        <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5 mr-2" />
                        Run Analysis
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Main Analysis Area */}
            <div className="xl:col-span-3 space-y-6">
              {/* Analysis Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <Card className="glass-card shadow-xl border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-primary-50/30 to-accent-teal-50/20 dark:from-primary-950/30 dark:to-accent-teal-950/20 group hover:shadow-2xl card-hover">
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-teal-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-primary-500/25 group-hover:scale-110 transition-transform duration-200">
                      <Activity className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-2xl font-bold gradient-text mb-1">
                      {sampleCount.toLocaleString()}
                    </div>
                    <div className="text-sm font-medium text-primary-700 dark:text-primary-300">
                      {sampleTitle}
                    </div>
                    <div className="text-xs text-primary-600 dark:text-primary-400 mt-1 opacity-80">
                      {sampleSubtitle}
                    </div>
                  </CardContent>
                </Card>
                <Card className="glass-card shadow-xl border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-red-50/30 to-red-100/20 dark:from-red-950/30 dark:to-red-900/20 group hover:shadow-2xl card-hover">
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-red-500/25 group-hover:scale-110 transition-transform duration-200">
                      <AlertTriangle className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-2xl font-bold text-red-900 dark:text-red-100 mb-1">
                      {displayAnomalyCount}
                    </div>
                    <div className="text-sm font-medium text-red-700 dark:text-red-300">
                      Anomalies Detected
                    </div>
                    <div className="text-xs text-red-600 dark:text-red-400 mt-1 opacity-80">
                      Points flagged as anomalous
                    </div>
                  </CardContent>
                </Card>
                <Card className="glass-card shadow-xl border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-accent-orange-50/30 to-accent-orange-100/20 dark:from-accent-orange-950/30 dark:to-accent-orange-900/20 group hover:shadow-2xl card-hover">
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-accent-orange-500 to-accent-orange-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-accent-orange-500/25 group-hover:scale-110 transition-transform duration-200">
                      <XCircle className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-2xl font-bold text-accent-orange-900 dark:text-accent-orange-100 mb-1">
                      {displayCriticalCount}
                    </div>
                    <div className="text-sm font-medium text-accent-orange-700 dark:text-accent-orange-300">
                      Critical Anomalies
                    </div>
                    <div className="text-xs text-accent-orange-600 dark:text-accent-orange-400 mt-1 opacity-80">
                      Top 25% most severe anomalies
                    </div>
                  </CardContent>
                </Card>
                <Card className="glass-card shadow-xl border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-accent-purple-50/30 to-accent-purple-100/20 dark:from-accent-purple-950/30 dark:to-accent-purple-900/20 group hover:shadow-2xl card-hover">
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-accent-purple-500 to-accent-purple-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-accent-purple-500/25 group-hover:scale-110 transition-transform duration-200">
                      <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-2xl font-bold text-accent-purple-900 dark:text-accent-purple-100 mb-1">
                      {displayDetectionRate}
                    </div>
                    <div className="text-sm font-medium text-accent-purple-700 dark:text-accent-purple-300">
                      Detection Rate
                    </div>
                    <div className="text-xs text-accent-purple-600 dark:text-accent-purple-400 mt-1 opacity-80">
                      Percentage of samples flagged
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Visualization Card */}
              <Card className="glass-card shadow-2xl border-gray-200/50 dark:border-gray-700/50 card-hover">
                <CardHeader className="border-b border-gray-100/50 dark:border-gray-700/50 bg-gradient-to-r from-primary-50/30 via-white/50 to-accent-purple-50/30 dark:from-gray-900/50 dark:via-gray-950/50 dark:to-gray-900/50 backdrop-blur-sm rounded-t-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/25">
                      <Activity className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl font-bold gradient-text">
                        Anomaly Detection Visualization
                      </CardTitle>
                      <CardDescription className="text-gray-600 dark:text-gray-400 mt-1">
                        Baseline vs Monitor data comparison with anomaly overlay
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {isAnalyzing ? (
                    <div className="flex items-center justify-center h-96">
                      <div className="text-center">
                        <div className="relative">
                          <div className="w-20 h-20 border-4 border-primary-200 dark:border-primary-800 border-t-primary-600 dark:border-t-primary-400 rounded-full animate-spin mx-auto mb-6"></div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Activity className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                          </div>
                        </div>
                        <h3 className="text-2xl font-bold gradient-text mb-3">Analyzing Data</h3>
                        <p className="text-gray-600 dark:text-gray-300">
                          Running anomaly detection algorithms...
                        </p>
                      </div>
                    </div>
                  ) : isLoadingBaseline ? (
                    <div className="flex items-center justify-center h-96">
                      <div className="text-center">
                        <div className="relative">
                          <div className="w-20 h-20 border-4 border-primary-200 dark:border-primary-800 border-t-primary-600 dark:border-t-primary-400 rounded-full animate-spin mx-auto mb-6"></div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Activity className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                          </div>
                        </div>
                        <h3 className="text-2xl font-bold gradient-text mb-3">
                          Preparing Baseline
                        </h3>
                        <p className="text-gray-600 dark:text-gray-300">
                          Loading baseline coordinates for visualization...
                        </p>
                      </div>
                    </div>
                  ) : !visualization ? (
                    <div className="flex items-center justify-center h-96">
                      <div className="text-center">
                        <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-xl">
                          <Activity className="w-10 h-10 text-gray-400 dark:text-gray-500" />
                        </div>
                        <h3 className="text-2xl font-bold gradient-text mb-3">
                          Baseline Not Ready
                        </h3>
                        <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-sm leading-relaxed">
                          {baselineError
                            ? baselineError
                            : 'Upload or load a baseline dataset to start visualizing your data.'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="relative h-[700px] w-full p-6">
                      <div className="bg-white rounded-lg border border-gray-200 dark:border-gray-600 p-2 h-full">
                        <Plot
                          data={visualization.data || []}
                          layout={visualization.layout || {}}
                          config={visualization.config || {}}
                          style={{ width: '100%', height: '100%' }}
                          useResizeHandler={true}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
