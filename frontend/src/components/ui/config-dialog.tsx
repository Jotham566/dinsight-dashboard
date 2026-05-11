'use client';

import { ReactNode } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { cn } from '@/utils/cn';

export interface ConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string | ReactNode;
  children: ReactNode;
  contentClassName?: string;
}

export function ConfigDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  contentClassName,
}: ConfigDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        className={cn(
          'sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-canvas border border-strong shadow-2xl',
          contentClassName
        )}
      >
        <AlertDialogHeader>
          <AlertDialogTitle className="text-2xl font-semibold text-fg flex items-center gap-3">
            {title}
          </AlertDialogTitle>
          {description && (
            <AlertDialogDescription className="text-fg-muted mt-1">
              {description}
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <div className="mt-6">{children}</div>
        <AlertDialogFooter className="mt-8">
          <AlertDialogCancel onClick={() => onOpenChange(false)}>Close</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
