# Changelog

All notable changes to the Dinsight Dashboard frontend are recorded in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres loosely to [Semantic Versioning](https://semver.org/). Until we cut a tagged release the changes below live under **Unreleased** and group the foundation work that pairs the frontend with the four-week backend hardening.

The backend's matching CHANGELOG lives at [`Dinsight_API_Enhanced/CHANGELOG.md`](../Dinsight_API_Enhanced/CHANGELOG.md). Backend and frontend ship in lockstep across the foundation arc — every backend feature here has a frontend counterpart and vice versa.

## [Unreleased]

Four weeks of foundation work, plus a closeout pass.

- **Week 1** — Storage namespacing + error boundaries + Playwright auth fixture
- **Week 2** — Org switcher + currentOrg state + X-Org-ID interceptor
- **Week 3** — SSO sign-in button + admin-only audit log page
- **Week 4** — Permission table mirror + RequirePermission primitives + canonical pref-sync hook
- **Week 4 closeout** — Wire RequirePermission into the audit page + sidebar nav
- **Week 4 follow-up close-out** — Hook variants for local-only + conflict-aware pref sync

---

### Week 1 — Storage namespacing + error boundaries + Playwright auth fixture

Foundational hardening pass before the multi-tenancy work landed. Cleanups that previous sessions had deferred.

#### Added

- **`src/lib/scoped-storage.ts`** — `readScoped` / `writeScoped` / `removeScoped` namespace `localStorage` keys by the active user id. Every preference (live-monitor settings, insights wear config, dashboard timeline history, account notification toggles) is now stored under `dinsight:u<userId>:<key>` instead of a flat `dinsight:<key>`. Eliminates pref leakage when two users share a browser. The key shape leaves room for the `o<orgId>:` segment that lands in Week 2.
- **`src/lib/scoped-storage.test.ts`** — 5 tests covering the round-trip + the guest fallback when no user id is available.
- **`ErrorBoundary`** mounted in the dashboard shell + wrapping `PlotCanvas`. A Plotly render crash no longer takes down the whole layout — it fails gracefully to a recovery panel.
- **Playwright `storageState` fixture** in `e2e/auth.setup.ts`. The auth setup logs in once at suite start and writes a session file the rest of the specs read. Removes 30+ seconds of per-spec login overhead.
- **Primitive component test coverage** for Badge, Alert, Input, and Table to pin §11.1 of the design spec (state model: default / focus / disabled / error).

#### Changed

- **Live-monitor preferences keys** migrated to the scoped helpers. The previous `dinsight:live-monitor:prefs` key is now `dinsight:u<userId>:live-monitor:prefs`. Pre-existing keys are left in place (no migration); they'll be ignored and eventually evicted by browsers.

---

### Week 2 — Org switcher + currentOrg state + X-Org-ID interceptor

Multi-tenancy landed on the frontend in Week 2: an org switcher in the sidebar, a `currentOrg` slice on the auth context, and an axios interceptor that stamps `X-Org-ID` on every request.

See the backend's [`docs/TENANCY_AND_RBAC.md`](../Dinsight_API_Enhanced/docs/TENANCY_AND_RBAC.md) for the matching server-side flow.

#### Added

- **`User.organizations` field** on the user shape. Populated from the `memberships` array embedded in the JWT (also returned by `GET /users/profile`). Each entry: `{ id, slug, name, role }`.
- **`currentOrg` + `currentOrgRole` state** on `AuthContext`. Initialized from the user's first membership at login; persisted to `localStorage` per user via the scoped helpers. The user can switch orgs via the sidebar switcher.
- **`OrgSwitcher` component** in the sidebar header. Renders the current org's slug + role; opens a popover when the user belongs to more than one org. Switching invalidates every cached query so stale-org data doesn't bleed across the switch.
- **`X-Org-ID` axios interceptor** stamps the active org on every request. Backend's `ResolveOrg` reads this header to pick the active org.
- **`OrgSwitcher` integration test** covering the multi-org case + the single-org case (where the switcher renders nothing).

#### Changed

- **`AuthContext` initialization** now hydrates `currentOrg` synchronously alongside the user object. No flash of "no active org" during the auth bootstrap.
- **React Query default cache key** prefix updated to include `currentOrg?.id` for any query that touches org-scoped data. A `useQueryClient().invalidateQueries()` on org switch then evicts the right entries.

---

### Week 3 — SSO sign-in button + admin-only audit log page

Two enterprise-facing features landed in Week 3: SSO sign-in on `/login` and an admin-only audit log viewer at `/dashboard/audit`.

#### Added

- **`SsoSignInButton`** on `/login`. Probes `GET /api/v1/auth/sso/login` on mount; renders the button when the backend has OIDC configured, hides it otherwise. Clicking redirects the browser to the backend's `/auth/sso/login`, which redirects to the IdP. On callback, the backend issues the same access + refresh tokens the password flow does.
- **3 tests** covering the SSO button: visible when OIDC is configured, hidden when it's not, click-through to the SSO endpoint.
- **`/dashboard/audit` page**. Paginated table of the active org's audit log rows. Reads `GET /api/v1/audit?limit=50&offset=N`. Shows actor, action, resource, outcome, response status, IP, and a JSON preview of the request summary.
- **Admin-only gate** on the audit page. Pre-Week-4 it was an inline `currentOrgRole === 'admin'` check; Week 4 closeout replaced this with `usePermission(Actions.AuditRead)`.
- **4 audit page tests** covering: admin sees the table, viewer/operator sees the "Admin access required" alert, the pagination controls advance + retreat correctly.
- **Audit Log entry in the sidebar nav**. Hidden for non-admins via the per-org role filter.

#### Changed

- **`/login` layout** now has space for the SSO button below the password form, with a labelled divider when both options are available.

---

### Week 4 — Permission table mirror + RequirePermission primitives + canonical pref-sync hook

Week 4 brought RBAC primitives that mirror the backend's `policy.Can` matrix, plus a canonical hook for the cross-page pref-sync pattern that had been growing entangled in [`live/page.tsx`](src/app/dashboard/live/page.tsx).

#### Added

- **`src/lib/permissions.ts`** — frontend mirror of the backend's [`policy.go`](../Dinsight_API_Enhanced/internal/policy/policy.go) capability matrix. Action vocabulary + role capabilities duplicated by name so a grep across both codebases surfaces every gate. Authoritative gating still lives on the backend; this mirror is cosmetic — hides UI affordances the caller can't use.
- **10 tests for `permissions.ts`** including superset assertions (admin ⊇ operator ⊇ viewer), the high-leverage gates (audit read, alert rule delete, dataset delete = admin only), and the fail-closed contract on null role.
- **`<RequirePermission perm={...} fallback={...}>` component** and **`usePermission(action)` hook** in `src/components/auth/require-permission.tsx`. Reads `currentOrgRole` from `AuthContext`. Pre-hydration (`currentOrgRole === null`) returns false so we never flash forbidden affordances during the auth bootstrap. 7 tests cover the allowed / denied / pre-hydration / fallback paths.
- **`useDebouncedRemotePrefs<T>` hook** in `src/hooks/useDebouncedRemotePrefs.ts`. Extracts the four-step canonical pattern from `live/page.tsx` where it was entangled with 30+ other state slices:
  1. **Hydrate-local-first** on mount, before the network fetch resolves, so the UI doesn't flash defaults
  2. **Merge-fresh-server-before-save**: server snapshot merges over locally-hydrated value (default server-wins, caller can pass a field-by-field merge)
  3. **Debounce** writes (default 800ms); subsequent edits reset the timer
  4. **Flush-on-unmount** via `useEffect` cleanup so the user doesn't lose their last edit on navigation
- **10 tests for the hook** covering: local hydration race, server-wins merge, custom merge keeping local-only fields, synchronous local writes, debounce timer reset, no-save-before-hydration safety, `flushNow` flushes pending write, unmount flushes pending write, corrupt JSON in localStorage, save-failure re-arms dirty for retry.

---

### Week 4 closeout — Wire RequirePermission into the audit page + sidebar nav

The Week 4 PR shipped the RBAC primitives + 27 tests but no real UI surface consumed them. This closeout wired the two existing admin affordances.

#### Changed

- **`src/app/dashboard/audit/page.tsx`** — was `const isAdmin = currentOrgRole === 'admin'`, now `const canRead = usePermission(Actions.AuditRead)`. Same effective behavior today (admin is the only role with `audit.read` in the matrix), but the gate is now sourced from the same matrix the backend's `middleware.RequireAction(policy.ActionAuditRead)` reads. If the policy table ever grants `audit.read` to another role, this page updates with zero code change. The two surfaces can't drift.
- **`src/lib/navigation.ts`** — added a `requiredAction?: Action` field to `NavItem`. The Audit Log nav entry now uses `requiredAction: Actions.AuditRead` instead of `requiredOrgRoles: ['admin']`. Same matrix-driven argument as the audit page. Legacy `requiredOrgRoles` field kept for entries that gate on a role itself (not a specific action); new entries should prefer `requiredAction`.
- **`src/components/layout/sidebar.tsx`** — the nav filter now calls `can(currentOrgRole, item.requiredAction)` for entries that use the new field. Composes with the legacy `requiredOrgRoles` check (both must allow).

#### Not done — intentional

Inspected `live/page.tsx` and `insights/page.tsx` for migrating to `useDebouncedRemotePrefs`. Both fall outside what the current hook models:

- **`live/page.tsx`** has cross-device conflict detection (deviceId + updatedAt arbitration with a user-facing conflict modal) layered on top of the four canonical steps. The current hook doesn't model this; migrating would silently drop the feature.
- **`insights/page.tsx`** has NO remote layer — purely local persistence with a `setTimeout` debounce. Using a remote-prefs hook here would force a fake network round-trip.

The right answer is to build hook variants when there's a third real case: `useDebouncedRemotePrefsWithConflict<T>` for live, `useDebouncedLocalPrefs<T>` for insights. **Both variants landed in the Week 4 follow-up close-out below.**

---

### Week 4 follow-up close-out — Hook variants for local-only + conflict-aware pref sync

The two hook variants flagged at the end of the Week 4 closeout PR are now built and tested. The `useDebouncedRemotePrefs` family now covers all three patterns the foundation work surfaced.

#### Added

- **`src/hooks/useDebouncedLocalPrefs.ts`** — local-only variant. No fetchRemote / saveRemote / merge layer. Just hydrate from user-scoped localStorage on mount + debounced writes (default 250ms) + flush-on-unmount. Use when a surface has preferences that should be remembered across reloads on the same device but don't need cross-device sync. The canonical example is the insights page's UI layout toggles (`includeMonitoring`, `showWearSummaryMetrics`, `activePlotTab`, `isControlsCollapsed`).
- **`src/hooks/useDebouncedRemotePrefsWithConflict.ts`** — multi-device variant with cross-device conflict detection. Adds a fifth step to the canonical four: when the server snapshot is from a different `deviceId` AND newer than the local copy AND the user has unsaved local edits, the hook surfaces a `PrefsConflict<T>` via the `onConflict` callback instead of auto-merging. The page renders a modal and calls `resolveConflict({ kind: 'use-local' | 'merge', merged?: T })` with the user's choice. Required payload shape: `T extends PrefsWithMeta` (a `__meta?: { deviceId, updatedAt, version }` slot that the hook stamps automatically). When `onConflict` is omitted, behavior matches the simple `useDebouncedRemotePrefs` (server-wins).
- **8 tests for `useDebouncedLocalPrefs`** — hydration, default-when-empty, corrupt-JSON survival, debounced-writes-collapse, synchronous-state-update, flushNow, unmount-flush, per-user namespacing.
- **7 tests for `useDebouncedRemotePrefsWithConflict`** — local hydration, server-auto-apply when same device, conflict detection on foreign device + newer + local edits, `resolveConflict('merge', merged)` applies + saves, `resolveConflict('use-local')` schedules a save with the current value, `setPrefs` stamps `__meta`, fallback to server-wins when no `onConflict` callback.

#### Not done — explicitly parked

The live and insights pages still inline their own pref-sync logic. The hooks are now available; migrating each page is a separate refactor on a ~2000-line file with real regression risk. The hook variants alone close the "we need variants for the third case" follow-up; the page refactors are their own work item. New surfaces should prefer the hooks; existing surfaces can migrate opportunistically.

---

### Documentation refresh (PR-merged separately)

- **`CHANGELOG.md`** created — frontend was missing a per-repo changelog. This file covers the full four-week arc + closeout.
- Root **`README.md`** features list updated to reflect multi-tenancy, RBAC, SSO, and the audit log. Pre-foundation it only mentioned "JWT-based authentication with role-based access control" — now lists the full capability set.

---

### Deploy hardening — vm-test multi-dev isolation + backend folder rename

Three follow-up tweaks landed in `deploy/vm-test/`, plus a working-tree rename of the backend folder. No frontend source touched — docs and compose only.

#### Changed

- **Backend folder rebadged on disk** `Dinsight_API` → `Dinsight_API_Enhanced`. Working-tree-only rename; the backend's git remote and repo name are unchanged. Doc + compose references updated across:
  - Root [`README.md`](../README.md), [`docs/README.md`](../docs/README.md)
  - [`frontend/README.md`](README.md), this file
  - [`deploy/vm-test/README.md`](../deploy/vm-test/README.md), [`.env.example`](../deploy/vm-test/.env.example), [`compose.yml`](../deploy/vm-test/compose.yml)
- **[`deploy/vm-test/compose.yml`](../deploy/vm-test/compose.yml)** dropped hardcoded `container_name:` fields on all five services (postgres, api, frontend, caddy, mailpit). Container names now resolve to `<COMPOSE_PROJECT_NAME>-<service>-<index>` — two devs on one VM each pick a distinct `COMPOSE_PROJECT_NAME` in their `.env` and run side-by-side without collisions.
- **Image tags + Mailpit port parameterized**: `dinsight-api:${IMAGE_TAG:-vm-test}`, `dinsight-frontend:${IMAGE_TAG:-vm-test}`, Mailpit web UI on `${MAILPIT_PORT:-8025}:8025`. Defaults preserve the existing single-dev behaviour.
- **SMTP / email block parameterized**. Previously the api container hardcoded `EMAIL_PROVIDER`, `EMAIL_FROM`, `EMAIL_FROM_NAME`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_TLS`, and `REQUIRE_EMAIL_VERIFICATION` to mailpit-shaped values, and `SMTP_USERNAME` / `SMTP_PASSWORD` were never passed through at all — meaning the stack couldn't reach a real SMTP relay even if `.env` provided credentials. Each setting now reads from `.env` with the mailpit defaults preserved when unset:
  - `EMAIL_PROVIDER: ${EMAIL_PROVIDER:-smtp}`
  - `EMAIL_FROM: "${EMAIL_FROM:-noreply@dinsight.local}"`
  - `EMAIL_FROM_NAME: "${EMAIL_FROM_NAME:-Dinsight}"`
  - `SMTP_HOST: ${SMTP_HOST:-mailpit}` / `SMTP_PORT: "${SMTP_PORT:-1025}"` / `SMTP_TLS: "${SMTP_TLS:-false}"`
  - `SMTP_USERNAME: ${SMTP_USERNAME:-}` / `SMTP_PASSWORD: ${SMTP_PASSWORD:-}` (new pass-throughs)
  - `REQUIRE_EMAIL_VERIFICATION: "${REQUIRE_EMAIL_VERIFICATION:-false}"`
- **Postgres user + DB name parameterized for symmetry with the password**. `POSTGRES_PASSWORD` was already env-driven; `POSTGRES_USER` and `POSTGRES_DB` were hardcoded as `postgres` / `dinsight` in four places (postgres service env, healthcheck `pg_isready` test, api container `DB_USER` / `DB_NAME`). All four now reference `${POSTGRES_USER:-postgres}` / `${POSTGRES_DB:-dinsight}`, so overriding either flows through the whole stack.

#### Added

- **"Multi-dev isolation" block in [`deploy/vm-test/.env.example`](../deploy/vm-test/.env.example)** documenting `COMPOSE_PROJECT_NAME`, `IMAGE_TAG`, and `MAILPIT_PORT` with examples.
- **"Email / SMTP" block in [`deploy/vm-test/.env.example`](../deploy/vm-test/.env.example)** documenting every SMTP knob plus a Resend-shaped production reference section (smtp.resend.com :465 implicit TLS, `REQUIRE_EMAIL_VERIFICATION=true`). The `.env` template gets a commented Postgres + SMTP block matching, so adding a real relay is uncomment-and-edit.
- **"Multi-dev isolation on a shared VM" section in [`deploy/vm-test/README.md`](../deploy/vm-test/README.md)** covering the three env knobs, the Caddy port reminder, and the auto-namespaced Postgres volume.
- **"Pointing at a real SMTP relay" + "Postgres user + DB name" sections in [`deploy/vm-test/README.md`](../deploy/vm-test/README.md)** covering provider verification (SPF/DKIM), the verification-gate migration grandfather, and the wipe-volume-to-rotate-creds caveat.

---

### Deploy hardening — structural fix for the devices.json mount

Two failure modes hit the VM deploy enough times to warrant a structural fix instead of repeated `touch` / `chmod 666`:

1. **Existence** — if `devices.json` didn't pre-exist on the host before `docker compose up`, Docker auto-created it **as a directory**, and the backend exited with `read /app/devices.json: is a directory`.
2. **Writability** — even as a correct file (host-user, mode 664), the distroless api image runs as UID 65532. The container couldn't write the host-owned file, exited with `permission denied`.

The fix moves the device store into a git-tracked directory and pins the api container to the host user. Both failure modes are now structurally impossible — a clean `git pull` + rebuild needs zero manual `touch` / `chmod` / `chown`.

#### Changed

- **[`deploy/vm-test/compose.yml`](../deploy/vm-test/compose.yml)** api service:
  - Devices mount switched from a bare file (`./devices.json:/app/devices.json`) to a directory (`./runtime:/app/runtime`). A bind-mounted directory that exists in git can't be auto-created as the wrong type.
  - `DEVICES_PATH` updated to `/app/runtime/devices.json`. The api creates the file inside the mounted directory on first device registration (`pkg/license/device.go` already handles missing-file via `os.IsNotExist` → empty map → write-on-first-save at mode 0600).
  - Added `user: "${HOST_UID:-1000}:${HOST_GID:-1000}"`. Files the api writes into `runtime/` now belong to the host user; the host shell can `cat`/`rm`/inspect them without sudo.
  - `license.lic` bind mount untouched — still `:ro`, still operator-pre-placed.

#### Added

- **`HOST_UID` / `HOST_GID` block in [`deploy/vm-test/.env.example`](../deploy/vm-test/.env.example)** documenting the override (default `1000`, standard first-Linux-user UID; macOS dev typically needs `id -u` → `501`).
- **README Step 2 rewrite** in [`deploy/vm-test/README.md`](../deploy/vm-test/README.md) — drops the `touch devices.json` line; the api writes its own devices.json into the committed `runtime/` directory. Plus a new troubleshooting entry for the `permission denied` case pointing at `HOST_UID` / `HOST_GID`.

The companion backend change in `Dinsight_API_Enhanced` (branch `fix/devices-runtime-dir`):
- Adds `runtime/` + `runtime/.gitkeep`, with `.gitignore` rules (`/runtime/*` + `!/runtime/.gitkeep`) so the directory tracks but its contents stay out of git.
- Same compose pattern applied to the backend's own host-side `docker-compose.yml` so the two stacks stay consistent.
- Removes the orphan root-level `devices.json` (was untracked; both compose files now mount `runtime/` instead).
- Drops the now-stale `# touch devices.json` hint from the backend `README.md`.

---

### Test totals

After Week 4 follow-up close-out: **121 / 121 tests green** (106 Week 4 + 15 new from the two hook variants), `pnpm type-check` clean, `pnpm lint` clean.

| Suite                                | Tests |
|--------------------------------------|------:|
| `src/lib/__tests__/permissions.test.ts`               | 10 |
| `src/lib/__tests__/scoped-storage.test.ts`            | 5 |
| `src/lib/__tests__/dataset-normalizers.test.ts`       | 3 |
| `src/lib/__tests__/dashboard-overview.test.ts`        | 6 |
| `src/lib/__tests__/health-status.test.ts`             | 3 |
| `src/lib/__tests__/ia-regression.test.ts`             | 3 |
| `src/components/auth/__tests__/require-permission.test.tsx` | 7 |
| `src/components/ui/__tests__/alert.test.tsx`          | 9 |
| `src/components/ui/__tests__/badge.test.tsx`          | 12 |
| `src/components/ui/__tests__/input.test.tsx`          | 8 |
| `src/components/ui/__tests__/table.test.tsx`          | 12 |
| `src/components/layout/__tests__/sidebar.integration.test.tsx` | 1 |
| `src/components/layout/__tests__/org-switcher.test.tsx`        | 4 |
| `src/app/dashboard/__tests__/dashboard-page.integration.test.tsx` | 1 |
| `src/app/dashboard/audit/__tests__/audit-page.test.tsx`           | 4 |
| `src/app/login/__tests__/login-sso-button.test.tsx`               | 3 |
| `src/hooks/__tests__/useBaselineMonitoringData.test.tsx`          | 1 |
| `src/hooks/__tests__/useDatasetDiscovery.test.tsx`                | 1 |
| `src/hooks/__tests__/useDebouncedRemotePrefs.test.tsx`            | 10 |
| `src/hooks/__tests__/useDebouncedLocalPrefs.test.tsx`             | 8 |
| `src/hooks/__tests__/useDebouncedRemotePrefsWithConflict.test.tsx`| 7 |
| `src/hooks/__tests__/useMachineHealthStatus.test.ts`              | 2 |
| `src/hooks/__tests__/useUploadWorkflow.test.tsx`                  | 1 |
