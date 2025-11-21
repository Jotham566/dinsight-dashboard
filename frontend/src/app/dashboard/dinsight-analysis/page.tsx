'use client';

import { useState, useEffect, useMemo } from 'react';
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
  statusMessage?: string;
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
  const [monitoringBaselineId, setMonitoringBaselineId] = useState<string>('');
  const [baselineIdDirty, setBaselineIdDirty] = useState(false);

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

  // --- Standardized DInsight dataset discovery ---
  const {
    data: availableDinsightIds,
    isLoading: dinsightIdsLoading,
    refetch: refetchDinsightIds,
  } = useQuery<any[]>({
    queryKey: ['available-dinsight-ids'],
    refetchOnWindowFocus: true,
    refetchInterval: 30000,
    staleTime: 10000,
    queryFn: async (): Promise<any[]> => {
      const validDatasets: any[] = [];
      const seenDinsightIds = new Set<number>();
      let id = 1;
      let consecutiveFailures = 0;
      const maxConsecutiveFailures = 5;
      const maxId = 1000;
      while (consecutiveFailures < maxConsecutiveFailures && id <= maxId) {
        try {
          const response = await apiClient.get(`/dinsight/${id}`);
          const payload = response?.data?.data;
          const resolvedId =
            payload && typeof payload.dinsight_id === 'number' && payload.dinsight_id > 0
              ? payload.dinsight_id
              : id;
          if (
            response.data.success &&
            payload?.dinsight_x &&
            payload?.dinsight_y &&
            Array.isArray(payload.dinsight_x) &&
            Array.isArray(payload.dinsight_y) &&
            payload.dinsight_x.length > 0 &&
            payload.dinsight_y.length > 0
          ) {
            if (!seenDinsightIds.has(resolvedId)) {
              validDatasets.push({
                dinsight_id: resolvedId,
                name: `DInsight ID ${resolvedId}`,
                type: 'dinsight',
              });
              seenDinsightIds.add(resolvedId);
            }
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

  useEffect(() => {
    if (availableDinsightIds && availableDinsightIds.length > 0 && !processingState.dinsightId) {
      const latestDataset = availableDinsightIds.reduce((latest, current) =>
        current.dinsight_id > latest.dinsight_id ? current : latest
      );
      setProcessingState((prev: ProcessingState) => ({
        ...prev,
        dinsightId: latestDataset.dinsight_id,
      }));
    }
  }, [availableDinsightIds, processingState.dinsightId]);

  useEffect(() => {
    if (!processingState.dinsightId) {
      return;
    }

    if (!baselineIdDirty) {
      const targetId = String(processingState.dinsightId);
      if (monitoringBaselineId !== targetId) {
        setMonitoringBaselineId(targetId);
      }
    }
  }, [processingState.dinsightId, baselineIdDirty, monitoringBaselineId]);

  const resolvedBaselineId = useMemo(() => {
    const trimmed = monitoringBaselineId.trim();
    if (trimmed !== '') {
      const parsed = Number(trimmed);
      if (!Number.isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }
    return processingState.dinsightId ?? null;
  }, [monitoringBaselineId, processingState.dinsightId]);

  // Polling effect to check processing status
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    let pollAttempts = 0;
    const maxPollAttempts = 600; // Maximum 30 minutes of polling (3s * 600 = 1800s)

    if (processingState.status === 'processing' && processingState.fileUploadId) {
      // Poll every 3 seconds to check if processing is complete
      intervalId = setInterval(async () => {
        pollAttempts++;

        try {
          // Check the status endpoint for progress updates
          const statusResponse = await apiClient.get(`/analyze/${processingState.fileUploadId}/status`);
          
          if (!statusResponse.data || statusResponse.data.code !== 200) {
            throw new Error('Status check failed');
          }

          const fileUpload = statusResponse.data.data;
          const serverStatus = fileUpload.status;
          const serverProgress = fileUpload.progress || 0;
          const serverMessage = fileUpload.status_message || 'Processing...';

          // Update state with server progress
          setProcessingState((prev) => ({
            ...prev,
            progress: serverProgress,
            statusMessage: serverMessage,
          }));

          // Handle different statuses
          if (serverStatus === 'failed') {
            const errorMsg = fileUpload.error_message || 'Processing failed on server';
            console.error('Processing failed:', errorMsg);
            setProcessingState((prev) => ({
              ...prev,
              status: 'error',
              errorMessage: errorMsg,
            }));

            setProcessingDialogType('error');
            setShowProcessingDialog(true);
            clearInterval(intervalId);
            return;
          }

          if (serverStatus === 'completed') {
            console.log('Processing completed! Server status: completed, progress:', serverProgress);

            // For monitoring step, we're done
            if (processingState.step === 'monitoring') {
              setProcessingState((prev) => ({
                ...prev,
                status: 'completed',
                step: 'complete',
                progress: 100,
                statusMessage: 'Monitoring data processed successfully!',
              }));

              setMonitoringBaselineId(String(processingState.dinsightId));
              setBaselineIdDirty(false);

              // Show completion dialog
              setProcessingDialogType('completed');
              setProcessingDialogStage('complete');
              setShowProcessingDialog(true);
              setMonitoringFiles([]);

              clearInterval(intervalId);
              return;
            }

            // For baseline step, verify dinsight data is ready
            if (processingState.step === 'baseline') {
              try {
                const dinsightResponse = await apiClient.get(`/dinsight/${processingState.fileUploadId}`);
                if (dinsightResponse.data.success && dinsightResponse.data.data) {
                  const dinsightData = dinsightResponse.data.data;

                  // Verify coordinates are available
                  const hasValidCoordinates =
                    dinsightData.dinsight_x &&
                    dinsightData.dinsight_y &&
                    Array.isArray(dinsightData.dinsight_x) &&
                    Array.isArray(dinsightData.dinsight_y) &&
                    dinsightData.dinsight_x.length > 0 &&
                    dinsightData.dinsight_y.length > 0;

                  if (hasValidCoordinates) {
                    const actualDinsightId = dinsightData.dinsight_id;

                    setProcessingState((prev) => ({
                      ...prev,
                      status: 'completed',
                      dinsightId: actualDinsightId,
                      step: 'monitoring',
                      progress: 100,
                      statusMessage: 'Baseline processing complete!',
                    }));

                    setBaselineIdDirty(false);

                    // Show baseline completion dialog
                    setProcessingDialogType('completed');
                    setProcessingDialogStage('baseline');
                    setShowProcessingDialog(true);

                    clearInterval(intervalId);
                    return;
                  } else {
                    // Status says completed but coordinates not ready - keep polling
                    console.log('Status completed but coordinates not ready yet, continuing to poll...');
                  }
                }
              } catch (dinsightError) {
                console.warn('Error checking dinsight data:', dinsightError);
                // Continue polling
              }
            }
          }

          // Check for timeout
          if (pollAttempts >= maxPollAttempts) {
            console.error('Processing timeout - maximum polling attempts reached');
            setProcessingState((prev) => ({
              ...prev,
              status: 'error',
              errorMessage: 'Processing timeout. The operation is taking longer than expected.',
            }));

            setProcessingDialogType('error');
            setShowProcessingDialog(true);
            clearInterval(intervalId);
          }
        } catch (error: any) {
          console.error('Error checking status:', error);

          // If it's not a 404, it might be a real error
          if (error.response?.status !== 404) {
            // Check for timeout
            if (pollAttempts >= maxPollAttempts) {
              setProcessingState((prev) => ({
                ...prev,
                status: 'error',
                errorMessage: 'Unable to check processing status. Please try again.',
              }));

              setProcessingDialogType('error');
              setShowProcessingDialog(true);
              clearInterval(intervalId);
            }
          }
          // For 404, just continue polling (data not ready yet)
        }
      }, 3000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [processingState.status, processingState.fileUploadId, processingState.step, processingState.dinsightId]);

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

      // Upload to /analyze endpoint with infinite timeout; progress updates if available
      const response = await apiClient.post('/analyze', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 0,
        onUploadProgress: (event) => {
          if (event.total) {
            const percent = Math.round((event.loaded * 100) / event.total);
            setProcessingState((prev) => ({ ...prev, progress: percent }));
          }
        },
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
    const baselineId = resolvedBaselineId;

    if (!baselineId) {
      setProcessingState((prev) => ({
        ...prev,
        status: 'error',
        errorMessage:
          'No baseline DInsight ID available. Enter the baseline ID or upload baseline data first.',
      }));
      setProcessingDialogType('error');
      setShowProcessingDialog(true);
      return;
    }

    // Double-check that baseline processing is actually complete before allowing monitoring upload
    try {
      const baselineCheck = await apiClient.get(`/dinsight/${baselineId}`);
      if (!baselineCheck.data.success || !baselineCheck.data.data) {
        setProcessingState((prev) => ({
          ...prev,
          status: 'error',
          errorMessage: `Baseline data not found for DInsight ID ${baselineId}.`,
        }));
        setProcessingDialogType('error');
        setShowProcessingDialog(true);
        return;
      }

      const dinsightData = baselineCheck.data.data;
      const hasValidCoordinates =
        dinsightData.dinsight_x &&
        dinsightData.dinsight_y &&
        Array.isArray(dinsightData.dinsight_x) &&
        Array.isArray(dinsightData.dinsight_y) &&
        dinsightData.dinsight_x.length > 0 &&
        dinsightData.dinsight_y.length > 0;

      if (!hasValidCoordinates) {
        setProcessingState((prev) => ({
          ...prev,
          status: 'error',
          errorMessage:
            'Baseline data is still processing. Please wait for baseline processing to complete before uploading monitoring data.',
        }));
        setProcessingDialogType('error');
        setShowProcessingDialog(true);
        return;
      }
    } catch (error) {
      console.error('Error checking baseline readiness:', error);
      setProcessingState((prev) => ({
        ...prev,
        status: 'error',
        errorMessage:
          'Unable to verify baseline data. Please ensure the baseline ID is correct and processing is complete.',
      }));
      setProcessingDialogType('error');
      setShowProcessingDialog(true);
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

      // Upload to /monitor/:dinsight_id endpoint with infinite timeout; progress updates if available
      const response = await apiClient.post(`/monitor/${baselineId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 0,
        onUploadProgress: (event) => {
          if (event.total) {
            const percent = Math.round((event.loaded * 100) / event.total);
            setProcessingState((prev) => ({ ...prev, progress: percent }));
          }
        },
      });

      console.log('Monitoring upload successful:', response.data);

      // For async processing, we get an ID and need to poll
      const fileUploadId = response.data.data.id;

      setProcessingState((prev) => ({
        ...prev,
        status: 'processing',
        fileUploadId,
        step: 'monitoring',
        progress: 0,
      }));

      // Switch to processing dialog
      setProcessingDialogType('processing');
      setProcessingDialogStage('monitoring');
      
      // We don't clear files yet, wait for completion
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
    setMonitoringBaselineId('');
    setBaselineIdDirty(false);
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

  const switchToMonitoringStep = () => {
    setBaselineIdDirty(false);
    setProcessingState((prev) => ({
      ...prev,
      step: 'monitoring',
      status: 'idle',
      errorMessage: undefined,
    }));
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
        return 'Analyzing data and generating dinsight coordinates. This process involves complex calculations and may take several minutes to complete.';
      case 'completed':
        if (processingDialogStage === 'complete') {
          return 'Your analysis workflow is complete! You can now visualize results or run anomaly detection.';
        }
        return processingDialogStage === 'baseline'
          ? 'Your baseline data has been fully processed and coordinate generation is complete. You can now safely upload monitoring data.'
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
                onClick={switchToMonitoringStep}
                disabled={isMonitoringStep}
                className="glass-card hover:shadow-lg transition-all duration-200 disabled:opacity-50"
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                Upload Monitoring Only
              </Button>
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
                    maxSize={2.5 * 1024 * 1024 * 1024} // 2.5GB
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
                  {processingState.dinsightId && (
                    <div className="mt-4 flex flex-col sm:flex-row gap-2">
                      <Button
                        asChild
                        variant="outline"
                        className="glass-card hover:shadow-lg justify-center"
                      >
                        <a href={`/dashboard/analysis?baselineId=${processingState.dinsightId}`}>
                          <Activity className="w-4 h-4 mr-2" />
                          Visualize Baseline
                        </a>
                      </Button>
                      <Button
                        variant="outline"
                        onClick={switchToMonitoringStep}
                        className="glass-card hover:shadow-lg justify-center"
                      >
                        <ArrowRight className="w-4 h-4 mr-2" />
                        Upload Monitoring Data
                      </Button>
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
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="monitoring-baseline-id" className="text-sm font-medium">
                        Baseline DInsight ID
                      </Label>
                      <Input
                        id="monitoring-baseline-id"
                        value={monitoringBaselineId}
                        onChange={(event) => {
                          setBaselineIdDirty(true);
                          setMonitoringBaselineId(event.target.value.replace(/[^0-9]/g, ''));
                        }}
                        placeholder="Enter baseline DInsight ID"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        className="mt-2"
                      />
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">
                        Provide the DInsight ID for the baseline dataset you want to monitor. Leave
                        this field blank to use the most recent baseline processed in this session.
                      </p>
                    </div>

                    {resolvedBaselineId ? (
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                        <div className="flex items-center text-sm text-emerald-800 dark:text-emerald-200">
                          <CheckCircle className="h-4 w-4 mr-2" />
                          <span className="font-medium">Using DInsight ID:</span>
                          <span className="ml-1 font-mono">{resolvedBaselineId}</span>
                        </div>
                      </div>
                    ) : (
                      isMonitoringStep && (
                        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                          <div className="text-sm text-yellow-800 dark:text-yellow-200">
                            Enter a valid baseline DInsight ID or upload baseline data first.
                          </div>
                        </div>
                      )
                    )}

                    <FileUpload
                      onFilesChange={setMonitoringFiles}
                      onUpload={handleMonitoringUpload}
                      maxFiles={1}
                      maxSize={2.5 * 1024 * 1024 * 1024} // 2.5GB
                      disabled={!isMonitoringStep || isUploading || !resolvedBaselineId}
                      uploadText={isUploading ? 'Processing...' : 'Upload Monitoring Data'}
                    />
                  </div>
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
        errorMessage={processingState.errorMessage}
        statusMessage={processingState.statusMessage}
        onClose={handleDialogClose}
        onRetry={handleRetryUpload}
        progress={processingState.progress}
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
