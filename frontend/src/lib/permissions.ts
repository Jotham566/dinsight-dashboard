/**
 * Frontend mirror of the backend's internal/policy package.
 *
 * The action vocabulary + role capabilities are duplicated here so the
 * UI can hide affordances the caller can't use (a viewer doesn't see the
 * "Delete" button on an alert rule). Authoritative gating still lives on
 * the backend — the frontend is purely cosmetic; never rely on it for
 * security.
 *
 * Keep this list in sync with Dinsight_API_Enhanced/internal/policy/policy.go.
 * The names match exactly so a grep across both codebases surfaces every
 * call site.
 */
import type { OrgRole } from '@/types';

export const Actions = {
  // Audit log
  AuditRead: 'audit.read',

  // Alert rules
  AlertRuleCreate: 'alert.rule.create',
  AlertRuleUpdate: 'alert.rule.update',
  AlertRuleDelete: 'alert.rule.delete',
  AlertResolve: 'alert.resolve',
  AlertAck: 'alert.acknowledge',

  // Datasets
  DatasetCreate: 'dataset.create',
  DatasetUpdate: 'dataset.update',
  DatasetDelete: 'dataset.delete',
  DatasetRead: 'dataset.read',

  // Data validation
  ValidationRuleCreate: 'validation.rule.create',
  ValidationRun: 'validation.run',

  // Data lineage
  LineageCreate: 'lineage.create',

  // Org administration
  OrgInvite: 'org.invite',
  OrgRoleChange: 'org.role.change',
  OrgMemberRemove: 'org.member.remove',
  OrgSettingEdit: 'org.settings.edit',

  // Platform administration (vendor-side cross-tenant surface).
  // These resolve true via Can() for any admin role, BUT the backend
  // also enforces `org_slug == "default"` via RequirePlatformAdmin
  // middleware. The FE mirrors that gate via usePlatformAdmin()
  // (see context/auth-context.tsx) — never grant a platform-admin
  // affordance to a user who isn't admin of the default org.
  PlatformOrgRead: 'platform.org.read',
  PlatformOrgCreate: 'platform.org.create',
  PlatformOrgDelete: 'platform.org.delete',
} as const;

export type Action = (typeof Actions)[keyof typeof Actions];

const roleCapabilities: Record<OrgRole, ReadonlySet<Action>> = {
  viewer: new Set<Action>([Actions.DatasetRead]),
  operator: new Set<Action>([
    Actions.DatasetRead,
    Actions.AlertRuleCreate,
    Actions.AlertRuleUpdate,
    Actions.AlertResolve,
    Actions.AlertAck,
    Actions.DatasetCreate,
    Actions.DatasetUpdate,
    Actions.ValidationRuleCreate,
    Actions.ValidationRun,
    Actions.LineageCreate,
  ]),
  admin: new Set<Action>([
    Actions.DatasetRead,
    Actions.AlertRuleCreate,
    Actions.AlertRuleUpdate,
    Actions.AlertRuleDelete,
    Actions.AlertResolve,
    Actions.AlertAck,
    Actions.DatasetCreate,
    Actions.DatasetUpdate,
    Actions.DatasetDelete,
    Actions.ValidationRuleCreate,
    Actions.ValidationRun,
    Actions.LineageCreate,
    Actions.AuditRead,
    Actions.OrgInvite,
    Actions.OrgRoleChange,
    Actions.OrgMemberRemove,
    Actions.OrgSettingEdit,
    Actions.PlatformOrgRead,
    Actions.PlatformOrgCreate,
    Actions.PlatformOrgDelete,
  ]),
};

/**
 * Can reports whether the named role is permitted to perform action.
 * Unknown role / unknown action both fail closed. Use via the
 * usePermission() hook in components; the bare function exists for
 * non-React call sites (route loaders, server actions).
 */
export function can(role: OrgRole | null | undefined, action: Action): boolean {
  if (!role) return false;
  const caps = roleCapabilities[role];
  if (!caps) return false;
  return caps.has(action);
}
