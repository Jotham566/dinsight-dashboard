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
  Settings2,
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
import { ConfigDialog } from '@/components/ui/config-dialog';
import { ProcessingDialog } from '@/components/ui/processing-dialog';
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

  // Processing dialog state
  const [showProcessingDialog, setShowProcessingDialog] = useState(false);
  const [processingDialogType, setProcessingDialogType] = useState<
    'uploading' | 'processing' | 'completed' | 'error'
  >('uploading');
  const [processingDialogStage, setProcessingDialogStage] = useState<
    'baseline' | 'monitoring' | 'complete'
  >('baseline');

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
  const { data: config, refetch: refetchConfig } = useQuery({
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

            // Show baseline completion dialog
            setProcessingDialogType('completed');
            setProcessingDialogStage('baseline');
            setShowProcessingDialog(true);

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

              // Show timeout error dialog
              setProcessingDialogType('error');
              setShowProcessingDialog(true);

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

            // Show processing error dialog
            setProcessingDialogType('error');
            setShowProcessingDialog(true);

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

    // Show uploading dialog
    setProcessingDialogType('uploading');
    setProcessingDialogStage('baseline');
    setShowProcessingDialog(true);

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

      // Switch to processing dialog
      setProcessingDialogType('processing');

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

      // Show error dialog
      setProcessingDialogType('error');
      setShowProcessingDialog(true);
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

    // Show uploading dialog for monitoring
    setProcessingDialogType('uploading');
    setProcessingDialogStage('monitoring');
    setShowProcessingDialog(true);

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

      // Show completion dialog
      setProcessingDialogType('completed');
      setProcessingDialogStage('complete');
      setShowProcessingDialog(true);

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

      // Show error dialog
      setProcessingDialogType('error');
      setShowProcessingDialog(true);
    }
  };

  const resetWorkflow = () => {
    setProcessingState({
      step: 'baseline',
      status: 'idle',
    });
    setBaselineFiles([]);
    setMonitoringFiles([]);
    setShowProcessingDialog(false);
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

  // Helper functions for dialog content
  const getDialogTitle = () => {
    switch (processingDialogType) {
      case 'uploading':
        return processingDialogStage === 'baseline'
          ? 'Uploading Baseline Data'
          : 'Uploading Monitoring Data';
      case 'processing':
        return 'Processing Baseline Data';
      case 'completed':
        if (processingDialogStage === 'complete') return 'Analysis Complete!';
        return processingDialogStage === 'baseline'
          ? 'Baseline Processing Complete'
          : 'Monitoring Upload Complete';
      case 'error':
        return 'Upload Error';
      default:
        return 'Processing';
    }
  };

  const getDialogDescription = () => {
    switch (processingDialogType) {
      case 'uploading':
        return processingDialogStage === 'baseline'
          ? 'Uploading your baseline dataset files to the server...'
          : 'Uploading your monitoring data for anomaly detection...';
      case 'processing':
        return 'Analyzing data and generating dinsight coordinates. This may take a few minutes.';
      case 'completed':
        if (processingDialogStage === 'complete') {
          return 'Your analysis workflow is complete! You can now visualize results or run anomaly detection.';
        }
        return processingDialogStage === 'baseline'
          ? 'Your baseline data has been processed successfully. You can now upload monitoring data.'
          : 'Your monitoring data has been uploaded successfully.';
      case 'error':
        return 'An error occurred during the process. Please review the details below.';
      default:
        return '';
    }
  };

  const handleDialogClose = () => {
    setShowProcessingDialog(false);
    // Reset workflow if there was an error
    if (processingDialogType === 'error') {
      resetWorkflow();
    }
  };

  const handleRetryUpload = () => {
    setShowProcessingDialog(false);
    resetWorkflow();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Modern Header with Enhanced Gradient */}
      <div className="sticky top-0 z-10 glass-card backdrop-blur-xl bg-white/80 dark:bg-gray-950/80 border-b border-gray-200/50 dark:border-gray-700/50 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/25">
                <Upload className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold gradient-text">Run DInsight Analysis</h1>
                <p className="text-gray-600 dark:text-gray-300 mt-1">
                  Configure settings and upload data for anomaly detection
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={resetWorkflow}
                className="glass-card hover:shadow-lg transition-all duration-200"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reset Workflow
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
            {/* Workflow Status Card */}
            <Card className="glass-card shadow-xl border-gray-200/50 dark:border-gray-700/50 card-hover">
              <CardHeader className="pb-4 bg-gradient-to-r from-primary-50/30 to-accent-teal-50/20 dark:from-primary-950/30 dark:to-accent-teal-950/20 rounded-t-xl">
                <CardTitle className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/25">
                    <Activity className="w-5 h-5 text-white" />
                  </div>
                  <span className="gradient-text">Workflow</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Step 1: Baseline */}
                <div
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border transition-all duration-200',
                    isBaselineStep ||
                      processingState.status === 'processing' ||
                      isMonitoringStep ||
                      isCompleteStep
                      ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20'
                      : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/20'
                  )}
                >
                  <div
                    className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold',
                      isBaselineStep ||
                        processingState.status === 'processing' ||
                        isMonitoringStep ||
                        isCompleteStep
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-300 dark:bg-gray-700 text-gray-500'
                    )}
                  >
                    1
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">Baseline Upload</div>
                    <div className="text-xs text-gray-500">
                      {isBaselineStep
                        ? 'In Progress'
                        : processingState.status === 'processing'
                          ? 'Processing...'
                          : isMonitoringStep || isCompleteStep
                            ? 'Completed'
                            : 'Pending'}
                    </div>
                  </div>
                </div>

                {/* Step 2: Monitoring */}
                <div
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border transition-all duration-200',
                    isMonitoringStep || isCompleteStep
                      ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20'
                      : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/20'
                  )}
                >
                  <div
                    className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold',
                      isMonitoringStep || isCompleteStep
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-300 dark:bg-gray-700 text-gray-500'
                    )}
                  >
                    2
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">Monitoring Upload</div>
                    <div className="text-xs text-gray-500">
                      {isMonitoringStep ? 'In Progress' : isCompleteStep ? 'Completed' : 'Pending'}
                    </div>
                  </div>
                </div>

                {/* Step 3: Complete */}
                <div
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border transition-all duration-200',
                    isCompleteStep
                      ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20'
                      : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/20'
                  )}
                >
                  <div
                    className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold',
                      isCompleteStep
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-300 dark:bg-gray-700 text-gray-500'
                    )}
                  >
                    ✓
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">Analysis Ready</div>
                    <div className="text-xs text-gray-500">
                      {isCompleteStep ? 'Analysis Complete' : 'Pending'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Configuration Card */}
            <Card className="glass-card shadow-xl border-gray-200/50 dark:border-gray-700/50 card-hover">
              <CardHeader className="pb-4 bg-gradient-to-r from-accent-purple-50/30 to-accent-pink-50/20 dark:from-accent-purple-950/30 dark:to-accent-pink-950/20 rounded-t-xl">
                <CardTitle className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-accent-purple-500 to-accent-pink-600 rounded-xl flex items-center justify-center shadow-lg shadow-accent-purple-500/25">
                    <Settings2 className="w-5 h-5 text-white" />
                  </div>
                  <span className="gradient-text">Configuration</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!isEditingConfig && config && (
                  <>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-gray-500 block">Optimizer</span>
                        <span className="font-medium capitalize">{config?.optimizer}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Alpha</span>
                        <span className="font-medium">{config?.alpha}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Gamma0</span>
                        <span className="font-medium">{config?.gamma0}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block">End Meta</span>
                        <span className="font-medium">{config?.end_meta}</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setIsEditingConfig(true);
                        setEditedConfig({ ...config });
                      }}
                      className="w-full"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Edit Configuration
                    </Button>
                  </>
                )}

                {isEditingConfig && (
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleSaveConfig}
                        disabled={isSavingConfig}
                        className="flex-1"
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
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="xl:col-span-3 space-y-8">
            {/* Upload Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Baseline Upload */}
              <Card
                className={cn(
                  'glass-card shadow-xl border-gray-200/50 dark:border-gray-700/50 card-hover',
                  isBaselineStep && 'ring-2 ring-blue-500',
                  isMonitoringStep || (isCompleteStep && 'opacity-60')
                )}
              >
                <CardHeader className="border-b border-gray-100/50 dark:border-gray-700/50 bg-gradient-to-r from-primary-50/30 via-white/50 to-accent-purple-50/30 dark:from-gray-900/50 dark:via-gray-950/50 dark:to-gray-900/50 backdrop-blur-sm rounded-t-xl">
                  <CardTitle className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center shadow-lg',
                        isBaselineStep ||
                          processingState.status === 'processing' ||
                          isMonitoringStep ||
                          isCompleteStep
                          ? 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-blue-500/25'
                          : 'bg-gray-300 dark:bg-gray-700'
                      )}
                    >
                      <span className="text-sm font-semibold text-white">1</span>
                    </div>
                    <span className="gradient-text">Baseline Data</span>
                  </CardTitle>
                  <CardDescription className="text-gray-600 dark:text-gray-400">
                    Upload CSV files for initial analysis
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
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
              <Card
                className={cn(
                  'glass-card shadow-xl border-gray-200/50 dark:border-gray-700/50 card-hover',
                  isMonitoringStep && 'ring-2 ring-blue-500',
                  !isMonitoringStep && 'opacity-60'
                )}
              >
                <CardHeader className="border-b border-gray-100/50 dark:border-gray-700/50 bg-gradient-to-r from-primary-50/30 via-white/50 to-accent-purple-50/30 dark:from-gray-900/50 dark:via-gray-950/50 dark:to-gray-900/50 backdrop-blur-sm rounded-t-xl">
                  <CardTitle className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center shadow-lg',
                        isMonitoringStep || isCompleteStep
                          ? 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-blue-500/25'
                          : 'bg-gray-300 dark:bg-gray-700'
                      )}
                    >
                      <span className="text-sm font-semibold text-white">2</span>
                    </div>
                    <span className="gradient-text">Monitoring Data</span>
                  </CardTitle>
                  <CardDescription className="text-gray-600 dark:text-gray-400">
                    Upload data for anomaly detection
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
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
              <Card className="glass-card shadow-2xl border-gray-200/50 dark:border-gray-700/50 card-hover">
                <CardHeader className="border-b border-gray-100/50 dark:border-gray-700/50 bg-gradient-to-r from-emerald-50/30 via-white/50 to-accent-teal-50/30 dark:from-emerald-900/50 dark:via-gray-950/50 dark:to-accent-teal-900/50 backdrop-blur-sm rounded-t-xl">
                  <CardTitle className="text-2xl font-bold gradient-text flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                    Analysis Complete!
                  </CardTitle>
                  <CardDescription className="text-gray-600 dark:text-gray-400 mt-1">
                    Your data has been successfully processed and is ready for analysis
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button asChild className="glass-card hover:shadow-lg">
                      <a href="/dashboard/visualization">
                        <ArrowRight className="w-4 h-4 mr-2" />
                        View Visualization
                      </a>
                    </Button>
                    <Button asChild variant="outline" className="glass-card hover:shadow-lg">
                      <a href="/dashboard/analysis">
                        <PlayCircle className="w-4 h-4 mr-2" />
                        Run Anomaly Detection
                      </a>
                    </Button>
                    <Button
                      onClick={resetWorkflow}
                      variant="outline"
                      className="glass-card hover:shadow-lg"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      New Analysis
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Configuration Modal */}
      <ConfigDialog
        open={isEditingConfig}
        onOpenChange={(open) => {
          if (!open) handleCancelEdit();
        }}
        title="Processing Configuration"
        description="Configure analysis parameters for optimal performance"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                onChange={(e) => handleConfigFieldChange('alpha', parseFloat(e.target.value))}
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
                onChange={(e) => handleConfigFieldChange('gamma0', parseFloat(e.target.value))}
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
          <div className="flex gap-3 pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
            <Button
              onClick={handleSaveConfig}
              disabled={isSavingConfig}
              className="glass-card hover:shadow-lg"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSavingConfig ? 'Saving...' : 'Save Configuration'}
            </Button>
            <Button
              variant="outline"
              onClick={handleRestoreDefaults}
              disabled={isSavingConfig}
              className="glass-card hover:shadow-lg"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Restore Defaults
            </Button>
            <Button
              variant="outline"
              onClick={handleCancelEdit}
              disabled={isSavingConfig}
              className="glass-card hover:shadow-lg"
            >
              Cancel
            </Button>
          </div>
        </div>
      </ConfigDialog>

      {/* Processing Dialog */}
      <ProcessingDialog
        open={showProcessingDialog}
        onOpenChange={setShowProcessingDialog}
        type={processingDialogType}
        stage={processingDialogStage}
        title={getDialogTitle()}
        description={getDialogDescription()}
        pollCount={processingState.pollCount}
        maxPolls={100}
        errorMessage={processingState.errorMessage}
        onClose={handleDialogClose}
        onRetry={handleRetryUpload}
        showActions={processingDialogType === 'completed' && processingDialogStage === 'complete'}
      />

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
