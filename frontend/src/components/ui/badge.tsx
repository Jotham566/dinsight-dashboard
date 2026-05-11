import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils/cn';

/**
 * Status pill / badge — DESIGN.md §7.5 and §11.7.
 *
 * Variants are bound to the semantic ramps in globals.css so colour swaps
 * across light/dark are automatic and consistent with every other surface
 * that consumes a semantic family (alert, kpi card, table row, etc.).
 *
 * Choose by intent:
 *   - `neutral`  default metadata / counts / non-state labels
 *   - `accent`   selected / informational anchors (not a health state)
 *   - `success`  OK machine state
 *   - `warning`  Deteriorating machine state
 *   - `danger`   Failing machine state
 *   - `info`     general information chips
 *   - `outline`  quieter neutral variant
 */
const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium leading-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-1 focus-visible:ring-offset-canvas',
  {
    variants: {
      variant: {
        neutral: 'border-border bg-surface-muted text-fg',
        outline: 'border-border bg-transparent text-fg-muted',
        accent: 'border-transparent bg-accent text-accent-contrast',
        success: 'border-success-border bg-success-bg text-success-text',
        warning: 'border-warning-border bg-warning-bg text-warning-text',
        danger: 'border-danger-border bg-danger-bg text-danger-text',
        info: 'border-info-border bg-info-bg text-info-text',
        // Back-compat aliases for the original shadcn variant names.
        // Codemod in Phase C5 will migrate call sites to the semantic names.
        default: 'border-transparent bg-accent text-accent-contrast',
        secondary: 'border-border bg-surface-muted text-fg',
        destructive: 'border-danger-border bg-danger-bg text-danger-text',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => (
    <span ref={ref} className={cn(badgeVariants({ variant }), className)} {...props} />
  )
);
Badge.displayName = 'Badge';

export { Badge, badgeVariants };
