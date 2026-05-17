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

/**
 * Slug of the seeded platform-admin tenant. Hardcoded so the FE gate
 * matches the backend's middleware.RequirePlatformAdmin check verbatim
 * (which references the same literal `"default"`). Keep these two
 * call sites in sync if the platform-admin tenant is ever renamed.
 */
const PLATFORM_ADMIN_ORG_SLUG = 'default';

/**
 * usePlatformAdmin returns true when the active-org caller is the
 * vendor-side platform-admin tier — i.e. an admin of the seeded
 * `default` org. Mirrors middleware.RequirePlatformAdmin on the
 * backend. Returns false before AuthContext hydrates.
 *
 * Use this (not bare usePermission) to gate platform-admin
 * affordances. The Actions.PlatformOrg* checks via Can() return true
 * for any admin role, so they alone would leak the surface to
 * customer-org admins — the slug check here is what restricts to
 * the platform-admin tenant.
 */
export function usePlatformAdmin(): boolean {
  const { currentOrg, currentOrgRole } = useAuth();
  return currentOrg?.slug === PLATFORM_ADMIN_ORG_SLUG && currentOrgRole === 'admin';
}
