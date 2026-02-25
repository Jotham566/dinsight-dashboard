# Frontend Operator-First Refactor Blueprint

## 1. Purpose and Outcomes
This document defines the end-to-end frontend refactor and cleanup plan for the DInsight dashboard to support factory workers with limited data-analysis skills.

### Primary outcomes
- Reduce dashboard experience to **5 core pages**.
- Preserve and strengthen core functionality:
  - Baseline upload and processing
  - Monitoring upload and processing
  - Live monitoring visualization
  - Anomaly detection
  - Deterioration analysis
  - Auth/profile/security flows
- Replace analyst-heavy UX with operator-first UX:
  - Clear machine state: `OK`, `Deteriorating`, `Failing`
  - Minimal cognitive load
  - Guided workflows
- Raise UI quality to clean, modern, enterprise-grade standards.
- Add comprehensive automated tests to prevent regressions.

### Explicit constraint
- **No backward compatibility required** (development mode).
- Old routes/components can be removed once replacements are complete and tested.

---

## 2. Target Information Architecture (Final 5 Pages)

## 2.1 Final pages
1. `/dashboard` - **Machine Status**
2. `/dashboard/data` - **Data Ingestion**
3. `/dashboard/live` - **Live Monitor**
4. `/dashboard/insights` - **Health Insights**
5. `/dashboard/account` - **Account & Security**

## 2.2 Removed/merged pages
- Remove:
  - `/dashboard/dinsight-analysis`
  - `/dashboard/dinsight-analysis/data-summary`
  - `/dashboard/visualization`
  - `/dashboard/analysis`
  - `/dashboard/streaming`
  - `/dashboard/deterioration-analysis`
  - `/dashboard/features` (or keep internal/admin-only, not operator-facing)
  - `/dashboard/profile`
  - `/dashboard/settings`

## 2.3 New mapping (logical merge)
- Ingestion logic from:
  - `frontend/src/app/dashboard/dinsight-analysis/page.tsx`
  - `frontend/src/app/dashboard/dinsight-analysis/data-summary/page.tsx`
  - -> `/dashboard/data`
- Live logic from:
  - `frontend/src/app/dashboard/streaming/page.tsx`
  - `frontend/src/app/dashboard/visualization/page.tsx`
  - -> `/dashboard/live`
- Insights logic from:
  - `frontend/src/app/dashboard/analysis/page.tsx`
  - `frontend/src/app/dashboard/deterioration-analysis/page.tsx`
  - -> `/dashboard/insights`
- Account logic from:
  - `frontend/src/app/dashboard/profile/page.tsx`
  - `frontend/src/app/dashboard/settings/page.tsx`
  - -> `/dashboard/account`

---

## 3. UX Principles and Design Standard

## 3.1 Operator-first principles
- Show answers before analysis:
  - `Current Machine State`
  - `Trend`
  - `Recommended Action`
- One primary action per page.
- Progressive disclosure:
  - Hide advanced controls behind explicit `Advanced` sections.
- Reduce jargon:
  - `Anomaly percentage` -> `Abnormal behavior`
  - `Deterioration` -> `Wear trend`
  - `DInsight ID` -> `Dataset`

## 3.2 Layout standard
- App-level:
  - Clean left navigation with max 5 items.
  - Consistent top status strip (state + last update + active alerts).
- Page-level:
  - Desktop: 2-column layout (`controls` + `results`)
  - Mobile: stacked layout with sticky action footer where needed.
- Visual style:
  - Subtle gradients and restrained shadows.
  - Strong spacing system and readable typography.
  - High contrast and clear color semantics:
    - Green = OK
    - Amber = Deteriorating
    - Red = Failing

## 3.3 Accessibility and usability
- Keyboard navigable controls and dialogs.
- Semantic headings and landmarks.
- `aria-live` for processing and status updates.
- Minimum touch target sizes for tablet/factory-floor use.

---

## 4. Technical Refactor Strategy

## 4.1 Consolidate duplicate logic into shared hooks
Create reusable hooks in `frontend/src/hooks/`:
- `useDatasetDiscovery.ts`
  - Single source of truth for available DInsight datasets.
- `useBaselineMonitoringData.ts`
  - Fetch and normalize baseline + monitoring coordinates and metadata.
- `useUploadWorkflow.ts`
  - Handles baseline/monitor uploads and status polling.
- `useMachineHealthStatus.ts`
  - Derives `OK | Deteriorating | Failing` from anomaly + deterioration metrics.

## 4.2 Shared domain utilities
Create/refactor utilities in `frontend/src/lib/` and `frontend/src/utils/`:
- `health-status.ts` for state thresholds and recommendation text.
- `dataset-normalizers.ts` for payload normalization and safety checks.
- `ui-copy.ts` for operator-safe terminology.

## 4.3 API layer cleanup
Refactor `frontend/src/lib/api-client.ts`:
- Keep only endpoints used by target 5-page flow.
- Remove dead organization/machine/legacy paths not used by new UI.
- Introduce typed response models for all active endpoints.

## 4.4 Navigation cleanup
Refactor `frontend/src/lib/navigation.ts` and layout components:
- Keep only:
  - Dashboard
  - Data Ingestion
  - Live Monitor
  - Health Insights
  - Account & Security
- Remove broken links and dead menu entries.

---

## 5. Page Specifications (Final State)

## 5.1 `/dashboard` Machine Status
### Goal
One-screen operational status snapshot.

### Content
- Machine state card: `OK | Deteriorating | Failing`
- Secondary stats:
  - Abnormal behavior (%)
  - Wear trend (up/down)
  - Last data timestamp
- CTA buttons:
  - `Upload Data` -> `/dashboard/data`
  - `Open Live Monitor` -> `/dashboard/live`
  - `View Insights` -> `/dashboard/insights`

### Acceptance criteria
- Worker can determine machine condition in under 5 seconds.

## 5.2 `/dashboard/data` Data Ingestion
### Goal
Simple guided flow for baseline and monitoring uploads.

### Flow
1. Baseline upload
2. Processing status/progress
3. Monitoring upload
4. Completion with next-step CTA (`Go to Live Monitor`)

### Controls
- Default-simple mode only.
- Advanced config hidden behind collapsible section.

### Acceptance criteria
- No manual dataset ID entry required for common path.
- Clear errors for invalid CSV/processing failures.

## 5.3 `/dashboard/live` Live Monitor
### Goal
Real-time operational view.

### Content
- Live scatter/trajectory view with clear legend.
- State ribbon at top: current status + alert summary.
- Monitoring controls:
  - Start/refresh/reset monitoring view
  - Auto-refresh on/off
- Optional advanced panel:
  - contour overlays
  - metadata hover toggles

### Acceptance criteria
- Default view is comprehensible without changing any settings.

## 5.4 `/dashboard/insights` Health Insights
### Goal
Interpretation page that combines anomaly + deterioration.

### Sections
- Decision card:
  - Risk level
  - Top reason(s)
  - Recommended action
- Abnormal behavior section (anomaly)
- Wear trend section (deterioration)
- Timeline/trend chart

### Acceptance criteria
- User can identify reason and action without reading formulas.
- Formulas/technical metrics available only in advanced info drawers.

## 5.5 `/dashboard/account` Account & Security
### Goal
Single place for profile, password, sessions, preferences.

### Content
- Profile edit
- Change password dialog
- Active sessions + revoke controls
- Notification/preferences section

### Acceptance criteria
- Remove duplicate profile/settings pages.

---

## 6. Phased Execution Plan

### Phase Status (Current)
- Phase 1 - Foundation Refactor: **Completed**
- Phase 2 - Navigation and IA Rewrite: **Completed**
- Phase 3 - Data Ingestion + Live Monitor: **Completed**
- Phase 4 - Health Insights + Account: **Completed**
- Phase 5 - Remove Legacy Pages and Dead Code: **Completed**
- Phase 6 - Hardening and QA: **Completed**

Validation status for Phases 1-6:
- `npm run build`: **Passing**
- `npm run lint`: **Passing**
- `npm run test`: **Passing**
- `npm run test:e2e`: **Passing**
- `npm run test:all`: **Passing**

Notes:
- Phase completion is based on implemented routes, shared hooks extraction, page consolidation, and current successful type-check/test/build runs.
- This status reflects the current development state and should be revalidated after any new changes.
- Core workflow e2e coverage, regression checks, and CI `test:all` wiring are now in place under Phase 6.

## Phase 0 - Baseline and Safety Setup
- Create branch and checkpoint.
- Add test scaffolding (unit + integration + e2e).
- Add visual regression snapshot baseline for key current flows.

Deliverables:
- Testing framework in place.
- Existing critical flows captured as baseline tests.

## Phase 1 - Foundation Refactor (No UI merge yet)
- Extract shared hooks and utilities.
- Refactor API client to typed, centralized active endpoints.
- Remove duplicated dataset scanning logic from individual pages.

Deliverables:
- Shared hooks used by old pages.
- All existing flows still green.

## Phase 2 - Navigation and IA Rewrite
- Replace nav with 5 final destinations.
- Remove dead links and stale menu items.
- Create empty scaffolds for new routes.

Deliverables:
- App shell shows only 5 pages.
- No broken links.

## Phase 3 - Build `Data Ingestion` and `Live Monitor`
- Migrate and simplify ingestion workflows.
- Migrate streaming + visualization into one live page.
- Hide advanced options behind collapsible panel.

Deliverables:
- End-to-end ingest + live monitoring usable from new pages.

## Phase 4 - Build `Health Insights` and `Account`
- Merge anomaly + deterioration into one interpretation page.
- Merge profile + settings + security into account page.

Deliverables:
- Decision-focused insights page.
- Unified account page.

## Phase 5 - Remove Legacy Pages and Dead Code
- Delete legacy route files and unused components.
- Remove obsolete API methods and utilities.
- Final style polish and consistency pass.

Deliverables:
- Clean codebase with final IA only.

## Phase 6 - Hardening and QA
- Full test run and bug fixes.
- Performance/accessibility pass.
- Final regression verification.

Deliverables:
- Release-ready dev milestone.

---

## 7. Testing Strategy (Comprehensive)

## 7.1 Tooling
- Unit + component tests: `Vitest` + `React Testing Library`
- Integration tests: RTL + mocked API (`MSW`)
- E2E tests: `Playwright`
- Optional visual diff: Playwright screenshot assertions

## 7.2 Unit tests
Test files:
- `useDatasetDiscovery.test.ts`
- `useBaselineMonitoringData.test.ts`
- `useUploadWorkflow.test.ts`
- `useMachineHealthStatus.test.ts`
- `health-status.test.ts`
- `dataset-normalizers.test.ts`

Coverage targets:
- >= 90% for core hooks/utilities
- 100% for health status classification rules

## 7.3 Component/integration tests
Pages/components:
- Data ingestion wizard states:
  - idle, uploading, processing, success, failure
- Live monitor:
  - no baseline, baseline only, baseline+monitoring
- Insights:
  - no data, anomaly only, deterioration only, combined
- Account:
  - profile save, password change validation, session revoke

Key assertions:
- Primary CTA visibility and behavior
- Error state copy and recovery actions
- Advanced panels collapsed by default

## 7.4 E2E tests (critical workflows)
1. Login -> dashboard state visible
2. Upload baseline -> processing -> success
3. Upload monitoring -> appears in live view
4. Run insights -> status updates to expected bucket
5. Change password flow works
6. Session revoke flow works
7. Navigation only exposes 5 pages
8. No dead links (`404`) from app shell

## 7.5 Regression suite
- Contract checks for active backend endpoints used by new UI.
- Snapshot checks for key page blocks:
  - status header
  - decision card
  - ingestion progress panel
- Performance checks:
  - page interactive time threshold
  - heavy charts render within agreed budget

## 7.6 Test commands (to add/update in `frontend/package.json`)
- `test` - unit/component tests
- `test:watch` - watch mode
- `test:coverage` - coverage report
- `test:e2e` - Playwright e2e
- `test:e2e:ui` - interactive e2e
- `test:all` - lint + type-check + unit + e2e

---

## 8. Definition of Done (Per Phase and Final)

## Per phase DoD
- Code compiles and type-checks.
- New/updated tests included.
- No failing lint or tests.
- UX acceptance criteria for touched page(s) met.

## Final DoD
- Only 5 operator pages remain in navigation.
- Legacy pages removed from codebase.
- All critical workflows pass e2e.
- No broken links.
- Accessibility checks pass for core pages.
- Core functionality verified manually and by tests.

---

## 9. Non-Functional Quality Gates

## Performance
- Avoid repeated dataset scans in multiple pages.
- Cache dataset discovery and normalize data once.
- Keep chart interactions responsive with large datasets.

## Reliability
- Unified error handling and retry behavior.
- Explicit loading and empty states.

## Security
- Respect auth guard behavior on all dashboard pages.
- Sensitive actions (password/session revoke) require explicit confirmation.

## Maintainability
- Shared hooks replace duplicated page logic.
- Strong TypeScript models for endpoint payloads.
- Remove dead code and stale endpoint wrappers.

---

## 10. Implementation Backlog Checklist

## 10.1 Routing and shell
- [x] Create `/dashboard/data`
- [x] Create `/dashboard/live`
- [x] Create `/dashboard/insights`
- [x] Create `/dashboard/account`
- [x] Refactor `/dashboard` for operator state
- [x] Replace navigation with 5 pages only

## 10.2 Data and logic consolidation
- [x] Implement `useDatasetDiscovery`
- [x] Implement `useBaselineMonitoringData`
- [x] Implement `useUploadWorkflow`
- [x] Implement `useMachineHealthStatus`
- [x] Remove duplicate scanning/polling code from pages

## 10.3 Page merges
- [x] Merge ingestion pages into `/dashboard/data`
- [x] Merge streaming+visualization into `/dashboard/live`
- [x] Merge analysis+deterioration into `/dashboard/insights`
- [x] Merge profile+settings into `/dashboard/account`

## 10.4 UX/layout polish
- [x] Apply unified status strip
- [x] Apply consistent 2-column page layout
- [x] Move advanced controls into collapsible sections
- [x] Replace technical copy with operator copy
- [x] Validate responsive behavior (desktop/tablet/mobile)

## 10.5 Testing
- [x] Add unit tests for hooks/utilities
- [x] Add integration tests for page flows
- [x] Add e2e tests for core workflows
- [x] Add regression/perf checks
- [x] Wire `test:all` in CI

## 10.6 Cleanup
- [x] Delete legacy pages and dead components
- [x] Delete obsolete API client methods
- [x] Remove stale routes/links

---

## 11. Risks and Mitigations

## Risk: Functionality regressions during merge
- Mitigation: extract logic into hooks first, then compose new pages.

## Risk: API shape inconsistencies across old pages
- Mitigation: strict normalization layer with typed guards.

## Risk: Scope creep in UI redesign
- Mitigation: enforce page-level acceptance criteria and phased delivery.

## Risk: Hidden dependency on removed routes
- Mitigation: run dead-link scans and full e2e route coverage before cleanup.

---

## 12. Execution Notes
- Start with shared hooks + tests before moving UI.
- Merge behavior, then simplify visuals and copy.
- Keep refactors incremental and test-driven.
- Do not introduce backend API changes unless unavoidable.
