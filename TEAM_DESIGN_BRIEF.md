# DInsight Team Design Brief

## Purpose

This document is the shareable design brief for the full product team.

It is meant to align:
- The dashboard team
- The mobile sound-collection app team
- The landing-page team
- Engineering, product, and design reviewers

This document is intended to stand on its own for day-to-day team use.
If someone follows this brief well, they should already be aligned with the intended product design direction.

## Design North Star

Everything we build should feel:
- Clear
- Calm
- Precise
- Trustworthy
- Premium through restraint
- Operational, not decorative

The product should look like a serious industrial technology platform, not a startup marketing experiment.

## What We Are Optimizing For

- Fast understanding
- Low cognitive load
- Confidence under real-world use
- Consistency across surfaces
- Accessibility and usability
- A polished enterprise-grade impression

We are not optimizing for:
- Trendy visual effects
- Dense decoration
- Novelty for its own sake
- Generic AI-product aesthetics

## Shared Design Principles

### 1. Clarity over flair
- Every screen should make the next action obvious.
- Visual hierarchy should come from structure, spacing, contrast, and type.
- Interfaces should never feel noisy or performative.

### 2. Premium through restraint
- Premium does not mean shiny.
- Premium means disciplined spacing, careful typography, strong alignment, and consistent interaction patterns.
- Use fewer visual ideas, executed well.

### 3. Industrial minimalism
- Clean surfaces
- Structured layouts
- Quiet chrome
- Strong operational signals
- No decorative gradients, patterns, glows, or glass effects

### 4. Consistency is part of the product
- Similar actions must look the same.
- Similar states must look the same.
- Similar workflows must follow the same interaction logic.

### 5. Usability beats cleverness
- The user should not need to decode the interface.
- Plain language beats jargon.
- Feedback should be immediate and easy to understand.

## Shared Visual Direction

### Overall feel
- Modern
- Enterprise-ready
- Clean
- Confident
- Understated

### Color direction
- Restrained industrial neutrals
- One clear accent color for interaction
- Semantic colors reserved for system state and machine state

### Non-negotiable semantic meanings
- Green = OK / healthy / success
- Amber = deteriorating / warning / attention
- Red = failing / destructive / critical
- Blue = interaction, focus, selected state, information

Blue is not a health state.
Green is not a brand color.

### Typography direction
- Clean, highly legible sans-serif for UI
- Monospace only for values, IDs, timestamps, and technical data
- Strong hierarchy without oversized text

Recommended implementation direction:
- Use one modern sans-serif family across product surfaces
- Use one monospace family for technical and numeric content
- Keep headings disciplined and readable, not oversized
- Prefer strong spacing and alignment over expressive display typography

### Motion direction
- Minimal
- Functional
- Fast
- Never decorative

Allowed motion:
- Hover feedback
- Focus transitions
- Menu and dialog transitions
- Loading indicators
- Live-state motion only when it communicates something real

Avoid:
- Floating animations
- Animated gradients
- Decorative shimmer
- Pulsing UI that does not represent a real alert or live state

## Shared Theme Rules

- Light and dark modes should both feel intentional and fully supported where themes apply
- Theme changes must not alter layout, spacing, or interaction patterns
- Accent color is for interaction and selection, not decoration
- Semantic state colors must remain stable across all product surfaces

## Shared Token Intent

Even if teams are using different stacks, they should follow the same token logic.

Every surface should define consistent roles for:
- Canvas background
- Primary surface
- Secondary or muted surface
- Border
- Primary text
- Secondary text
- Accent
- Focus
- Success
- Warning
- Danger
- Info
- Disabled

Teams should avoid raw one-off color choices in product UI. Colors should have roles, not just values.

## Shared Baseline Design Decisions

This section defines the core decisions teams should follow directly, even without any other document.

### Fonts

Primary UI font:
- `IBM Plex Sans`

Monospace font:
- `IBM Plex Mono`

Fallbacks:
- `system-ui`, `sans-serif` for UI
- `ui-monospace`, `monospace` for technical and numeric content

Rules:
- Use one sans-serif family across dashboard, mobile app, and landing page
- Use monospace only for values, timestamps, IDs, logs, and technical metadata
- Do not introduce decorative display fonts

### Core light-theme colors

| Role | Swatch | Value |
| --- | --- | --- |
| Canvas | <span style="display:inline-block;width:18px;height:18px;border:1px solid #B7C4D1;border-radius:4px;background:#F3F5F7;"></span> | `#F3F5F7` |
| Surface | <span style="display:inline-block;width:18px;height:18px;border:1px solid #D5DEE7;border-radius:4px;background:#FFFFFF;"></span> | `#FFFFFF` |
| Muted surface | <span style="display:inline-block;width:18px;height:18px;border:1px solid #B7C4D1;border-radius:4px;background:#E9EEF3;"></span> | `#E9EEF3` |
| Border | <span style="display:inline-block;width:18px;height:18px;border:1px solid #98A2B3;border-radius:4px;background:#D5DEE7;"></span> | `#D5DEE7` |
| Strong border | <span style="display:inline-block;width:18px;height:18px;border:1px solid #98A2B3;border-radius:4px;background:#B7C4D1;"></span> | `#B7C4D1` |
| Primary text | <span style="display:inline-block;width:18px;height:18px;border:1px solid #B7C4D1;border-radius:4px;background:#0F1720;"></span> | `#0F1720` |
| Secondary text | <span style="display:inline-block;width:18px;height:18px;border:1px solid #B7C4D1;border-radius:4px;background:#475467;"></span> | `#475467` |
| Accent | <span style="display:inline-block;width:18px;height:18px;border:1px solid #0A44B7;border-radius:4px;background:#155EEF;"></span> | `#155EEF` |
| Accent hover | <span style="display:inline-block;width:18px;height:18px;border:1px solid #003BB3;border-radius:4px;background:#004EEB;"></span> | `#004EEB` |
| Success | <span style="display:inline-block;width:18px;height:18px;border:1px solid #106B33;border-radius:4px;background:#15803D;"></span> | `#15803D` |
| Warning | <span style="display:inline-block;width:18px;height:18px;border:1px solid #8A3E08;border-radius:4px;background:#B45309;"></span> | `#B45309` |
| Danger | <span style="display:inline-block;width:18px;height:18px;border:1px solid #8F1F16;border-radius:4px;background:#B42318;"></span> | `#B42318` |
| Info | <span style="display:inline-block;width:18px;height:18px;border:1px solid #0B5268;border-radius:4px;background:#0F6E8C;"></span> | `#0F6E8C` |

### Core dark-theme colors

| Role | Swatch | Value |
| --- | --- | --- |
| Canvas | <span style="display:inline-block;width:18px;height:18px;border:1px solid #425466;border-radius:4px;background:#0B1218;"></span> | `#0B1218` |
| Surface | <span style="display:inline-block;width:18px;height:18px;border:1px solid #425466;border-radius:4px;background:#111A22;"></span> | `#111A22` |
| Muted surface | <span style="display:inline-block;width:18px;height:18px;border:1px solid #425466;border-radius:4px;background:#1B2A36;"></span> | `#1B2A36` |
| Border | <span style="display:inline-block;width:18px;height:18px;border:1px solid #5D7184;border-radius:4px;background:#2A3A47;"></span> | `#2A3A47` |
| Strong border | <span style="display:inline-block;width:18px;height:18px;border:1px solid #6F8397;border-radius:4px;background:#425466;"></span> | `#425466` |
| Primary text | <span style="display:inline-block;width:18px;height:18px;border:1px solid #425466;border-radius:4px;background:#F3F5F7;"></span> | `#F3F5F7` |
| Secondary text | <span style="display:inline-block;width:18px;height:18px;border:1px solid #425466;border-radius:4px;background:#C7D0D9;"></span> | `#C7D0D9` |
| Accent | <span style="display:inline-block;width:18px;height:18px;border:1px solid #4C88E6;border-radius:4px;background:#6EA8FE;"></span> | `#6EA8FE` |
| Accent hover | <span style="display:inline-block;width:18px;height:18px;border:1px solid #63A4E0;border-radius:4px;background:#8BC0FF;"></span> | `#8BC0FF` |
| Success | <span style="display:inline-block;width:18px;height:18px;border:1px solid #1A8C4A;border-radius:4px;background:#22A75A;"></span> | `#22A75A` |
| Warning | <span style="display:inline-block;width:18px;height:18px;border:1px solid #B77517;border-radius:4px;background:#D18A1D;"></span> | `#D18A1D` |
| Danger | <span style="display:inline-block;width:18px;height:18px;border:1px solid #C64F4D;border-radius:4px;background:#E35D5B;"></span> | `#E35D5B` |
| Info | <span style="display:inline-block;width:18px;height:18px;border:1px solid #3F8AA6;border-radius:4px;background:#4FA7C6;"></span> | `#4FA7C6` |

### Shared spacing and radius baseline

Spacing scale:
- `4`
- `8`
- `12`
- `16`
- `20`
- `24`
- `32`
- `40`
- `48`

Radius scale:
- Small: `6px`
- Medium: `8px`
- Large: `12px`

Rules:
- Buttons and inputs: `8px` radius
- Cards and panels: `12px` radius
- Do not exceed `12px` rounding unless the element is intentionally pill-shaped

### Shared sizing baseline

- Minimum button/control height: `40px`
- Minimum touch target for mobile or tablet use: `44px`
- Header or top bar height target: `64px`

### Shared motion baseline

- Default transition duration: `150ms`
- Extended transition duration: `180ms` to `200ms`
- Motion should be subtle and functional only

### Shared semantic state mappings

Use these meanings consistently:
- `OK` = success color family
- `Deteriorating` or `Warning` = warning color family
- `Failing` or `Critical` = danger color family
- `Info` = informational blue family

Never use accent blue as a health-state color.
Never use green as a brand or decorative color.

## Cross-Product Guidance

### 1. Dashboard

Primary role:
- Operational monitoring and decision support

Users:
- Plant operators
- Maintenance teams
- Reliability engineers
- Operations managers

What it should feel like:
- Calm under pressure
- Data-rich but readable
- Serious and dependable

Dashboard priorities:
- Show machine state first
- Show recommended action clearly
- Keep advanced controls secondary
- Make alerts and deterioration impossible to miss
- Preserve consistency across machine status, ingestion, live monitor, and insights

Dashboard anti-patterns:
- Fancy analytics chrome
- Decorative cards
- Overuse of color
- Motion-heavy dashboards
- Hidden critical states

### 2. Mobile Sound Collection App

Primary role:
- Capture machine sound reliably using a phone

Important context:
- This is a field utility, not a customer-facing showcase app
- It may be used in noisy, rushed, or imperfect environments
- It must prioritize clarity, state feedback, and reliability over branding

What it should feel like:
- Fast
- Focused
- Tactile
- Reliable
- Hard to misuse

Mobile priorities:
- One primary action per screen
- Large touch targets
- Very clear recording states
- Very clear upload and sync states
- Strong permission guidance for microphone, storage, and connectivity where relevant
- Good handling for offline, weak-network, queued, and failed-upload conditions
- Minimal navigation depth

Recommended mobile state language:
- Ready to record
- Recording
- Recording paused
- Saved locally
- Uploading
- Uploaded
- Sync failed

Mobile anti-patterns:
- Marketing-style UI
- Small touch targets
- Hidden permission requirements
- Ambiguous recording state
- Weak feedback after capture
- Complex multi-step forms on small screens

### 3. Landing Page

Primary role:
- Explain the product clearly and build trust

What it should feel like:
- Premium
- Credible
- Modern
- Direct
- Grounded in real product value

Landing-page priorities:
- Make the problem and value proposition obvious quickly
- Show the product as operational technology, not vague AI magic
- Use real screenshots, product language, and concrete workflows where possible
- Prioritize trust signals, clarity, and proof over spectacle
- Keep conversion paths obvious and limited

Landing-page anti-patterns:
- Abstract AI art
- Empty claims about intelligence or transformation
- Purple gradients, mesh backgrounds, and generic SaaS hero sections
- Overselling “real-time” or “AI” without explaining the product
- UI elements that feel unrelated to the actual product

## Shared Component Principles

These apply across all surfaces even if the implementation stacks differ.

### Buttons
- One clearly dominant primary action per surface
- Secondary and ghost actions should stay visually quiet
- Disabled buttons must remain legible
- Loading buttons must keep their size and label context

Expected states:
- Default
- Hover
- Pressed
- Focus-visible
- Loading
- Disabled

### Inputs and forms
- Labels must be explicit
- Helper text and errors must be close to the control
- Validation must be clear and specific
- Avoid placeholder-only labeling

Expected states:
- Default
- Hover
- Focus-visible
- Error
- Read-only
- Disabled

### Alerts and notifications
- Severity should be instantly recognizable
- Critical states should not be subtle
- Notification styles should be consistent across products
- Use persistent in-context alerts for important operational issues

### Status indicators
- Status must always include text, not color alone
- Use the same meaning for the same color across products
- Status language should remain simple and operational

Core state language:
- OK
- Warning or Deteriorating
- Critical or Failing
- Info

## Shared Layout Principles

- Keep shells visually quiet
- Let the main content carry the visual emphasis
- Use consistent spacing and alignment
- Avoid over-fragmenting screens into too many card types
- Make key actions easy to find without visual clutter

Practical guidance:
- Prefer a stable grid over ad hoc panel placement
- Keep primary actions near the top of the working area
- Use restrained card and panel patterns
- Avoid overly wide reading blocks
- Ensure layouts still work comfortably on tablet widths where relevant

## Shared Content Principles

Use language that is:
- Direct
- Operational
- Calm
- Specific

Prefer:
- Machine state
- Wear trend
- Abnormal behavior
- Recommended action
- Last update
- Recording status
- Upload status

Avoid:
- Buzzwords
- Unexplained acronyms in primary UI
- Cute microcopy
- Marketing copy inside operational interfaces

## Team Rules

- Do not invent page-level color systems
- Do not introduce decorative effects outside the design system
- Do not add new component variants without checking the shared system first
- Do not reinterpret semantic colors locally
- Do not ship surfaces that feel unrelated to each other

If a team needs a new variant, token, or exception:
- define the problem clearly
- explain why the current system is insufficient
- propose the smallest possible addition
- validate it in light and dark contexts where applicable

## Quick Review Checklist

Before shipping a new screen or major UI change, ask:
- Does this feel clear and calm?
- Does this look premium because it is disciplined, not because it is flashy?
- Is the next action obvious?
- Are status, alert, and error states unmistakable?
- Is the interface consistent with the rest of the product family?
- Are we relying on real product clarity instead of decorative styling?
- Would this still feel strong if all gradients and effects were removed?

## Recommended Team Usage

- For every developer working on dashboard, mobile, and landing-page surfaces
- Use it during PR review for visual and UX alignment
- Revisit this brief whenever a new product surface is introduced

## Bottom Line

DInsight should feel like one product family.

The dashboard should feel operational.
The mobile app should feel reliable and task-focused.
The landing page should feel credible and premium.

Different surfaces can have different emphasis, but they should all reflect the same product values: clarity, trust, discipline, and usefulness.
