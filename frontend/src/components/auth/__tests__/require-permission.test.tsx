import React from 'react';
import { render, screen, renderHook } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { RequirePermission, usePermission } from '@/components/auth/require-permission';
import { Actions } from '@/lib/permissions';

// useAuth mocked per-test. Provides currentOrgRole — the only field
// RequirePermission / usePermission read.
let mockAuthValue: any = { currentOrgRole: null };
vi.mock('@/context/auth-context', () => ({
  useAuth: () => mockAuthValue,
}));

beforeEach(() => {
  mockAuthValue = { currentOrgRole: null };
});

describe('RequirePermission', () => {
  it('renders children when the role is permitted', () => {
    mockAuthValue = { currentOrgRole: 'admin' };
    render(
      <RequirePermission perm={Actions.AuditRead}>
        <button>Open audit log</button>
      </RequirePermission>
    );
    expect(screen.getByRole('button', { name: /Open audit log/i })).toBeInTheDocument();
  });

  it('renders nothing when the role lacks permission', () => {
    mockAuthValue = { currentOrgRole: 'operator' };
    const { container } = render(
      <RequirePermission perm={Actions.AuditRead}>
        <button>Open audit log</button>
      </RequirePermission>
    );
    expect(container.querySelector('button')).toBeNull();
  });

  it('renders the fallback when supplied and permission is denied', () => {
    mockAuthValue = { currentOrgRole: 'viewer' };
    render(
      <RequirePermission perm={Actions.AlertRuleCreate} fallback={<span>Admin only</span>}>
        <button>Create rule</button>
      </RequirePermission>
    );
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText('Admin only')).toBeInTheDocument();
  });

  it('hides children when currentOrgRole is null (pre-hydration)', () => {
    mockAuthValue = { currentOrgRole: null };
    const { container } = render(
      <RequirePermission perm={Actions.DatasetRead}>
        <span>data</span>
      </RequirePermission>
    );
    expect(container.querySelector('span')).toBeNull();
  });
});

describe('usePermission()', () => {
  it('returns true when permitted', () => {
    mockAuthValue = { currentOrgRole: 'admin' };
    const { result } = renderHook(() => usePermission(Actions.AuditRead));
    expect(result.current).toBe(true);
  });

  it('returns false when not permitted', () => {
    mockAuthValue = { currentOrgRole: 'viewer' };
    const { result } = renderHook(() => usePermission(Actions.AlertRuleDelete));
    expect(result.current).toBe(false);
  });

  it('returns false when role is null', () => {
    mockAuthValue = { currentOrgRole: null };
    const { result } = renderHook(() => usePermission(Actions.DatasetRead));
    expect(result.current).toBe(false);
  });
});
