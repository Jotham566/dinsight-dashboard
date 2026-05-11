import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { Badge } from '@/components/ui/badge';

// Badge — DESIGN.md §11.7 semantic variants. The codemod that closed the
// design audit collapsed many ad-hoc inline status pills to this primitive;
// these snapshots are the regression net for future variant changes.

describe('Badge', () => {
  it.each(['neutral', 'outline', 'accent', 'success', 'warning', 'danger', 'info'] as const)(
    'renders the %s variant with the right semantic classes',
    (variant) => {
      const { container } = render(<Badge variant={variant}>Label</Badge>);
      expect(container.firstChild).toMatchSnapshot();
    }
  );

  it.each(['default', 'secondary', 'destructive'] as const)(
    'keeps back-compat alias %s rendering during Phase C5 codemod sweep',
    (variant) => {
      const { container } = render(<Badge variant={variant}>Label</Badge>);
      expect(container.firstChild).toMatchSnapshot();
    }
  );

  it('forwards className overrides to the rendered span', () => {
    const { container } = render(<Badge className="custom-extra-class">x</Badge>);
    expect((container.firstChild as HTMLElement).className).toContain('custom-extra-class');
  });

  it('defaults to the neutral variant when no variant prop is set', () => {
    const { container } = render(<Badge>Default</Badge>);
    const cls = (container.firstChild as HTMLElement).className;
    expect(cls).toContain('bg-surface-muted');
    expect(cls).toContain('text-fg');
  });
});
