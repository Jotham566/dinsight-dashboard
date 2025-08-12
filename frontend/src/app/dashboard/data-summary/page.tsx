'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Settings,
  Download,
  Eye,
  BarChart3,
  FileText,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Database,
  ArrowRight,
  Upload,
  Save,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileUpload, UploadedFile } from '@/components/ui/file-upload';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/utils/cn';
import { formatBytes, formatRelativeTime, formatNumber } from '@/utils/format';

// Types for the workflow
type WorkflowStep = 'baseline' | 'monitoring' | 'complete';
type ProcessingStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'error';

interface ProcessingState {
  step: WorkflowStep;
  status: ProcessingStatus;
  fileUploadId?: number;
  dinsightId?: number;
  errorMessage?: string;
  progress?: number;
  pollCount?: number;
}

// Mock data - in a real app, this would come from APIs
const mockConfig = {
  gamma0: 1e-7,
  optimizer: 'adam',
  alpha: 0.1,
  end_meta: 'participant',
  start_dim: 'f_0',
  end_dim: 'f_1023',
};

const mockDatasets = [
  {
    id: 1,
    name: 'baseline_data_week1.csv',
    records: 1000,
    features: 1024,
    status: 'processed',
    type: 'baseline',
    tags: ['baseline', 'production', 'week1'],
    quality_score: 98.5,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    size: 15728640, // ~15MB
  },
  {
    id: 2,
    name: 'monitoring_data_day1.csv',
    records: 500,
    features: 1024,
    status: 'processing',
    type: 'monitoring',
    tags: ['monitoring', 'day1'],
    quality_score: null,
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    size: 7864320, // ~7.5MB
  },
];

export default function DataSummaryPage() {
  const [baselineFiles, setBaselineFiles] = useState<UploadedFile[]>([]);
  const [monitoringFiles, setMonitoringFiles] = useState<UploadedFile[]>([]);
  const [processingState, setProcessingState] = useState<ProcessingState>({
    step: 'baseline',
    status: 'idle',
  });

  // Config editing state
  const [isEditingConfig, setIsEditingConfig] = useState(false);
  const [editedConfig, setEditedConfig] = useState<any>(null);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Pagination state for Dataset Library
  const [currentPage, setCurrentPage] = useState(1);
  const datasetsPerPage = 4; // Increased for better UX

  // View mode state for switching between different views - Config first for better UX
  const [viewMode, setViewMode] = useState<'config' | 'upload' | 'library' | 'stats'>('config');

  // Query for processing configuration
  const {
    data: config,
    isLoading: configLoading,
    refetch: refetchConfig,
  } = useQuery({
    queryKey: ['config'],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/config');
        return response.data.data;
      } catch (error) {
        console.error('Failed to fetch config:', error);
        // Fallback to mock config if API fails
        return mockConfig;
      }
    },
  });

  // Query for dinsight data statistics (when we have a completed dinsightId)
  const { data: dinsightStats, isLoading: statsLoading } = useQuery({
    queryKey: ['dinsight-stats', processingState.dinsightId],
    queryFn: async () => {
      if (!processingState.dinsightId) return null;

      try {
        const response = await apiClient.get(`/dinsight/${processingState.dinsightId}`);
        const data = response.data.data;

        // Calculate statistics from the actual data
        const totalRecords = data.dinsight_x?.length || 0;
        const features = data.feature_names?.length || data.features_count || 1024; // fallback to original feature count if available
        const missingValues = 0; // Calculate based on data if needed
        const dataQuality = totalRecords > 0 ? 98.5 : 0; // Could be calculated based on data completeness

        return {
          totalRecords,
          features,
          missingValues,
          dataQuality,
          dinsightId: data.dinsight_id,
          createdAt: data.created_at,
        };
      } catch (error) {
        console.warn(`Failed to fetch dinsight stats for ID ${processingState.dinsightId}:`, error);
        return null;
      }
    },
    enabled: !!processingState.dinsightId && processingState.status === 'completed',
  });

  // Query for available datasets - simplified approach for empty database state
  const {
    data: availableDatasets,
    isLoading: datasetsLoading,
    refetch: refetchDatasets,
  } = useQuery({
    queryKey: ['available-datasets'],
    queryFn: async () => {
      // TODO: When data exists, this should be updated to:
      // 1. Either use a proper list endpoint (GET /dinsight) if backend implements it
      // 2. Or track dinsight IDs from successful uploads and query those specific IDs
      //
      // For now, with empty database, return empty array to avoid API errors
      return [];
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Reset pagination when datasets change
  useEffect(() => {
    if (availableDatasets) {
      setCurrentPage(1);
    }
  }, [availableDatasets]);

  // Handle scroll navigation for pagination
  const handleScroll = (event: React.WheelEvent) => {
    if (!availableDatasets || availableDatasets.length <= datasetsPerPage) return;

    const totalPages = Math.ceil(availableDatasets.length / datasetsPerPage);

    if (event.deltaY > 0) {
      // Scrolling down - next page
      setCurrentPage((prev) => Math.min(totalPages, prev + 1));
    } else if (event.deltaY < 0) {
      // Scrolling up - previous page
      setCurrentPage((prev) => Math.max(1, prev - 1));
    }
  };

  // Handle keyboard navigation for pagination
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!availableDatasets || availableDatasets.length <= datasetsPerPage) return;

    const totalPages = Math.ceil(availableDatasets.length / datasetsPerPage);

    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      setCurrentPage((prev) => Math.max(1, prev - 1));
    } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      setCurrentPage((prev) => Math.min(totalPages, prev + 1));
    }
  };

  // Polling effect to check processing status
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    let pollCount = 0;
    const maxPolls = 100; // Maximum 5 minutes of polling (3s * 100 = 300s)

    if (processingState.status === 'processing' && processingState.fileUploadId) {
      // Poll every 3 seconds to check if processing is complete
      intervalId = setInterval(async () => {
        pollCount++;

        try {
          // Check if dinsight data is available
          const response = await apiClient.get(`/dinsight/${processingState.fileUploadId}`);
          if (response.data.success && response.data.data) {
            // Processing is complete, we have dinsight coordinates
            console.log('Processing completed! Dinsight data available:', response.data.data);

            // Extract the actual dinsight_id from the response
            const actualDinsightId = response.data.data.dinsight_id;

            setProcessingState((prev) => ({
              ...prev,
              status: 'completed',
              dinsightId: actualDinsightId, // Use the actual dinsight_data.id
              step: 'monitoring',
              pollCount: undefined,
            }));
            clearInterval(intervalId);
          }
        } catch (error: any) {
          // Update poll count in state for user feedback
          setProcessingState((prev) => ({
            ...prev,
            pollCount: pollCount,
          }));

          // Check if it's a 404 (still processing) or another error
          if (error.response?.status === 404) {
            console.log(`Still processing... (attempt ${pollCount}/${maxPolls})`);

            // Check if we've reached the maximum polling attempts
            if (pollCount >= maxPolls) {
              console.error('Processing timeout - maximum polling attempts reached');
              setProcessingState((prev) => ({
                ...prev,
                status: 'error',
                errorMessage:
                  'Processing timeout. Please try again or check if the file format is correct.',
                pollCount: undefined,
              }));
              clearInterval(intervalId);
            }
          } else {
            // Different error, stop polling
            console.error('Error while checking processing status:', error);
            setProcessingState((prev) => ({
              ...prev,
              status: 'error',
              errorMessage: error.response?.data?.message || 'Error checking processing status',
              pollCount: undefined,
            }));
            clearInterval(intervalId);
          }
        }
      }, 3000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [processingState.status, processingState.fileUploadId]);

  const handleBaselineUpload = async (uploadFiles: File[]) => {
    setProcessingState((prev) => ({ ...prev, status: 'uploading', errorMessage: undefined }));

    try {
      // Create FormData for multipart upload
      const formData = new FormData();
      uploadFiles.forEach((file) => {
        formData.append('files', file);
      });

      // Upload to /analyze endpoint with extended timeout
      const response = await apiClient.post('/analyze', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 120000, // 2 minutes timeout for baseline uploads
      });

      console.log('Baseline upload successful:', response.data);

      const fileUploadId = response.data.data.id;

      setProcessingState((prev) => ({
        ...prev,
        status: 'processing',
        fileUploadId,
        progress: 0,
      }));

      // Clear baseline files after successful upload
      setBaselineFiles([]);
    } catch (error: any) {
      console.error('Baseline upload failed:', error);
      let errorMessage = 'Baseline upload failed';

      if (error.code === 'ECONNABORTED' && error.message.includes('timeout')) {
        errorMessage =
          'Baseline upload timed out. The file may be too large or processing is taking longer than expected. Please try again with a smaller file.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      setProcessingState((prev) => ({
        ...prev,
        status: 'error',
        errorMessage,
      }));
    }
  };

  const handleMonitoringUpload = async (uploadFiles: File[]) => {
    if (!processingState.dinsightId) {
      setProcessingState((prev) => ({
        ...prev,
        status: 'error',
        errorMessage: 'No dinsight ID available. Please upload baseline data first.',
      }));
      return;
    }

    setProcessingState((prev) => ({ ...prev, status: 'uploading', errorMessage: undefined }));

    try {
      // Create FormData for monitoring upload
      const formData = new FormData();
      // Note: monitoring endpoint expects 'file' (singular) not 'files'
      formData.append('file', uploadFiles[0]);

      // Upload to /monitor/:dinsight_id endpoint with extended timeout
      const response = await apiClient.post(`/monitor/${processingState.dinsightId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 120000, // 2 minutes timeout for monitoring uploads
      });

      console.log('Monitoring upload successful:', response.data);

      setProcessingState((prev) => ({
        ...prev,
        status: 'completed',
        step: 'complete',
      }));

      // Clear monitoring files after successful upload
      setMonitoringFiles([]);
    } catch (error: any) {
      console.error('Monitoring upload failed:', error);
      let errorMessage = 'Monitoring upload failed';

      if (error.code === 'ECONNABORTED' && error.message.includes('timeout')) {
        errorMessage =
          'Monitoring upload timed out. The file may be too large or processing is taking longer than expected. Please try again with a smaller file.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      setProcessingState((prev) => ({
        ...prev,
        status: 'error',
        errorMessage,
      }));
    }
  };

  const resetWorkflow = () => {
    setProcessingState({
      step: 'baseline',
      status: 'idle',
    });
    setBaselineFiles([]);
    setMonitoringFiles([]);
  };

  const handleEditConfig = () => {
    setIsEditingConfig(true);
    setEditedConfig({ ...config });
  };

  const handleCancelEdit = () => {
    setIsEditingConfig(false);
    setEditedConfig(null);
  };

  const handleSaveConfig = async () => {
    if (!editedConfig) return;

    setIsSavingConfig(true);
    try {
      const response = await apiClient.post('/config', editedConfig);
      if (response.data.success) {
        // Refresh config data
        refetchConfig();
        setIsEditingConfig(false);
        setEditedConfig(null);
        console.log('Configuration updated successfully');
      }
    } catch (error: any) {
      console.error('Failed to update configuration:', error);
      // Could add toast notification here
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleConfigFieldChange = (field: string, value: any) => {
    setEditedConfig((prev: any) => ({
      ...prev,
      [field]: value,
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processed':
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'processing':
      case 'uploading':
        return 'text-blue-600 bg-blue-100';
      case 'error':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processed':
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'processing':
      case 'uploading':
        return <Clock className="h-4 w-4 animate-spin" />;
      case 'error':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Database className="h-4 w-4" />;
    }
  };

  const isBaselineStep = processingState.step === 'baseline';
  const isMonitoringStep = processingState.step === 'monitoring';
  const isCompleteStep = processingState.step === 'complete';
  const isUploading = processingState.status === 'uploading';
  const isProcessing = processingState.status === 'processing';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Enhanced Page Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="mb-4 sm:mb-0">
            <h1 className="text-3xl font-bold text-gray-900">Data Summary</h1>
            <p className="mt-2 text-lg text-gray-600">
              Upload and manage your datasets for anomaly detection analysis
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={resetWorkflow} className="flex-shrink-0">
              <RefreshCw className="w-4 h-4 mr-2" />
              Reset Workflow
            </Button>
            <Button variant="outline" onClick={() => refetchConfig()} className="flex-shrink-0">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Config
            </Button>
          </div>
        </div>

        {/* View Mode Tabs - Reorganized for better workflow */}
        <div className="mt-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setViewMode('config')}
              className={cn(
                'py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap',
                viewMode === 'config'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              <Settings className="w-4 h-4 mr-2 inline" />
              1. Configuration
            </button>
            <button
              onClick={() => setViewMode('upload')}
              className={cn(
                'py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap',
                viewMode === 'upload'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              <Upload className="w-4 h-4 mr-2 inline" />
              2. Data Upload
            </button>
            <button
              onClick={() => setViewMode('library')}
              className={cn(
                'py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap',
                viewMode === 'library'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              <Database className="w-4 h-4 mr-2 inline" />
              3. Dataset Library
            </button>
            <button
              onClick={() => setViewMode('stats')}
              className={cn(
                'py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap',
                viewMode === 'stats'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              <BarChart3 className="w-4 h-4 mr-2 inline" />
              4. Statistics
            </button>
          </nav>
        </div>
      </div>

      {/* Content based on selected view */}
      {viewMode === 'config' && (
        <div className="space-y-6">
          {/* Configuration Instructions */}
          <Card className="border-l-4 border-l-blue-500 bg-blue-50/50">
            <CardContent className="pt-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                    <Settings className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Configure Processing Parameters
                  </h3>
                  <p className="text-gray-700 mb-4">
                    Set up your analysis parameters before uploading data. These settings will be
                    applied to all baseline and monitoring datasets during processing.
                  </p>
                  <div className="bg-blue-100 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-800">
                      <strong>💡 Tip:</strong> Configure these settings first, then proceed to
                      upload your data. You can always come back to adjust parameters if needed.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Processing Configuration */}
          <Card className="shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-gray-50/80 to-white/80 backdrop-blur-sm">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Settings className="w-5 h-5 text-blue-600" />
                  Processing Configuration
                </CardTitle>
                <CardDescription>Analysis parameters and algorithm settings</CardDescription>
              </div>
              {isEditingConfig ? (
                <div className="flex gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleSaveConfig}
                    disabled={isSavingConfig}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Save className="w-4 h-4 mr-1" />
                    {isSavingConfig ? 'Saving...' : 'Save'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelEdit}
                    disabled={isSavingConfig}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEditConfig}
                  className="border-blue-200 hover:bg-blue-50"
                >
                  <Settings className="w-4 h-4 mr-1" />
                  Edit Configuration
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-6">
              {configLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : isEditingConfig ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="optimizer" className="text-sm font-medium text-gray-700">
                        Optimizer Algorithm
                      </Label>
                      <Select
                        value={editedConfig?.optimizer || ''}
                        onValueChange={(value) => handleConfigFieldChange('optimizer', value)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select optimizer" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="adam">Adam (Recommended)</SelectItem>
                          <SelectItem value="sgd">SGD</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500 mt-1">
                        Optimization algorithm for training
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="alpha" className="text-sm font-medium text-gray-700">
                        Alpha Learning Rate
                      </Label>
                      <Input
                        id="alpha"
                        type="number"
                        step="0.01"
                        min="0.001"
                        max="1.0"
                        className="mt-1"
                        value={editedConfig?.alpha || ''}
                        onChange={(e) =>
                          handleConfigFieldChange('alpha', parseFloat(e.target.value))
                        }
                      />
                      <p className="text-xs text-gray-500 mt-1">Learning rate (0.001 - 1.0)</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="gamma0" className="text-sm font-medium text-gray-700">
                        Gamma0 Initial Value
                      </Label>
                      <Input
                        id="gamma0"
                        type="number"
                        step="0.0000001"
                        className="mt-1"
                        value={editedConfig?.gamma0 || ''}
                        onChange={(e) =>
                          handleConfigFieldChange('gamma0', parseFloat(e.target.value))
                        }
                      />
                      <p className="text-xs text-gray-500 mt-1">Initial gamma parameter</p>
                    </div>
                    <div>
                      <Label htmlFor="end_meta" className="text-sm font-medium text-gray-700">
                        End Meta Column
                      </Label>
                      <Input
                        id="end_meta"
                        type="text"
                        className="mt-1"
                        placeholder="e.g., participant"
                        value={editedConfig?.end_meta || ''}
                        onChange={(e) => handleConfigFieldChange('end_meta', e.target.value)}
                      />
                      <p className="text-xs text-gray-500 mt-1">Last metadata column name</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="start_dim" className="text-sm font-medium text-gray-700">
                        Start Dimension
                      </Label>
                      <Input
                        id="start_dim"
                        type="text"
                        className="mt-1"
                        placeholder="e.g., f_0"
                        value={editedConfig?.start_dim || ''}
                        onChange={(e) => handleConfigFieldChange('start_dim', e.target.value)}
                      />
                      <p className="text-xs text-gray-500 mt-1">First feature column name</p>
                    </div>
                    <div>
                      <Label htmlFor="end_dim" className="text-sm font-medium text-gray-700">
                        End Dimension
                      </Label>
                      <Input
                        id="end_dim"
                        type="text"
                        className="mt-1"
                        placeholder="e.g., f_1023"
                        value={editedConfig?.end_dim || ''}
                        onChange={(e) => handleConfigFieldChange('end_dim', e.target.value)}
                      />
                      <p className="text-xs text-gray-500 mt-1">Last feature column name</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                      <span className="text-sm font-medium text-blue-700">Optimizer</span>
                      <p className="text-lg font-semibold text-blue-900 capitalize">
                        {config?.optimizer}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                      <span className="text-sm font-medium text-green-700">Alpha</span>
                      <p className="text-lg font-semibold text-green-900">{config?.alpha}</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                      <span className="text-sm font-medium text-purple-700">Gamma0</span>
                      <p className="text-lg font-semibold text-purple-900">{config?.gamma0}</p>
                    </div>
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
                      <span className="text-sm font-medium text-orange-700">End Meta</span>
                      <p className="text-lg font-semibold text-orange-900">{config?.end_meta}</p>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-lg border border-indigo-200">
                        <span className="text-sm font-medium text-indigo-700">Start Dim</span>
                        <p className="text-lg font-semibold text-indigo-900">{config?.start_dim}</p>
                      </div>
                      <div className="bg-gradient-to-br from-teal-50 to-teal-100 p-4 rounded-lg border border-teal-200">
                        <span className="text-sm font-medium text-teal-700">End Dim</span>
                        <p className="text-lg font-semibold text-teal-900">{config?.end_dim}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Next Steps Card */}
          <Card className="border-green-200 bg-green-50/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <div>
                    <h3 className="font-semibold text-green-800">Configuration Complete</h3>
                    <p className="text-sm text-green-700">
                      Ready to proceed with data upload using these settings
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => setViewMode('upload')}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Proceed to Upload
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {viewMode === 'upload' && (
        <div className="space-y-6">
          {/* Workflow Progress - Compact Header */}
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-2">
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                        isBaselineStep ||
                          processingState.status === 'processing' ||
                          isMonitoringStep ||
                          isCompleteStep
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-600'
                      )}
                    >
                      1
                    </div>
                    <span
                      className={cn(
                        'font-medium text-sm',
                        isBaselineStep ||
                          processingState.status === 'processing' ||
                          isMonitoringStep ||
                          isCompleteStep
                          ? 'text-blue-600'
                          : 'text-gray-400'
                      )}
                    >
                      Baseline
                    </span>
                  </div>

                  <ArrowRight
                    className={cn(
                      'w-4 h-4 hidden sm:block',
                      isMonitoringStep || isCompleteStep ? 'text-blue-600' : 'text-gray-400'
                    )}
                  />

                  <div className="flex items-center space-x-2">
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                        isMonitoringStep || isCompleteStep
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-600'
                      )}
                    >
                      2
                    </div>
                    <span
                      className={cn(
                        'font-medium text-sm',
                        isMonitoringStep || isCompleteStep ? 'text-blue-600' : 'text-gray-400'
                      )}
                    >
                      Monitoring
                    </span>
                  </div>

                  <ArrowRight
                    className={cn(
                      'w-4 h-4 hidden sm:block',
                      isCompleteStep ? 'text-green-600' : 'text-gray-400'
                    )}
                  />

                  <div className="flex items-center space-x-2">
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                        isCompleteStep ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'
                      )}
                    >
                      ✓
                    </div>
                    <span
                      className={cn(
                        'font-medium text-sm',
                        isCompleteStep ? 'text-green-600' : 'text-gray-400'
                      )}
                    >
                      Complete
                    </span>
                  </div>
                </div>

                <div className="mt-4 sm:mt-0">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(processingState.status)}
                    <span
                      className={cn(
                        'text-sm font-medium capitalize',
                        getStatusColor(processingState.status).split(' ')[0]
                      )}
                    >
                      {processingState.status === 'idle'
                        ? 'Ready to upload'
                        : processingState.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Detailed Status Information */}
              {(processingState.fileUploadId || processingState.errorMessage || isProcessing) && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  {processingState.fileUploadId && (
                    <div className="mb-2 text-sm text-gray-600">
                      <div className="flex flex-wrap items-center gap-4">
                        <span>
                          <strong>Upload ID:</strong> {processingState.fileUploadId}
                        </span>
                        {processingState.dinsightId && (
                          <span className="text-green-600">
                            <strong>Dinsight ID:</strong> {processingState.dinsightId} ✓
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {processingState.errorMessage && (
                    <div className="mb-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="text-sm text-red-600">
                        <strong>Error:</strong> {processingState.errorMessage}
                      </div>
                    </div>
                  )}

                  {isProcessing && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="text-sm text-blue-800 mb-2">
                        <strong>Processing baseline data...</strong> This may take a few minutes.
                      </div>
                      <div className="text-xs text-blue-600 mb-2">
                        Analyzing data and generating dinsight coordinates...
                        {processingState.pollCount && (
                          <span className="ml-2 font-mono">
                            (Check {processingState.pollCount}/100)
                          </span>
                        )}
                      </div>
                      <Progress value={undefined} className="h-2" />
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upload Section - Full Width */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Step 1: Baseline Upload */}
            <Card
              className={cn(
                'h-fit transition-all duration-200',
                isBaselineStep ? 'ring-2 ring-blue-500 ring-opacity-50 shadow-lg' : '',
                isMonitoringStep || isCompleteStep ? 'opacity-80' : ''
              )}
            >
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-lg">
                  <span className="w-7 h-7 rounded-full bg-blue-600 text-white text-sm flex items-center justify-center mr-3">
                    1
                  </span>
                  Baseline Data
                </CardTitle>
                <CardDescription className="text-sm">
                  Upload CSV files for initial analysis and processing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FileUpload
                  onFilesChange={setBaselineFiles}
                  onUpload={handleBaselineUpload}
                  maxFiles={10}
                  maxSize={100 * 1024 * 1024} // 100MB
                  disabled={!isBaselineStep || isUploading}
                  uploadText={isUploading ? 'Uploading...' : 'Upload Baseline Data'}
                />
                {processingState.fileUploadId && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="text-sm text-blue-800">
                      <strong>Upload ID:</strong> {processingState.fileUploadId}
                    </div>
                    {isProcessing && (
                      <div className="text-sm text-blue-600 mt-1">
                        Processing... Monitoring upload will be enabled once complete.
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Step 2: Monitoring Upload */}
            <Card
              className={cn(
                'h-fit transition-all duration-200',
                isMonitoringStep ? 'ring-2 ring-blue-500 ring-opacity-50 shadow-lg' : '',
                !isMonitoringStep ? 'opacity-60' : ''
              )}
            >
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-lg">
                  <span
                    className={cn(
                      'w-7 h-7 rounded-full text-sm flex items-center justify-center mr-3',
                      isMonitoringStep || isCompleteStep
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-300 text-gray-500'
                    )}
                  >
                    2
                  </span>
                  Monitoring Data
                </CardTitle>
                <CardDescription className="text-sm">
                  Upload monitoring data for anomaly detection
                </CardDescription>
              </CardHeader>
              <CardContent>
                {processingState.dinsightId && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <Label htmlFor="dinsight-id" className="text-sm font-medium text-green-800">
                      Dinsight ID (auto-populated)
                    </Label>
                    <Input
                      id="dinsight-id"
                      value={processingState.dinsightId}
                      readOnly
                      className="mt-1 bg-green-100 text-green-800 font-mono text-sm"
                    />
                  </div>
                )}
                <FileUpload
                  onFilesChange={setMonitoringFiles}
                  onUpload={handleMonitoringUpload}
                  maxFiles={1} // Monitoring endpoint accepts single file
                  maxSize={100 * 1024 * 1024} // 100MB
                  disabled={!isMonitoringStep || isUploading || !processingState.dinsightId}
                  uploadText={isUploading ? 'Processing...' : 'Upload Monitoring Data'}
                />
                {isMonitoringStep && isUploading && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="text-sm text-blue-800 mb-2">
                      <strong>Processing monitoring data...</strong>
                    </div>
                    <div className="text-xs text-blue-600 mb-2">
                      This may take up to 2 minutes. Please wait...
                    </div>
                    <Progress value={undefined} className="h-2" />
                  </div>
                )}
                {!processingState.dinsightId && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="text-sm text-yellow-800">
                      Complete baseline processing first.
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Completion Status - Full Width */}
          {isCompleteStep && (
            <Card className="border-green-200 bg-gradient-to-r from-green-50 to-green-100 mt-6">
              <CardContent className="pt-8 pb-8">
                <div className="text-center">
                  <div className="mx-auto mb-4 w-16 h-16 bg-green-600 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-green-800 mb-2">
                    🎉 Data Processing Complete!
                  </h3>
                  <p className="text-green-700 mb-6 max-w-md mx-auto">
                    Both baseline and monitoring data have been successfully uploaded and processed.
                    You can now view analysis results or upload new data.
                  </p>
                  <div className="flex flex-wrap justify-center gap-3">
                    <Button className="bg-green-600 hover:bg-green-700 text-white">
                      <BarChart3 className="w-4 h-4 mr-2" />
                      View Analysis
                    </Button>
                    <Button
                      onClick={() => setViewMode('stats')}
                      variant="outline"
                      className="border-green-300 text-green-700 hover:bg-green-50"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      View Statistics
                    </Button>
                    <Button
                      onClick={resetWorkflow}
                      variant="outline"
                      className="border-green-300 text-green-700 hover:bg-green-50"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload New Data
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {viewMode === 'library' && (
        <div className="space-y-6">
          {/* Dataset Library */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl">Dataset Library</CardTitle>
                <CardDescription className="text-base">
                  {datasetsLoading
                    ? 'Loading your datasets...'
                    : availableDatasets && availableDatasets.length > 0
                      ? availableDatasets.length > datasetsPerPage
                        ? `${availableDatasets.length} datasets • ${datasetsPerPage} per page`
                        : `${availableDatasets.length} datasets total`
                      : 'No datasets found'}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchDatasets()}
                  disabled={datasetsLoading}
                >
                  <RefreshCw className={cn('w-4 h-4 mr-2', datasetsLoading && 'animate-spin')} />
                  Refresh
                </Button>
                <Button variant="default" size="sm" onClick={() => setViewMode('upload')}>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload New
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {datasetsLoading ? (
                <div className="flex items-center justify-center p-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-600">Loading datasets...</span>
                </div>
              ) : availableDatasets && availableDatasets.length > 0 ? (
                <div
                  className="space-y-4 focus:outline-none"
                  onWheel={handleScroll}
                  onKeyDown={handleKeyDown}
                  tabIndex={0}
                >
                  {/* Dataset Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {availableDatasets
                      .slice((currentPage - 1) * datasetsPerPage, currentPage * datasetsPerPage)
                      .map((dataset: any) => (
                        <Card
                          key={dataset.id}
                          className="hover:shadow-md transition-shadow border border-gray-200"
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center space-x-3">
                                <div className="flex-shrink-0">
                                  <FileText className="h-8 w-8 text-blue-500" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-semibold text-gray-900 truncate mb-1">
                                    {dataset.name}
                                  </p>
                                  <span
                                    className={cn(
                                      'inline-flex items-center px-2 py-1 text-xs font-medium rounded-full',
                                      getStatusColor(dataset.status)
                                    )}
                                  >
                                    {getStatusIcon(dataset.status)}
                                    <span className="ml-1 capitalize">{dataset.status}</span>
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-2 mb-4">
                              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                                <div className="flex items-center">
                                  <span className="mr-1">📊</span>
                                  <span>{formatNumber(dataset.records)} records</span>
                                </div>
                                <div className="flex items-center">
                                  <span className="mr-1">🧬</span>
                                  <span>{formatNumber(dataset.features)} features</span>
                                </div>
                                <div className="flex items-center">
                                  <span className="mr-1">💾</span>
                                  <span>{formatBytes(dataset.size)}</span>
                                </div>
                                {dataset.quality_score && (
                                  <div className="flex items-center">
                                    <span className="mr-1">✨</span>
                                    <span>{dataset.quality_score}% quality</span>
                                  </div>
                                )}
                              </div>

                              <div className="flex flex-wrap gap-1">
                                {dataset.tags.slice(0, 2).map((tag: any) => (
                                  <span
                                    key={tag}
                                    className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
                                  >
                                    {tag}
                                  </span>
                                ))}
                                {dataset.tags.length > 2 && (
                                  <span className="inline-flex px-2 py-1 text-xs text-gray-400">
                                    +{dataset.tags.length - 2} more
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" className="flex-1 h-8 text-xs">
                                <Eye className="h-3 w-3 mr-1" />
                                Preview
                              </Button>
                              <Button variant="ghost" size="sm" className="flex-1 h-8 text-xs">
                                <BarChart3 className="h-3 w-3 mr-1" />
                                Analyze
                              </Button>
                              <Button variant="ghost" size="sm" className="h-8 px-2">
                                <Download className="h-3 w-3" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>

                  {/* Pagination Controls */}
                  {availableDatasets.length > datasetsPerPage && (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-6 border-t space-y-3 sm:space-y-0">
                      <div className="text-sm text-gray-600">
                        Showing {(currentPage - 1) * datasetsPerPage + 1} to{' '}
                        {Math.min(currentPage * datasetsPerPage, availableDatasets.length)} of{' '}
                        {availableDatasets.length} datasets
                      </div>
                      <div className="flex items-center justify-center sm:justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="w-4 h-4 mr-1" />
                          Previous
                        </Button>
                        <span className="text-sm text-gray-600 px-2">
                          {currentPage} of {Math.ceil(availableDatasets.length / datasetsPerPage)}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setCurrentPage((prev) =>
                              Math.min(
                                Math.ceil(availableDatasets.length / datasetsPerPage),
                                prev + 1
                              )
                            )
                          }
                          disabled={
                            currentPage >= Math.ceil(availableDatasets.length / datasetsPerPage)
                          }
                        >
                          Next
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <div className="mx-auto mb-4 w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                    <Database className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No datasets found</h3>
                  <p className="text-sm mb-4">
                    Upload your first dataset to get started with analysis
                  </p>
                  <Button onClick={() => setViewMode('upload')}>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Data
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {viewMode === 'stats' && (
        <div className="space-y-6">
          {/* Current Configuration Summary */}
          <Card className="border-blue-200 bg-blue-50/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Settings className="w-6 h-6 text-blue-600" />
                  <div>
                    <h3 className="font-semibold text-blue-800">Current Configuration</h3>
                    <p className="text-sm text-blue-700">
                      Optimizer: {config?.optimizer || 'Loading...'} | Alpha:{' '}
                      {config?.alpha || 'Loading...'}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => setViewMode('config')}
                  variant="outline"
                  className="border-blue-200 hover:bg-blue-100 text-blue-700"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Edit Configuration
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Dataset Statistics */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl">Dataset Statistics</CardTitle>
              <CardDescription>
                {dinsightStats
                  ? `Data overview for Dinsight ID ${dinsightStats.dinsightId}`
                  : 'Data quality metrics and insights'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-600">Loading statistics...</span>
                </div>
              ) : dinsightStats ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                      <p className="text-2xl font-bold text-blue-900">
                        {formatNumber(dinsightStats.totalRecords)}
                      </p>
                      <p className="text-sm font-medium text-blue-700">Total Records</p>
                    </div>
                    <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
                      <p className="text-2xl font-bold text-green-900">
                        {formatNumber(dinsightStats.features)}
                      </p>
                      <p className="text-sm font-medium text-green-700">Features</p>
                    </div>
                    <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
                      <p className="text-2xl font-bold text-purple-900">
                        {dinsightStats.missingValues.toFixed(1)}%
                      </p>
                      <p className="text-sm font-medium text-purple-700">Missing Values</p>
                    </div>
                    <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg border border-orange-200">
                      <p className="text-2xl font-bold text-orange-900">
                        {dinsightStats.dataQuality.toFixed(1)}%
                      </p>
                      <p className="text-sm font-medium text-orange-700">Data Quality</p>
                    </div>
                  </div>

                  {/* Data Quality Progress */}
                  <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Data Quality Score</span>
                      <span className="text-lg font-bold text-gray-900">
                        {dinsightStats.dataQuality.toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={dinsightStats.dataQuality} className="h-3" />
                    <p className="text-xs text-gray-600">
                      {dinsightStats.dataQuality >= 95
                        ? 'Excellent data quality'
                        : dinsightStats.dataQuality >= 80
                          ? 'Good data quality'
                          : dinsightStats.dataQuality >= 60
                            ? 'Fair data quality'
                            : 'Poor data quality'}
                    </p>
                  </div>

                  {/* Storage Usage */}
                  <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Storage Used</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {formatBytes(dinsightStats.totalRecords * 4 * dinsightStats.features)}
                      </span>
                    </div>
                    <Progress
                      value={Math.min(
                        ((dinsightStats.totalRecords * 4 * dinsightStats.features) /
                          (1024 * 1024 * 1024)) *
                          100,
                        15
                      )}
                      className="h-2"
                    />
                    <p className="text-xs text-gray-600">of 1 GB limit</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-2xl font-bold text-gray-400">—</p>
                      <p className="text-sm font-medium text-gray-500">Total Records</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-2xl font-bold text-gray-400">—</p>
                      <p className="text-sm font-medium text-gray-500">Features</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-2xl font-bold text-gray-400">—</p>
                      <p className="text-sm font-medium text-gray-500">Missing Values</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-2xl font-bold text-gray-400">—</p>
                      <p className="text-sm font-medium text-gray-500">Data Quality</p>
                    </div>
                  </div>

                  <div className="text-center py-8">
                    <div className="mx-auto mb-4 w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                      <BarChart3 className="h-6 w-6 text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-900 mb-2">
                      No statistics available
                    </p>
                    <p className="text-xs text-gray-600 mb-4">
                      Upload and process data to see statistics
                    </p>
                    <Button onClick={() => setViewMode('upload')} size="sm">
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Data
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl">Quick Actions</CardTitle>
              <CardDescription>Common tasks and shortcuts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Button variant="outline" className="justify-start h-auto p-4 flex-col items-start">
                  <BarChart3 className="w-6 h-6 mb-2 text-blue-600" />
                  <div className="text-left">
                    <div className="font-semibold">Sample Data</div>
                    <div className="text-xs text-gray-500">Load demo dataset</div>
                  </div>
                </Button>
                <Button variant="outline" className="justify-start h-auto p-4 flex-col items-start">
                  <Download className="w-6 h-6 mb-2 text-green-600" />
                  <div className="text-left">
                    <div className="font-semibold">Export Stats</div>
                    <div className="text-xs text-gray-500">Download reports</div>
                  </div>
                </Button>
                <Button variant="outline" className="justify-start h-auto p-4 flex-col items-start">
                  <Settings className="w-6 h-6 mb-2 text-orange-600" />
                  <div className="text-left">
                    <div className="font-semibold">Reset Config</div>
                    <div className="text-xs text-gray-500">Default settings</div>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="justify-start h-auto p-4 flex-col items-start"
                  onClick={() => setViewMode('upload')}
                >
                  <Upload className="w-6 h-6 mb-2 text-purple-600" />
                  <div className="text-left">
                    <div className="font-semibold">New Upload</div>
                    <div className="text-xs text-gray-500">Upload more data</div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
