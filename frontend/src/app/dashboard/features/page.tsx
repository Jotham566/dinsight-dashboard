'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Database,
  Download,
  RefreshCw,
  Search,
  TrendingUp,
  BarChart3,
  Eye,
  Settings,
  CheckCircle,
  AlertCircle,
  FileText,
  Zap,
  ArrowRight,
  Camera,
  Settings2,
  Palette,
  Dna,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api-client';
import { cn } from '@/utils/cn';

// Dynamic import for Plotly to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

// Declare Plotly global for export functionality
declare global {
  interface Window {
    Plotly: any;
  }
}

// Types
interface Dataset {
  file_upload_id: number;
  name: string;
  type: 'features';
}

interface FeatureApiResponse {
  success: boolean;
  data: {
    feature_values: number[][];
    total_rows: number;
    metadata: Array<{
      segID?: string;
      participant?: string;
      timestamp?: string;
    }>;
  };
}

interface FeatureData {
  sample_id: string;
  features: number[];
  metadata?: {
    segID?: string;
    participant?: string;
    timestamp?: string;
  };
}

interface FeatureStats {
  feature_index: number;
  mean: number;
  std: number;
  min: number;
  max: number;
  variance: number;
}

// Helper functions
const transformApiDataToFeatureData = (apiResponse: FeatureApiResponse): FeatureData[] => {
  if (!apiResponse?.data?.feature_values || !Array.isArray(apiResponse.data.feature_values)) {
    return [];
  }

  return apiResponse.data.feature_values.map((features, index) => {
    const metadata = apiResponse.data.metadata?.[index];
    const hasValidMetadata =
      metadata && typeof metadata === 'object' && Object.keys(metadata).length > 0;

    return {
      sample_id:
        hasValidMetadata && metadata.segID
          ? metadata.segID
          : `sample_${index.toString().padStart(3, '0')}`,
      features,
      metadata: hasValidMetadata
        ? metadata
        : {
            segID: `sample_${index.toString().padStart(3, '0')}`,
            participant: `Unknown`,
            timestamp: new Date().toISOString(),
          },
    };
  });
};

const calculateFeatureStats = (featureData: FeatureData[]): FeatureStats[] => {
  if (!featureData || featureData.length === 0) return [];

  // Find the first valid features array to determine the number of features
  const firstValidSample = featureData.find(
    (sample) => sample?.features && Array.isArray(sample.features)
  );
  if (!firstValidSample) return [];

  const numFeatures = firstValidSample.features.length;
  return Array.from({ length: numFeatures }, (_, featureIndex) => {
    const values = featureData
      .map((sample) => sample?.features?.[featureIndex])
      .filter((v) => v != null && typeof v === 'number');

    if (values.length === 0) {
      return {
        feature_index: featureIndex,
        mean: 0,
        std: 0,
        min: 0,
        max: 0,
        variance: 0,
      };
    }

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const std = Math.sqrt(variance);
    const min = Math.min(...values);
    const max = Math.max(...values);

    return {
      feature_index: featureIndex,
      mean,
      std,
      min,
      max,
      variance,
    };
  });
};

export default function FeatureAnalysisPage() {
  // State management
  const [idSelectionMethod, setIdSelectionMethod] = useState<'auto' | 'manual'>('auto');
  const [selectedFileUploadId, setSelectedFileUploadId] = useState<number | null>(null);
  const [manualId, setManualId] = useState<string>('');
  const [selectedSamples, setSelectedSamples] = useState<string[]>([]);
  const [maxSamples] = useState<number>(20); // **PERFORMANCE FIX**: Match Streamlit limit of 20 max samples
  const [isLoadingFeatures, setIsLoadingFeatures] = useState<boolean>(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [plotElement, setPlotElement] = useState<any>(null);

  // **PERFORMANCE FIX**: Removed pagination - Streamlit approach limits samples at selection level instead

  // Query for available file upload IDs - performance optimized discovery
  const {
    data: availableDatasets,
    isLoading: datasetsLoading,
    error: datasetsError,
  } = useQuery<Dataset[]>({
    queryKey: ['available-feature-datasets'],
    refetchOnWindowFocus: true, // Automatically refetch when window regains focus to pick up new uploads
    refetchInterval: 60 * 1000, // Poll every 60 seconds for new datasets
    staleTime: 30 * 1000, // Reduce cache time to 30 seconds for faster refresh
    queryFn: async (): Promise<Dataset[]> => {
      try {
        const validDatasets: Dataset[] = [];
        let consecutiveFailures = 0;
        let totalAttempts = 0;

        // **PERFORMANCE FIX**: More aggressive early termination - scan only first 8 IDs with better error handling
        for (let id = 1; id <= 8; id++) {
          totalAttempts++;

          try {
            const response = await api.analysis.getFeatures(id);

            // Validate this is a proper feature record with feature_values
            if (
              response.data.success &&
              response.data.data &&
              response.data.data.feature_values &&
              Array.isArray(response.data.data.feature_values) &&
              response.data.data.feature_values.length > 0
            ) {
              validDatasets.push({
                file_upload_id: id,
                name: `Feature Analysis ID ${id} (${response.data.data.total_rows} samples)`,
                type: 'features' as const,
              });
              consecutiveFailures = 0; // Reset counter on success
              console.log(`✅ Found valid feature dataset at ID ${id}`);
            } else {
              consecutiveFailures++;
              console.log(`⚠️ ID ${id}: Invalid response structure or empty data`);

              // **IMPROVED**: Be less aggressive - allow up to 3 consecutive failures
              if (consecutiveFailures >= 3) {
                console.log(
                  `🛑 Stopping feature scan at ID ${id} after ${consecutiveFailures} consecutive failures`
                );
                break;
              }
            }
          } catch (error: any) {
            consecutiveFailures++;

            if (error?.response?.status === 404) {
              console.log(`❌ Feature ID ${id} not found (404)`);
            } else if (error?.response?.status === 500) {
              console.log(`💥 Server error for Feature ID ${id} (500)`);
            } else if (error?.code === 'ECONNREFUSED' || error?.code === 'NETWORK_ERROR') {
              console.error(`🔌 Network error scanning Feature ID ${id}:`, error.message);
              // Network errors shouldn't stop the scan immediately
              if (totalAttempts <= 3) {
                consecutiveFailures = Math.max(0, consecutiveFailures - 1); // Be more forgiving for network errors
              }
            } else {
              console.warn(`❓ Unexpected error checking feature upload ID ${id}:`, error.message);
            }

            // **IMPROVED**: Allow more failures and differentiate error types
            if (consecutiveFailures >= 3) {
              console.log(
                `🛑 Stopping feature scan at ID ${id} after ${consecutiveFailures} consecutive failures`
              );
              break;
            }
          }

          // Small delay to prevent overwhelming the server
          if (id < 8) {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        }

        console.log(
          `📊 Feature dataset discovery complete: Found ${validDatasets.length} valid datasets from ${totalAttempts} attempts`
        );

        // **IMPROVED**: Auto-select logic with better state handling
        if (validDatasets.length > 0 && !selectedFileUploadId) {
          // Use requestIdleCallback to prevent state update during render
          requestIdleCallback(() => {
            setSelectedFileUploadId(validDatasets[0].file_upload_id);
          });
        }

        return validDatasets;
      } catch (error) {
        console.error('💥 Critical error in feature dataset discovery:', error);
        // Don't throw to prevent the entire component from erroring out
        return [];
      }
    },
    retry: 2, // Retry failed discovery attempts
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000), // Exponential backoff
  });

  const {
    data: rawFeatureData,
    isLoading: featureDataLoading,
    refetch: refetchFeatureData,
    error: featureDataError,
  } = useQuery<FeatureApiResponse>({
    queryKey: ['feature-data', selectedFileUploadId],
    queryFn: async () => {
      if (!selectedFileUploadId) throw new Error('No file upload ID selected');

      try {
        const response = await api.analysis.getFeatures(selectedFileUploadId);

        // Focused debug logging
        console.log(`=== Feature API Response for ID ${selectedFileUploadId} ===`);
        console.log('Success:', response.data?.success);
        console.log('Feature values count:', response.data?.data?.feature_values?.length);
        console.log('Metadata count:', response.data?.data?.metadata?.length);
        console.log('Total rows:', response.data?.data?.total_rows);
        console.log('Has metadata array:', !!response.data?.data?.metadata);
        console.log('Sample metadata[0]:', response.data?.data?.metadata?.[0]);

        // Check if metadata is actually empty or undefined
        if (response.data?.data?.metadata) {
          console.log('Metadata array type:', Array.isArray(response.data.data.metadata));
          console.log('First 3 metadata entries:', response.data.data.metadata.slice(0, 3));
        } else {
          console.log('❌ BACKEND ISSUE: Metadata is undefined or null in API response');
          console.log(
            '🔧 Expected: metadata array with sample-level data (segID, participant, timestamp)'
          );
          console.log('📋 Check: Backend /feature/:file_upload_id endpoint implementation');
          console.log(
            '📊 Database: Verify metadata column is being queried from feature_data table'
          );
        }
        console.log('=== End Debug ===');

        if (!response.data?.success || !response.data?.data) {
          throw new Error('Invalid API response structure');
        }

        return response.data;
      } catch (error: any) {
        console.error('Feature data fetch error:', error);
        console.error('Error details:', {
          message: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText,
          responseData: error.response?.data,
        });
        throw new Error(`Failed to fetch feature data: ${error.message}`);
      }
    },
    enabled: !!selectedFileUploadId,
    retry: 1,
  });

  // Transform raw API data to component format
  const featureData = useMemo(() => {
    if (!rawFeatureData) return null;

    try {
      console.log('🔄 Transforming feature data:', {
        hasData: !!rawFeatureData.data,
        featureValuesCount: rawFeatureData.data?.feature_values?.length,
        metadataCount: rawFeatureData.data?.metadata?.length,
      });

      const startTime = performance.now();
      const transformed = transformApiDataToFeatureData(rawFeatureData);
      const transformTime = performance.now() - startTime;

      // **PERFORMANCE WARNING**: Alert if transformation takes too long
      if (transformTime > 1000) {
        console.warn(
          `⚠️ Slow transformation detected: ${transformTime.toFixed(2)}ms for ${transformed.length} samples`
        );
      }

      console.log('✅ Feature data transformed:', {
        count: transformed.length,
        transformTime: `${transformTime.toFixed(2)}ms`,
        samplePreview: transformed[0]?.sample_id,
        featuresPerSample: transformed[0]?.features?.length,
      });

      return transformed;
    } catch (error) {
      console.error('💥 Error transforming feature data:', error);
      return null;
    }
  }, [rawFeatureData]);

  // Calculate feature statistics from real data
  const featureStats = useMemo(() => {
    if (!featureData) return null;
    return calculateFeatureStats(featureData);
  }, [featureData]);

  // Clear selections when dataset changes
  useEffect(() => {
    setSelectedSamples([]); // Clear selections to prevent issues
  }, [selectedFileUploadId]);

  const handleLoadFeatureData = useCallback(async () => {
    setIsLoadingFeatures(true);
    setNotification(null);

    try {
      const result = await refetchFeatureData();

      // **PERFORMANCE FIX**: Auto-select fewer samples and add delay for UI responsiveness
      if (result.data && result.data.data && result.data.data.feature_values) {
        const sampleCount = result.data.data.feature_values.length;
        const featureCount = result.data.data.feature_values[0]?.length || 0;

        // Use requestIdleCallback for better performance - **MATCH STREAMLIT**: Default to 1 sample only
        requestIdleCallback(() => {
          // Only auto-select if we have valid transformed data
          if (featureData && featureData.length > 0) {
            setSelectedSamples([featureData[0].sample_id]); // Default to 1 sample like Streamlit
          }

          setNotification({
            type: 'success',
            message: `Successfully loaded ${sampleCount.toLocaleString()} samples with ${featureCount} features each`,
          });
        });
      } else {
        throw new Error('Invalid data structure received from API');
      }
    } catch (error: any) {
      console.error('Failed to load feature data:', error);

      let errorMessage = 'Failed to load feature data. Please try again.';

      if (error?.response?.status === 404) {
        errorMessage = `No feature data found for upload ID ${selectedFileUploadId}. Try a different ID.`;
      } else if (error?.response?.status === 500) {
        errorMessage = 'Server error occurred. Please contact support if this persists.';
      } else if (error?.code === 'ECONNREFUSED' || error?.code === 'NETWORK_ERROR') {
        errorMessage = 'Network connection failed. Please check your internet connection.';
      } else if (error?.message?.includes('Invalid data structure')) {
        errorMessage = 'Received invalid data from server. The dataset may be corrupted.';
      }

      setNotification({
        type: 'error',
        message: errorMessage,
      });
    } finally {
      setIsLoadingFeatures(false);
    }
  }, [refetchFeatureData, featureData, selectedFileUploadId]);

  const handleSampleSelection = (sampleId: string, isSelected: boolean) => {
    if (isSelected && selectedSamples.length < maxSamples) {
      setSelectedSamples([...selectedSamples, sampleId]);
    } else if (!isSelected) {
      setSelectedSamples(selectedSamples.filter((id) => id !== sampleId));
    }
  };

  // **FIX: Memoize plot data to prevent infinite loop**
  const plotData = useMemo(() => {
    console.log('🔄 Creating feature plot data...', {
      hasFeatureData: !!featureData,
      featureDataLength: featureData?.length,
      selectedSamplesLength: selectedSamples.length,
    });

    if (!featureData || selectedSamples.length === 0) {
      console.log('❌ No data to plot - returning empty array');
      return [];
    }

    const colors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728'];

    // **PERFORMANCE FIX**: Limit features and samples to match Streamlit performance
    const MAX_FEATURES_TO_PLOT = 100; // Increased from 20 for better resolution
    const MAX_SAMPLES_TO_PLOT = 3; // Limit concurrent samples
    console.log(
      `📊 Using MAX_FEATURES_TO_PLOT: ${MAX_FEATURES_TO_PLOT}, MAX_SAMPLES: ${MAX_SAMPLES_TO_PLOT}`
    );

    const startTime = performance.now();

    const result = selectedSamples
      .slice(0, MAX_SAMPLES_TO_PLOT) // Process up to 3 samples
      .map((sampleId, index) => {
        console.log(`📈 Processing sample ${index + 1}: ${sampleId}`);

        const sampleData = featureData.find((data) => data.sample_id === sampleId);
        if (!sampleData || !sampleData.features || !Array.isArray(sampleData.features)) {
          console.warn(`Invalid sample data for ${sampleId}:`, sampleData);
          return null;
        }

        const totalFeatures = sampleData.features.length;
        console.log(`📊 Sample ${sampleId} has ${totalFeatures} features`);

        // Take every N-th feature to get representative points
        const step = Math.max(1, Math.floor(totalFeatures / MAX_FEATURES_TO_PLOT));
        const limitedFeatures = [];
        const featureIndices = [];

        for (
          let i = 0;
          i < totalFeatures && limitedFeatures.length < MAX_FEATURES_TO_PLOT;
          i += step
        ) {
          limitedFeatures.push(sampleData.features[i]);
          featureIndices.push(i);
        }

        console.log(`📉 Sampled ${limitedFeatures.length} features with step ${step}`);

        const trace = {
          x: featureIndices,
          y: limitedFeatures,
          mode: 'lines' as const,
          type: 'scatter' as const,
          name: sampleData.metadata?.segID || sampleId,
          line: {
            color: colors[index % colors.length],
            width: 2,
          },
          hovertemplate:
            '<b>%{fullData.name}</b><br>' +
            'Feature Index: %{x}<br>' +
            'Feature Value: %{y:.3f}<br>' +
            '<extra></extra>',
        };

        console.log(`✅ Created trace for ${sampleId}`);
        return trace;
      })
      .filter((data): data is NonNullable<typeof data> => data !== null);

    const endTime = performance.now();
    console.log(`⏱️ Plot data creation took ${endTime - startTime}ms`);
    console.log('🎯 Final result:', { tracesCount: result.length });

    return result;
  }, [featureData, selectedSamples]); // **CRITICAL: Dependencies to prevent infinite loop**

  const plotLayout = useMemo(
    () => ({
      title: {
        text: `Raw Feature Data Analysis - Upload ID ${selectedFileUploadId} (${(featureData?.[0]?.features?.length ?? 0) > 256 ? 'Downsampled for Performance' : 'Full Resolution'})`,
        font: { family: 'Inter, sans-serif', size: 16 },
      },
      xaxis: {
        title: { text: 'Feature Index (f_0 to f_1023)', font: { family: 'Inter, sans-serif' } },
        gridcolor: 'rgba(156, 163, 175, 0.2)',
      },
      yaxis: {
        title: { text: 'Feature Value', font: { family: 'Inter, sans-serif' } },
        gridcolor: 'rgba(156, 163, 175, 0.2)',
      },
      showlegend: true,
      hovermode: 'closest' as const,
      plot_bgcolor: 'rgba(0,0,0,0)',
      paper_bgcolor: 'rgba(0,0,0,0)',
      font: { family: 'Inter, sans-serif', size: 12 },
      legend: {
        orientation: 'h' as const,
        y: -0.15,
        x: 0.5,
        xanchor: 'center' as const,
        font: { family: 'Inter, sans-serif' },
      },
      margin: { l: 60, r: 20, t: 60, b: 80 },
    }),
    [selectedFileUploadId, featureData]
  );

  const plotConfig = useMemo(
    () => ({
      displayModeBar: true,
      modeBarButtonsToRemove: [
        'pan2d' as const,
        'lasso2d' as const,
        'select2d' as const,
        'autoScale2d' as const,
        'hoverClosestCartesian' as const,
        'hoverCompareCartesian' as const,
      ],
      displaylogo: false,
      toImageButtonOptions: {
        format: 'png' as const,
        filename: `feature-analysis-${selectedFileUploadId}`,
        height: 600,
        width: 1200,
        scale: 2,
      },
      responsive: true,
      // **PERFORMANCE**: Optimize for better rendering performance
      plotGlPixelRatio: 1, // Reduced from 2 for better performance
      doubleClick: 'reset+autosize' as const,
      scrollZoom: true,
      // **PERFORMANCE**: Disable expensive features for large datasets
      showTips: false,
      staticPlot: false,
      // **PERFORMANCE**: Optimize interaction performance
      editable: false,
      // **PERFORMANCE**: Reduce animation frames for smoother interaction
      frameMargins: 0,
    }),
    [selectedFileUploadId]
  );

  // Export functionality
  const exportPlot = useCallback(
    async (format: 'png' | 'svg' = 'png') => {
      if (!plotElement) return;

      try {
        const gd = plotElement.el;
        if (window.Plotly) {
          await window.Plotly.downloadImage(gd, {
            format,
            width: 1200,
            height: 600,
            filename: `feature-analysis-${selectedFileUploadId}`,
          });
          setNotification({
            type: 'success',
            message: `Plot exported as ${format.toUpperCase()}`,
          });
        }
      } catch (error) {
        console.error('Failed to export plot:', error);
        setNotification({
          type: 'error',
          message: 'Failed to export plot. Please try again.',
        });
      }
    },
    [plotElement, selectedFileUploadId]
  );

  // Get selected dataset info
  const selectedDataset = availableDatasets?.find(
    (dataset) => dataset.file_upload_id === selectedFileUploadId
  );

  // Calculate feature statistics
  const totalFeatures = featureData?.[0]?.features.length || 0;
  const totalSamples = rawFeatureData?.data.total_rows || featureData?.length || 0;
  const hasMetadata =
    rawFeatureData?.data.metadata &&
    Array.isArray(rawFeatureData.data.metadata) &&
    rawFeatureData.data.metadata.length > 0 &&
    rawFeatureData.data.metadata.some((meta) => meta && Object.keys(meta).length > 0);

  const highVarianceFeatures = featureStats?.filter((stat) => stat.variance > 2).length || 0;
  const mostVariableFeature = featureStats?.reduce((prev, current) =>
    prev && current && prev.variance > current.variance ? prev : current
  );
  const leastVariableFeature = featureStats?.reduce((prev, current) =>
    prev && current && prev.variance < current.variance ? prev : current
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
      {/* Notification Toast */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg transition-all duration-300 transform ${
            notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            )}
            <span className="font-medium">{notification.message}</span>
          </div>
        </div>
      )}

      {/* Modern Header with Glass Effect */}
      <div className="sticky top-0 z-10 backdrop-blur-md bg-white/80 border-b border-slate-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                <Dna className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Feature Explorer
                </h1>
                <p className="text-sm text-slate-600">
                  Explore raw feature data with heatmap visualization
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => exportPlot('png')}
                disabled={!plotElement || selectedSamples.length === 0}
                className="border-slate-300 hover:bg-slate-50 hover:border-slate-400 transition-all duration-200 shadow-sm"
              >
                <Camera className="w-4 h-4 mr-2" />
                Export PNG
              </Button>
              <Button
                variant="outline"
                onClick={() => refetchFeatureData()}
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
            {/* Dataset Selection Card */}
            <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                    <Database className="w-4 h-4 text-white" />
                  </div>
                  Dataset
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Compact Status */}
                {datasetsLoading ? (
                  <div className="text-center py-2">
                    <RefreshCw className="w-4 h-4 mx-auto mb-1 text-blue-600 animate-spin" />
                    <p className="text-xs text-blue-600">Scanning...</p>
                  </div>
                ) : datasetsError ? (
                  <div className="text-center py-2">
                    <AlertCircle className="w-4 h-4 mx-auto mb-1 text-red-500" />
                    <p className="text-xs text-red-600">Discovery failed</p>
                  </div>
                ) : availableDatasets && availableDatasets.length > 0 ? (
                  <div className="text-center py-2">
                    <CheckCircle className="w-4 h-4 mx-auto mb-1 text-green-600" />
                    <p className="text-xs text-green-600">
                      {availableDatasets.length} datasets found
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-2">
                    <AlertCircle className="w-4 h-4 mx-auto mb-1 text-yellow-500" />
                    <p className="text-xs text-yellow-600">None found</p>
                  </div>
                )}

                {/* Simplified Dataset Selection */}
                {idSelectionMethod === 'auto' ? (
                  <div>
                    <select
                      value={selectedFileUploadId || ''}
                      onChange={(e) => setSelectedFileUploadId(Number(e.target.value))}
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm hover:shadow-md"
                      disabled={!availableDatasets || availableDatasets.length === 0}
                    >
                      <option value="">Select dataset...</option>
                      {availableDatasets?.map((dataset) => (
                        <option key={dataset.file_upload_id} value={dataset.file_upload_id}>
                          ID {dataset.file_upload_id} (
                          {dataset.name.match(/\((\d+) samples\)/)?.[1] || 'N/A'})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={manualId}
                      onChange={(e) => setManualId(e.target.value)}
                      placeholder="ID"
                      className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm hover:shadow-md"
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        requestIdleCallback(() => {
                          const id = parseInt(manualId);
                          if (!isNaN(id)) {
                            setSelectedFileUploadId(id);
                          }
                        });
                      }}
                      disabled={!manualId || isNaN(parseInt(manualId))}
                    >
                      Load
                    </Button>
                  </div>
                )}

                {/* Toggle Method */}
                <button
                  onClick={() =>
                    setIdSelectionMethod(idSelectionMethod === 'auto' ? 'manual' : 'auto')
                  }
                  className="w-full text-xs text-blue-600 hover:text-blue-800 py-1"
                >
                  {idSelectionMethod === 'auto' ? 'Enter manual ID' : 'Use auto-detected'}
                </button>

                {/* Load Button */}
                <Button
                  onClick={handleLoadFeatureData}
                  disabled={isLoadingFeatures || !selectedFileUploadId}
                  className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {isLoadingFeatures ? (
                    <>
                      <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Search className="w-3 h-3 mr-1" />
                      Load Data
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Sample Selection Card */}
            <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                    <Eye className="w-4 h-4 text-white" />
                  </div>
                  Samples
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {featureDataLoading ? (
                  <div className="text-center py-4">
                    <RefreshCw className="w-4 h-4 mx-auto mb-2 text-gray-400 animate-spin" />
                    <p className="text-xs text-gray-500">Loading...</p>
                  </div>
                ) : featureData && featureData.length > 0 ? (
                  <div className="space-y-3">
                    {/* Quick Sample Buttons */}
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-gray-700 mb-3">Quick Select</p>
                      <div className="grid grid-cols-1 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedSamples([featureData[0].sample_id])}
                          className="justify-start border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
                        >
                          First Sample
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const samples = featureData.slice(0, 3).map((d) => d.sample_id);
                            setSelectedSamples(samples);
                          }}
                          className="justify-start border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
                        >
                          First 3 Samples
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const step = Math.floor(featureData.length / 3);
                            const samples = [0, step, step * 2]
                              .map((i) => featureData[i]?.sample_id)
                              .filter(Boolean);
                            setSelectedSamples(samples);
                          }}
                          className="justify-start border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
                        >
                          Spread 3 Samples
                        </Button>
                      </div>
                    </div>

                    {/* Current Selection */}
                    {selectedSamples.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-sm font-medium text-gray-700">
                          Selected ({selectedSamples.length}/{maxSamples})
                        </p>
                        <div className="space-y-1 max-h-24 overflow-y-auto">
                          {selectedSamples.map((sampleId, index) => {
                            const sample = featureData.find((s) => s.sample_id === sampleId);
                            const colors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728'];
                            return (
                              <div
                                key={sampleId}
                                className="flex items-center justify-between text-xs py-1 px-2 bg-gray-50 rounded"
                              >
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: colors[index % colors.length] }}
                                  />
                                  <span className="font-mono">
                                    {sample?.metadata?.segID || sampleId}
                                  </span>
                                </div>
                                <button
                                  onClick={() => handleSampleSelection(sampleId, false)}
                                  className="text-gray-400 hover:text-red-500"
                                >
                                  ✕
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedSamples([])}
                      disabled={selectedSamples.length === 0}
                      className="w-full border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
                    >
                      Clear All
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <Database className="w-4 h-4 mx-auto mb-1 text-gray-300" />
                    <p className="text-xs">Load data first</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Visualization Area */}
          <div className="xl:col-span-3">
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm min-h-[700px]">
              <CardHeader className="flex flex-row items-center justify-between border-b border-gray-100 bg-gradient-to-r from-gray-50/80 to-white/80 backdrop-blur-sm">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Dna className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-semibold text-gray-900">
                      Feature Data Visualization
                    </CardTitle>
                    <CardDescription className="text-sm text-gray-600">
                      {selectedFileUploadId
                        ? `Dataset ID ${selectedFileUploadId}`
                        : 'No dataset selected'}
                      {totalSamples > 0 &&
                        ` • ${totalSamples.toLocaleString()} samples • ${totalFeatures} features`}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedFileUploadId && (
                    <div className="px-3 py-1.5 bg-purple-100 text-purple-700 text-sm font-medium rounded-full">
                      Dataset ID: {selectedFileUploadId}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {selectedSamples.length > 0 && featureData ? (
                  <div className="relative h-[700px] w-full">
                    <Plot
                      data={plotData}
                      layout={plotLayout}
                      config={plotConfig}
                      style={{ width: '100%', height: '100%' }}
                      useResizeHandler={true}
                      onInitialized={(figure, graphDiv) => setPlotElement({ el: graphDiv })}
                      onUpdate={(figure, graphDiv) => setPlotElement({ el: graphDiv })}
                    />
                  </div>
                ) : featureDataLoading ? (
                  <div className="flex items-center justify-center h-[600px]">
                    <div className="text-center">
                      <div className="relative">
                        <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Dna className="w-6 h-6 text-purple-600" />
                        </div>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Loading Feature Data
                      </h3>
                      <p className="text-sm text-gray-600">Processing feature vectors...</p>
                    </div>
                  </div>
                ) : !featureData ? (
                  <div className="flex items-center justify-center h-[600px]">
                    <div className="text-center">
                      <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                        <Dna className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        No Data Available
                      </h3>
                      <p className="text-gray-600 mb-6 max-w-sm">
                        Select a dataset and load feature data to begin visualization.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[600px]">
                    <div className="text-center">
                      <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                        <Eye className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        No Samples Selected
                      </h3>
                      <p className="text-gray-600 mb-6 max-w-sm">
                        Choose samples from the sidebar to visualize feature patterns.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Statistics Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100/50 backdrop-blur-sm group hover:shadow-xl transition-all duration-200">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg group-hover:scale-110 transition-transform duration-200">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-blue-900 mb-1">
                    {totalFeatures.toLocaleString()}
                  </div>
                  <div className="text-sm font-medium text-blue-700">Total Features</div>
                  <div className="text-xs text-blue-600 mt-1 opacity-80">
                    Feature dimensions per sample
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100/50 backdrop-blur-sm group hover:shadow-xl transition-all duration-200">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg group-hover:scale-110 transition-transform duration-200">
                    <Database className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-green-900 mb-1">
                    {totalSamples.toLocaleString()}
                  </div>
                  <div className="text-sm font-medium text-green-700">Total Samples</div>
                  <div className="text-xs text-green-600 mt-1 opacity-80">
                    Data points in dataset
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100/50 backdrop-blur-sm group hover:shadow-xl transition-all duration-200">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg group-hover:scale-110 transition-transform duration-200">
                    <BarChart3 className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-purple-900 mb-1">
                    {highVarianceFeatures.toLocaleString()}
                  </div>
                  <div className="text-sm font-medium text-purple-700">High Variance</div>
                  <div className="text-xs text-purple-600 mt-1 opacity-80">
                    Features with variance &gt; 2
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Additional Info Cards */}
            {mostVariableFeature && (
              <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm mt-6">
                <CardHeader className="border-b border-gray-100">
                  <CardTitle className="text-lg font-semibold text-gray-900">
                    Feature Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-600">Most Variable Feature</p>
                      <p className="text-lg font-semibold text-gray-900">
                        f_{mostVariableFeature.feature_index}
                      </p>
                      <p className="text-xs text-gray-500">
                        Variance: {mostVariableFeature.variance.toFixed(4)}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-600">Least Variable Feature</p>
                      <p className="text-lg font-semibold text-gray-900">
                        f_{leastVariableFeature?.feature_index}
                      </p>
                      <p className="text-xs text-gray-500">
                        Variance: {leastVariableFeature?.variance.toFixed(4)}
                      </p>
                    </div>
                  </div>

                  {/* Data Quality Indicator */}
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      {hasMetadata ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-yellow-500" />
                      )}
                      <span className="text-sm font-medium text-blue-800">Dataset Quality</span>
                    </div>
                    <p className="text-sm text-blue-700">
                      Metadata: {hasMetadata ? 'Available' : 'Missing'}
                      {selectedFileUploadId && ` • Dataset ID: ${selectedFileUploadId}`}
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
