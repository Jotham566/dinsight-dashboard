import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Input } from '@/components/ui/input';

// Input — design-system.md §11.5 seven-state model. These tests assert the
// behaviour of the state props (invalid, loading, readOnly, disabled,
// errorText, helperText) rather than snapshotting class strings, because
// the message + a11y wiring is the part that matters for downstream forms.

describe('Input', () => {
  it('renders the default state', () => {
    const { container } = render(<Input placeholder="you@example.com" />);
    const input = container.querySelector('input')!;
    expect(input).toBeInTheDocument();
    expect(input.getAttribute('aria-invalid')).toBeNull();
    expect(input.getAttribute('aria-busy')).toBeNull();
  });

  it('flags aria-invalid when invalid prop is true', () => {
    render(<Input invalid />);
    expect(screen.getByRole('textbox').getAttribute('aria-invalid')).toBe('true');
  });

  it('flags aria-invalid when errorText is provided', () => {
    render(<Input errorText="Email is required" />);
    const input = screen.getByRole('textbox');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByText('Email is required')).toBeInTheDocument();
  });

  it('flags aria-busy when loading is true and renders a spinner', () => {
    const { container } = render(<Input loading />);
    expect(screen.getByRole('textbox').getAttribute('aria-busy')).toBe('true');
    expect(container.querySelector('.spinner')).toBeInTheDocument();
  });

  it('renders helperText with non-error styling when not invalid', () => {
    render(<Input helperText="We never share your email" />);
    const helper = screen.getByText('We never share your email');
    expect(helper.className).toContain('text-fg-muted');
    expect(helper.className).not.toContain('text-danger-text');
  });

  it('marks the field read-only when readOnly prop is set', () => {
    render(<Input readOnly defaultValue="locked@example.com" />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.readOnly).toBe(true);
  });

  it('forwards aria-invalid prop without breaking the invalid prop path', () => {
    render(<Input aria-invalid />);
    expect(screen.getByRole('textbox').getAttribute('aria-invalid')).toBe('true');
  });

  it('uses h-10 (40px) min-height per §11.5', () => {
    const { container } = render(<Input />);
    expect(container.querySelector('input')!.className).toContain('h-10');
  });
});
