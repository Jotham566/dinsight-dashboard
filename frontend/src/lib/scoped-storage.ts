/**
 * scoped-storage — localStorage helpers that namespace keys by the active
 * user, ahead of the multi-tenancy migration that adds org_id.
 *
 * Why:
 *
 * Today every preference (live-monitor settings, insights wear-trend config,
 * dashboard timeline history, account notification toggles) lives under a
 * flat `dinsight:*` key. When two users share a browser (or the upcoming org
 * switch lets one user belong to two orgs), prefs leak across identities:
 * user A's live-monitor settings persist into user B's session because the
 * key doesn't include either's id.
 *
 * Namespacing by user_id now (with 'guest' as the fallback for the
 * pre-auth surfaces) establishes the pattern before org_id lands in Week 2.
 * Org-scoped keys become `dinsight:u<userId>:o<orgId>:...` with a tiny edit
 * to scopedKey() once the org context is wired into AuthContext.
 *
 * Usage:
 *
 *   import { useAuth } from '@/context/auth-context';
 *   import { readScoped, writeScoped } from '@/lib/scoped-storage';
 *
 *   const { user } = useAuth();
 *   const raw = readScoped('live-monitor:prefs:v1', user?.id);
 *   writeScoped('live-monitor:prefs:v1', user?.id, JSON.stringify(payload));
 *
 * Keys passed in DO NOT include the `dinsight:` prefix — this module owns
 * the entire prefix so the namespace can evolve without touching call sites.
 *
 * Note on device-scoped data: identifiers that belong to the *browser*
 * (e.g. live-monitor device id) MUST NOT use this helper. They're per-device,
 * not per-user, and should remain flat.
 */

type UserScope = string | number | null | undefined;

function scopedKey(rawKey: string, userId: UserScope): string {
  const id = userId === undefined || userId === null ? 'guest' : userId;
  return `dinsight:u${id}:${rawKey}`;
}

export function readScoped(rawKey: string, userId: UserScope): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(scopedKey(rawKey, userId));
}

export function writeScoped(rawKey: string, userId: UserScope, value: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(scopedKey(rawKey, userId), value);
}

export function removeScoped(rawKey: string, userId: UserScope): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(scopedKey(rawKey, userId));
}

/**
 * Returns the fully-qualified storage key. Useful when a caller needs to
 * pass the key into something other than the helpers above (e.g. a custom
 * deserializer or a storage-event listener that compares e.key).
 */
export function buildScopedKey(rawKey: string, userId: UserScope): string {
  return scopedKey(rawKey, userId);
}
