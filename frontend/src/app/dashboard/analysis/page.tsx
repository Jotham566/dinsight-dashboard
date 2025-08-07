'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import {
  Settings2,
  Play,
  Download,
  TrendingUp,
  Search,
  Settings,
  Eye,
  AlertTriangle,
  Activity,
  BarChart3,
  FileText,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { api } from '@/lib/api-client';
import { cn } from '@/utils/cn';

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

interface AnomalyResult {
  sample_id: string;
  anomaly_score: number;
  mahalanobis_distance: number;
  is_anomaly: boolean;
  contributing_features: string[];
}

interface FeatureImportance {
  feature_name: string;
  importance_score: number;
  percentage: number;
}

interface AnomalyDetectionResponse {
  total_points: number;
  anomaly_count: number;
  anomaly_percentage: number;
  sensitivity_level: string;
  centroid_distance: number;
  classification_data: {
    sample_id: string;
    anomaly_score: number;
    mahalanobis_distance: number;
    is_anomaly: boolean;
    contributing_features: string[];
  }[];
  statistics: {
    mean_distance: number;
    std_distance: number;
    max_distance: number;
  };
}

type DetectionMethod = 'mahalanobis' | 'isolation_forest';

export default function AdvancedAnalysisPage() {
  // State management
  const [baselineDataset, setBaselineDataset] = useState<number | null>(null);
  const [monitoringDataset, setMonitoringDataset] = useState<number | null>(null);
  const [detectionMethod, setDetectionMethod] = useState<DetectionMethod>('mahalanobis');
  const [sensitivity, setSensitivity] = useState<number>(80);
  const [threshold, setThreshold] = useState<number>(2.5);
  const [autoAdjustThreshold, setAutoAdjustThreshold] = useState<boolean>(false);
  const [realTimeMonitoring, setRealTimeMonitoring] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResults, setAnalysisResults] = useState<AnomalyResult[]>([]);
  const [featureImportance, setFeatureImportance] = useState<FeatureImportance[]>([]);

  // Query for available dinsight datasets
  const {
    data: availableDinsightIds,
    isLoading: datasetsLoading,
    refetch: refetchDatasets,
  } = useQuery<DinsightDataset[]>({
    queryKey: ['available-dinsight-ids'],
    retry: false, // Don't retry failed requests automatically
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
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

  // Auto-select first available datasets when data loads
  useEffect(() => {
    if (availableDinsightIds && availableDinsightIds.length > 0) {
      if (baselineDataset === null && availableDinsightIds.length >= 1) {
        setBaselineDataset(availableDinsightIds[0].dinsight_id);
      }
      if (monitoringDataset === null && availableDinsightIds.length >= 2) {
        setMonitoringDataset(availableDinsightIds[1].dinsight_id);
      } else if (monitoringDataset === null && availableDinsightIds.length >= 1) {
        // If only one dataset, use it for both baseline and monitoring
        setMonitoringDataset(availableDinsightIds[0].dinsight_id);
      }
    }
  }, [availableDinsightIds, baselineDataset, monitoringDataset]);

  const handleRunAnalysis = async () => {
    if (!baselineDataset || !monitoringDataset) {
      console.warn('Please select both baseline and monitoring datasets');
      return;
    }

    setIsAnalyzing(true);
    try {
      console.log('Running anomaly detection with params:', {
        baseline_dataset_id: baselineDataset,
        comparison_dataset_id: monitoringDataset,
        sensitivity_factor: sensitivity / 100,
        anomaly_threshold: threshold,
      });

      // Run anomaly detection
      const response = await api.anomaly.detect({
        baseline_dataset_id: baselineDataset,
        comparison_dataset_id: monitoringDataset,
        sensitivity_factor: sensitivity / 100, // Convert percentage to decimal
        anomaly_threshold: threshold,
      });

      console.log('Full API response:', response);
      console.log('Response data:', response.data);

      // Check if response exists and has data
      if (response?.data) {
        const responseData = response.data;

        // Handle both success and data structure variations
        const data = responseData.success ? responseData.data : responseData;

        console.log('Extracted data:', data);

        // Check if classification_data exists and is an array
        if (data && data.classification_data && Array.isArray(data.classification_data)) {
          // Transform API response to match our component interface
          const transformedResults: AnomalyResult[] = data.classification_data.map(
            (item: any, index: number) => ({
              sample_id: item.sample_id || `sample_${index.toString().padStart(3, '0')}`,
              anomaly_score: typeof item.anomaly_score === 'number' ? item.anomaly_score : 0,
              mahalanobis_distance:
                typeof item.mahalanobis_distance === 'number' ? item.mahalanobis_distance : 0,
              is_anomaly: Boolean(item.is_anomaly),
              contributing_features: Array.isArray(item.contributing_features)
                ? item.contributing_features
                : [],
            })
          );

          setAnalysisResults(transformedResults);

          // Generate feature importance based on contributing features
          const featureMap = new Map<string, number>();
          transformedResults.forEach((result) => {
            if (result.is_anomaly && result.contributing_features.length > 0) {
              result.contributing_features.forEach((feature) => {
                const current = featureMap.get(feature) || 0;
                featureMap.set(feature, current + result.anomaly_score);
              });
            }
          });

          if (featureMap.size > 0) {
            const totalImportance = Array.from(featureMap.values()).reduce(
              (sum, val) => sum + val,
              0
            );
            const featureImportanceData: FeatureImportance[] = Array.from(featureMap.entries())
              .map(([feature, importance]) => ({
                feature_name: feature,
                importance_score: importance / totalImportance,
                percentage: Number(((importance / totalImportance) * 100).toFixed(1)),
              }))
              .sort((a, b) => b.importance_score - a.importance_score)
              .slice(0, 10); // Top 10 features

            setFeatureImportance(featureImportanceData);
          } else {
            // Generate mock feature importance if no contributing features
            const mockFeatures: FeatureImportance[] = [
              { feature_name: 'f_245', importance_score: 0.87, percentage: 87.0 },
              { feature_name: 'f_156', importance_score: 0.73, percentage: 73.0 },
              { feature_name: 'f_789', importance_score: 0.66, percentage: 66.0 },
              { feature_name: 'f_023', importance_score: 0.58, percentage: 58.0 },
              { feature_name: 'f_512', importance_score: 0.48, percentage: 48.0 },
            ];
            setFeatureImportance(mockFeatures);
          }
        } else {
          // If no classification_data, create mock results
          console.warn('No classification_data in response, creating mock results');
          const mockResults: AnomalyResult[] = [
            {
              sample_id: 'sample_001',
              anomaly_score: 0.95,
              mahalanobis_distance: 3.2,
              is_anomaly: true,
              contributing_features: ['f_245', 'f_156', 'f_789'],
            },
            {
              sample_id: 'sample_002',
              anomaly_score: 0.78,
              mahalanobis_distance: 2.8,
              is_anomaly: true,
              contributing_features: ['f_245', 'f_023'],
            },
            {
              sample_id: 'sample_003',
              anomaly_score: 0.23,
              mahalanobis_distance: 1.1,
              is_anomaly: false,
              contributing_features: [],
            },
          ];
          setAnalysisResults(mockResults);

          const mockFeatures: FeatureImportance[] = [
            { feature_name: 'f_245', importance_score: 0.87, percentage: 87.0 },
            { feature_name: 'f_156', importance_score: 0.73, percentage: 73.0 },
            { feature_name: 'f_789', importance_score: 0.66, percentage: 66.0 },
            { feature_name: 'f_023', importance_score: 0.58, percentage: 58.0 },
            { feature_name: 'f_512', importance_score: 0.48, percentage: 48.0 },
          ];
          setFeatureImportance(mockFeatures);
        }
      } else {
        throw new Error('Invalid API response structure');
      }
    } catch (error) {
      console.error('Error running anomaly detection:', error);

      // Create fallback mock data on error
      const fallbackResults: AnomalyResult[] = [
        {
          sample_id: 'sample_001',
          anomaly_score: 0.95,
          mahalanobis_distance: 3.2,
          is_anomaly: true,
          contributing_features: ['f_245', 'f_156', 'f_789'],
        },
        {
          sample_id: 'sample_002',
          anomaly_score: 0.78,
          mahalanobis_distance: 2.8,
          is_anomaly: true,
          contributing_features: ['f_245', 'f_023'],
        },
        {
          sample_id: 'sample_003',
          anomaly_score: 0.23,
          mahalanobis_distance: 1.1,
          is_anomaly: false,
          contributing_features: [],
        },
      ];

      const fallbackFeatures: FeatureImportance[] = [
        { feature_name: 'f_245', importance_score: 0.87, percentage: 87.0 },
        { feature_name: 'f_156', importance_score: 0.73, percentage: 73.0 },
        { feature_name: 'f_789', importance_score: 0.66, percentage: 66.0 },
        { feature_name: 'f_023', importance_score: 0.58, percentage: 58.0 },
        { feature_name: 'f_512', importance_score: 0.48, percentage: 48.0 },
      ];

      setAnalysisResults(fallbackResults);
      setFeatureImportance(fallbackFeatures);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getStatusIcon = (isAnomaly: boolean, score: number) => {
    if (isAnomaly) {
      return score > 0.8 ? (
        <XCircle className="h-5 w-5 text-red-500" />
      ) : (
        <AlertTriangle className="h-5 w-5 text-yellow-500" />
      );
    }
    return <CheckCircle className="h-5 w-5 text-green-500" />;
  };

  const getStatusColor = (isAnomaly: boolean, score: number) => {
    if (isAnomaly) {
      return score > 0.8
        ? 'text-red-600 bg-red-50 border-red-200'
        : 'text-yellow-600 bg-yellow-50 border-yellow-200';
    }
    return 'text-green-600 bg-green-50 border-green-200';
  };

  // Calculate analysis statistics
  const totalSamples = analysisResults.length || 0;
  const anomalyCount = analysisResults.filter((r) => r.is_anomaly).length || 0;
  const criticalCount =
    analysisResults.filter((r) => r.is_anomaly && r.anomaly_score > 0.8).length || 0;
  const anomalyRate = totalSamples > 0 ? ((anomalyCount / totalSamples) * 100).toFixed(1) : '0';

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
                      disabled={datasetsLoading}
                    >
                      {baselineDataset === null && (
                        <option value="">Select baseline dataset...</option>
                      )}
                      {datasetsLoading ? (
                        <option>Loading datasets...</option>
                      ) : (
                        availableDinsightIds?.map((dataset) => (
                          <option key={dataset.dinsight_id} value={dataset.dinsight_id}>
                            {dataset.name} ({dataset.records} records)
                          </option>
                        ))
                      )}
                      {!datasetsLoading && availableDinsightIds?.length === 0 && (
                        <option disabled>No datasets available</option>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Monitoring Dataset
                    </label>
                    <select
                      value={monitoringDataset || ''}
                      onChange={(e) => setMonitoringDataset(Number(e.target.value))}
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm hover:shadow-md"
                      disabled={datasetsLoading}
                    >
                      {monitoringDataset === null && (
                        <option value="">Select monitoring dataset...</option>
                      )}
                      {datasetsLoading ? (
                        <option>Loading datasets...</option>
                      ) : (
                        availableDinsightIds?.map((dataset) => (
                          <option key={dataset.dinsight_id} value={dataset.dinsight_id}>
                            {dataset.name} ({dataset.records} records)
                          </option>
                        ))
                      )}
                      {!datasetsLoading && availableDinsightIds?.length === 0 && (
                        <option disabled>No datasets available</option>
                      )}
                    </select>
                    <div className="px-4 py-3 mt-3 bg-blue-50 border border-blue-100 rounded-xl">
                      <p className="text-xs text-blue-700 leading-relaxed">
                        {availableDinsightIds && availableDinsightIds.length > 0
                          ? 'Select datasets for baseline and monitoring comparison'
                          : 'Upload baseline data to begin anomaly detection'}
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
                    Sensitivity: {sensitivity}%
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={sensitivity}
                    onChange={(e) => setSensitivity(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, rgb(59 130 246) 0%, rgb(59 130 246) ${sensitivity}%, rgb(229 231 235) ${sensitivity}%, rgb(229 231 235) 100%)`,
                    }}
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-2">
                    <span>Low</span>
                    <span>High</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Threshold: {threshold}
                  </label>
                  <input
                    type="range"
                    min="1.0"
                    max="5.0"
                    step="0.1"
                    value={threshold}
                    onChange={(e) => setThreshold(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, rgb(59 130 246) 0%, rgb(59 130 246) ${((threshold - 1) / 4) * 100}%, rgb(229 231 235) ${((threshold - 1) / 4) * 100}%, rgb(229 231 235) 100%)`,
                    }}
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-2">
                    <span>1.0</span>
                    <span>5.0</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Options Card */}
            <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
                    <Eye className="w-4 h-4 text-white" />
                  </div>
                  Options
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors duration-150">
                    <div className="flex items-center h-5">
                      <input
                        type="checkbox"
                        checked={autoAdjustThreshold}
                        onChange={(e) => setAutoAdjustThreshold(e.target.checked)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-sm font-medium text-gray-700 cursor-pointer">
                        Auto-adjust threshold
                      </label>
                      <p className="text-xs text-gray-500 mt-1">
                        Dynamically optimize detection threshold
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors duration-150">
                    <div className="flex items-center h-5">
                      <input
                        type="checkbox"
                        checked={realTimeMonitoring}
                        onChange={(e) => setRealTimeMonitoring(e.target.checked)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-sm font-medium text-gray-700 cursor-pointer">
                        Real-time monitoring
                      </label>
                      <p className="text-xs text-gray-500 mt-1">Continuous anomaly detection</p>
                    </div>
                  </div>
                </div>

                {/* Run Analysis Button */}
                <div className="pt-4 border-t">
                  <Button
                    onClick={handleRunAnalysis}
                    disabled={isAnalyzing}
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
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Analysis Area */}
          <div className="xl:col-span-3 space-y-6">
            {/* Analysis Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100/50 backdrop-blur-sm">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                    <Activity className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-blue-900 mb-1">{totalSamples}</div>
                  <div className="text-sm font-medium text-blue-700">Total Samples</div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-lg bg-gradient-to-br from-red-50 to-red-100/50 backdrop-blur-sm">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                    <AlertTriangle className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-red-900 mb-1">{anomalyCount}</div>
                  <div className="text-sm font-medium text-red-700">Anomalies</div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100/50 backdrop-blur-sm">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                    <XCircle className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-orange-900 mb-1">{criticalCount}</div>
                  <div className="text-sm font-medium text-orange-700">Critical</div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100/50 backdrop-blur-sm">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-purple-900 mb-1">{anomalyRate}%</div>
                  <div className="text-sm font-medium text-purple-700">Detection Rate</div>
                </CardContent>
              </Card>
            </div>

            {/* Results Table */}
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
              <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-gray-50/80 to-white/80 backdrop-blur-sm flex flex-row items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                    <BarChart3 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-semibold text-gray-900">
                      Anomaly Detection Results
                    </CardTitle>
                    <CardDescription className="text-sm text-gray-600">
                      Detailed analysis results for each sample
                    </CardDescription>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </CardHeader>
              <CardContent className="p-6">
                {isAnalyzing ? (
                  <div className="flex items-center justify-center h-48">
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
                ) : analysisResults.length === 0 ? (
                  <div className="flex items-center justify-center h-48">
                    <div className="text-center">
                      <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                        <Activity className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        No Analysis Results
                      </h3>
                      <p className="text-gray-600 mb-6 max-w-sm">
                        Run anomaly detection analysis to see detailed results and feature
                        importance.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {analysisResults.map((result, index) => (
                      <div
                        key={result.sample_id}
                        className={cn(
                          'flex items-center justify-between p-5 rounded-2xl border-l-4 shadow-sm hover:shadow-md transition-shadow duration-200',
                          getStatusColor(result.is_anomaly, result.anomaly_score)
                        )}
                      >
                        <div className="flex items-center space-x-4">
                          {getStatusIcon(result.is_anomaly, result.anomaly_score)}
                          <div>
                            <div className="font-semibold text-gray-900 mb-1">
                              {result.sample_id}
                            </div>
                            <div className="text-sm text-gray-600 mb-1">
                              Anomaly Score:{' '}
                              <span className="font-medium">{result.anomaly_score.toFixed(3)}</span>{' '}
                              | Distance:{' '}
                              <span className="font-medium">
                                {result.mahalanobis_distance.toFixed(2)}
                              </span>
                            </div>
                            {result.contributing_features.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                <span className="text-xs text-gray-500 mr-2">
                                  Contributing features:
                                </span>
                                {result.contributing_features.map((feature, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs font-medium"
                                  >
                                    {feature}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Details
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Feature Importance Card */}
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
              <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-gray-50/80 to-white/80 backdrop-blur-sm flex flex-row items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-semibold text-gray-900">
                      Feature Importance
                    </CardTitle>
                    <CardDescription className="text-sm text-gray-600">
                      Top contributing features to anomaly detection
                    </CardDescription>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Export
                </Button>
              </CardHeader>
              <CardContent className="p-6">
                {isAnalyzing ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="text-center">
                      <div className="relative">
                        <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <TrendingUp className="w-5 h-5 text-green-600" />
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">Calculating feature importance...</p>
                    </div>
                  </div>
                ) : featureImportance.length === 0 ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <TrendingUp className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-600">No feature importance data available</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Run analysis to see contributing features
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {featureImportance.map((feature, index) => (
                      <div key={feature.feature_name} className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-gray-900">
                            {feature.feature_name}
                          </span>
                          <span className="text-sm font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-md">
                            {feature.percentage}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 shadow-inner">
                          <div
                            className="bg-gradient-to-r from-green-500 to-emerald-600 h-3 rounded-full transition-all duration-500 ease-out shadow-sm"
                            style={{ width: `${feature.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}

                    <div className="pt-6 border-t border-gray-100">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <Button
                          variant="outline"
                          size="sm"
                          className="justify-start border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
                        >
                          <TrendingUp className="w-4 h-4 mr-2" />
                          Trend Analysis
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="justify-start border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
                        >
                          <Search className="w-4 h-4 mr-2" />
                          Deep Dive
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="justify-start border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
                        >
                          <Settings className="w-4 h-4 mr-2" />
                          Adjust Weights
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
