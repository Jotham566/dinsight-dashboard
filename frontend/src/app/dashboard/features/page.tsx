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

// Safe wrapper for requestIdleCallback with fallback
const safeRequestIdleCallback = (callback: () => void) => {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    window.requestIdleCallback(callback);
  } else {
    // Fallback to setTimeout if requestIdleCallback is not available
    setTimeout(callback, 0);
  }
};

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

interface FeatureDataset {
  feature_dataset_id: number;
  name: string;
  type: 'feature';
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

  // Auto-hide notification after 4 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);
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


        // Robust: scan up to 1000 IDs, stop after 5 consecutive failures
        const maxId = 1000;
        const maxConsecutiveFailures = 5;
        for (let id = 1, consecutiveFailures = 0; id <= maxId && consecutiveFailures < maxConsecutiveFailures; id++) {
          totalAttempts++;
          try {
            const response = await api.analysis.getFeatures(id);
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
              consecutiveFailures = 0;
              console.log(`✅ Found valid feature dataset at ID ${id}`);
            } else {
              consecutiveFailures++;
              console.log(`⚠️ ID ${id}: Invalid response structure or empty data`);
            }
          } catch (error: any) {
            consecutiveFailures++;
            if (error?.response?.status === 404) {
              console.log(`❌ Feature ID ${id} not found (404)`);
            } else if (error?.response?.status === 500) {
              console.log(`💥 Server error for Feature ID ${id} (500)`);
            } else if (error?.code === 'ECONNREFUSED' || error?.code === 'NETWORK_ERROR') {
              console.error(`🔌 Network error scanning Feature ID ${id}:`, error.message);
            } else {
              console.warn(`❓ Unexpected error checking feature upload ID ${id}:`, error.message);
            }
          }
          // Small delay to prevent overwhelming the server
          if (id < maxId) {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        }

        console.log(
          `📊 Feature dataset discovery complete: Found ${validDatasets.length} valid datasets from ${totalAttempts} attempts`
        );

        // **IMPROVED**: Auto-select logic with better state handling
        if (validDatasets.length > 0 && !selectedFileUploadId) {
          // Use safeRequestIdleCallback to prevent state update during render
          safeRequestIdleCallback(() => {
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

        // Use safeRequestIdleCallback for better performance - **MATCH STREAMLIT**: Default to 1 sample only
        safeRequestIdleCallback(() => {
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
      plot_bgcolor: 'white',
      paper_bgcolor: 'white',
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

  // Query for available file upload IDs - performance optimized discovery
  const {
    data: availableFeatureDatasets,
    isLoading: featureDatasetsLoading,
    refetch: refetchFeatureDatasets,
  } = useQuery<FeatureDataset[]>({
    queryKey: ['available-feature-datasets'],
    refetchOnWindowFocus: true, // Always refetch when window regains focus
    refetchInterval: 30000, // Poll every 30s for new datasets
    staleTime: 10000, // Mark as stale after 10s for quick refresh
    queryFn: async (): Promise<FeatureDataset[]> => {
      // Robust: fetch all available feature datasets by incrementally scanning until N consecutive misses
      const validDatasets: FeatureDataset[] = [];
      let id = 1;
      let consecutiveFailures = 0;
      const maxConsecutiveFailures = 5;
      const maxId = 1000; // Safety cap
      while (consecutiveFailures < maxConsecutiveFailures && id <= maxId) {
        try {
          const response = await api.analysis.getFeatures(id);
          if (
            response.data.success &&
            response.data.data &&
            response.data.data.features &&
            Array.isArray(response.data.data.features) &&
            response.data.data.features.length > 0
          ) {
            validDatasets.push({
              feature_dataset_id: id,
              name: `Feature Dataset ${id}`,
              type: 'feature' as const,
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

  // Auto-select latest (highest ID) available feature dataset when data loads
  useEffect(() => {
    if (availableFeatureDatasets && availableFeatureDatasets.length > 0 && !selectedFileUploadId) {
      const latestDataset = availableFeatureDatasets.reduce((latest, current) =>
        current.feature_dataset_id > latest.feature_dataset_id ? current : latest
      );
      setSelectedFileUploadId(latestDataset.feature_dataset_id);
    }
  }, [availableFeatureDatasets, selectedFileUploadId]);

  // Add manual refresh button handler
  const handleRefreshFeatureDatasets = () => {
    refetchFeatureDatasets();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Improved Non-Intrusive Toast Notification */}
      {notification && (
        <div
          className={`fixed top-20 right-4 z-40 max-w-sm px-4 py-3 rounded-lg shadow-lg transition-all duration-300 transform backdrop-blur-sm border ${
            notification.type === 'success'
              ? 'bg-accent-teal-500/95 text-white border-accent-teal-400/30 shadow-accent-teal-500/20'
              : 'bg-red-500/95 text-white border-red-400/30 shadow-red-500/20'
          }`}
        >
          <div className="flex items-start gap-3">
            {notification.type === 'success' ? (
              <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-5">{notification.message}</p>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="ml-2 flex-shrink-0 p-0.5 rounded-md hover:bg-black/10 transition-colors"
              aria-label="Dismiss notification"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Modern Header with Enhanced Gradient */}
      <div className="sticky top-0 z-10 glass-card backdrop-blur-xl bg-white/80 dark:bg-gray-950/80 border-b border-gray-200/50 dark:border-gray-700/50 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-accent-purple-500 to-accent-pink-600 rounded-xl flex items-center justify-center shadow-lg shadow-accent-purple-500/25">
                <Dna className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold gradient-text">Feature Explorer</h1>
                <p className="text-gray-600 dark:text-gray-300 mt-1">
                  Explore raw feature data with interactive visualization
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => exportPlot('png')}
                disabled={!plotElement || selectedSamples.length === 0}
                className="glass-card hover:shadow-lg transition-all duration-200"
              >
                <Camera className="w-4 h-4 mr-2" />
                Export PNG
              </Button>
              <Button
                variant="outline"
                onClick={() => refetchFeatureData()}
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
            {/* Dataset Selection Card */}
            <Card className="glass-card shadow-xl border-gray-200/50 dark:border-gray-700/50 card-hover">
              <CardHeader className="pb-3 bg-gradient-to-r from-primary-50/30 to-accent-teal-50/20 dark:from-primary-950/30 dark:to-accent-teal-950/20 rounded-t-xl">
                <CardTitle className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-accent-teal-600 rounded-lg flex items-center justify-center shadow-lg">
                    <Database className="w-4 h-4 text-white" />
                  </div>
                  <span className="gradient-text text-base">Dataset Selection</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {/* Compact Status */}
                {featureDatasetsLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin text-primary-600" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Scanning datasets...
                    </span>
                  </div>
                ) : datasetsError ? (
                  <div className="flex items-center justify-center py-4">
                    <AlertCircle className="w-4 h-4 mr-2 text-red-500" />
                    <span className="text-sm text-red-600 dark:text-red-400">Discovery failed</span>
                  </div>
                ) : availableDatasets && availableDatasets.length > 0 ? (
                  <div className="flex items-center justify-center py-2">
                    <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {availableDatasets.length} datasets found
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-4">
                    <AlertCircle className="w-4 h-4 mr-2 text-yellow-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">None found</span>
                  </div>
                )}

                {/* Simplified Dataset Selection */}
                {idSelectionMethod === 'auto' ? (
                  <div>
                    <select
                      value={selectedFileUploadId || ''}
                      onChange={(e) => setSelectedFileUploadId(Number(e.target.value))}
                      className="w-full px-4 py-3 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 shadow-sm hover:shadow-md text-gray-900 dark:text-gray-100"
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
                      className="flex-1 px-4 py-3 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 shadow-sm hover:shadow-md text-gray-900 dark:text-gray-100"
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        safeRequestIdleCallback(() => {
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
                  className="w-full bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed h-12 text-base font-semibold"
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
            <Card className="glass-card shadow-xl border-gray-200/50 dark:border-gray-700/50 card-hover">
              <CardHeader className="pb-3 bg-gradient-to-r from-accent-purple-50/30 to-accent-pink-50/20 dark:from-accent-purple-950/30 dark:to-accent-pink-950/20 rounded-t-xl">
                <CardTitle className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-accent-purple-500 to-accent-pink-600 rounded-lg flex items-center justify-center shadow-lg">
                    <Eye className="w-4 h-4 text-white" />
                  </div>
                  <span className="gradient-text text-base">Sample Selection</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {featureDataLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin text-primary-600" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Loading samples...
                    </span>
                  </div>
                ) : featureData && featureData.length > 0 ? (
                  <div className="space-y-3">
                    {/* Quick Sample Buttons */}
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Quick Select
                      </p>
                      <div className="grid grid-cols-1 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedSamples([featureData[0].sample_id])}
                          className="justify-start text-sm"
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
                          className="justify-start text-sm"
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
                          className="justify-start text-sm"
                        >
                          Spread 3 Samples
                        </Button>
                      </div>
                    </div>

                    {/* Current Selection */}
                    {selectedSamples.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Selected ({selectedSamples.length}/{maxSamples})
                        </p>
                        <div className="space-y-1 max-h-24 overflow-y-auto">
                          {selectedSamples.map((sampleId, index) => {
                            const sample = featureData.find((s) => s.sample_id === sampleId);
                            const colors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728'];
                            return (
                              <div
                                key={sampleId}
                                className="flex items-center justify-between text-xs py-1 px-2 bg-gray-50 dark:bg-gray-800 rounded"
                              >
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: colors[index % colors.length] }}
                                  />
                                  <span className="font-mono text-gray-900 dark:text-gray-100">
                                    {sample?.metadata?.segID || sampleId}
                                  </span>
                                </div>
                                <button
                                  onClick={() => handleSampleSelection(sampleId, false)}
                                  className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400"
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
                      className="w-full text-sm"
                    >
                      Clear All
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-6">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                        <Database className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Load data first</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Visualization Area */}
          <div className="xl:col-span-3">
            <Card className="glass-card shadow-2xl border-gray-200/50 dark:border-gray-700/50 card-hover">
              <CardHeader className="border-b border-gray-100/50 dark:border-gray-700/50 bg-gradient-to-r from-primary-50/30 via-white/50 to-accent-purple-50/30 dark:from-gray-900/50 dark:via-gray-950/50 dark:to-gray-900/50 backdrop-blur-sm rounded-t-xl">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/25">
                    <Dna className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-bold gradient-text">
                      Feature Data Visualization
                    </CardTitle>
                    <CardDescription className="text-gray-600 dark:text-gray-400 mt-1">
                      {selectedFileUploadId
                        ? `Dataset ID ${selectedFileUploadId}`
                        : 'No dataset selected'}
                      {totalSamples > 0 &&
                        ` • ${totalSamples.toLocaleString()} samples • ${totalFeatures} features`}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {selectedSamples.length > 0 && featureData ? (
                  <div className="relative h-[700px] w-full p-6">
                    <div className="bg-white rounded-lg border border-gray-200 dark:border-gray-600 p-2 h-full">
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
                  </div>
                ) : featureDataLoading ? (
                  <div className="flex items-center justify-center h-96">
                    <div className="text-center">
                      <div className="relative">
                        <div className="w-20 h-20 border-4 border-primary-200 dark:border-primary-800 border-t-primary-600 dark:border-t-primary-400 rounded-full animate-spin mx-auto mb-6"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Dna className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                        </div>
                      </div>
                      <h3 className="text-2xl font-bold gradient-text mb-3">
                        Loading Feature Data
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300">
                        Processing feature vectors...
                      </p>
                    </div>
                  </div>
                ) : !featureData ? (
                  <div className="flex items-center justify-center h-96">
                    <div className="text-center">
                      <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-xl">
                        <Dna className="w-10 h-10 text-gray-400 dark:text-gray-500" />
                      </div>
                      <h3 className="text-2xl font-bold gradient-text mb-3">No Data Available</h3>
                      <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-sm leading-relaxed">
                        Select a dataset and load feature data to begin visualization.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-96">
                    <div className="text-center">
                      <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-xl">
                        <Eye className="w-10 h-10 text-gray-400 dark:text-gray-500" />
                      </div>
                      <h3 className="text-2xl font-bold gradient-text mb-3">No Samples Selected</h3>
                      <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-sm leading-relaxed">
                        Choose samples from the sidebar to visualize feature patterns.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Statistics Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              <Card className="glass-card shadow-xl border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-primary-50/30 to-accent-teal-50/20 dark:from-primary-950/30 dark:to-accent-teal-950/20 group hover:shadow-2xl card-hover">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-teal-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-primary-500/25 group-hover:scale-110 transition-transform duration-200">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-2xl font-bold gradient-text mb-1">
                    {totalFeatures.toLocaleString()}
                  </div>
                  <div className="text-sm font-medium text-primary-700 dark:text-primary-300">
                    Total Features
                  </div>
                  <div className="text-xs text-primary-600 dark:text-primary-400 mt-1 opacity-80">
                    Feature dimensions per sample
                  </div>
                </CardContent>
              </Card>
              <Card className="glass-card shadow-xl border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-red-50/30 to-red-100/20 dark:from-red-950/30 dark:to-red-900/20 group hover:shadow-2xl card-hover">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-red-500/25 group-hover:scale-110 transition-transform duration-200">
                    <Database className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-red-900 dark:text-red-100 mb-1">
                    {totalSamples.toLocaleString()}
                  </div>
                  <div className="text-sm font-medium text-red-700 dark:text-red-300">
                    Total Samples
                  </div>
                  <div className="text-xs text-red-600 dark:text-red-400 mt-1 opacity-80">
                    Data points in dataset
                  </div>
                </CardContent>
              </Card>
              <Card className="glass-card shadow-xl border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-accent-orange-50/30 to-accent-orange-100/20 dark:from-accent-orange-950/30 dark:to-accent-orange-900/20 group hover:shadow-2xl card-hover">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-accent-orange-500 to-accent-orange-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-accent-orange-500/25 group-hover:scale-110 transition-transform duration-200">
                    <BarChart3 className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-accent-orange-900 dark:text-accent-orange-100 mb-1">
                    {highVarianceFeatures.toLocaleString()}
                  </div>
                  <div className="text-sm font-medium text-accent-orange-700 dark:text-accent-orange-300">
                    High Variance
                  </div>
                  <div className="text-xs text-accent-orange-600 dark:text-accent-orange-400 mt-1 opacity-80">
                    Features with variance &gt; 2
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
