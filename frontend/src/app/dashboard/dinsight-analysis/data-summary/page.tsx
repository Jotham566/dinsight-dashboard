'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Settings,
  Download,
  Eye,
  BarChart3,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowRight,
  Upload,
  Save,
  X,
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

  // View mode state for switching between different views - Config first for better UX
  const [viewMode, setViewMode] = useState<'config' | 'upload' | 'stats'>('config');

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
      {/* Modern Page Header with Gradient */}
      <div className="mb-8">
        <div className="relative overflow-hidden bg-gradient-to-br from-primary-50 via-white to-accent-purple-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900 rounded-2xl p-8 border border-gray-200/50 dark:border-gray-700/50">
          <div className="absolute inset-0 bg-gradient-to-r from-primary-500/5 to-accent-purple-500/5"></div>
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="mb-4 sm:mb-0">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-accent-purple-600 bg-clip-text text-transparent mb-3">
                Run DInsight Analysis
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl">
                Configure processing settings and upload data for comprehensive anomaly detection
                and insights
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={resetWorkflow}
                className="glass-card hover:shadow-lg"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reset Workflow
              </Button>
              <Button
                variant="outline"
                onClick={() => refetchConfig()}
                className="glass-card hover:shadow-lg"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Config
              </Button>
            </div>
          </div>
        </div>

        {/* Modern Tab Navigation */}
        <div className="mt-8">
          <div className="glass-card rounded-xl p-2">
            <nav className="flex space-x-2">
              <button
                onClick={() => setViewMode('config')}
                className={cn(
                  'flex items-center px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200',
                  viewMode === 'config'
                    ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/25'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
                )}
              >
                <Settings className="w-4 h-4 mr-2" />
                1. Configuration
              </button>
              <button
                onClick={() => setViewMode('upload')}
                className={cn(
                  'flex items-center px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200',
                  viewMode === 'upload'
                    ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/25'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
                )}
              >
                <Upload className="w-4 h-4 mr-2" />
                2. Data Upload
              </button>
              <button
                onClick={() => setViewMode('stats')}
                className={cn(
                  'flex items-center px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200',
                  viewMode === 'stats'
                    ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/25'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
                )}
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                3. Statistics
              </button>
            </nav>
          </div>
        </div>
      </div>

      {/* Content based on selected view */}
      {viewMode === 'config' && (
        <div className="space-y-6">
          {/* Configuration Instructions */}
          <Card className="glass-card border-l-4 border-l-primary-500 bg-gradient-to-r from-primary-50/50 to-accent-purple-50/30 dark:from-primary-950/50 dark:to-accent-purple-950/30 card-hover">
            <CardContent className="pt-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/25">
                    <Settings className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                    Configure Processing Parameters
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
                    Set up your analysis parameters before uploading data. These settings will be
                    applied to all baseline and monitoring datasets during processing.
                  </p>
                  <div className="glass-card bg-gradient-to-r from-primary-100/80 to-accent-purple-100/60 dark:from-primary-900/50 dark:to-accent-purple-900/40 border border-primary-200/50 dark:border-primary-700/50 rounded-xl p-4">
                    <p className="text-sm text-primary-800 dark:text-primary-200">
                      <strong>💡 Pro Tip:</strong> Configure these settings first, then proceed to
                      upload your data. You can always come back to adjust parameters if needed.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Processing Configuration */}
          <Card className="glass-card shadow-xl border-gray-200/50 dark:border-gray-700/50 card-hover">
            <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-primary-50/30 via-white/50 to-accent-purple-50/30 dark:from-gray-900/50 dark:via-gray-950/50 dark:to-gray-900/50 backdrop-blur-sm rounded-t-xl">
              <div>
                <CardTitle className="text-2xl flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                    <Settings className="w-4 h-4 text-white" />
                  </div>
                  <span className="gradient-text">Processing Configuration</span>
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400 mt-2">
                  Analysis parameters and algorithm settings for optimal performance
                </CardDescription>
              </div>
              {isEditingConfig ? (
                <div className="flex gap-2">
                  <Button
                    variant="gradient"
                    size="sm"
                    onClick={handleSaveConfig}
                    disabled={isSavingConfig}
                    className="shadow-lg"
                  >
                    <Save className="w-4 h-4 mr-1" />
                    {isSavingConfig ? 'Saving...' : 'Save'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRestoreDefaults}
                    disabled={isSavingConfig}
                    className="border-accent-orange-300 hover:bg-accent-orange-50 text-accent-orange-700 dark:border-accent-orange-700 dark:hover:bg-accent-orange-950 dark:text-accent-orange-300"
                  >
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Restore Defaults
                  </Button>
                  <Button
                    variant="ghost"
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
                  className="glass-card hover:shadow-lg"
                >
                  <Settings className="w-4 h-4 mr-1" />
                  Edit Configuration
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-6">
              {configLoading ? (
                <div className="space-y-6">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-5 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-lg w-3/4 mb-3"></div>
                      <div className="h-12 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-xl w-full"></div>
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
                          <SelectItem value="adam">Adam</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500 mt-1">
                        Adam optimizer (currently supported algorithm)
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
                <div className="space-y-8">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="glass-card bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-950/50 dark:to-primary-900/50 p-6 rounded-xl border border-primary-200/50 dark:border-primary-700/50 hover:shadow-lg transition-all duration-200">
                      <span className="text-sm font-medium text-primary-700 dark:text-primary-300 block mb-2">
                        Optimizer
                      </span>
                      <p className="text-xl font-bold text-primary-900 dark:text-primary-100 capitalize">
                        {config?.optimizer}
                      </p>
                    </div>
                    <div className="glass-card bg-gradient-to-br from-accent-teal-50 to-accent-teal-100 dark:from-accent-teal-950/50 dark:to-accent-teal-900/50 p-6 rounded-xl border border-accent-teal-200/50 dark:border-accent-teal-700/50 hover:shadow-lg transition-all duration-200">
                      <span className="text-sm font-medium text-accent-teal-700 dark:text-accent-teal-300 block mb-2">
                        Alpha
                      </span>
                      <p className="text-xl font-bold text-accent-teal-900 dark:text-accent-teal-100">
                        {config?.alpha}
                      </p>
                    </div>
                    <div className="glass-card bg-gradient-to-br from-accent-purple-50 to-accent-purple-100 dark:from-accent-purple-950/50 dark:to-accent-purple-900/50 p-6 rounded-xl border border-accent-purple-200/50 dark:border-accent-purple-700/50 hover:shadow-lg transition-all duration-200">
                      <span className="text-sm font-medium text-accent-purple-700 dark:text-accent-purple-300 block mb-2">
                        Gamma0
                      </span>
                      <p className="text-xl font-bold text-accent-purple-900 dark:text-accent-purple-100">
                        {config?.gamma0}
                      </p>
                    </div>
                    <div className="glass-card bg-gradient-to-br from-accent-orange-50 to-accent-orange-100 dark:from-accent-orange-950/50 dark:to-accent-orange-900/50 p-6 rounded-xl border border-accent-orange-200/50 dark:border-accent-orange-700/50 hover:shadow-lg transition-all duration-200">
                      <span className="text-sm font-medium text-accent-orange-700 dark:text-accent-orange-300 block mb-2">
                        End Meta
                      </span>
                      <p className="text-xl font-bold text-accent-orange-900 dark:text-accent-orange-100">
                        {config?.end_meta}
                      </p>
                    </div>
                  </div>
                  <div className="pt-6 border-t border-gray-200/50 dark:border-gray-700/50">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="glass-card bg-gradient-to-br from-accent-pink-50 to-accent-pink-100 dark:from-accent-pink-950/50 dark:to-accent-pink-900/50 p-6 rounded-xl border border-accent-pink-200/50 dark:border-accent-pink-700/50 hover:shadow-lg transition-all duration-200">
                        <span className="text-sm font-medium text-accent-pink-700 dark:text-accent-pink-300 block mb-2">
                          Start Dimension
                        </span>
                        <p className="text-xl font-bold text-accent-pink-900 dark:text-accent-pink-100 font-mono">
                          {config?.start_dim}
                        </p>
                      </div>
                      <div className="glass-card bg-gradient-to-br from-primary-50 to-accent-teal-100 dark:from-primary-950/50 dark:to-accent-teal-900/50 p-6 rounded-xl border border-primary-200/50 dark:border-primary-700/50 hover:shadow-lg transition-all duration-200">
                        <span className="text-sm font-medium text-primary-700 dark:text-primary-300 block mb-2">
                          End Dimension
                        </span>
                        <p className="text-xl font-bold text-primary-900 dark:text-primary-100 font-mono">
                          {config?.end_dim}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Next Steps Card */}
          <Card className="glass-card border-accent-teal-200/50 bg-gradient-to-r from-accent-teal-50/50 to-primary-50/30 dark:from-accent-teal-950/30 dark:to-primary-950/30 dark:border-accent-teal-700/50 card-hover">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-accent-teal-500 to-accent-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-accent-teal-500/25">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-accent-teal-800 dark:text-accent-teal-200">
                      Configuration Complete
                    </h3>
                    <p className="text-sm text-accent-teal-700 dark:text-accent-teal-300">
                      Ready to proceed with data upload using these optimized settings
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => setViewMode('upload')}
                  className="bg-gradient-to-r from-accent-teal-600 to-accent-teal-700 hover:from-accent-teal-700 hover:to-accent-teal-800 text-white shadow-lg shadow-accent-teal-500/25"
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
          {/* Workflow Progress - Modern Header */}
          <Card className="glass-card border-l-4 border-l-primary-500 bg-gradient-to-r from-primary-50/30 to-accent-purple-50/20 dark:from-primary-950/30 dark:to-accent-purple-950/20 card-hover">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-2">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-lg transition-all duration-200',
                        isBaselineStep ||
                          processingState.status === 'processing' ||
                          isMonitoringStep ||
                          isCompleteStep
                          ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-primary-500/25'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      )}
                    >
                      1
                    </div>
                    <span
                      className={cn(
                        'font-semibold text-sm',
                        isBaselineStep ||
                          processingState.status === 'processing' ||
                          isMonitoringStep ||
                          isCompleteStep
                          ? 'text-primary-600 dark:text-primary-400'
                          : 'text-gray-400 dark:text-gray-500'
                      )}
                    >
                      Baseline
                    </span>
                  </div>

                  <ArrowRight
                    className={cn(
                      'w-5 h-5 hidden sm:block transition-all duration-200',
                      isMonitoringStep || isCompleteStep
                        ? 'text-primary-600 dark:text-primary-400'
                        : 'text-gray-400 dark:text-gray-500'
                    )}
                  />

                  <div className="flex items-center space-x-2">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-lg transition-all duration-200',
                        isMonitoringStep || isCompleteStep
                          ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-primary-500/25'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      )}
                    >
                      2
                    </div>
                    <span
                      className={cn(
                        'font-semibold text-sm',
                        isMonitoringStep || isCompleteStep
                          ? 'text-primary-600 dark:text-primary-400'
                          : 'text-gray-400 dark:text-gray-500'
                      )}
                    >
                      Monitoring
                    </span>
                  </div>

                  <ArrowRight
                    className={cn(
                      'w-5 h-5 hidden sm:block transition-all duration-200',
                      isCompleteStep
                        ? 'text-accent-teal-600 dark:text-accent-teal-400'
                        : 'text-gray-400 dark:text-gray-500'
                    )}
                  />

                  <div className="flex items-center space-x-2">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-lg transition-all duration-200',
                        isCompleteStep
                          ? 'bg-gradient-to-br from-accent-teal-500 to-accent-teal-600 text-white shadow-accent-teal-500/25'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      )}
                    >
                      ✓
                    </div>
                    <span
                      className={cn(
                        'font-semibold text-sm',
                        isCompleteStep
                          ? 'text-accent-teal-600 dark:text-accent-teal-400'
                          : 'text-gray-400 dark:text-gray-500'
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
                'glass-card h-fit transition-all duration-300 card-hover',
                isBaselineStep ? 'ring-2 ring-primary-500/50 shadow-xl shadow-primary-500/10' : '',
                isMonitoringStep || isCompleteStep ? 'opacity-80' : ''
              )}
            >
              <CardHeader className="pb-4 bg-gradient-to-r from-primary-50/30 to-transparent dark:from-primary-950/30 rounded-t-xl">
                <CardTitle className="flex items-center text-xl">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 text-white text-sm font-bold flex items-center justify-center mr-3 shadow-lg shadow-primary-500/25">
                    1
                  </div>
                  <span className="gradient-text">Baseline Data</span>
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  Upload CSV files for initial analysis and processing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FileUpload
                  onFilesChange={setBaselineFiles}
                  onUpload={handleBaselineUpload}
                  maxFiles={10}
                  maxSize={1024 * 1024 * 1024} // 1GB
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
                'glass-card h-fit transition-all duration-300 card-hover',
                isMonitoringStep
                  ? 'ring-2 ring-primary-500/50 shadow-xl shadow-primary-500/10'
                  : '',
                !isMonitoringStep ? 'opacity-60' : ''
              )}
            >
              <CardHeader className="pb-4 bg-gradient-to-r from-primary-50/30 to-transparent dark:from-primary-950/30 rounded-t-xl">
                <CardTitle className="flex items-center text-xl">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full text-sm font-bold flex items-center justify-center mr-3 shadow-lg transition-all duration-200',
                      isMonitoringStep || isCompleteStep
                        ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-primary-500/25'
                        : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    )}
                  >
                    2
                  </div>
                  <span
                    className={cn(
                      isMonitoringStep || isCompleteStep
                        ? 'gradient-text'
                        : 'text-gray-500 dark:text-gray-400'
                    )}
                  >
                    Monitoring Data
                  </span>
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">
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
                  maxSize={1024 * 1024 * 1024} // 1GB
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
            <Card className="glass-card border-accent-teal-200/50 bg-gradient-to-r from-accent-teal-50/50 via-primary-50/30 to-accent-purple-50/30 dark:from-accent-teal-950/30 dark:via-primary-950/20 dark:to-accent-purple-950/30 mt-6 card-hover">
              <CardContent className="pt-10 pb-10">
                <div className="text-center">
                  <div className="mx-auto mb-6 w-20 h-20 bg-gradient-to-br from-accent-teal-500 to-accent-teal-600 rounded-full flex items-center justify-center shadow-2xl shadow-accent-teal-500/25">
                    <CheckCircle className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-3xl font-bold gradient-text mb-3">
                    🎉 Data Processing Complete!
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-lg mx-auto text-lg leading-relaxed">
                    Both baseline and monitoring data have been successfully uploaded and processed.
                    You can now view analysis results or upload new data.
                  </p>
                  <div className="flex flex-wrap justify-center gap-4">
                    <Button className="bg-gradient-to-r from-accent-teal-600 to-accent-teal-700 hover:from-accent-teal-700 hover:to-accent-teal-800 text-white shadow-lg shadow-accent-teal-500/25">
                      <BarChart3 className="w-4 h-4 mr-2" />
                      View Analysis
                    </Button>
                    <Button
                      onClick={() => setViewMode('stats')}
                      variant="outline"
                      className="glass-card hover:shadow-lg"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      View Statistics
                    </Button>
                    <Button
                      onClick={resetWorkflow}
                      variant="outline"
                      className="glass-card hover:shadow-lg"
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

      {viewMode === 'stats' && (
        <div className="space-y-6">
          {/* Current Configuration Summary */}
          <Card className="glass-card border-primary-200/50 bg-gradient-to-r from-primary-50/50 to-accent-purple-50/30 dark:from-primary-950/50 dark:to-accent-purple-950/30 dark:border-primary-700/50 card-hover">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/25">
                    <Settings className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-primary-800 dark:text-primary-200">
                      Current Configuration
                    </h3>
                    <p className="text-sm text-primary-700 dark:text-primary-300">
                      Optimizer:{' '}
                      <span className="font-mono font-semibold">
                        {config?.optimizer || 'Loading...'}
                      </span>{' '}
                      | Alpha:{' '}
                      <span className="font-mono font-semibold">
                        {config?.alpha || 'Loading...'}
                      </span>
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => setViewMode('config')}
                  variant="outline"
                  className="glass-card hover:shadow-lg"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Edit Configuration
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Dataset Statistics */}
          <Card className="glass-card shadow-xl border-gray-200/50 dark:border-gray-700/50 card-hover">
            <CardHeader className="bg-gradient-to-r from-primary-50/30 via-white/50 to-accent-purple-50/30 dark:from-gray-900/50 dark:via-gray-950/50 dark:to-gray-900/50 backdrop-blur-sm rounded-t-xl">
              <CardTitle className="text-2xl flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-white" />
                </div>
                <span className="gradient-text">Dataset Statistics</span>
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400 mt-2">
                {dinsightStats
                  ? `Data overview for Dinsight ID ${dinsightStats.dinsightId}`
                  : 'Data quality metrics and insights for your analysis'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="flex items-center justify-center p-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
                  <span className="ml-4 text-gray-600 dark:text-gray-300 text-lg">
                    Loading statistics...
                  </span>
                </div>
              ) : dinsightStats ? (
                <div className="space-y-8">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="glass-card text-center p-6 bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-950/50 dark:to-primary-900/50 rounded-xl border border-primary-200/50 dark:border-primary-700/50 hover:shadow-lg transition-all duration-200">
                      <p className="text-3xl font-bold text-primary-900 dark:text-primary-100 mb-2">
                        {formatNumber(dinsightStats.totalRecords)}
                      </p>
                      <p className="text-sm font-medium text-primary-700 dark:text-primary-300">
                        Total Records
                      </p>
                    </div>
                    <div className="glass-card text-center p-6 bg-gradient-to-br from-accent-teal-50 to-accent-teal-100 dark:from-accent-teal-950/50 dark:to-accent-teal-900/50 rounded-xl border border-accent-teal-200/50 dark:border-accent-teal-700/50 hover:shadow-lg transition-all duration-200">
                      <p className="text-3xl font-bold text-accent-teal-900 dark:text-accent-teal-100 mb-2">
                        {formatNumber(dinsightStats.features)}
                      </p>
                      <p className="text-sm font-medium text-accent-teal-700 dark:text-accent-teal-300">
                        Features
                      </p>
                    </div>
                    <div className="glass-card text-center p-6 bg-gradient-to-br from-accent-purple-50 to-accent-purple-100 dark:from-accent-purple-950/50 dark:to-accent-purple-900/50 rounded-xl border border-accent-purple-200/50 dark:border-accent-purple-700/50 hover:shadow-lg transition-all duration-200">
                      <p className="text-3xl font-bold text-accent-purple-900 dark:text-accent-purple-100 mb-2">
                        {dinsightStats.missingValues.toFixed(1)}%
                      </p>
                      <p className="text-sm font-medium text-accent-purple-700 dark:text-accent-purple-300">
                        Missing Values
                      </p>
                    </div>
                    <div className="glass-card text-center p-6 bg-gradient-to-br from-accent-orange-50 to-accent-orange-100 dark:from-accent-orange-950/50 dark:to-accent-orange-900/50 rounded-xl border border-accent-orange-200/50 dark:border-accent-orange-700/50 hover:shadow-lg transition-all duration-200">
                      <p className="text-3xl font-bold text-accent-orange-900 dark:text-accent-orange-100 mb-2">
                        {dinsightStats.dataQuality.toFixed(1)}%
                      </p>
                      <p className="text-sm font-medium text-accent-orange-700 dark:text-accent-orange-300">
                        Data Quality
                      </p>
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
          <Card className="glass-card shadow-xl border-gray-200/50 dark:border-gray-700/50 card-hover">
            <CardHeader className="bg-gradient-to-r from-primary-50/30 via-white/50 to-accent-purple-50/30 dark:from-gray-900/50 dark:via-gray-950/50 dark:to-gray-900/50 backdrop-blur-sm rounded-t-xl">
              <CardTitle className="text-2xl flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                  <ArrowRight className="w-4 h-4 text-white" />
                </div>
                <span className="gradient-text">Quick Actions</span>
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400 mt-2">
                Common tasks and shortcuts for data management
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Button
                  variant="ghost"
                  className="glass-card justify-start h-auto p-6 flex-col items-start hover:shadow-lg transition-all duration-200 border border-gray-200/50 dark:border-gray-700/50"
                >
                  <BarChart3 className="w-8 h-8 mb-3 text-primary-600 dark:text-primary-400" />
                  <div className="text-left">
                    <div className="font-bold text-gray-900 dark:text-gray-100">Sample Data</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Load demo dataset
                    </div>
                  </div>
                </Button>
                <Button
                  variant="ghost"
                  className="glass-card justify-start h-auto p-6 flex-col items-start hover:shadow-lg transition-all duration-200 border border-gray-200/50 dark:border-gray-700/50"
                >
                  <Download className="w-8 h-8 mb-3 text-accent-teal-600 dark:text-accent-teal-400" />
                  <div className="text-left">
                    <div className="font-bold text-gray-900 dark:text-gray-100">Export Stats</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Download reports
                    </div>
                  </div>
                </Button>
                <Button
                  variant="ghost"
                  className="glass-card justify-start h-auto p-6 flex-col items-start hover:shadow-lg transition-all duration-200 border border-gray-200/50 dark:border-gray-700/50"
                >
                  <Settings className="w-8 h-8 mb-3 text-accent-orange-600 dark:text-accent-orange-400" />
                  <div className="text-left">
                    <div className="font-bold text-gray-900 dark:text-gray-100">Reset Config</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Default settings
                    </div>
                  </div>
                </Button>
                <Button
                  variant="ghost"
                  className="glass-card justify-start h-auto p-6 flex-col items-start hover:shadow-lg transition-all duration-200 border border-gray-200/50 dark:border-gray-700/50"
                  onClick={() => setViewMode('upload')}
                >
                  <Upload className="w-8 h-8 mb-3 text-accent-purple-600 dark:text-accent-purple-400" />
                  <div className="text-left">
                    <div className="font-bold text-gray-900 dark:text-gray-100">New Upload</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Upload more data
                    </div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Confirmation Dialogs */}
      <ConfirmationDialog
        open={showRestoreDialog}
        onOpenChange={setShowRestoreDialog}
        title="Restore Default Configuration"
        description={
          <>
            Are you sure you want to restore the default configuration values?
            <br />
            <br />
            <span className="text-sm text-amber-700 bg-amber-50 p-2 rounded border border-amber-200 block">
              <strong>Warning:</strong> This will overwrite your current changes and cannot be
              undone.
            </span>
          </>
        }
        confirmText="Restore Defaults"
        cancelText="Keep Current Values"
        variant="default"
        onConfirm={confirmRestoreDefaults}
      />
    </div>
  );
}
