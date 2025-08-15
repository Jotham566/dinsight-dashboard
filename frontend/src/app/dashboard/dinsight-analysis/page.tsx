'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Settings,
  Upload,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Save,
  X,
  PlayCircle,
  FileText,
  Activity,
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
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/utils/cn';

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

export default function DinsightAnalysisPage() {
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
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);

  // Default configuration values based on backend config.json
  const defaultConfig = {
    id: 1,
    optimizer: 'adam',
    alpha: 0.1,
    gamma0: 1e-7,
    end_meta: 'participant',
    start_dim: 'f_0',
    end_dim: 'f_1023',
    created_at: new Date().toISOString(),
  };

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

  const handleRestoreDefaults = () => {
    setShowRestoreDialog(true);
  };

  const confirmRestoreDefaults = () => {
    setEditedConfig({ ...defaultConfig });
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
        return 'text-green-600';
      case 'processing':
      case 'uploading':
        return 'text-blue-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
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
        return <Clock className="h-4 w-4" />;
    }
  };

  const isBaselineStep = processingState.step === 'baseline';
  const isMonitoringStep = processingState.step === 'monitoring';
  const isCompleteStep = processingState.step === 'complete';
  const isUploading = processingState.status === 'uploading';
  const isProcessing = processingState.status === 'processing';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Clean Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="mb-4 sm:mb-0">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Run DInsight Analysis
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Configure settings and upload data for anomaly detection and insights
            </p>
          </div>
          <Button
            variant="outline"
            onClick={resetWorkflow}
            className="border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset Workflow
          </Button>
        </div>
      </div>

      {/* Workflow Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-8">
            <div className="flex items-center">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors',
                  isBaselineStep || processingState.status === 'processing' || isMonitoringStep || isCompleteStep
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                )}
              >
                1
              </div>
              <span className={cn(
                'ml-2 text-sm font-medium',
                isBaselineStep || processingState.status === 'processing' || isMonitoringStep || isCompleteStep
                  ? 'text-gray-900 dark:text-white'
                  : 'text-gray-500 dark:text-gray-400'
              )}>
                Configure & Upload Baseline
              </span>
            </div>

            <div className="flex items-center">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors',
                  isMonitoringStep || isCompleteStep
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                )}
              >
                2
              </div>
              <span className={cn(
                'ml-2 text-sm font-medium',
                isMonitoringStep || isCompleteStep
                  ? 'text-gray-900 dark:text-white'
                  : 'text-gray-500 dark:text-gray-400'
              )}>
                Upload Monitoring Data
              </span>
            </div>

            <div className="flex items-center">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors',
                  isCompleteStep
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                )}
              >
                ✓
              </div>
              <span className={cn(
                'ml-2 text-sm font-medium',
                isCompleteStep
                  ? 'text-gray-900 dark:text-white'
                  : 'text-gray-500 dark:text-gray-400'
              )}>
                Analysis Complete
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {getStatusIcon(processingState.status)}
            <span className={cn('text-sm font-medium capitalize', getStatusColor(processingState.status))}>
              {processingState.status === 'idle' ? 'Ready' : processingState.status}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-primary-600 h-2 rounded-full transition-all duration-500"
            style={{
              width: isCompleteStep ? '100%' : isMonitoringStep ? '66%' : isBaselineStep ? '33%' : '0%'
            }}
          />
        </div>
      </div>

      {/* Status Messages */}
      {processingState.errorMessage && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 mr-3 flex-shrink-0" />
            <div className="text-sm text-red-800 dark:text-red-200">
              <strong>Error:</strong> {processingState.errorMessage}
            </div>
          </div>
        </div>
      )}

      {isProcessing && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start">
            <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0 animate-pulse" />
            <div>
              <div className="text-sm text-blue-800 dark:text-blue-200 font-medium mb-2">
                Processing baseline data...
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-300 mb-2">
                Analyzing data and generating dinsight coordinates. This may take a few minutes.
                {processingState.pollCount && (
                  <span className="ml-2 font-mono">
                    (Check {processingState.pollCount}/100)
                  </span>
                )}
              </div>
              <Progress value={undefined} className="h-1.5" />
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="space-y-6">
        {/* Configuration Section */}
        {(isBaselineStep || processingState.status === 'idle') && (
          <Card className="border-gray-200 dark:border-gray-700">
            <CardHeader className="border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Settings className="h-5 w-5 text-gray-600 dark:text-gray-400 mr-2" />
                  <CardTitle className="text-lg">Processing Configuration</CardTitle>
                </div>
                {isEditingConfig ? (
                  <div className="flex gap-2">
                    <Button
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
                      onClick={handleRestoreDefaults}
                      disabled={isSavingConfig}
                    >
                      <RefreshCw className="w-4 h-4 mr-1" />
                      Defaults
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCancelEdit}
                      disabled={isSavingConfig}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEditConfig}
                  >
                    Edit
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {configLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-2"></div>
                      <div className="h-10 bg-gray-100 dark:bg-gray-800 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : isEditingConfig ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="optimizer">Optimizer Algorithm</Label>
                    <Select
                      value={editedConfig?.optimizer || ''}
                      onValueChange={(value) => handleConfigFieldChange('optimizer', value)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select optimizer" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="adam">Adam</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="alpha">Alpha Learning Rate</Label>
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
                  </div>
                  <div>
                    <Label htmlFor="gamma0">Gamma0 Initial Value</Label>
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
                    <Label htmlFor="end_meta">End Meta Column</Label>
                    <Input
                      id="end_meta"
                      type="text"
                      className="mt-1"
                      placeholder="e.g., participant"
                      value={editedConfig?.end_meta || ''}
                      onChange={(e) => handleConfigFieldChange('end_meta', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="start_dim">Start Dimension</Label>
                    <Input
                      id="start_dim"
                      type="text"
                      className="mt-1"
                      placeholder="e.g., f_0"
                      value={editedConfig?.start_dim || ''}
                      onChange={(e) => handleConfigFieldChange('start_dim', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="end_dim">End Dimension</Label>
                    <Input
                      id="end_dim"
                      type="text"
                      className="mt-1"
                      placeholder="e.g., f_1023"
                      value={editedConfig?.end_dim || ''}
                      onChange={(e) => handleConfigFieldChange('end_dim', e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                      Optimizer
                    </span>
                    <p className="font-semibold text-gray-900 dark:text-white capitalize">
                      {config?.optimizer}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                      Alpha
                    </span>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {config?.alpha}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                      Gamma0
                    </span>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {config?.gamma0}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                      End Meta
                    </span>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {config?.end_meta}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                      Start Dimension
                    </span>
                    <p className="font-semibold text-gray-900 dark:text-white font-mono">
                      {config?.start_dim}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                      End Dimension
                    </span>
                    <p className="font-semibold text-gray-900 dark:text-white font-mono">
                      {config?.end_dim}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Upload Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Baseline Upload */}
          <Card className={cn(
            'border transition-all duration-200',
            isBaselineStep 
              ? 'border-primary-500 shadow-lg' 
              : 'border-gray-200 dark:border-gray-700',
            isMonitoringStep || isCompleteStep ? 'opacity-60' : ''
          )}>
            <CardHeader className="border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold mr-3',
                  isBaselineStep || processingState.status === 'processing' || isMonitoringStep || isCompleteStep
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                )}>
                  1
                </div>
                <div>
                  <CardTitle className="text-lg">Baseline Data</CardTitle>
                  <CardDescription className="text-sm">
                    Upload CSV files for initial analysis
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <FileUpload
                onFilesChange={setBaselineFiles}
                onUpload={handleBaselineUpload}
                maxFiles={10}
                maxSize={100 * 1024 * 1024} // 100MB
                disabled={!isBaselineStep || isUploading}
                uploadText={isUploading ? 'Uploading...' : 'Upload Baseline Data'}
              />
              {processingState.fileUploadId && (
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-center text-sm text-blue-800 dark:text-blue-200">
                    <FileText className="h-4 w-4 mr-2" />
                    <span className="font-medium">Upload ID:</span>
                    <span className="ml-1 font-mono">{processingState.fileUploadId}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Monitoring Upload */}
          <Card className={cn(
            'border transition-all duration-200',
            isMonitoringStep 
              ? 'border-primary-500 shadow-lg' 
              : 'border-gray-200 dark:border-gray-700',
            !isMonitoringStep ? 'opacity-60' : ''
          )}>
            <CardHeader className="border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold mr-3',
                  isMonitoringStep || isCompleteStep
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                )}>
                  2
                </div>
                <div>
                  <CardTitle className="text-lg">Monitoring Data</CardTitle>
                  <CardDescription className="text-sm">
                    Upload data for anomaly detection
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {processingState.dinsightId && (
                <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center text-sm text-green-800 dark:text-green-200">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    <span className="font-medium">Dinsight ID:</span>
                    <span className="ml-1 font-mono">{processingState.dinsightId}</span>
                  </div>
                </div>
              )}
              <FileUpload
                onFilesChange={setMonitoringFiles}
                onUpload={handleMonitoringUpload}
                maxFiles={1}
                maxSize={100 * 1024 * 1024} // 100MB
                disabled={!isMonitoringStep || isUploading || !processingState.dinsightId}
                uploadText={isUploading ? 'Processing...' : 'Upload Monitoring Data'}
              />
              {!processingState.dinsightId && isMonitoringStep && (
                <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <div className="text-sm text-yellow-800 dark:text-yellow-200">
                    Waiting for baseline processing to complete...
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Completion Status */}
        {isCompleteStep && (
          <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10">
            <CardContent className="pt-8 pb-8">
              <div className="text-center">
                <div className="mx-auto mb-4 w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Analysis Complete!
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                  Both baseline and monitoring data have been successfully processed.
                  You can now view the analysis results.
                </p>
                <div className="flex justify-center gap-3">
                  <Button className="bg-primary-600 hover:bg-primary-700 text-white">
                    <PlayCircle className="w-4 h-4 mr-2" />
                    View Analysis
                  </Button>
                  <Button
                    onClick={resetWorkflow}
                    variant="outline"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    New Analysis
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        open={showRestoreDialog}
        onOpenChange={setShowRestoreDialog}
        title="Restore Default Configuration"
        description="Are you sure you want to restore the default configuration values? This will overwrite your current changes."
        confirmText="Restore Defaults"
        cancelText="Cancel"
        variant="default"
        onConfirm={confirmRestoreDefaults}
      />
    </div>
  );
}