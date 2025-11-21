'use client';

import { ReactNode } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Activity, CheckCircle, Upload, Database, AlertCircle, X } from 'lucide-react';

export interface ProcessingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'uploading' | 'processing' | 'completed' | 'error';
  stage: 'baseline' | 'monitoring' | 'complete';
  title: string;
  description: string | ReactNode;
  errorMessage?: string;
  statusMessage?: string;
  progress?: number;
  onClose?: () => void;
  onRetry?: () => void;
  showActions?: boolean;
}

export function ProcessingDialog({
  open,
  onOpenChange,
  type,
  stage,
  title,
  description,
  errorMessage,
  statusMessage,
  progress,
  onClose,
  onRetry,
  showActions = false,
}: ProcessingDialogProps) {
  const getIcon = () => {
    switch (type) {
      case 'uploading':
        return <Upload className="w-8 h-8 text-blue-600 animate-pulse" />;
      case 'processing':
        return <Activity className="w-8 h-8 text-blue-600 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-8 h-8 text-emerald-600" />;
      case 'error':
        return <AlertCircle className="w-8 h-8 text-red-600" />;
      default:
        return <Database className="w-8 h-8 text-gray-600" />;
    }
  };

  const getGradientColors = () => {
    switch (stage) {
      case 'baseline':
        return 'from-primary-500 to-primary-600';
      case 'monitoring':
        return 'from-accent-teal-500 to-accent-teal-600';
      case 'complete':
        return 'from-emerald-500 to-emerald-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const getProgressValue = () => {
    if (type === 'uploading') return 25;
    if (type === 'processing') {
      // Use real progress from backend (0-100)
      if (progress !== undefined && progress >= 0) {
        return progress;
      }
      // Fallback to indeterminate state
      return 0;
    }
    if (type === 'completed') return 100;
    return undefined;
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-[500px] bg-white dark:bg-gray-950 border border-gray-300 dark:border-gray-600 shadow-2xl">
        <AlertDialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className={`w-12 h-12 bg-gradient-to-br ${getGradientColors()} rounded-xl flex items-center justify-center shadow-lg`}
              >
                {getIcon()}
              </div>
              <div>
                <AlertDialogTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {title}
                </AlertDialogTitle>
                <AlertDialogDescription className="text-gray-600 dark:text-gray-300 mt-1">
                  {description}
                </AlertDialogDescription>
              </div>
            </div>
            {(type === 'completed' || type === 'error') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onClose?.();
                  onOpenChange(false);
                }}
                className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </AlertDialogHeader>

        <div className="mt-6 space-y-4">
          {/* Progress Section */}
          {(type === 'uploading' || type === 'processing') && (
            <div className="space-y-3">
              <Progress value={getProgressValue()} className="h-2" />

              {type === 'processing' && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
                    <span className="flex-1">{statusMessage || 'Processing data...'}</span>
                    {progress !== undefined && progress >= 0 && (
                      <span className="font-mono text-primary-600 dark:text-primary-400 ml-2">
                        {progress}%
                      </span>
                    )}
                  </div>
                  {progress === 0 && (
                    <div className="text-xs text-gray-400 dark:text-gray-500">
                      Initializing processing pipeline...
                    </div>
                  )}
                </div>
              )}

              {type === 'uploading' && (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Uploading files to server...
                </div>
              )}
            </div>
          )}

          {/* Error Section */}
          {type === 'error' && errorMessage && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-red-800 dark:text-red-200">
                  <strong>Error:</strong> {errorMessage}
                </div>
              </div>
            </div>
          )}

          {/* Success Section */}
          {type === 'completed' && stage === 'complete' && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <div className="text-sm text-emerald-800 dark:text-emerald-200">
                  Your data has been successfully processed and is ready for analysis!
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {showActions && type === 'completed' && stage === 'complete' && (
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                asChild
                className="flex-1 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white"
              >
                <a href="/dashboard/visualization">View Visualization</a>
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <a href="/dashboard/analysis">Run Anomaly Detection</a>
              </Button>
            </div>
          )}

          {/* Retry Button for Errors */}
          {type === 'error' && onRetry && (
            <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button onClick={onRetry} className="flex-1">
                Try Again
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  onClose?.();
                  onOpenChange(false);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          )}

          {/* Simple Close Button for Completed States */}
          {type === 'completed' && stage !== 'complete' && (
            <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                onClick={() => {
                  onClose?.();
                  onOpenChange(false);
                }}
              >
                Continue
              </Button>
            </div>
          )}
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
