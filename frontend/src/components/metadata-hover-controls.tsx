import { useState } from 'react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfigDialog } from '@/components/ui/config-dialog';

interface MetadataHoverControlsProps {
  availableKeys: string[];
  selectedKeys: string[];
  onToggleKey: (key: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  metadataEnabled: boolean;
  onToggleEnabled: (value: boolean) => void;
  className?: string;
  disabled?: boolean;
}

export function MetadataHoverControls({
  availableKeys,
  selectedKeys,
  onToggleKey,
  onSelectAll,
  onClearAll,
  metadataEnabled,
  onToggleEnabled,
  className,
  disabled = false,
}: MetadataHoverControlsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const hasSelection = metadataEnabled && selectedKeys.length > 0;
  const previewKeys = selectedKeys.slice(0, 3);
  const remainingCount = selectedKeys.length - previewKeys.length;
  const hasMetadataAvailable = availableKeys.length > 0;

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Hover metadata</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Choose which metadata fields appear when hovering over chart points.
          </p>
        </div>
        <input
          type="checkbox"
          className="mt-1 rounded border-gray-300 dark:border-gray-600"
          checked={metadataEnabled && hasMetadataAvailable && !disabled}
          onChange={(event) => onToggleEnabled(event.target.checked)}
          disabled={!hasMetadataAvailable || disabled}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {hasSelection ? (
          <>
            {previewKeys.map((key) => (
              <Badge key={key} variant="secondary" className="text-xs">
                {key}
              </Badge>
            ))}
            {remainingCount > 0 && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                +{remainingCount} more
              </span>
            )}
          </>
        ) : (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {hasMetadataAvailable
              ? 'No metadata fields selected yet.'
              : 'Metadata fields will appear once the dataset is loaded.'}
          </span>
        )}
      </div>

      <Button
        variant="outline"
        size="sm"
        className="text-sm"
        onClick={() => setIsDialogOpen(true)}
        disabled={!hasMetadataAvailable || disabled}
      >
        Configure fields
      </Button>

      <ConfigDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title="Configure Hover Metadata"
        description="Select which metadata columns should be included in chart hover tooltips."
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={onSelectAll}
              disabled={!hasMetadataAvailable}
            >
              Select all
            </Button>
            <Button size="sm" variant="ghost" onClick={onClearAll}>
              Clear
            </Button>
          </div>

          <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-800">
            {hasMetadataAvailable ? (
              availableKeys.map((key) => {
                const checked = selectedKeys.includes(key);
                return (
                  <label
                    key={key}
                    className={cn(
                      'flex items-center justify-between px-4 py-2 text-sm',
                      checked
                        ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-200'
                        : 'text-gray-700 dark:text-gray-300'
                    )}
                  >
                    <span className="truncate pr-3">{key}</span>
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 dark:border-gray-600"
                      checked={checked}
                      onChange={() => onToggleKey(key)}
                    />
                  </label>
                );
              })
            ) : (
              <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                Metadata fields will become available once data is loaded.
              </div>
            )}
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400">
            Tip: Limit selected fields to the most relevant information to keep hover cards concise.
          </div>
        </div>
      </ConfigDialog>
    </div>
  );
}
