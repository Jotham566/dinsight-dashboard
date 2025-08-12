import * as React from 'react';
import { cn } from '@/utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm transition-all duration-200',
          'ring-offset-white dark:ring-offset-gray-950 file:border-0 file:bg-transparent file:text-sm file:font-medium',
          'placeholder:text-gray-400 dark:placeholder:text-gray-500 text-gray-900 dark:text-gray-100',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
          'focus:border-primary-500 dark:focus:border-primary-400',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'hover:border-gray-300 dark:hover:border-gray-600',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };