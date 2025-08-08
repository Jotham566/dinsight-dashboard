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
  const { data: availableDatasets, isLoading: datasetsLoading } = useQuery<Dataset[]>({
    queryKey: ['available-feature-datasets'],
    queryFn: async (): Promise<Dataset[]> => {
      try {
        const validDatasets: Dataset[] = [];
        let consecutiveFailures = 0;

        // **PERFORMANCE FIX**: More aggressive early termination - scan only first 6 IDs
        for (let id = 1; id <= 6; id++) {
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
            } else {
              consecutiveFailures++;
              // Stop after 2 consecutive failures for features
              if (consecutiveFailures >= 2) {
                console.log(
                  `Stopping feature scan at ID ${id} after ${consecutiveFailures} consecutive failures`
                );
                break;
              }
            }
          } catch (error: any) {
            consecutiveFailures++;
            // If we get a 404 or any error, count as failure
            if (error?.response?.status === 404) {
              console.log(`Feature ID ${id} not found (404)`);
            } else {
              console.warn(`Error checking feature upload ID ${id}:`, error);
            }

            // Stop scanning after 2 consecutive failures to avoid unnecessary requests
            if (consecutiveFailures >= 2) {
              console.log(
                `Stopping feature scan at ID ${id} after ${consecutiveFailures} consecutive failures`
              );
              break;
            }
          }
        }

        console.log(
          `Found ${validDatasets.length} valid feature datasets:`,
          validDatasets.map((d) => d.file_upload_id)
        );

        // Auto-select first dataset if none selected
        if (validDatasets.length > 0 && !selectedFileUploadId) {
          setSelectedFileUploadId(validDatasets[0].file_upload_id);
        }

        return validDatasets;
      } catch (error) {
        console.error('Error fetching available feature datasets:', error);
        throw error;
      }
    },
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes to prevent repeated scans
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
      console.log('Transforming feature data:', rawFeatureData);
      const transformed = transformApiDataToFeatureData(rawFeatureData);
      console.log('Transformed feature data:', {
        count: transformed.length,
        sample: transformed[0],
      });
      return transformed;
    } catch (error) {
      console.error('Error transforming feature data:', error);
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
      await refetchFeatureData();
      // **PERFORMANCE FIX**: Auto-select fewer samples and add delay for UI responsiveness
      if (featureData && featureData.length > 0) {
        // Use requestIdleCallback for better performance - **MATCH STREAMLIT**: Default to 1 sample only
        requestIdleCallback(() => {
          setSelectedSamples(featureData.slice(0, 1).map((data) => data.sample_id)); // Default to 1 sample like Streamlit
          setNotification({
            type: 'success',
            message: `Successfully loaded ${Math.min(featureData.length, 50)} samples with ${featureData[0]?.features.length || 1024} features each`,
          });
        });
      }
    } catch (error) {
      console.error('Failed to load feature data:', error);
      setNotification({
        type: 'error',
        message: 'Failed to load feature data. Please try again or check your connection.',
      });
    } finally {
      setIsLoadingFeatures(false);
    }
  }, [refetchFeatureData, featureData]);

  const handleSampleSelection = (sampleId: string, isSelected: boolean) => {
    if (isSelected && selectedSamples.length < maxSamples) {
      setSelectedSamples([...selectedSamples, sampleId]);
    } else if (!isSelected) {
      setSelectedSamples(selectedSamples.filter((id) => id !== sampleId));
    }
  };

  const createFeaturePlotData = () => {
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

    // **EMERGENCY FIX**: Try with only 20 features and lines-only (no markers)
    const MAX_FEATURES_TO_PLOT = 20;
    console.log(`📊 Using MAX_FEATURES_TO_PLOT: ${MAX_FEATURES_TO_PLOT}`);

    const startTime = performance.now();

    const result = selectedSamples
      .slice(0, 1) // **EMERGENCY**: Only process 1 sample at a time
      .map((sampleId, index) => {
        console.log(`📈 Processing sample ${index + 1}: ${sampleId}`);

        const sampleData = featureData.find((data) => data.sample_id === sampleId);
        if (!sampleData || !sampleData.features || !Array.isArray(sampleData.features)) {
          console.warn(`Invalid sample data for ${sampleId}:`, sampleData);
          return null;
        }

        const totalFeatures = sampleData.features.length;
        console.log(`📊 Sample ${sampleId} has ${totalFeatures} features`);

        // Take every N-th feature to get 20 representative points
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
          mode: 'lines' as const, // **EMERGENCY**: Only lines, no markers
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
  };

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
      modeBarButtonsToRemove: ['pan2d' as const, 'lasso2d' as const, 'select2d' as const],
      displaylogo: false,
      toImageButtonOptions: {
        format: 'png' as const,
        filename: `feature-analysis-${selectedFileUploadId}`,
        height: 600,
        width: 1200,
        scale: 2,
      },
      responsive: true,
      // **PERFORMANCE**: Enable WebGL for better rendering performance
      plotGlPixelRatio: 2,
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
  const totalFeatures = featureData?.[0]?.features.length || 1024;
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
    <div className="space-y-6">
      {/* Notification */}
      {notification && (
        <div
          className={cn(
            'p-4 rounded-lg border',
            notification.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          )}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span className="font-medium">{notification.message}</span>
            <button
              onClick={() => setNotification(null)}
              className="ml-auto text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl text-white shadow-lg">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Feature Analysis</h1>
            <p className="text-gray-600">Raw feature data exploration and visualization</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => exportPlot('png')}
            disabled={!plotElement || selectedSamples.length === 0}
          >
            <Camera className="w-4 h-4 mr-2" />
            Export PNG
          </Button>
          <Button variant="outline" onClick={() => refetchFeatureData()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Main Content Area */}
        <div className="xl:col-span-3 space-y-6">
          {/* Feature Data Loading Panel */}
          <Card className="bg-white/70 backdrop-blur-sm shadow-xl border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg text-white">
                  <Database className="w-4 h-4" />
                </div>
                Feature Analysis: Live Database Integration
              </CardTitle>
              <CardDescription>
                Load and analyze raw feature data from uploaded datasets with live API integration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Auto-Detection Status */}
                {datasetsLoading ? (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
                      <span className="font-medium text-blue-900">
                        Scanning for Available Datasets...
                      </span>
                    </div>
                    <p className="text-sm text-blue-700">
                      Checking file upload IDs for feature data availability.
                    </p>
                  </div>
                ) : availableDatasets && availableDatasets.length > 0 ? (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="font-medium text-green-900">
                        Auto-Detected Feature Datasets
                      </span>
                    </div>
                    <p className="text-sm text-green-700">
                      Found {availableDatasets.length} datasets with feature data available for
                      analysis.
                    </p>
                  </div>
                ) : (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-5 h-5 text-yellow-600" />
                      <span className="font-medium text-yellow-900">No Feature Datasets Found</span>
                    </div>
                    <p className="text-sm text-yellow-700">
                      No feature data found. You can try manual ID entry or upload new datasets.
                    </p>
                  </div>
                )}

                {/* ID Selection Method */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    ID Selection Method:
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="auto"
                        checked={idSelectionMethod === 'auto'}
                        onChange={(e) => setIdSelectionMethod(e.target.value as 'auto')}
                        className="mr-2"
                      />
                      <span className="text-sm">Use Auto-Detected ID</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="manual"
                        checked={idSelectionMethod === 'manual'}
                        onChange={(e) => setIdSelectionMethod(e.target.value as 'manual')}
                        className="mr-2"
                      />
                      <span className="text-sm">Enter Manual ID</span>
                    </label>
                  </div>
                </div>

                {/* Dataset Selection or Manual Entry */}
                {idSelectionMethod === 'auto' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Auto-Detected Feature Dataset:
                    </label>
                    <select
                      value={selectedFileUploadId || ''}
                      onChange={(e) => setSelectedFileUploadId(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={!availableDatasets || availableDatasets.length === 0}
                    >
                      <option value="">Select a dataset...</option>
                      {availableDatasets?.map((dataset) => (
                        <option key={dataset.file_upload_id} value={dataset.file_upload_id}>
                          {dataset.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Enter Manual File Upload ID:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={manualId}
                        onChange={(e) => setManualId(e.target.value)}
                        placeholder="Enter file upload ID"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <Button
                        onClick={() => {
                          // **PERFORMANCE FIX**: Use requestIdleCallback for better performance
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
                  </div>
                )}

                {/* Dataset Info */}
                {selectedDataset && selectedFileUploadId && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-blue-900">File Upload ID:</span>
                        <p className="text-blue-700">{selectedFileUploadId}</p>
                      </div>
                      <div>
                        <span className="font-medium text-blue-900">Samples:</span>
                        <p className="text-blue-700">{totalSamples.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="font-medium text-blue-900">Features per Sample:</span>
                        <p className="text-blue-700">{totalFeatures}</p>
                      </div>
                      <div>
                        <span className="font-medium text-blue-900">Metadata:</span>
                        <p className="text-blue-700">{hasMetadata ? '✅ Yes' : '❌ No'}</p>
                      </div>
                    </div>
                    {featureDataError && (
                      <div className="mt-2 text-sm text-red-600">
                        Error loading data: {featureDataError.message}
                      </div>
                    )}
                  </div>
                )}

                {/* Load Data Button */}
                <div className="text-center">
                  <Button onClick={handleLoadFeatureData} disabled={isLoadingFeatures} size="lg">
                    {isLoadingFeatures ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Loading Feature Data...
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4 mr-2" />
                        Load Feature Data
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sample Selection & Visualization */}
          <Card className="bg-white/70 backdrop-blur-sm shadow-xl border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-green-500 to-blue-600 rounded-lg text-white">
                  <BarChart3 className="w-4 h-4" />
                </div>
                Feature Value Plots
              </CardTitle>
              <CardDescription>Select samples to visualize their raw feature data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Sample Selection */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-gray-700">
                      Select Samples to Visualize:
                    </label>
                    <span className="text-xs text-gray-500">
                      {selectedSamples.length}/{maxSamples} selected
                    </span>
                  </div>

                  {featureDataLoading ? (
                    <div className="text-center py-4">
                      <div className="animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
                      </div>
                      <p className="text-sm text-gray-500 mt-2">Loading samples...</p>
                    </div>
                  ) : featureData && featureData.length > 0 ? (
                    <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                      <div className="text-xs text-gray-500 p-2 border-b bg-gray-50">
                        <span>
                          {featureData.length} samples available (select up to {maxSamples} for
                          visualization)
                        </span>
                      </div>
                      <div className="grid gap-2 p-4">
                        {featureData.map((sample, index) => (
                          <label
                            key={`${selectedFileUploadId}-${index}-${sample.sample_id}`}
                            className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedSamples.includes(sample.sample_id)}
                              onChange={(e) =>
                                handleSampleSelection(sample.sample_id, e.target.checked)
                              }
                              disabled={
                                !selectedSamples.includes(sample.sample_id) &&
                                selectedSamples.length >= maxSamples
                              }
                              className="mr-3"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-900">
                                  {sample.sample_id}
                                </span>
                                {sample.metadata?.segID && (
                                  <span className="text-xs text-gray-500">
                                    {sample.metadata.segID}
                                  </span>
                                )}
                              </div>
                              {sample.metadata?.participant && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {sample.metadata.participant}
                                </div>
                              )}
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Database className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>No feature data loaded. Click "Load Feature Data" to begin.</p>
                    </div>
                  )}
                </div>

                {/* Selected Samples Summary */}
                {selectedSamples.length > 0 && (
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Selected Samples:</h4>
                    <div className="space-y-1">
                      {selectedSamples.slice(0, 3).map((sampleId, index) => {
                        const sample = featureData?.find((s) => s.sample_id === sampleId);
                        return (
                          <div
                            key={`selected-${index}-${sampleId}`}
                            className="text-sm text-gray-600"
                          >
                            <span className="font-medium">{sampleId}</span>
                            {sample?.metadata?.segID && (
                              <span className="ml-2">| segID: {sample.metadata.segID}</span>
                            )}
                          </div>
                        );
                      })}
                      {selectedSamples.length > 3 && (
                        <div className="text-sm text-gray-500">
                          ...and {selectedSamples.length - 3} more samples
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Plot */}
                <div className="border border-gray-200 rounded-lg p-4 bg-white/50">
                  {selectedSamples.length > 0 && featureData ? (
                    <div className="h-96 w-full">
                      <Plot
                        data={createFeaturePlotData()}
                        layout={plotLayout}
                        config={plotConfig}
                        style={{ width: '100%', height: '100%' }}
                        useResizeHandler={true}
                        onInitialized={(figure, graphDiv) => setPlotElement({ el: graphDiv })}
                        onUpdate={(figure, graphDiv) => setPlotElement({ el: graphDiv })}
                      />
                    </div>
                  ) : featureDataLoading ? (
                    <div className="h-96 flex items-center justify-center text-gray-500">
                      <div className="text-center">
                        <RefreshCw className="w-16 h-16 mx-auto mb-4 text-gray-300 animate-spin" />
                        <p className="text-lg font-medium">Loading Feature Data...</p>
                        <p className="text-sm">Please wait while we fetch the data</p>
                      </div>
                    </div>
                  ) : (
                    <div className="h-96 flex items-center justify-center text-gray-500">
                      <div className="text-center">
                        <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                        <p className="text-lg font-medium">
                          {!featureData ? 'No Data Loaded' : 'No Samples Selected'}
                        </p>
                        <p className="text-sm">
                          {!featureData
                            ? 'Select a dataset and click "Load Feature Data" to begin'
                            : 'Select samples above to visualize their feature data'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Feature Statistics */}
          <Card className="bg-white/70 backdrop-blur-sm shadow-xl border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg text-white">
                  <TrendingUp className="w-4 h-4" />
                </div>
                Feature Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {featureDataLoading ? (
                  <div className="text-center py-4">
                    <RefreshCw className="w-6 h-6 mx-auto mb-2 text-gray-400 animate-spin" />
                    <p className="text-sm text-gray-500">Calculating statistics...</p>
                  </div>
                ) : featureStats ? (
                  <>
                    <div className="grid grid-cols-1 gap-3">
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="text-xl font-bold text-blue-900">{totalFeatures}</div>
                        <div className="text-xs text-blue-700">Total Features</div>
                      </div>
                      <div className="text-center p-3 bg-purple-50 rounded-lg">
                        <div className="text-xl font-bold text-purple-900">
                          {highVarianceFeatures}
                        </div>
                        <div className="text-xs text-purple-700">High Variance</div>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-xl font-bold text-green-900">{totalSamples}</div>
                        <div className="text-xs text-green-700">Total Samples</div>
                      </div>
                    </div>

                    {mostVariableFeature && leastVariableFeature && (
                      <div className="space-y-3 pt-4 border-t">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            Most Variable Feature:
                          </div>
                          <div className="text-sm text-gray-600">
                            f_{mostVariableFeature.feature_index} (σ²=
                            {mostVariableFeature.variance.toFixed(3)})
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            Least Variable Feature:
                          </div>
                          <div className="text-sm text-gray-600">
                            f_{leastVariableFeature.feature_index} (σ²=
                            {leastVariableFeature.variance.toFixed(3)})
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <TrendingUp className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm">No statistics available</p>
                  </div>
                )}

                <div className="pt-4 border-t space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => refetchFeatureData()}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh Stats
                  </Button>
                  <Link href="/dashboard/analysis">
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      <ArrowRight className="w-4 h-4 mr-2" />
                      Advanced Analysis
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="bg-white/70 backdrop-blur-sm shadow-xl border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-indigo-500 to-cyan-600 rounded-lg text-white">
                  <Zap className="w-4 h-4" />
                </div>
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3">
                <Button
                  variant="outline"
                  className="justify-start"
                  onClick={() => exportPlot('png')}
                  disabled={!plotElement || selectedSamples.length === 0}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Plot
                </Button>
                <Button variant="outline" className="justify-start">
                  <FileText className="w-4 h-4 mr-2" />
                  Generate Report
                </Button>
                <Button variant="outline" className="justify-start">
                  <Eye className="w-4 h-4 mr-2" />
                  Compare Samples
                </Button>
                <Link href="/dashboard/visualization">
                  <Button variant="outline" className="w-full justify-start">
                    <Settings className="w-4 h-4 mr-2" />
                    View in D'insight
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Data Quality */}
          <Card className="bg-white/70 backdrop-blur-sm shadow-xl border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg text-white">
                  <CheckCircle className="w-4 h-4" />
                </div>
                Data Quality
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedFileUploadId ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Metadata Available</span>
                    <div className="flex items-center gap-2">
                      {hasMetadata ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-yellow-500" />
                      )}
                      <span className="text-sm font-medium">{hasMetadata ? 'Yes' : 'No'}</span>
                    </div>
                  </div>

                  {/* Show backend issue warning if no metadata */}
                  {!hasMetadata && rawFeatureData && (
                    <div className="text-xs bg-red-50 border border-red-200 p-3 rounded">
                      <div className="flex items-center gap-2 text-red-800 font-medium mb-2">
                        <AlertCircle className="w-4 h-4" />
                        Backend Issue: Missing Metadata
                      </div>
                      <div className="text-red-700 space-y-1">
                        <div>
                          • Metadata array exists: {rawFeatureData.data.metadata ? 'Yes' : 'No'}
                        </div>
                        <div>• Expected: Array with segID, participant, timestamp</div>
                        <div>• Impact: Generic sample labels (sample_000, etc.)</div>
                        <div className="mt-2 text-xs">
                          Check:{' '}
                          <code className="bg-red-100 px-1 rounded">
                            GET /feature/{selectedFileUploadId}
                          </code>{' '}
                          endpoint
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Feature Count</span>
                    <span className="text-sm font-medium">{totalFeatures}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Sample Count</span>
                    <span className="text-sm font-medium">{totalSamples.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Upload ID</span>
                    <span className="text-sm font-medium px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                      {selectedFileUploadId}
                    </span>
                  </div>
                  {featureDataError && (
                    <div className="pt-2 border-t">
                      <div className="flex items-center gap-2 text-red-600">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-xs">Data Load Error</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <Database className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">Select a dataset to view quality metrics</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
