'use client';

import { ReactNode } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from '@/components/ui/alert-dialog';

export interface ConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string | ReactNode;
  children: ReactNode;
}

export function ConfigDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
}: ConfigDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-950 border border-gray-300 dark:border-gray-600 shadow-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-2xl font-bold gradient-text flex items-center gap-3">
            {title}
          </AlertDialogTitle>
          {description && (
            <AlertDialogDescription className="text-gray-600 dark:text-gray-400 mt-1">
              {description}
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <div className="mt-6">{children}</div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
