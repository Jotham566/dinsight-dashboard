import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-accent text-accent-contrast shadow-sm hover:bg-accent-hover',
        destructive: 'bg-danger text-accent-contrast shadow-sm hover:bg-danger',
        outline: 'border border-border bg-transparent hover:bg-surface-hover text-fg',
        secondary: 'bg-surface-muted text-fg hover:bg-surface-muted dark:hover:bg-surface-hover',
        ghost: 'hover:bg-surface-hover text-fg',
        link: 'text-accent underline-offset-4 hover:underline',
      },
      // design-system.md §11.2 mandates 40px min-height for buttons; §12.6 mandates
      // 44px touch targets on mobile. We meet both with h-10 (40px) as the floor.
      size: {
        default: 'h-10 px-4 py-2 rounded-lg text-sm',
        sm: 'h-10 rounded-lg px-3 text-xs',
        lg: 'h-12 rounded-lg px-8 text-base',
        icon: 'h-10 w-10 rounded-lg',
        'icon-sm': 'h-10 w-10 rounded-lg',
        'icon-lg': 'h-12 w-12 rounded-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
