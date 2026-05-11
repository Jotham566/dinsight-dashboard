'use client';

import type { ReactNode } from 'react';
import { useAuth } from '@/context/auth-context';
import { can, type Action } from '@/lib/permissions';

/**
 * usePermission returns true when the active-org caller can perform the
 * named action. Reads currentOrgRole from AuthContext. Returns false
 * before AuthContext hydrates (treat null/undefined role as "no").
 */
export function usePermission(action: Action): boolean {
  const { currentOrgRole } = useAuth();
  return can(currentOrgRole, action);
}

interface RequirePermissionProps {
  /** Action the caller must be permitted to perform. */
  perm: Action;
  /** What to render when the caller has the permission. */
  children: ReactNode;
  /**
   * What to render when the caller is missing the permission. Defaults
   * to rendering nothing (i.e. the affordance is hidden). Pass a
   * disabled placeholder when "you can't do this" needs an explanation,
   * or a real fallback when the surface is page-level.
   */
  fallback?: ReactNode;
}

/**
 * RequirePermission hides children unless the active-org caller is
 * permitted to perform perm. Cosmetic only — the backend's
 * middleware.RequireAction is the authoritative gate. Use this to keep
 * buttons / nav items from rendering for users who can't use them.
 *
 * Example:
 *
 *   <RequirePermission perm={Actions.AlertRuleDelete}>
 *     <Button variant="destructive" onClick={remove}>Delete</Button>
 *   </RequirePermission>
 */
export function RequirePermission({ perm, children, fallback = null }: RequirePermissionProps) {
  const allowed = usePermission(perm);
  return <>{allowed ? children : fallback}</>;
}
