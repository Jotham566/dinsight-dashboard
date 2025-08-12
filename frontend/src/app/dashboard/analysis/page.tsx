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
      try {
        const response = await api.monitoring.getAvailable();
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
      try {
        const validDatasets: DinsightDataset[] = [];
        let consecutiveNotFound = 0;
        const maxConsecutiveNotFound = 3; // Stop after 3 consecutive 404s
        const maxCheckLimit = 20; // Reduce from 100 to 20 to minimize API calls

        // Start checking from ID 1 and continue until we find no more data
        for (let id = 1; id <= maxCheckLimit; id++) {
          try {
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
        console.warn('Failed to fetch available dinsight IDs:', error);
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

    setIsAnalyzing(true);
    try {
      // First, fetch the baseline coordinates and monitoring coordinates
      console.log('Fetching baseline and monitoring coordinates...');
      const [baselineResponse, monitoringResponse] = await Promise.all([
        api.analysis.getDinsight(baselineDataset),
        api.monitoring.getCoordinates(baselineDataset), // Use monitoring coordinates for the baseline ID
      ]);

      if (!baselineResponse.data.success) {
        throw new Error('Failed to fetch baseline dataset coordinates');
      }

      // Check monitoring response structure
      if (
        !monitoringResponse.data ||
        (!monitoringResponse.data.success && !monitoringResponse.data.dinsight_x)
      ) {
        throw new Error('No monitoring data available for selected baseline dataset');
      }

      const baselineCoords: DinsightData = {
        dinsight_x: baselineResponse.data.data.dinsight_x,
        dinsight_y: baselineResponse.data.data.dinsight_y,
      };

      const monitoringCoords: DinsightData = {
        dinsight_x: monitoringResponse.data.dinsight_x || [],
        dinsight_y: monitoringResponse.data.dinsight_y || [],
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
        const result: AnomalyDetectionResult = response.data.data;
        setAnomalyResults(result);
        console.log('Anomaly detection completed successfully:', result);
      } else {
        throw new Error('Invalid API response structure');
      }
    } catch (error: any) {
      console.error('Error running anomaly detection:', error);

      // Reset states on error
      setAnomalyResults(null);
      setBaselineData(null);
      setMonitoringData(null);
    } finally {
      setIsAnalyzing(false);
    }
  }, [baselineDataset, monitoringDataset, sensitivity, detectionMethod]);

  // Auto-rerun analysis when sensitivity changes (for real-time updates)
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
          console.error('Error during auto-rerun analysis:', error);
        } finally {
          setIsAnalyzing(false);
        }
      }, 500); // 500ms debounce

      return () => clearTimeout(timeoutId);
    }
  }, [sensitivity, detectionMethod]); // Only depend on the parameters that should trigger re-runs

  // Create the scatter plot visualization
  const createAnomalyVisualization = () => {
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
      config: { displayModeBar: true, responsive: true },
    };
  };

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
      {/* Modern Header with Glass Effect */}
      <div className="sticky top-0 z-10 backdrop-blur-md bg-white/80 border-b border-slate-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Advanced Analysis
                </h1>
                <p className="text-sm text-slate-600">
                  AI-powered anomaly detection and feature importance analysis
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => refetchDatasets()}
                className="border-slate-300 hover:bg-slate-50 hover:border-slate-400 transition-all duration-200 shadow-sm"
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
            <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                    <Settings2 className="w-4 h-4 text-white" />
                  </div>
                  Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Baseline Dataset
                    </label>
                    <select
                      value={baselineDataset || ''}
                      onChange={(e) => setBaselineDataset(Number(e.target.value))}
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm hover:shadow-md"
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
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Monitoring Dataset
                    </label>
                    <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl">
                      {baselineDataset ? (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-700">
                            Monitoring data for Dataset ID {baselineDataset}
                          </span>
                          <span className="text-sm text-green-600 bg-green-100 px-2 py-1 rounded-md">
                            Auto-linked
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-500">Select baseline dataset first</span>
                      )}
                    </div>
                    <div className="px-4 py-3 mt-3 bg-blue-50 border border-blue-100 rounded-xl">
                      <p className="text-xs text-blue-700 leading-relaxed">
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
            <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-white" />
                  </div>
                  Parameters
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Detection Method
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                      <input
                        type="radio"
                        value="mahalanobis"
                        checked={detectionMethod === 'mahalanobis'}
                        onChange={(e) => setDetectionMethod(e.target.value as DetectionMethod)}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <span className="ml-3 text-sm font-medium text-gray-700">
                        Mahalanobis Distance
                      </span>
                    </label>
                    <label className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                      <input
                        type="radio"
                        value="isolation_forest"
                        checked={detectionMethod === 'isolation_forest'}
                        onChange={(e) => setDetectionMethod(e.target.value as DetectionMethod)}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <span className="ml-3 text-sm font-medium text-gray-700">
                        Isolation Forest
                      </span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Sensitivity Factor: {sensitivity.toFixed(1)}
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="5.0"
                    step="0.1"
                    value={sensitivity}
                    onChange={(e) => setSensitivity(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, rgb(59 130 246) 0%, rgb(59 130 246) ${((sensitivity - 0.5) / 4.5) * 100}%, rgb(229 231 235) ${((sensitivity - 0.5) / 4.5) * 100}%, rgb(229 231 235) 100%)`,
                    }}
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-2">
                    <span>0.5 (Low Sensitivity)</span>
                    <span>5.0 (High Sensitivity)</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-2">Higher values detect more anomalies</p>
                </div>
              </CardContent>
            </Card>

            {/* Run Analysis Button */}
            <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
              <CardContent className="p-6">
                <Button
                  onClick={handleRunAnalysis}
                  disabled={isAnalyzing || !baselineDataset || !monitoringDataset}
                  className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {isAnalyzing ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
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
              <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100/50 backdrop-blur-sm group hover:shadow-xl transition-all duration-200">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg group-hover:scale-110 transition-transform duration-200">
                    <Activity className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-blue-900 mb-1">
                    {totalSamples.toLocaleString()}
                  </div>
                  <div className="text-sm font-medium text-blue-700">Monitoring Samples</div>
                  <div className="text-xs text-blue-600 mt-1 opacity-80">
                    Total data points analyzed
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-lg bg-gradient-to-br from-red-50 to-red-100/50 backdrop-blur-sm group hover:shadow-xl transition-all duration-200">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg group-hover:scale-110 transition-transform duration-200">
                    <AlertTriangle className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-red-900 mb-1">
                    {anomalyCount.toLocaleString()}
                  </div>
                  <div className="text-sm font-medium text-red-700">Anomalies Detected</div>
                  <div className="text-xs text-red-600 mt-1 opacity-80">
                    Points flagged as anomalous
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100/50 backdrop-blur-sm group hover:shadow-xl transition-all duration-200">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg group-hover:scale-110 transition-transform duration-200">
                    <XCircle className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-orange-900 mb-1">
                    {criticalCount.toLocaleString()}
                  </div>
                  <div className="text-sm font-medium text-orange-700">Critical Anomalies</div>
                  <div className="text-xs text-orange-600 mt-1 opacity-80">
                    Top 25% most severe anomalies
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100/50 backdrop-blur-sm group hover:shadow-xl transition-all duration-200">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg group-hover:scale-110 transition-transform duration-200">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-purple-900 mb-1">
                    {detectionRate.toFixed(1)}%
                  </div>
                  <div className="text-sm font-medium text-purple-700">Detection Rate</div>
                  <div className="text-xs text-purple-600 mt-1 opacity-80">
                    Percentage of samples flagged
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Visualization Card */}
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
              <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-gray-50/80 to-white/80 backdrop-blur-sm">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Activity className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-semibold text-gray-900">
                      Anomaly Detection Visualization
                    </CardTitle>
                    <CardDescription className="text-sm text-gray-600">
                      Baseline vs Monitor data comparison with anomaly overlay
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {isAnalyzing ? (
                  <div className="flex items-center justify-center h-96">
                    <div className="text-center">
                      <div className="relative">
                        <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Activity className="w-6 h-6 text-purple-600" />
                        </div>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Analyzing Data</h3>
                      <p className="text-sm text-gray-600">
                        Running anomaly detection algorithms...
                      </p>
                    </div>
                  </div>
                ) : !anomalyResults || !baselineData || !monitoringData ? (
                  <div className="flex items-center justify-center h-96">
                    <div className="text-center">
                      <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                        <Activity className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        No Analysis Results
                      </h3>
                      <p className="text-gray-600 mb-6 max-w-sm">
                        Select datasets and run anomaly detection to visualize baseline vs monitor
                        data comparison.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="w-full">
                    <Plot
                      data={createAnomalyVisualization()?.data || []}
                      layout={createAnomalyVisualization()?.layout || {}}
                      config={createAnomalyVisualization()?.config || {}}
                      className="w-full"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Analysis Statistics */}
            {anomalyResults && (
              <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
                <CardHeader className="border-b border-gray-100">
                  <CardTitle className="text-lg font-semibold text-gray-900">
                    Analysis Details
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    Detection Method: {detectionMethod.replace('_', ' ')}
                  </p>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-600">Sensitivity Level</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {anomalyResults.sensitivity_level}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-600">
                        {detectionMethod === 'mahalanobis'
                          ? 'Distance Threshold'
                          : 'Anomaly Score Threshold'}
                      </p>
                      <p className="text-lg font-semibold text-gray-900">
                        {anomalyResults.anomaly_threshold.toFixed(4)}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-600">Centroid Distance</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {anomalyResults.centroid_distance.toFixed(3)}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-600">
                        {detectionMethod === 'mahalanobis'
                          ? 'Max Mahalanobis Distance'
                          : 'Max Anomaly Score'}
                      </p>
                      <p className="text-lg font-semibold text-gray-900">
                        {anomalyResults.statistics.max_mahalanobis_distance.toFixed(4)}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-600">
                        {detectionMethod === 'mahalanobis'
                          ? 'Mean Mahalanobis Distance'
                          : 'Mean Anomaly Score'}
                      </p>
                      <p className="text-lg font-semibold text-gray-900">
                        {anomalyResults.statistics.mean_mahalanobis_distance.toFixed(4)}
                      </p>
                    </div>
                    {detectionMethod === 'mahalanobis' && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-600">Baseline Std Dev</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {anomalyResults.statistics.baseline_std_dev.toFixed(4)}
                        </p>
                      </div>
                    )}
                    {detectionMethod === 'isolation_forest' && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-600">Score Std Dev</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {anomalyResults.statistics.comparison_std_dev.toFixed(4)}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Additional Context for Critical Anomalies */}
                  <div className="mt-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <h4 className="text-sm font-semibold text-orange-800 mb-2">
                      Critical Anomalies Definition
                    </h4>
                    <p className="text-sm text-orange-700">
                      Critical anomalies represent the top 25% of detected anomalies ranked by their{' '}
                      {detectionMethod === 'mahalanobis' ? 'Mahalanobis distance' : 'anomaly score'}{' '}
                      values. Out of {anomalyCount} total anomalies, {criticalCount} are classified
                      as critical.
                    </p>
                  </div>

                  {/* Detection Rate Context */}
                  <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <h4 className="text-sm font-semibold text-purple-800 mb-2">
                      Detection Rate Explanation
                    </h4>
                    <p className="text-sm text-purple-700">
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
  );
}
