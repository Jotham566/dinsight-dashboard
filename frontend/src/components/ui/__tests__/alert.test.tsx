import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Alert — design-system.md §11.8 four required severities (info / success /
// warning / danger). 'destructive' is the back-compat alias kept until the
// codemod sweep clears existing call sites.

describe('Alert', () => {
  it.each(['default', 'info', 'success', 'warning', 'danger', 'destructive'] as const)(
    'renders the %s variant with the right semantic classes',
    (variant) => {
      const { container } = render(
        <Alert variant={variant}>
          <AlertTitle>Title</AlertTitle>
          <AlertDescription>Body</AlertDescription>
        </Alert>
      );
      expect(container.firstChild).toMatchSnapshot();
    }
  );

  it('exposes role="alert" for assistive tech', () => {
    render(<Alert variant="warning">Heads up</Alert>);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders title + description with the right semantic tags', () => {
    render(
      <Alert variant="info">
        <AlertTitle>Hello</AlertTitle>
        <AlertDescription>World</AlertDescription>
      </Alert>
    );
    expect(screen.getByText('Hello').tagName).toBe('H5');
    expect(screen.getByText('World').tagName).toBe('DIV');
  });

  it('defaults to the neutral surface variant', () => {
    const { container } = render(<Alert>x</Alert>);
    const cls = (container.firstChild as HTMLElement).className;
    expect(cls).toContain('bg-surface');
    expect(cls).toContain('text-fg');
  });
});
