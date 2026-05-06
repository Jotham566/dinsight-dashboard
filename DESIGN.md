# DInsight Dashboard Design System

## 1. Purpose

This document defines the centralized design system for the DInsight dashboard.

The goal is to create a consistent, modern, minimalist, operator-friendly interface for predictive maintenance and industrial monitoring workflows. The system must reduce visual drift, improve usability, and ensure that every page, component, theme, and interaction feels like part of the same product.

This is not a mood board. It is the source of truth for visual direction, theme structure, component behavior, and implementation rules.

## 2. Product Context

DInsight is an industrial operations product. Its core users are:
- Plant operators
- Maintenance teams
- Reliability engineers
- Operations managers

These users need speed, clarity, and trust. They are not using the dashboard for visual novelty. They are using it to understand machine condition, detect abnormal behavior, monitor deterioration, and act with confidence.

That context drives the design standard:
- High signal, low noise
- Clear machine-state communication
- Minimal cognitive load
- Fast scanning under operational pressure
- Strong contrast and accessibility
- Consistency across all flows

## 3. Design Principles

### 3.1 Operator-first
- Show status before analysis.
- Show recommended action before technical detail.
- Keep the primary action obvious on every page.
- Use plain operational language.

### 3.2 Industrial minimalism
- Interfaces should feel calm, precise, and credible.
- Surfaces should be clean and structured.
- Visual hierarchy should come from spacing, type, contrast, and layout, not decoration.

### 3.3 Consistency over creativity
- Reuse the same tokens, components, spacing, and state patterns everywhere.
- Similar actions should always look and behave the same.
- Similar states should always use the same color and language.

### 3.4 Accessible by default
- Keyboard focus must be visible.
- Contrast must meet WCAG AA at minimum.
- Color must not be the only signal.
- Motion must never be required for comprehension.

## 4. Visual Direction

The visual style should feel:
- Industrial
- Modern
- Calm
- Compact but not cramped
- Enterprise-grade

It should not feel:
- Playful
- Futuristic for its own sake
- Marketing-heavy
- Glossy
- Decorative

Explicitly avoid:
- Gradients as decoration
- Background patterns or mesh textures
- Glassmorphism and heavy backdrop blur
- Floating cards
- Glows
- Pulsing badges unless they represent a real live condition
- Over-animated dashboards

## 5. Theme Strategy

### 5.1 Supported themes
- Light theme: first-class
- Dark theme: first-class
- System theme: supported as the default behavior in-app

Both themes must be designed intentionally. Dark mode is not a color inversion of light mode, and light mode is not an afterthought.

### 5.2 Theme philosophy
- Light theme should be the baseline reference for daytime and operational environments.
- Dark theme should preserve the same hierarchy, spacing, and semantics without increasing visual noise.
- Theme switching must not change layout, spacing, or component behavior.

## 6. Token Architecture

All visual decisions must flow through semantic tokens.

Implementation order:
1. Design tokens
2. Theme variables
3. Primitive UI components
4. Composite layout patterns
5. Pages

Page files must not invent their own color systems.

### 6.1 Required token groups
- Canvas and surface colors
- Text colors
- Border colors
- Focus colors
- Interactive colors
- Interactive state colors
- Disabled-state colors
- Overlay and scrim colors
- Semantic status colors
- Semantic status ramps
- Spacing scale
- Radius scale
- Elevation scale
- Motion timing
- Typography scale
- Data-visualization tokens

### 6.2 Core semantic tokens

Use semantic names such as:
- `--color-canvas`
- `--color-surface`
- `--color-surface-raised`
- `--color-surface-muted`
- `--color-border`
- `--color-border-strong`
- `--color-text`
- `--color-text-muted`
- `--color-text-subtle`
- `--color-accent`
- `--color-accent-hover`
- `--color-focus`
- `--color-overlay-scrim`
- `--color-disabled-text`
- `--color-disabled-border`
- `--color-success`
- `--color-warning`
- `--color-danger`
- `--color-info`

Never treat raw color families like `gray`, `blue`, or `red` as the public design API.

### 6.3 Contextual UI token families

Every theme must define contextual tokens for the major UI states below.

Required surface and interaction tokens:
- `--color-surface-hover`
- `--color-surface-selected`
- `--color-surface-disabled`
- `--color-control-bg`
- `--color-control-bg-hover`
- `--color-control-bg-disabled`
- `--color-control-border`
- `--color-control-border-hover`
- `--color-control-border-focus`
- `--color-control-border-disabled`

Required semantic status families:
- `--color-success-bg`
- `--color-success-border`
- `--color-success-text`
- `--color-warning-bg`
- `--color-warning-border`
- `--color-warning-text`
- `--color-danger-bg`
- `--color-danger-border`
- `--color-danger-text`
- `--color-info-bg`
- `--color-info-border`
- `--color-info-text`

Required chart-support tokens:
- `--color-chart-grid`
- `--color-chart-axis`
- `--color-chart-neutral-line`
- `--color-chart-threshold`

Rules:
- Component primitives must consume these contextual tokens instead of using ad hoc tints or opacity blends.
- If a new component needs a new state token, it must be added centrally before use.
- Semantic states must be available as complete families, not single colors.

## 7. Color System

### 7.1 Base palette intent

The product should use restrained industrial neutrals with a single clear accent color.

- Neutral base: steel/slate
- Accent: industrial blue
- Success: green
- Warning: amber
- Danger: red
- Info: blue-cyan

The accent color is for interaction and selection, not decoration.
Green must not be used as a brand color because it is reserved for healthy and successful system states.

### 7.2 Theme tokens

#### Light theme

| Token | Value | Usage |
| --- | --- | --- |
| `--color-canvas` | `#F3F5F7` | App background |
| `--color-surface` | `#FFFFFF` | Primary cards and panels |
| `--color-surface-raised` | `#FFFFFF` | Dialogs, menus, elevated surfaces |
| `--color-surface-muted` | `#E9EEF3` | Secondary panels, controls, chart bands |
| `--color-border` | `#D5DEE7` | Default borders |
| `--color-border-strong` | `#B7C4D1` | Strong separators, selected outlines |
| `--color-text` | `#0F1720` | Primary text |
| `--color-text-muted` | `#475467` | Supporting text |
| `--color-text-subtle` | `#667085` | Meta text |
| `--color-accent` | `#155EEF` | Primary actions, focus, selected state |
| `--color-accent-hover` | `#004EEB` | Primary hover state |
| `--color-focus` | `#155EEF` | Focus ring |
| `--color-overlay-scrim` | `rgba(15, 23, 32, 0.48)` | Dialog and drawer backdrop |
| `--color-disabled-text` | `#98A2B3` | Disabled content |
| `--color-disabled-border` | `#D0D5DD` | Disabled controls |
| `--color-success` | `#15803D` | Healthy, success |
| `--color-warning` | `#B45309` | Attention, deterioration |
| `--color-danger` | `#B42318` | Failure, critical |
| `--color-info` | `#0F6E8C` | Informational status |

#### Dark theme

| Token | Value | Usage |
| --- | --- | --- |
| `--color-canvas` | `#0B1218` | App background |
| `--color-surface` | `#111A22` | Primary cards and panels |
| `--color-surface-raised` | `#15212C` | Dialogs, menus, elevated surfaces |
| `--color-surface-muted` | `#1B2A36` | Secondary panels, controls, chart bands |
| `--color-border` | `#2A3A47` | Default borders |
| `--color-border-strong` | `#425466` | Strong separators, selected outlines |
| `--color-text` | `#F3F5F7` | Primary text |
| `--color-text-muted` | `#C7D0D9` | Supporting text |
| `--color-text-subtle` | `#98A7B5` | Meta text |
| `--color-accent` | `#6EA8FE` | Primary actions, focus, selected state |
| `--color-accent-hover` | `#8BC0FF` | Primary hover state |
| `--color-focus` | `#6EA8FE` | Focus ring |
| `--color-overlay-scrim` | `rgba(3, 10, 16, 0.64)` | Dialog and drawer backdrop |
| `--color-disabled-text` | `#748190` | Disabled content |
| `--color-disabled-border` | `#31414D` | Disabled controls |
| `--color-success` | `#22A75A` | Healthy, success |
| `--color-warning` | `#D18A1D` | Attention, deterioration |
| `--color-danger` | `#E35D5B` | Failure, critical |
| `--color-info` | `#4FA7C6` | Informational status |

### 7.3 Contextual UI token mappings

These are required mappings for both themes.

| Token | Light Theme | Dark Theme | Usage |
| --- | --- | --- | --- |
| `--color-surface-hover` | `#F8FAFC` | `#16212B` | Hoverable cards, rows, nav items |
| `--color-surface-selected` | `#EAF2FF` | `#1C3047` | Current page, selected rows, active tabs |
| `--color-surface-disabled` | `#F2F4F7` | `#121A22` | Disabled surfaces |
| `--color-control-bg` | `#FFFFFF` | `#111A22` | Inputs, selects, field-like controls |
| `--color-control-bg-hover` | `#FCFCFD` | `#15212C` | Input hover |
| `--color-control-bg-disabled` | `#F2F4F7` | `#121A22` | Disabled controls |
| `--color-control-border` | `#D5DEE7` | `#2A3A47` | Default field/control border |
| `--color-control-border-hover` | `#B7C4D1` | `#425466` | Hover border |
| `--color-control-border-focus` | `#155EEF` | `#6EA8FE` | Focus-visible border/ring |
| `--color-control-border-disabled` | `#D0D5DD` | `#31414D` | Disabled border |
| `--color-chart-grid` | `#E4E7EC` | `#263542` | Chart grid lines |
| `--color-chart-axis` | `#667085` | `#98A7B5` | Axis labels and ticks |
| `--color-chart-neutral-line` | `#98A2B3` | `#748190` | Neutral trend lines |
| `--color-chart-threshold` | `#B45309` | `#D18A1D` | Threshold and warning markers |

### 7.4 Semantic state ramps

Each semantic state must be defined as a family, not a single swatch.

| Family | Light Theme | Dark Theme | Usage |
| --- | --- | --- | --- |
| Success bg / border / text | `#ECFDF3 / #ABEFC6 / #067647` | `#0D2217 / #1F7A47 / #6CE9A6` | Healthy state, success alerts, OK chips |
| Warning bg / border / text | `#FFFAEB / #FEDF89 / #B54708` | `#261A08 / #9A6700 / #FEC84B` | Deteriorating state, warning alerts |
| Danger bg / border / text | `#FEF3F2 / #FECDCA / #B42318` | `#2B1110 / #B9382F / #FDA29B` | Failing state, destructive alerts |
| Info bg / border / text | `#F0F9FF / #B9E6FE / #026AA2` | `#0D1F29 / #175C7D / #7CD4FD` | Informational alerts and notices |

Required token names:
- `--color-success-bg`, `--color-success-border`, `--color-success-text`
- `--color-warning-bg`, `--color-warning-border`, `--color-warning-text`
- `--color-danger-bg`, `--color-danger-border`, `--color-danger-text`
- `--color-info-bg`, `--color-info-border`, `--color-info-text`

### 7.5 Machine-state semantics

These states are core product language and must be consistent everywhere:

- `OK`
  - Color family: success
  - Meaning: stable, normal, within expected range
- `Deteriorating`
  - Color family: warning
  - Meaning: degrading, needs attention soon
- `Failing`
  - Color family: danger
  - Meaning: critical, immediate action required

Rules:
- Never use accent blue for health states.
- Never use ambiguous colors for status.
- Pair color with label and icon.
- Keep the state vocabulary identical across dashboard cards, tables, badges, charts, alerts, and reports.

## 8. Typography

### 8.1 Font families

Primary UI font:
- `IBM Plex Sans`

Monospace support font:
- `IBM Plex Mono`

Fallbacks:
- `system-ui`, `sans-serif` for UI
- `ui-monospace`, `monospace` for technical values

Rationale:
- IBM Plex Sans feels more technical and product-specific than default SaaS typography while remaining highly legible.
- IBM Plex Mono is appropriate for timestamps, IDs, sensor-related values, and technical diagnostics.

### 8.2 Typography rules
- Use a single sans family for headings, labels, and body text.
- Do not use a decorative display font.
- Use monospace only for data where alignment or technical readability matters.
- Prefer weight and spacing over oversized text for hierarchy.

### 8.3 Type scale

| Role | Size / Line Height | Weight | Usage |
| --- | --- | --- | --- |
| Page title | `28 / 36` | `600` | Primary page heading |
| Section title | `22 / 30` | `600` | Section headers |
| Card title | `18 / 26` | `600` | Card headings |
| Body | `14 / 22` | `400` | Standard UI text |
| Body strong | `14 / 22` | `500` | Important supporting copy |
| Label | `13 / 18` | `500` | Form labels, field headers |
| Caption | `12 / 16` | `400` | Metadata, timestamps, helper text |
| Metric | `24 / 30` | `600` | KPI values |
| Mono meta | `12 / 16` | `500` | IDs, timestamps, technical values |

### 8.4 Numeric behavior
- Use tabular numerals for metrics, timestamps, percentages, and values in comparison tables.
- Avoid center alignment for tabular data.
- Keep units visually secondary to values.

## 9. Spacing, Radius, and Elevation

### 9.1 Spacing system

Use a 4px base scale.

Approved spacing steps:
- `4`
- `8`
- `12`
- `16`
- `20`
- `24`
- `32`
- `40`
- `48`

Guidance:
- Card padding: `16` or `20`
- Page padding: `16` mobile, `24` tablet/desktop
- Gap between major sections: `24` to `32`
- Gap between controls in a group: `8` to `12`

### 9.2 Radius

Use restrained rounding.

Approved radius scale:
- Small: `6px`
- Medium: `8px`
- Large: `12px`
- Pill: `9999px` for badges only

Rules:
- Inputs and buttons: `8px`
- Cards and panels: `12px`
- Dialogs and menus: `12px`
- Do not exceed `12px` unless the element is explicitly pill-shaped

### 9.3 Elevation

Prefer borders and contrast over heavy shadows.

Approved elevation:
- Base: no shadow
- Raised: subtle 1-layer shadow
- Overlay: restrained 2-layer shadow

Rules:
- Shadows should help separation, not create drama.
- Do not use glow effects.
- Do not simulate depth with blur-heavy floating panels.

## 10. Motion

Motion must be functional, not decorative.

### 10.1 Allowed motion
- Hover feedback
- Focus transitions
- Dialog/menu enter and exit
- Loading indicators
- Live-state pulses only when they represent active monitoring or active alert status

### 10.2 Motion rules
- Default transition duration: `150ms`
- Complex transition duration: `180ms` to `200ms`
- Easing: standard ease-out or ease-in-out
- Respect reduced motion preferences

### 10.3 Explicitly disallowed
- Floating animations
- Gradient animations
- Continuous glow
- Decorative shimmer
- Scale-based hover theatrics
- Animated background patterns

Skeletons should use subtle opacity change only. No shimmering light sweeps.

## 11. Component Standards

All reusable UI must be built from centralized primitives in `frontend/src/components/ui/`.

### 11.1 Universal interaction state model

Every interactive primitive must define the following states where applicable.

| State | Required treatment |
| --- | --- |
| Default | Base surface, border, text, and icon treatment |
| Hover | Surface or border response only; no dramatic motion |
| Pressed | Slight contrast shift; no large scale transforms |
| Focus-visible | High-contrast focus ring using focus tokens |
| Selected / current | Persistent selected styling using selected-surface tokens |
| Open | Clear active state for menus, selects, disclosures, and dialogs |
| Loading | Maintain layout, reduce action ambiguity, show progress indicator |
| Disabled | Distinct disabled tokens with preserved legibility |
| Invalid | Semantic danger border, text, and helper message |
| Read-only | Non-editable treatment distinct from disabled |

Rules:
- Hover alone is not enough. Focus-visible and disabled states are mandatory for all controls.
- Loading states must preserve layout and prevent duplicate submission.
- Selected and current states must be persistent, not hover-dependent.
- State behavior must be implemented at the primitive level, not reinvented in pages.

### 11.2 Buttons

Required variants:
- Primary
- Secondary
- Ghost
- Destructive
- Link

Rules:
- Min height: `40px`
- Icon buttons: square, centered, same focus treatment
- Primary is reserved for the dominant action on a surface
- Destructive is only for deletion, reset, revoke, or similarly irreversible actions
- Link buttons must behave like links, not like weak buttons
- Avoid novelty variants such as `glass` or decorative variants

Mandatory states:
- Default
- Hover
- Pressed
- Focus-visible
- Loading
- Disabled

### 11.3 Navigation items

Rules:
- Navigation items must define `default`, `hover`, `focus-visible`, and `current` states
- Current-page state must persist without relying on hover
- Selected nav items should use `surface-selected`, stronger text, and a clear location cue
- Notification counts in nav should be semantic and quiet unless critical

### 11.4 Links

Rules:
- Links should be visually clear without becoming noisy
- Use underline on hover and focus, not as constant decoration everywhere
- External links and navigational links should be distinguishable when needed
- Color alone must not be the only signal for interactivity

Mandatory states:
- Default
- Hover
- Focus-visible
- Visited where applicable
- Disabled

### 11.5 Inputs, textareas, and selects

Rules:
- Min height: `40px`
- Label above field
- Helper or error text below field
- Strong visible focus ring
- Error state must change border, text, and supporting message
- Disabled state must be visually distinct without reducing legibility too far

Mandatory states:
- Default
- Hover
- Focus-visible
- Invalid
- Read-only
- Disabled
- Loading when async data is required

### 11.6 Cards and panels

Rules:
- Single neutral surface
- Clear border
- Minimal shadow if elevated
- Padding must be consistent
- Use card sections when content types differ, not decorative separators

Supported states:
- Default
- Hoverable
- Selected
- Disabled where relevant

### 11.7 Badges and status pills

Rules:
- Reserve color badges for state, severity, or system status
- Keep labels in sentence case
- Always pair critical status with icon or adjacent text
- Avoid overusing colored badges for neutral metadata

### 11.8 Alerts and notifications

Required severities:
- Info
- Success
- Warning
- Critical

Rules:
- Alerts should be compact, scannable, and severity-led
- Notification badges must not pulse unless there is an actual live event worth escalating
- Toasts are for transient confirmation, not core operational warnings
- Critical conditions should remain visible in-page until resolved or dismissed intentionally

Mandatory states:
- Default
- Dismissible where appropriate
- Persistent critical
- Resolved
- Read/unread for notifications

### 11.9 Tables

Rules:
- Optimize for scanability
- Use row dividers and alignment, not heavy zebra striping
- Right-align numeric columns where useful
- Keep header styling quiet but readable
- Selected rows and alert rows must use semantic treatment, not arbitrary highlighting

Mandatory states:
- Default
- Hover row
- Selected row
- Sorted column
- Expanded row where applicable
- Empty
- Loading
- Error

### 11.10 Charts and data visualization

Rules:
- Charts are analytical tools, not decoration
- Use neutral grids and restrained color
- Reserve strong semantic colors for thresholds, alerts, and health states
- Avoid rainbow palettes
- Label axes, units, and thresholds clearly
- Support empty, loading, and no-data states cleanly

Mandatory states:
- Normal
- Threshold reached
- Alert condition
- Empty
- Loading
- Error
- Selected or highlighted series if interactive

### 11.11 Navigation and shell

Rules:
- Sidebar and header should remain visually quiet
- The shell should frame the content, not compete with it
- Primary navigation should emphasize clarity and current location
- Search, notifications, and account controls should remain compact and predictable

## 12. Layout Standards

### 12.1 App shell
- Left sidebar navigation
- Top utility/status bar
- Primary content area with stable page padding
- Consistent page max-widths for readability

Shell metrics:
- Header height: `64px`
- Desktop sidebar width: `280px`
- Collapsed tablet sidebar width if introduced later: `80px`
- Mobile navigation: overlay drawer, full-height
- Default page gutter: `16px` mobile, `24px` tablet, `32px` wide desktop

Width rules:
- Operational dashboard pages may expand fluidly up to `1440px`
- Dense monitoring and insight views may extend to `1600px` if charts require it
- Form-heavy pages such as account, auth, and setup should cap at `960px`
- Single-column reading blocks should cap at `720px`

### 12.2 Grid system

Use a consistent product grid:
- Mobile: `4` columns, `16px` gutter
- Tablet: `8` columns, `24px` gutter
- Desktop: `12` columns, `24px` gutter

Preferred desktop spans:
- KPI summary cards: `3` columns each
- Small control panels: `4` columns
- Primary analytical panel: `8` columns
- Secondary analytical panel: `4` columns
- Full-width table or timeline: `12` columns

Rules:
- Do not invent page-specific grids unless the content truly requires it
- Keep cards aligned to the global column structure
- Uneven masonry layouts are not allowed in operator-facing views

### 12.3 Section rhythm and vertical spacing

Required rhythm:
- Page title block to first content block: `24px`
- Between major sections: `32px`
- Between related cards in a group: `16px` to `24px`
- Within cards: `12px` to `16px`
- Label to control spacing: `6px` to `8px`

Rules:
- Page rhythm should feel deliberate and repeatable
- Do not compress analytical screens to fit more content at the cost of readability
- Do not add decorative whitespace that weakens scanability

### 12.4 Dashboard page structure

Preferred page pattern:
1. Page title and current context
2. Primary machine state or workflow summary
3. Key actions
4. Supporting detail
5. Advanced or secondary detail last

### 12.5 Tables and forms

Table density:
- Default row height: `52px`
- Compact row height: `44px`
- Header height: `44px`
- Use compact density only for high-volume operational tables

Form layout:
- One-column form layout until `720px`
- Two-column forms allowed from tablet upward when field pairing is logical
- Form actions align to the bottom of the form block
- Related switches, toggles, and helper text should remain grouped with their owning field

### 12.6 Responsive behavior
- Mobile: stacked layout
- Tablet: compact 2-column layout when useful
- Desktop: stable multi-column layout for monitoring and insights

Rules:
- Touch targets should be at least `44px`
- Controls used on the floor should remain operable at tablet widths
- Sticky action areas are acceptable where workflows require repeated confirmation or upload actions

## 13. Accessibility Standards

Required baseline:
- WCAG AA contrast or better
- Keyboard-accessible controls, menus, dialogs, and tables
- Visible focus indicators
- Proper semantic headings and landmarks
- `aria-live` for processing states and important status updates
- Reduced motion support

Additional rules:
- Never rely on red/green distinction alone
- Always accompany health state with text
- Keep tooltip-only information non-essential
- Ensure dark mode contrast is tested, not assumed

## 14. Content and Tone

The interface voice should be operational, direct, and calm.

Prefer:
- `Machine state`
- `Wear trend`
- `Abnormal behavior`
- `Recommended action`
- `Last update`

Avoid:
- Unexplained technical jargon
- Marketing adjectives in product UI
- Cute or playful microcopy
- Developer-facing terminology when an operator-safe term exists

## 15. Centralized Implementation Rules

### 15.1 Single source of truth

The frontend must move to one design-system implementation path:

1. One token source
   - Prefer CSS custom properties for light and dark theme tokens
2. One global stylesheet entry
   - `frontend/src/app/globals.css`
3. One Tailwind mapping layer
   - `frontend/tailwind.config.ts`
4. One primitive component layer
   - `frontend/src/components/ui/`

The unused duplicate stylesheet at `frontend/src/styles/globals.css` should be removed during refactor so tokens do not diverge.

### 15.2 Ownership

The design system must have named owners:
- One engineering owner for implementation integrity
- One product or design owner for UX consistency

Owner responsibilities:
- Approve new tokens, variants, and exceptions
- Reject page-local styling that bypasses primitives
- Maintain the system documentation as components evolve
- Periodically audit the dashboard for drift

### 15.3 Change control

Any new token, component variant, or visual exception must include:
- The problem being solved
- Why existing tokens or variants are insufficient
- The exact scope of use
- Light and dark screenshots
- Accessibility impact
- A migration path if it replaces an older pattern

No new public token or component variant should be introduced without owner approval.

### 15.4 Page-level restrictions

Page code should not:
- Hardcode raw color utilities for standard states
- Invent one-off hover treatments
- Define custom shadows or animation styles
- Create alternate button styles locally
- Reinterpret machine-state colors independently

Pages should consume centralized primitives and semantic utility classes only.

### 15.5 Approved exceptions

Exceptions are allowed only when:
- A charting library requires scoped styling
- A third-party primitive needs local patching
- A one-off experimental admin surface is explicitly isolated from operator UI

Exceptions must still use system tokens.

Exception rules:
- Exceptions must be documented in the PR
- Exceptions must name an owner
- Exceptions should include an expiry or cleanup follow-up where possible

### 15.6 Enforcement gates

Every UI PR should be reviewed against these gates:
- Uses semantic tokens rather than raw repeated utility values
- Reuses shared primitives where available
- Includes light and dark mode validation
- Includes keyboard and focus-state validation for interactive changes
- Does not introduce decorative motion or unauthorized visual treatments

Recommended automation:
- Visual regression coverage for core dashboard pages
- Linting or code-review checks for repeated raw color utilities in page files
- Story or showcase coverage for primitive states

## 16. Recommended File Architecture

Recommended target structure:

- `frontend/src/app/globals.css`
  - reset, global element rules, token imports
- `frontend/src/design/tokens.css`
  - light and dark CSS variables
- `frontend/src/design/motion.css`
  - optional shared motion tokens
- `frontend/src/components/ui/`
  - buttons, inputs, cards, badges, dialogs, tables, tabs, selects
- `frontend/src/components/layout/`
  - header, sidebar, dashboard shell using primitives only

If `tokens.css` is not introduced, then `globals.css` must own the token definitions directly. In either case there must be only one source of truth.

## 17. Migration Priorities

### Phase 1: Token consolidation
- Remove duplicate global styles
- Define semantic light and dark CSS variables
- Map Tailwind utilities to semantic tokens

### Phase 2: Primitive cleanup
- Standardize button, input, select, card, badge, and alert components
- Remove decorative variants and ad hoc classes

### Phase 3: Shell cleanup
- Refactor sidebar, header, and dashboard layout to use the same spacing, radius, and state rules

### Phase 4: Page cleanup
- Replace page-level raw color classes with semantic component usage
- Standardize state chips, alerts, chart styles, and empty/loading states

### Phase 5: Validation
- Run visual QA in light and dark mode
- Validate contrast and focus behavior
- Review mobile, tablet, and desktop layouts
- Add visual regression checks for core dashboard pages

## 18. Non-Negotiable Rules

- No decorative gradients
- No decorative background patterns
- No glassmorphism
- No unbounded animation
- No page-local theme decisions
- No inconsistent state color mapping
- No component variants that bypass the system
- No shipping of new UI without light and dark verification

## 19. Definition of Done for UI Work

A UI change is complete only when:
- It uses centralized tokens
- It uses or extends shared primitives
- It works in light and dark mode
- Focus, hover, disabled, loading, and error states are defined
- Status semantics match the product standard
- The result feels calm, modern, and operational rather than decorative

## 20. Summary

The DInsight design system should feel like an industrial control product, not a startup landing page. It should be quiet, precise, and dependable. Consistency matters more than novelty. Clarity matters more than ornament. Every theme, token, component, and interaction should help operators understand machine condition quickly and act with confidence.
