'use client';

import * as React from 'react';
import { cn } from '@/utils/cn';

interface DropdownMenuContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const DropdownMenuContext = React.createContext<DropdownMenuContextType | null>(null);

export function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block text-left">{children}</div>
    </DropdownMenuContext.Provider>
  );
}

export function DropdownMenuTrigger({
  children,
  className,
  asChild = false,
}: {
  children: React.ReactNode;
  className?: string;
  asChild?: boolean;
}) {
  const context = React.useContext(DropdownMenuContext);
  if (!context) throw new Error('DropdownMenuTrigger must be used within DropdownMenu');

  const { open, setOpen } = context;

  const handleClick = () => setOpen(!open);
  const handleBlur = (e: React.FocusEvent) => {
    // Close dropdown when clicking outside
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setTimeout(() => setOpen(false), 100);
    }
  };

  if (asChild && React.isValidElement(children)) {
    const childProps = (children as React.ReactElement).props as any;
    return React.cloneElement(children as React.ReactElement<any>, {
      onClick: handleClick,
      onBlur: handleBlur,
      className: cn(childProps.className, className),
    });
  }

  return (
    <button
      className={cn('flex items-center', className)}
      onClick={handleClick}
      onBlur={handleBlur}
    >
      {children}
    </button>
  );
}

export function DropdownMenuContent({
  children,
  align = 'right',
  className,
}: {
  children: React.ReactNode;
  align?: 'left' | 'right';
  className?: string;
}) {
  const context = React.useContext(DropdownMenuContext);
  if (!context) throw new Error('DropdownMenuContent must be used within DropdownMenu');

  const { open, setOpen } = context;

  if (!open) return null;

  return (
    <div
      className={cn(
        'absolute z-50 mt-2 w-56 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 shadow-xl backdrop-blur-sm animate-fade-in',
        align === 'right' ? 'right-0' : 'left-0',
        className
      )}
      onBlur={() => setOpen(false)}
    >
      <div className="py-1" role="menu" aria-orientation="vertical">
        {children}
      </div>
    </div>
  );
}

export function DropdownMenuItem({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  const context = React.useContext(DropdownMenuContext);
  const { setOpen } = context || {};

  return (
    <button
      className={cn(
        'flex w-full items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100 transition-colors',
        className
      )}
      role="menuitem"
      onClick={() => {
        onClick?.();
        setOpen?.(false);
      }}
    >
      {children}
    </button>
  );
}

export function DropdownMenuSeparator({ className }: { className?: string }) {
  return <div className={cn('my-1 h-px bg-gray-200 dark:bg-gray-800', className)} />;
}
