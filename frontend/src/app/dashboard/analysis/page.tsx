'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
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
import { api } from '@/lib/api-client';
import { ErrorBoundary } from '@/components/error-boundary';

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

type DetectionMethod = 'mahalanobis' | 'isolation_forest';

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
    refetch: refetchDatasets,
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
        let consecutiveNotFound = 0;
        const maxConsecutiveNotFound = 3; // Stop after 3 consecutive 404s
        const maxCheckLimit = 20; // Reduce from 100 to 20 to minimize API calls

        // Start checking from ID 1 and continue until we find no more data
        for (let id = 1; id <= maxCheckLimit; id++) {
          try {
            console.log(`📡 Checking dataset ID ${id}...`);
            const response = await api.analysis.getDinsight(id);

            // Validate this is a proper dinsight record with coordinates
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
                name: `Dataset ID ${id}`,
                type: 'dinsight' as const,
                records: response.data.data.dinsight_x.length,
              });
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

  // Filter baseline datasets to only those with monitoring data
  const baselinesWithMonitoring = useMemo(
    () =>
      availableDinsightIds?.filter((dataset) =>
        availableMonitoringDatasets?.some(
          (monitoring) => monitoring.dinsight_data_id === dataset.dinsight_id
        )
      ) || [],
    [availableDinsightIds, availableMonitoringDatasets]
  );

  // Auto-select first available datasets when data loads
  useEffect(() => {
    if (baselinesWithMonitoring && baselinesWithMonitoring.length > 0) {
      if (baselineDataset === null) {
        setBaselineDataset(baselinesWithMonitoring[0].dinsight_id);
      }
    }
  }, [baselinesWithMonitoring, baselineDataset]);

  // Auto-select monitoring dataset when baseline changes
  useEffect(() => {
    if (
      baselineDataset &&
      availableMonitoringDatasets?.some((m) => m.dinsight_data_id === baselineDataset)
    ) {
      // For the current design, monitoring dataset ID = baseline dataset ID
      // because monitoring data is linked to baseline via dinsight_data_id
      setMonitoringDataset(baselineDataset);
    }
  }, [baselineDataset, availableMonitoringDatasets]);

  // Define handleRunAnalysis with useCallback to prevent unnecessary re-renders
  const handleRunAnalysis = useCallback(async () => {
    if (!baselineDataset || !monitoringDataset) {
      console.warn('Please select both baseline and monitoring datasets');
      return;
    }

    console.log('🔄 Starting anomaly analysis...');
    setIsAnalyzing(true);
    try {
      // First, fetch the baseline coordinates and monitoring coordinates
      console.log('📡 Fetching baseline and monitoring coordinates...');
      console.log('📊 Baseline dataset ID:', baselineDataset);
      console.log('📊 Monitoring dataset ID:', monitoringDataset);

      const [baselineResponse, monitoringResponse] = await Promise.all([
        api.analysis.getDinsight(baselineDataset),
        api.monitoring.getCoordinates(baselineDataset), // Use monitoring coordinates for the baseline ID
      ]);

      console.log('✅ API responses received');
      console.log('📊 Baseline response:', baselineResponse);
      console.log('📊 Monitoring response:', monitoringResponse);

      if (!baselineResponse.data.success || !baselineResponse.data.data) {
        throw new Error('Failed to fetch baseline dataset coordinates');
      }

      // Check monitoring response structure
      if (
        !monitoringResponse.data ||
        (!monitoringResponse.data.success && !monitoringResponse.data.dinsight_x)
      ) {
        throw new Error('No monitoring data available for selected baseline dataset');
      }

      // Validate baseline data
      const baselineData = baselineResponse.data.data;
      if (
        !baselineData.dinsight_x ||
        !baselineData.dinsight_y ||
        !Array.isArray(baselineData.dinsight_x) ||
        !Array.isArray(baselineData.dinsight_y) ||
        baselineData.dinsight_x.length === 0 ||
        baselineData.dinsight_y.length === 0
      ) {
        throw new Error('Baseline dataset has invalid or empty coordinates');
      }

      // Validate monitoring data
      const monitoringX = monitoringResponse.data.dinsight_x || [];
      const monitoringY = monitoringResponse.data.dinsight_y || [];

      if (
        !Array.isArray(monitoringX) ||
        !Array.isArray(monitoringY) ||
        monitoringX.length === 0 ||
        monitoringY.length === 0
      ) {
        throw new Error('Monitoring dataset has invalid or empty coordinates');
      }

      const baselineCoords: DinsightData = {
        dinsight_x: baselineData.dinsight_x,
        dinsight_y: baselineData.dinsight_y,
      };

      const monitoringCoords: DinsightData = {
        dinsight_x: monitoringX,
        dinsight_y: monitoringY,
      };

      setBaselineData(baselineCoords);
      setMonitoringData(monitoringCoords);

      console.log('Running anomaly detection with params:', {
        baseline_dataset_id: baselineDataset,
        comparison_dataset_id: baselineDataset, // Backend now uses baseline ID to find monitoring data
        sensitivity_factor: sensitivity,
        detection_method: detectionMethod,
      });

      // Run anomaly detection with proper backend integration
      const response = await api.anomaly.detect({
        baseline_dataset_id: baselineDataset,
        comparison_dataset_id: baselineDataset, // Backend now uses baseline ID to find monitoring data
        sensitivity_factor: sensitivity, // Use sensitivity directly (0.5-5.0 range)
        detection_method: detectionMethod, // Pass selected detection method
      });

      console.log('Full API response:', response);

      if (response?.data?.success && response.data.data) {
        const result = response.data.data;

        // Validate the result structure
        if (typeof result === 'object' && result !== null) {
          console.log('Anomaly detection result:', result);

          // Check if required fields exist
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
        console.warn('API response structure:', response);
        throw new Error(`Invalid API response: ${response?.data?.message || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.warn('Error running anomaly detection:', error);

      // Show user-friendly error message
      let errorMessage = 'An unexpected error occurred during analysis';
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      // You could add a toast notification here if you have one set up
      alert(`Analysis Error: ${errorMessage}`);

      // Reset states on error
      setAnomalyResults(null);
      setBaselineData(null);
      setMonitoringData(null);
    } finally {
      setIsAnalyzing(false);
    }
  }, [baselineDataset, monitoringDataset, sensitivity, detectionMethod]);

  // Auto-rerun analysis when sensitivity changes (for real-time updates)
  // Note: We intentionally exclude anomalyResults from dependencies to prevent infinite loops
  useEffect(() => {
    // Only re-run if we have existing results and sensitivity changed
    if (anomalyResults && baselineDataset && monitoringDataset && !isAnalyzing) {
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

  // Create the scatter plot visualization - memoized to prevent infinite loops
  const createAnomalyVisualization = useCallback(() => {
    if (!baselineData || !monitoringData || !anomalyResults) {
      return null;
    }

    const data = [];

    // Add baseline points
    data.push({
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
    });

    // Separate normal and anomalous monitoring points
    const normalPoints = anomalyResults.anomalous_points.filter((p) => !p.is_anomaly);
    const anomalyPoints = anomalyResults.anomalous_points.filter((p) => p.is_anomaly);

    // Add normal monitoring points
    if (normalPoints.length > 0) {
      data.push({
        x: normalPoints.map((p) => p.x),
        y: normalPoints.map((p) => p.y),
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
        customdata: normalPoints.map((p) => p.mahalanobis_distance),
      });
    }

    // Add anomalous monitoring points
    if (anomalyPoints.length > 0) {
      data.push({
        x: anomalyPoints.map((p) => p.x),
        y: anomalyPoints.map((p) => p.y),
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
        customdata: anomalyPoints.map((p) => p.mahalanobis_distance),
      });
    }

    // Add baseline centroid marker
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

    // Add monitoring centroid marker
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

    return {
      data,
      layout: {
        title: { text: 'Anomaly Detection Analysis - Baseline vs Monitor' },
        xaxis: { title: { text: 'Dinsight X' } },
        yaxis: { title: { text: 'Dinsight Y' } },
        height: 700,
        template: 'plotly_white' as any,
        legend: {
          orientation: 'h' as any,
          yanchor: 'bottom' as any,
          y: 1.02,
          xanchor: 'right' as any,
          x: 1,
        },
        plot_bgcolor: 'rgba(240, 242, 246, 0.3)',
        showlegend: true,
        hovermode: 'closest' as any,
      },
      config: {
        displayModeBar: true,
        responsive: true,
        // Performance optimization to reduce console warnings about wheel events
        scrollZoom: false, // Disable scroll-based zooming to reduce wheel event listeners
      },
    };
  }, [baselineData, monitoringData, anomalyResults]);

  // Calculate analysis statistics from backend results
  const totalSamples = anomalyResults?.total_points || 0;
  const anomalyCount = anomalyResults?.anomaly_count || 0;

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

  const detectionRate = anomalyResults?.anomaly_percentage || 0;

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
                  onClick={() => refetchDatasets()}
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
                        value={baselineDataset || ''}
                        onChange={(e) => setBaselineDataset(Number(e.target.value))}
                        className="w-full px-4 py-3 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 shadow-sm hover:shadow-md text-gray-900 dark:text-gray-100"
                        disabled={datasetsLoading || monitoringLoading}
                      >
                        {baselineDataset === null && (
                          <option value="">Select baseline dataset...</option>
                        )}
                        {datasetsLoading || monitoringLoading ? (
                          <option>Loading datasets...</option>
                        ) : (
                          baselinesWithMonitoring?.map((dataset) => {
                            const monitoringInfo = availableMonitoringDatasets?.find(
                              (m) => m.dinsight_data_id === dataset.dinsight_id
                            );
                            return (
                              <option key={dataset.dinsight_id} value={dataset.dinsight_id}>
                                {dataset.name} ({dataset.records} baseline,{' '}
                                {monitoringInfo?.monitor_count || 0} monitoring)
                              </option>
                            );
                          })
                        )}
                        {!datasetsLoading &&
                          !monitoringLoading &&
                          baselinesWithMonitoring?.length === 0 && (
                            <option disabled>No datasets with monitoring data available</option>
                          )}
                      </select>
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
                            <span className="text-sm text-accent-teal-600 dark:text-accent-teal-400 bg-accent-teal-100 dark:bg-accent-teal-900/30 px-2 py-1 rounded-md">
                              Auto-linked
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
                          {baselinesWithMonitoring && baselinesWithMonitoring.length > 0
                            ? 'Monitoring data is automatically linked to the selected baseline dataset'
                            : 'Upload baseline and monitoring data to begin anomaly detection'}
                        </p>
                      </div>
                    </div>
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
                      <label className="flex items-center p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary-300 dark:hover:border-primary-600">
                        <input
                          type="radio"
                          value="isolation_forest"
                          checked={detectionMethod === 'isolation_forest'}
                          onChange={(e) => setDetectionMethod(e.target.value as DetectionMethod)}
                          className="w-4 h-4 text-primary-600 border-gray-300 dark:border-gray-600 focus:ring-primary-500 dark:bg-gray-700"
                        />
                        <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                          Isolation Forest
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

              {/* Run Analysis Button */}
              <Card className="glass-card shadow-xl border-gray-200/50 dark:border-gray-700/50 card-hover">
                <CardContent className="p-6">
                  <Button
                    onClick={handleRunAnalysis}
                    disabled={isAnalyzing || !baselineDataset || !monitoringDataset}
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
                      {totalSamples.toLocaleString()}
                    </div>
                    <div className="text-sm font-medium text-primary-700 dark:text-primary-300">
                      Monitoring Samples
                    </div>
                    <div className="text-xs text-primary-600 dark:text-primary-400 mt-1 opacity-80">
                      Total data points analyzed
                    </div>
                  </CardContent>
                </Card>
                <Card className="glass-card shadow-xl border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-red-50/30 to-red-100/20 dark:from-red-950/30 dark:to-red-900/20 group hover:shadow-2xl card-hover">
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-red-500/25 group-hover:scale-110 transition-transform duration-200">
                      <AlertTriangle className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-2xl font-bold text-red-900 dark:text-red-100 mb-1">
                      {anomalyCount.toLocaleString()}
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
                      {criticalCount.toLocaleString()}
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
                      {detectionRate.toFixed(1)}%
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
                  ) : !anomalyResults || !baselineData || !monitoringData ? (
                    <div className="flex items-center justify-center h-96">
                      <div className="text-center">
                        <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-xl">
                          <Activity className="w-10 h-10 text-gray-400 dark:text-gray-500" />
                        </div>
                        <h3 className="text-2xl font-bold gradient-text mb-3">
                          No Analysis Results
                        </h3>
                        <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-sm leading-relaxed">
                          Select datasets and run anomaly detection to visualize baseline vs monitor
                          data comparison.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="relative h-[700px] w-full p-6">
                      <Plot
                        data={createAnomalyVisualization()?.data || []}
                        layout={createAnomalyVisualization()?.layout || {}}
                        config={createAnomalyVisualization()?.config || {}}
                        style={{ width: '100%', height: '100%' }}
                        useResizeHandler={true}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Analysis Statistics */}
              {anomalyResults && (
                <Card className="glass-card shadow-2xl border-gray-200/50 dark:border-gray-700/50 card-hover">
                  <CardHeader className="border-b border-gray-100/50 dark:border-gray-700/50 bg-gradient-to-r from-primary-50/30 to-accent-purple-50/20 dark:from-primary-950/30 dark:to-accent-purple-950/20 rounded-t-xl">
                    <CardTitle className="text-2xl font-bold gradient-text flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/25">
                        <TrendingUp className="w-5 h-5 text-white" />
                      </div>
                      Analysis Details
                    </CardTitle>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                      Detection Method: {detectionMethod.replace('_', ' ')}
                    </p>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div className="glass-card p-4 bg-gradient-to-br from-primary-50/50 to-primary-100/30 dark:from-primary-950/50 dark:to-primary-900/30 border border-primary-200/50 dark:border-primary-700/50 rounded-xl">
                        <p className="text-sm font-medium text-primary-700 dark:text-primary-300">
                          Sensitivity Level
                        </p>
                        <p className="text-lg font-bold text-primary-900 dark:text-primary-100 mt-1">
                          {anomalyResults.sensitivity_level}
                        </p>
                      </div>
                      <div className="glass-card p-4 bg-gradient-to-br from-accent-purple-50/50 to-accent-purple-100/30 dark:from-accent-purple-950/50 dark:to-accent-purple-900/30 border border-accent-purple-200/50 dark:border-accent-purple-700/50 rounded-xl">
                        <p className="text-sm font-medium text-accent-purple-700 dark:text-accent-purple-300">
                          {detectionMethod === 'mahalanobis'
                            ? 'Distance Threshold'
                            : 'Anomaly Score Threshold'}
                        </p>
                        <p className="text-lg font-bold text-accent-purple-900 dark:text-accent-purple-100 mt-1">
                          {anomalyResults.anomaly_threshold.toFixed(4)}
                        </p>
                      </div>
                      <div className="glass-card p-4 bg-gradient-to-br from-accent-teal-50/50 to-accent-teal-100/30 dark:from-accent-teal-950/50 dark:to-accent-teal-900/30 border border-accent-teal-200/50 dark:border-accent-teal-700/50 rounded-xl">
                        <p className="text-sm font-medium text-accent-teal-700 dark:text-accent-teal-300">
                          Centroid Distance
                        </p>
                        <p className="text-lg font-bold text-accent-teal-900 dark:text-accent-teal-100 mt-1">
                          {anomalyResults.centroid_distance.toFixed(3)}
                        </p>
                      </div>
                      <div className="glass-card p-4 bg-gradient-to-br from-accent-orange-50/50 to-accent-orange-100/30 dark:from-accent-orange-950/50 dark:to-accent-orange-900/30 border border-accent-orange-200/50 dark:border-accent-orange-700/50 rounded-xl">
                        <p className="text-sm font-medium text-accent-orange-700 dark:text-accent-orange-300">
                          {detectionMethod === 'mahalanobis'
                            ? 'Max Mahalanobis Distance'
                            : 'Max Anomaly Score'}
                        </p>
                        <p className="text-lg font-bold text-accent-orange-900 dark:text-accent-orange-100 mt-1">
                          {anomalyResults.statistics.max_mahalanobis_distance.toFixed(4)}
                        </p>
                      </div>
                      <div className="glass-card p-4 bg-gradient-to-br from-accent-pink-50/50 to-accent-pink-100/30 dark:from-accent-pink-950/50 dark:to-accent-pink-900/30 border border-accent-pink-200/50 dark:border-accent-pink-700/50 rounded-xl">
                        <p className="text-sm font-medium text-accent-pink-700 dark:text-accent-pink-300">
                          {detectionMethod === 'mahalanobis'
                            ? 'Mean Mahalanobis Distance'
                            : 'Mean Anomaly Score'}
                        </p>
                        <p className="text-lg font-bold text-accent-pink-900 dark:text-accent-pink-100 mt-1">
                          {anomalyResults.statistics.mean_mahalanobis_distance.toFixed(4)}
                        </p>
                      </div>
                      {detectionMethod === 'mahalanobis' && (
                        <div className="glass-card p-4 bg-gradient-to-br from-primary-50/50 to-primary-100/30 dark:from-primary-950/50 dark:to-primary-900/30 border border-primary-200/50 dark:border-primary-700/50 rounded-xl">
                          <p className="text-sm font-medium text-primary-700 dark:text-primary-300">
                            Baseline Std Dev
                          </p>
                          <p className="text-lg font-bold text-primary-900 dark:text-primary-100 mt-1">
                            {anomalyResults.statistics.baseline_std_dev.toFixed(4)}
                          </p>
                        </div>
                      )}
                      {detectionMethod === 'isolation_forest' && (
                        <div className="glass-card p-4 bg-gradient-to-br from-primary-50/50 to-primary-100/30 dark:from-primary-950/50 dark:to-primary-900/30 border border-primary-200/50 dark:border-primary-700/50 rounded-xl">
                          <p className="text-sm font-medium text-primary-700 dark:text-primary-300">
                            Score Std Dev
                          </p>
                          <p className="text-lg font-bold text-primary-900 dark:text-primary-100 mt-1">
                            {anomalyResults.statistics.comparison_std_dev.toFixed(4)}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Additional Context for Critical Anomalies */}
                    <div className="glass-card p-6 bg-gradient-to-r from-accent-orange-100/80 to-accent-orange-50/60 dark:from-accent-orange-900/50 dark:to-accent-orange-950/40 border border-accent-orange-200/50 dark:border-accent-orange-700/50 rounded-xl">
                      <h4 className="text-sm font-semibold text-accent-orange-800 dark:text-accent-orange-200 mb-3 flex items-center gap-2">
                        <XCircle className="w-4 h-4" />
                        Critical Anomalies Definition
                      </h4>
                      <p className="text-sm text-accent-orange-700 dark:text-accent-orange-300 leading-relaxed">
                        Critical anomalies represent the top 25% of detected anomalies ranked by
                        their{' '}
                        {detectionMethod === 'mahalanobis'
                          ? 'Mahalanobis distance'
                          : 'anomaly score'}{' '}
                        values. Out of {anomalyCount} total anomalies, {criticalCount} are
                        classified as critical.
                      </p>
                    </div>

                    {/* Detection Rate Context */}
                    <div className="glass-card p-6 bg-gradient-to-r from-accent-purple-100/80 to-accent-purple-50/60 dark:from-accent-purple-900/50 dark:to-accent-purple-950/40 border border-accent-purple-200/50 dark:border-accent-purple-700/50 rounded-xl">
                      <h4 className="text-sm font-semibold text-accent-purple-800 dark:text-accent-purple-200 mb-3 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Detection Rate Explanation
                      </h4>
                      <p className="text-sm text-accent-purple-700 dark:text-accent-purple-300 leading-relaxed">
                        Detection rate of {detectionRate.toFixed(2)}% means {anomalyCount} out of{' '}
                        {totalSamples} monitoring samples were flagged as anomalous using{' '}
                        {detectionMethod.replace('_', ' ')} with{' '}
                        {anomalyResults.sensitivity_level.toLowerCase()} sensitivity.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
