'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Settings,
  Upload,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Save,
  X,
  PlayCircle,
  FileText,
  Activity,
  Plus,
  ArrowRight,
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
  const [, setBaselineFiles] = useState<UploadedFile[]>([]);
  const [, setMonitoringFiles] = useState<UploadedFile[]>([]);
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


  const isBaselineStep = processingState.step === 'baseline';
  const isMonitoringStep = processingState.step === 'monitoring';
  const isCompleteStep = processingState.step === 'complete';
  const isUploading = processingState.status === 'uploading';
  const isProcessing = processingState.status === 'processing';

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header - Consistent with dashboard */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Run DInsight Analysis
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Configure settings and upload data for anomaly detection
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={resetWorkflow}
            className="rounded-lg"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <Button 
            className="rounded-lg"
            onClick={() => setIsEditingConfig(true)}
            disabled={isEditingConfig}
          >
            <Settings className="w-4 h-4 mr-2" />
            Configure
          </Button>
        </div>
      </div>

      {/* Workflow Status - Clean card design */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className={cn(
          isBaselineStep || processingState.status === 'processing' || isMonitoringStep || isCompleteStep
            ? 'ring-2 ring-blue-500'
            : ''
        )}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Step 1: Baseline</CardTitle>
            <Upload className={cn(
              "h-4 w-4",
              isBaselineStep || processingState.status === 'processing' || isMonitoringStep || isCompleteStep
                ? 'text-blue-500'
                : 'text-gray-400'
            )} />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {isBaselineStep ? 'In Progress' : 
               processingState.status === 'processing' ? 'Processing...' :
               (isMonitoringStep || isCompleteStep) ? 'Completed' : 'Pending'}
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          isMonitoringStep ? 'ring-2 ring-blue-500' : '',
          isCompleteStep ? 'ring-2 ring-emerald-500' : ''
        )}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Step 2: Monitoring</CardTitle>
            <Activity className={cn(
              "h-4 w-4",
              isMonitoringStep || isCompleteStep ? 'text-blue-500' : 'text-gray-400'
            )} />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {isMonitoringStep ? 'In Progress' : 
               isCompleteStep ? 'Completed' : 'Pending'}
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          isCompleteStep ? 'ring-2 ring-emerald-500' : ''
        )}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Step 3: Complete</CardTitle>
            <CheckCircle className={cn(
              "h-4 w-4",
              isCompleteStep ? 'text-emerald-500' : 'text-gray-400'
            )} />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {isCompleteStep ? (
                <>
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    Analysis Ready
                  </span>
                </>
              ) : (
                <span className="text-sm font-medium text-gray-500">Pending</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Messages */}
      {processingState.errorMessage && (
        <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
          <CardContent className="pt-6">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 mr-3 flex-shrink-0" />
              <div className="text-sm text-red-800 dark:text-red-200">
                <strong>Error:</strong> {processingState.errorMessage}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isProcessing && (
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
          <CardContent className="pt-6">
            <div className="flex items-start">
              <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0 animate-pulse" />
              <div className="flex-1">
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
                <Progress value={undefined} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Configuration Section - Show when editing */}
      {isEditingConfig && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Processing Configuration</CardTitle>
              <CardDescription>
                Configure analysis parameters for optimal performance
              </CardDescription>
            </div>
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
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      )}

      {/* Current Configuration Display */}
      {!isEditingConfig && config && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Current Configuration</CardTitle>
            <CardDescription>
              These settings will be applied to your analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                  Optimizer
                </span>
                <p className="font-medium capitalize">{config?.optimizer}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                  Alpha
                </span>
                <p className="font-medium">{config?.alpha}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                  Gamma0
                </span>
                <p className="font-medium">{config?.gamma0}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                  End Meta
                </span>
                <p className="font-medium">{config?.end_meta}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                  Start Dim
                </span>
                <p className="font-medium font-mono">{config?.start_dim}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                  End Dim
                </span>
                <p className="font-medium font-mono">{config?.end_dim}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Baseline Upload */}
        <Card className={cn(
          isBaselineStep ? 'ring-2 ring-blue-500' : '',
          isMonitoringStep || isCompleteStep ? 'opacity-60' : ''
        )}>
          <CardHeader>
            <CardTitle className="flex items-center">
              <div className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center mr-3',
                isBaselineStep || processingState.status === 'processing' || isMonitoringStep || isCompleteStep
                  ? 'bg-blue-500'
                  : 'bg-gray-300 dark:bg-gray-700'
              )}>
                <span className="text-sm font-semibold text-white">1</span>
              </div>
              Baseline Data
            </CardTitle>
            <CardDescription>
              Upload CSV files for initial analysis
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
          isMonitoringStep ? 'ring-2 ring-blue-500' : '',
          !isMonitoringStep ? 'opacity-60' : ''
        )}>
          <CardHeader>
            <CardTitle className="flex items-center">
              <div className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center mr-3',
                isMonitoringStep || isCompleteStep
                  ? 'bg-blue-500'
                  : 'bg-gray-300 dark:bg-gray-700'
              )}>
                <span className="text-sm font-semibold text-white">2</span>
              </div>
              Monitoring Data
            </CardTitle>
            <CardDescription>
              Upload data for anomaly detection
            </CardDescription>
          </CardHeader>
          <CardContent>
            {processingState.dinsightId && (
              <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                <div className="flex items-center text-sm text-emerald-800 dark:text-emerald-200">
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
        <Card>
          <CardHeader>
            <CardTitle>Analysis Complete!</CardTitle>
            <CardDescription>
              Your data has been successfully processed and is ready for analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild>
                <a href="/dashboard/visualization">
                  <ArrowRight className="w-4 h-4 mr-2" />
                  View Visualization
                </a>
              </Button>
              <Button asChild variant="outline">
                <a href="/dashboard/analysis">
                  <PlayCircle className="w-4 h-4 mr-2" />
                  Run Anomaly Detection
                </a>
              </Button>
              <Button onClick={resetWorkflow} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                New Analysis
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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