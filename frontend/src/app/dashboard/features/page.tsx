'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import {
  Database,
  Play,
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
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api-client';
import { cn } from '@/utils/cn';

// Dynamic import for Plotly to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

// Types
interface FileUpload {
  id: number;
  name: string;
  samples: number;
  features: number;
  has_metadata: boolean;
  created_at: string;
  file_type: 'baseline' | 'monitoring';
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

// Mock data
const mockFileUploads: FileUpload[] = [
  {
    id: 123,
    name: 'Baseline Analysis (ID: 123)',
    samples: 1000,
    features: 1024,
    has_metadata: true,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    file_type: 'baseline',
  },
  {
    id: 124,
    name: 'Monitoring Data (ID: 124)',
    samples: 500,
    features: 1024,
    has_metadata: true,
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    file_type: 'monitoring',
  },
];

const generateMockFeatureData = (samples: number): FeatureData[] => {
  return Array.from({ length: samples }, (_, i) => ({
    sample_id: `sample_${i.toString().padStart(3, '0')}`,
    features: Array.from({ length: 1024 }, () => Math.random() * 10 - 5),
    metadata: {
      segID: `baseline_${i.toString().padStart(3, '0')}`,
      participant: `participant_${Math.floor(i / 100) + 1}`,
      timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
    },
  }));
};

const generateMockFeatureStats = (): FeatureStats[] => {
  return Array.from({ length: 1024 }, (_, i) => ({
    feature_index: i,
    mean: Math.random() * 4 - 2,
    std: Math.random() * 2,
    min: Math.random() * 2 - 5,
    max: Math.random() * 2 + 3,
    variance: Math.random() * 3,
  }));
};

export default function FeatureAnalysisPage() {
  // State management
  const [idSelectionMethod, setIdSelectionMethod] = useState<'auto' | 'manual'>('auto');
  const [selectedFileUploadId, setSelectedFileUploadId] = useState<number>(123);
  const [manualId, setManualId] = useState<string>('');
  const [selectedSamples, setSelectedSamples] = useState<string[]>([]);
  const [maxSamples] = useState<number>(20);
  const [isLoadingFeatures, setIsLoadingFeatures] = useState<boolean>(false);

  // Queries
  const { data: fileUploads, isLoading: uploadsLoading } = useQuery({
    queryKey: ['file-uploads'],
    queryFn: async () => {
      // In real app: await api.analysis.getFileUploads();
      return mockFileUploads;
    },
  });

  const {
    data: featureData,
    isLoading: featureDataLoading,
    refetch: refetchFeatureData,
  } = useQuery({
    queryKey: ['feature-data', selectedFileUploadId],
    queryFn: async () => {
      // In real app: await api.analysis.getFeatureData(selectedFileUploadId);
      const selectedUpload = fileUploads?.find((upload) => upload.id === selectedFileUploadId);
      return generateMockFeatureData(selectedUpload?.samples || 100);
    },
    enabled: !!selectedFileUploadId && idSelectionMethod === 'auto',
  });

  const { data: featureStats, isLoading: statsLoading } = useQuery({
    queryKey: ['feature-stats', selectedFileUploadId],
    queryFn: async () => {
      // In real app: await api.analysis.getFeatureStats(selectedFileUploadId);
      return generateMockFeatureStats();
    },
    enabled: !!selectedFileUploadId,
  });

  const handleLoadFeatureData = async () => {
    setIsLoadingFeatures(true);
    try {
      await refetchFeatureData();
      // Auto-select first few samples
      if (featureData && featureData.length > 0) {
        setSelectedSamples(featureData.slice(0, 5).map((data) => data.sample_id));
      }
    } finally {
      setIsLoadingFeatures(false);
    }
  };

  const handleSampleSelection = (sampleId: string, isSelected: boolean) => {
    if (isSelected && selectedSamples.length < maxSamples) {
      setSelectedSamples([...selectedSamples, sampleId]);
    } else if (!isSelected) {
      setSelectedSamples(selectedSamples.filter((id) => id !== sampleId));
    }
  };

  const createFeaturePlotData = () => {
    if (!featureData || selectedSamples.length === 0) return [];

    const colors = [
      '#1f77b4',
      '#ff7f0e',
      '#2ca02c',
      '#d62728',
      '#9467bd',
      '#8c564b',
      '#e377c2',
      '#7f7f7f',
      '#bcbd22',
      '#17becf',
    ];

    return selectedSamples
      .map((sampleId, index) => {
        const sampleData = featureData.find((data) => data.sample_id === sampleId);
        if (!sampleData) return null;

        const featureIndices = Array.from({ length: 1024 }, (_, i) => i);

        return {
          x: featureIndices,
          y: sampleData.features,
          mode: 'lines+markers' as const,
          type: 'scatter' as const,
          name: sampleData.metadata?.segID || sampleId,
          marker: { size: 3 },
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
      })
      .filter((data): data is NonNullable<typeof data> => data !== null);
  };

  const plotLayout = {
    title: { text: 'Raw Feature Data Visualization' },
    xaxis: { title: { text: 'Feature Index (f_0 to f_1023)' } },
    yaxis: { title: { text: 'Feature Value' } },
    showlegend: true,
    hovermode: 'closest' as const,
    plot_bgcolor: 'rgba(0,0,0,0)',
    paper_bgcolor: 'rgba(0,0,0,0)',
    font: { family: 'Inter, sans-serif' },
    legend: {
      orientation: 'h' as const,
      y: -0.2,
    },
  };

  const plotConfig = {
    displayModeBar: true,
    modeBarButtonsToRemove: ['pan2d' as const, 'lasso2d' as const],
    displaylogo: false,
    toImageButtonOptions: {
      format: 'png' as const,
      filename: 'feature-analysis-plot',
      height: 600,
      width: 1000,
      scale: 2,
    },
  };

  // Get selected file upload info
  const selectedUpload = fileUploads?.find((upload) => upload.id === selectedFileUploadId);

  // Calculate feature statistics
  const totalFeatures = 1024;
  const highVarianceFeatures = featureStats?.filter((stat) => stat.variance > 2).length || 0;
  const mostVariableFeature = featureStats?.reduce((prev, current) =>
    prev.variance > current.variance ? prev : current
  );
  const leastVariableFeature = featureStats?.reduce((prev, current) =>
    prev.variance < current.variance ? prev : current
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Feature Analysis</h1>
          <p className="text-gray-500">Raw feature data exploration and visualization</p>
        </div>
        <div className="flex gap-2">
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Feature Analysis: Database Feature Data
              </CardTitle>
              <CardDescription>
                Load and analyze raw feature data from uploaded datasets
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Auto-Detection Status */}
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-green-900">
                      Auto-Detected File Upload IDs
                    </span>
                  </div>
                  <p className="text-sm text-green-700">
                    Found {fileUploads?.length || 0} IDs from your current session.
                  </p>
                </div>

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

                {/* File Upload Selection or Manual Entry */}
                {idSelectionMethod === 'auto' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Auto-Detected File Upload ID:
                    </label>
                    <select
                      value={selectedFileUploadId}
                      onChange={(e) => setSelectedFileUploadId(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      {fileUploads?.map((upload) => (
                        <option key={upload.id} value={upload.id}>
                          {upload.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Enter Manual File Upload ID:
                    </label>
                    <input
                      type="text"
                      value={manualId}
                      onChange={(e) => setManualId(e.target.value)}
                      placeholder="Enter file upload ID"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                )}

                {/* File Info */}
                {selectedUpload && idSelectionMethod === 'auto' && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-blue-900">File Upload ID:</span>
                        <p className="text-blue-700">{selectedUpload.id}</p>
                      </div>
                      <div>
                        <span className="font-medium text-blue-900">Samples:</span>
                        <p className="text-blue-700">{selectedUpload.samples.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="font-medium text-blue-900">Features per Sample:</span>
                        <p className="text-blue-700">{selectedUpload.features}</p>
                      </div>
                      <div>
                        <span className="font-medium text-blue-900">Metadata:</span>
                        <p className="text-blue-700">
                          {selectedUpload.has_metadata ? '✅ Yes' : '❌ No'}
                        </p>
                      </div>
                    </div>
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
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
                      <div className="grid gap-2 p-4">
                        {featureData.slice(0, 50).map((sample) => (
                          <label
                            key={sample.sample_id}
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
                      {selectedSamples.slice(0, 3).map((sampleId) => {
                        const sample = featureData?.find((s) => s.sample_id === sampleId);
                        return (
                          <div key={sampleId} className="text-sm text-gray-600">
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
                <div className="border border-gray-200 rounded-lg p-4">
                  {selectedSamples.length > 0 ? (
                    <div className="h-96 w-full">
                      <Plot
                        data={createFeaturePlotData()}
                        layout={plotLayout}
                        config={plotConfig}
                        style={{ width: '100%', height: '100%' }}
                        useResizeHandler={true}
                      />
                    </div>
                  ) : (
                    <div className="h-96 flex items-center justify-center text-gray-500">
                      <div className="text-center">
                        <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                        <p className="text-lg font-medium">No Samples Selected</p>
                        <p className="text-sm">
                          Select samples above to visualize their feature data
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Feature Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-xl font-bold text-blue-900">{totalFeatures}</div>
                    <div className="text-xs text-blue-700">Total Features</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="text-xl font-bold text-purple-900">{highVarianceFeatures}</div>
                    <div className="text-xs text-purple-700">High Variance</div>
                  </div>
                </div>

                {!statsLoading && mostVariableFeature && leastVariableFeature && (
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

                <div className="pt-4 border-t space-y-2">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh Stats
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Advanced Analysis
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3">
                <Button variant="outline" className="justify-start">
                  <Download className="w-4 h-4 mr-2" />
                  Export Data
                </Button>
                <Button variant="outline" className="justify-start">
                  <FileText className="w-4 h-4 mr-2" />
                  Generate Report
                </Button>
                <Button variant="outline" className="justify-start">
                  <Eye className="w-4 h-4 mr-2" />
                  Compare Samples
                </Button>
                <Button variant="outline" className="justify-start">
                  <Settings className="w-4 h-4 mr-2" />
                  Plot Settings
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Data Quality */}
          <Card>
            <CardHeader>
              <CardTitle>Data Quality</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedUpload && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Metadata Available</span>
                    <div className="flex items-center gap-2">
                      {selectedUpload.has_metadata ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-yellow-500" />
                      )}
                      <span className="text-sm font-medium">
                        {selectedUpload.has_metadata ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Feature Count</span>
                    <span className="text-sm font-medium">{selectedUpload.features}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Sample Count</span>
                    <span className="text-sm font-medium">
                      {selectedUpload.samples.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">File Type</span>
                    <span
                      className={cn(
                        'text-sm font-medium px-2 py-1 rounded-full text-xs',
                        selectedUpload.file_type === 'baseline'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-orange-100 text-orange-800'
                      )}
                    >
                      {selectedUpload.file_type}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
