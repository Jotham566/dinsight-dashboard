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
  const datasetsPerPage = 2;

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
  const {
    data: dinsightStats,
    isLoading: statsLoading,
  } = useQuery({
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

  // Query for available datasets (dinsight records)
  const {
    data: availableDatasets,
    isLoading: datasetsLoading,
    refetch: refetchDatasets,
  } = useQuery({
    queryKey: ['available-datasets'],
    queryFn: async () => {
      try {
        // Check a smaller range of IDs since we're now paginating
        const potentialIds = Array.from({ length: 15 }, (_, i) => i + 1); // Check IDs 1-15
        
        const promises = potentialIds.map(async (testId) => {
          try {
            const response = await apiClient.get(`/dinsight/${testId}`);
            
            if (response.data.success && response.data.data) {
              const data = response.data.data;
              const totalRecords = data.dinsight_x?.length || 0;
              const features = data.feature_names?.length || data.features_count || 1024;
              
              return {
                id: data.dinsight_id || testId,
                name: data.filename || `dinsight_${data.dinsight_id || testId}.csv`,
                records: totalRecords,
                features: features,
                status: totalRecords > 0 ? 'processed' : 'processing',
                type: data.type || 'baseline',
                tags: [data.type || 'baseline', 'processed'],
                quality_score: totalRecords > 0 ? 98.5 : 0,
                created_at: data.created_at || new Date().toISOString(),
                size: totalRecords * features * 4, // Estimate: 4 bytes per float
              };
            }
            return null;
          } catch (error) {
            return null;
          }
        });

        const results = await Promise.all(promises);
        const validDatasets = results.filter((dataset) => dataset !== null);
        
        // Sort by created_at descending (newest first)
        return validDatasets.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      } catch (error) {
        console.warn('Failed to fetch available datasets:', error);
        return [];
      }
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Reset pagination when datasets change
  useEffect(() => {
    if (availableDatasets) {
      setCurrentPage(1);
    }
  }, [availableDatasets?.length]);

  // Handle scroll navigation for pagination
  const handleScroll = (event: React.WheelEvent) => {
    if (!availableDatasets || availableDatasets.length <= datasetsPerPage) return;

    const totalPages = Math.ceil(availableDatasets.length / datasetsPerPage);
    
    if (event.deltaY > 0) {
      // Scrolling down - next page
      setCurrentPage(prev => Math.min(totalPages, prev + 1));
    } else if (event.deltaY < 0) {
      // Scrolling up - previous page
      setCurrentPage(prev => Math.max(1, prev - 1));
    }
  };

  // Handle keyboard navigation for pagination
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!availableDatasets || availableDatasets.length <= datasetsPerPage) return;

    const totalPages = Math.ceil(availableDatasets.length / datasetsPerPage);

    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      setCurrentPage(prev => Math.max(1, prev - 1));
    } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      setCurrentPage(prev => Math.min(totalPages, prev + 1));
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
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Summary</h1>
          <p className="text-gray-500">Upload baseline data, then monitoring data for analysis</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetWorkflow}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset Workflow
          </Button>
          <Button variant="outline" onClick={() => refetchConfig()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Config
          </Button>
        </div>
      </div>

      {/* Workflow Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Data Processing Workflow</CardTitle>
          <CardDescription>
            Follow the two-step process: Upload baseline data first, then monitoring data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
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
                  'font-medium',
                  isBaselineStep ||
                    processingState.status === 'processing' ||
                    isMonitoringStep ||
                    isCompleteStep
                    ? 'text-blue-600'
                    : 'text-gray-400'
                )}
              >
                Upload Baseline
              </span>
            </div>

            <ArrowRight
              className={cn(
                'w-5 h-5',
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
                  'font-medium',
                  isMonitoringStep || isCompleteStep ? 'text-blue-600' : 'text-gray-400'
                )}
              >
                Upload Monitoring
              </span>
            </div>

            <ArrowRight
              className={cn('w-5 h-5', isCompleteStep ? 'text-green-600' : 'text-gray-400')}
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
                className={cn('font-medium', isCompleteStep ? 'text-green-600' : 'text-gray-400')}
              >
                Complete
              </span>
            </div>
          </div>

          {/* Status Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              {getStatusIcon(processingState.status)}
              <span
                className={cn(
                  'text-sm font-medium capitalize',
                  getStatusColor(processingState.status).split(' ')[0]
                )}
              >
                {processingState.status === 'idle'
                  ? 'Ready to upload baseline data'
                  : processingState.status}
              </span>
            </div>

            {processingState.fileUploadId && (
              <div className="mt-2 text-sm text-gray-600">
                <div>
                  <strong>File Upload ID:</strong> {processingState.fileUploadId}
                </div>
                {processingState.dinsightId && (
                  <div>
                    <strong>Dinsight ID:</strong> {processingState.dinsightId}
                    <span className="text-green-600 ml-2">✓ Ready for monitoring data</span>
                  </div>
                )}
              </div>
            )}

            {processingState.errorMessage && (
              <div className="mt-2 text-sm text-red-600">
                <strong>Error:</strong> {processingState.errorMessage}
              </div>
            )}

            {isProcessing && (
              <div className="mt-2">
                <div className="text-sm text-blue-600 mb-1">
                  Processing baseline data... This may take a few minutes depending on file size.
                </div>
                <div className="text-xs text-gray-500 mb-2">
                  The system is analyzing your data and generating dinsight coordinates. Please
                  wait...
                  {processingState.pollCount && (
                    <span className="ml-2 font-mono">(Check {processingState.pollCount}/100)</span>
                  )}
                </div>
                <Progress value={undefined} className="h-2" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* File Upload Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Step 1: Baseline Upload */}
          <Card
            className={cn(
              'transition-all duration-200',
              isBaselineStep ? 'ring-2 ring-blue-500 ring-opacity-50' : '',
              isMonitoringStep || isCompleteStep ? 'opacity-75' : ''
            )}
          >
            <CardHeader>
              <CardTitle className="flex items-center">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-sm flex items-center justify-center mr-2">
                  1
                </span>
                Baseline Data Upload
              </CardTitle>
              <CardDescription>
                Upload your baseline CSV files for initial analysis and processing
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
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <div className="text-sm text-blue-800">
                    <strong>File Upload ID:</strong> {processingState.fileUploadId}
                  </div>
                  {isProcessing && (
                    <div className="text-sm text-blue-600 mt-1">
                      Processing in progress... Monitoring upload will be enabled once complete.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Step 2: Monitoring Upload */}
          <Card
            className={cn(
              'transition-all duration-200',
              isMonitoringStep ? 'ring-2 ring-blue-500 ring-opacity-50' : '',
              !isMonitoringStep ? 'opacity-50' : ''
            )}
          >
            <CardHeader>
              <CardTitle className="flex items-center">
                <span
                  className={cn(
                    'w-6 h-6 rounded-full text-sm flex items-center justify-center mr-2',
                    isMonitoringStep || isCompleteStep
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-300 text-gray-500'
                  )}
                >
                  2
                </span>
                Monitoring Data Upload
              </CardTitle>
              <CardDescription>
                Upload monitoring data for anomaly detection (requires baseline processing to
                complete)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {processingState.dinsightId && (
                <div className="mb-4 p-3 bg-green-50 rounded-lg">
                  <Label htmlFor="dinsight-id" className="text-sm font-medium text-green-800">
                    Dinsight ID (auto-populated)
                  </Label>
                  <Input
                    id="dinsight-id"
                    value={processingState.dinsightId}
                    readOnly
                    className="mt-1 bg-green-100 text-green-800 font-mono"
                  />
                </div>
              )}
              <FileUpload
                onFilesChange={setMonitoringFiles}
                onUpload={handleMonitoringUpload}
                maxFiles={1} // Monitoring endpoint accepts single file
                maxSize={100 * 1024 * 1024} // 100MB
                disabled={!isMonitoringStep || isUploading || !processingState.dinsightId}
                uploadText={
                  isUploading ? 'Processing monitoring data...' : 'Upload Monitoring Data'
                }
              />
              {isMonitoringStep && isUploading && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <div className="text-sm text-blue-800 mb-2">
                    <strong>Processing monitoring data...</strong>
                  </div>
                  <div className="text-xs text-blue-600 mb-2">
                    This may take up to 2 minutes depending on file size and complexity. Please
                    wait...
                  </div>
                  <Progress value={undefined} className="h-2" />
                </div>
              )}
              {!processingState.dinsightId && (
                <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                  <div className="text-sm text-yellow-800">
                    Please complete baseline data upload and processing before uploading monitoring
                    data.
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Completion Status */}
          {isCompleteStep && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-6">
                <div className="text-center">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-green-800 mb-2">
                    Data Processing Complete!
                  </h3>
                  <p className="text-green-700 mb-4">
                    Both baseline and monitoring data have been successfully uploaded and processed.
                  </p>
                  <div className="flex justify-center space-x-3">
                    <Button variant="outline" className="border-green-300 text-green-700">
                      <BarChart3 className="w-4 h-4 mr-2" />
                      View Analysis
                    </Button>
                    <Button
                      onClick={resetWorkflow}
                      variant="outline"
                      className="border-green-300 text-green-700"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload New Data
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Dataset Library */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Dataset Library</CardTitle>
                <CardDescription>
                  {datasetsLoading 
                    ? 'Loading datasets...' 
                    : availableDatasets && availableDatasets.length > 0
                      ? availableDatasets.length > datasetsPerPage
                        ? `${availableDatasets.length} datasets (showing ${datasetsPerPage} per page • scroll or use buttons to navigate)`
                        : `${availableDatasets.length} datasets`
                      : 'No datasets found'}
                </CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => refetchDatasets()}
                disabled={datasetsLoading}
              >
                <RefreshCw className={cn("w-4 h-4 mr-2", datasetsLoading && "animate-spin")} />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {datasetsLoading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                  <span className="ml-2 text-gray-600">Loading datasets...</span>
                </div>
              ) : availableDatasets && availableDatasets.length > 0 ? (
                <div 
                  className="space-y-4 focus:outline-none" 
                  onWheel={handleScroll}
                  onKeyDown={handleKeyDown}
                  tabIndex={0}
                >
                  {/* Dataset List */}
                  <div className="space-y-3">
                    {availableDatasets
                      .slice((currentPage - 1) * datasetsPerPage, currentPage * datasetsPerPage)
                      .map((dataset) => (
                  <div
                    key={dataset.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <FileText className="h-8 w-8 text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
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
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>📊 {formatNumber(dataset.records)} records</span>
                          <span>🧬 {formatNumber(dataset.features)} features</span>
                          <span>💾 {formatBytes(dataset.size)}</span>
                          {dataset.quality_score && (
                            <span>✨ {dataset.quality_score}% quality</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          {dataset.tags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        Preview
                      </Button>
                      <Button variant="ghost" size="sm">
                        <BarChart3 className="h-4 w-4 mr-1" />
                        Analyze
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4 mr-1" />
                        Export
                      </Button>
                    </div>
                    </div>
                  ))}
                  </div>

                  {/* Pagination Controls */}
                  {availableDatasets.length > datasetsPerPage && (
                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="text-sm text-gray-500">
                        Showing {((currentPage - 1) * datasetsPerPage) + 1} to{' '}
                        {Math.min(currentPage * datasetsPerPage, availableDatasets.length)} of{' '}
                        {availableDatasets.length} datasets
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="w-4 h-4 mr-1" />
                          Previous
                        </Button>
                        <span className="text-sm text-gray-600">
                          Page {currentPage} of {Math.ceil(availableDatasets.length / datasetsPerPage)}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.min(Math.ceil(availableDatasets.length / datasetsPerPage), prev + 1))}
                          disabled={currentPage >= Math.ceil(availableDatasets.length / datasetsPerPage)}
                        >
                          Next
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm font-medium">No datasets found</p>
                  <p className="text-xs mt-1">Upload data to see it appear here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Configuration Panel */}
        <div className="space-y-6">
          {/* Processing Configuration */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Processing Configuration</CardTitle>
                <CardDescription>Analysis parameters and settings</CardDescription>
              </div>
              {isEditingConfig ? (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSaveConfig}
                    disabled={isSavingConfig}
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
                <Button variant="outline" size="sm" onClick={handleEditConfig}>
                  <Settings className="w-4 h-4 mr-1" />
                  Edit
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {configLoading ? (
                <div className="space-y-3">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ) : isEditingConfig ? (
                <div className="space-y-4 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="optimizer" className="text-sm font-medium text-gray-700">
                        Optimizer
                      </Label>
                      <Select
                        value={editedConfig?.optimizer || ''}
                        onValueChange={(value) => handleConfigFieldChange('optimizer', value)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select optimizer" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="adam">Adam</SelectItem>
                          <SelectItem value="sgd">SGD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="alpha" className="text-sm font-medium text-gray-700">
                        Alpha
                      </Label>
                      <Input
                        id="alpha"
                        type="number"
                        step="0.01"
                        className="mt-1"
                        value={editedConfig?.alpha || ''}
                        onChange={(e) =>
                          handleConfigFieldChange('alpha', parseFloat(e.target.value))
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="gamma0" className="text-sm font-medium text-gray-700">
                        Gamma0
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
                    </div>
                    <div>
                      <Label htmlFor="end_meta" className="text-sm font-medium text-gray-700">
                        End Meta
                      </Label>
                      <Input
                        id="end_meta"
                        type="text"
                        className="mt-1"
                        value={editedConfig?.end_meta || ''}
                        onChange={(e) => handleConfigFieldChange('end_meta', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="start_dim" className="text-sm font-medium text-gray-700">
                          Start Dim
                        </Label>
                        <Input
                          id="start_dim"
                          type="text"
                          className="mt-1"
                          value={editedConfig?.start_dim || ''}
                          onChange={(e) => handleConfigFieldChange('start_dim', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="end_dim" className="text-sm font-medium text-gray-700">
                          End Dim
                        </Label>
                        <Input
                          id="end_dim"
                          type="text"
                          className="mt-1"
                          value={editedConfig?.end_dim || ''}
                          onChange={(e) => handleConfigFieldChange('end_dim', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 text-sm">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="font-medium text-gray-700">Optimizer:</span>
                      <p className="text-gray-600 capitalize">{config?.optimizer}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Alpha:</span>
                      <p className="text-gray-600">{config?.alpha}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Gamma0:</span>
                      <p className="text-gray-600">{config?.gamma0}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">End Meta:</span>
                      <p className="text-gray-600">{config?.end_meta}</p>
                    </div>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="font-medium text-gray-700">Start Dim:</span>
                        <p className="text-gray-600">{config?.start_dim}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">End Dim:</span>
                        <p className="text-gray-600">{config?.end_dim}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dataset Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Dataset Statistics</CardTitle>
              <CardDescription>
                {dinsightStats
                  ? `Overview of Dinsight ID ${dinsightStats.dinsightId} data quality and metrics`
                  : 'Overview of your data quality and metrics'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                  <span className="ml-2 text-gray-600">Loading statistics...</span>
                </div>
              ) : dinsightStats ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <p className="font-semibold text-blue-900">
                        {formatNumber(dinsightStats.totalRecords)}
                      </p>
                      <p className="text-blue-700">Total Records</p>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <p className="font-semibold text-green-900">
                        {formatNumber(dinsightStats.features)}
                      </p>
                      <p className="text-green-700">Features</p>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <p className="font-semibold text-purple-900">
                        {dinsightStats.missingValues.toFixed(1)}%
                      </p>
                      <p className="text-purple-700">Missing Values</p>
                    </div>
                    <div className="text-center p-3 bg-orange-50 rounded-lg">
                      <p className="font-semibold text-orange-900">
                        {dinsightStats.dataQuality.toFixed(1)}%
                      </p>
                      <p className="text-orange-700">Data Quality</p>
                    </div>
                  </div>

                  {/* Data Quality Progress */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700">Data Quality Score</span>
                      <span className="font-medium text-gray-900">
                        {dinsightStats.dataQuality.toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={dinsightStats.dataQuality} className="h-2" />
                  </div>

                  {/* Storage Usage */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700">Storage Used</span>
                      <span className="font-medium text-gray-900">
                        {formatBytes(dinsightStats.totalRecords * 4 * dinsightStats.features)} / 1 GB
                      </span>
                    </div>
                    <Progress 
                      value={Math.min((dinsightStats.totalRecords * 4 * dinsightStats.features) / (1024 * 1024 * 1024) * 100, 100)} 
                      className="h-2" 
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="font-semibold text-gray-500">—</p>
                      <p className="text-gray-500">Total Records</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="font-semibold text-gray-500">—</p>
                      <p className="text-gray-500">Features</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="font-semibold text-gray-500">—</p>
                      <p className="text-gray-500">Missing Values</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="font-semibold text-gray-500">—</p>
                      <p className="text-gray-500">Data Quality</p>
                    </div>
                  </div>

                  {/* Data Quality Progress */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700">Data Quality Score</span>
                      <span className="font-medium text-gray-500">No data available</span>
                    </div>
                    <Progress value={0} className="h-2" />
                  </div>

                  {/* Storage Usage */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700">Storage Used</span>
                      <span className="font-medium text-gray-500">No data available</span>
                    </div>
                    <Progress value={0} className="h-2" />
                  </div>
                </div>
              )}
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
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Load Sample Data
                </Button>
                <Button variant="outline" className="justify-start">
                  <Download className="w-4 h-4 mr-2" />
                  Export Statistics
                </Button>
                <Button variant="outline" className="justify-start">
                  <Settings className="w-4 h-4 mr-2" />
                  Reset Configuration
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
