# Compound Design System

Status: Canonical
Last updated: 2026-04-29
Change control: Updates require explicit approval and a constitution change-log entry

## Inputs Reviewed

- `design-system/compound/MASTER.md`
- `apps/mobile/design-system/compound/MASTER.md`

These legacy files conflict and are no longer authoritative after canon adoption.

## Design Principles

- Premium but operational
- Trustworthy and clear
- Status-forward
- Consistent across web and mobile
- Accessible in Arabic and English

## Core Tokens

- Color roles: primary, secondary, accent, surface, surface-muted, border, text, text-muted, success, warning, danger
- Typography roles: display, heading, title, body, label, mono
- Space scale: 4, 8, 12, 16, 24, 32, 48, 64
- Radius scale: 8, 12, 16, 24
- Elevation scale: subtle, card, overlay, modal

## Visual Rules

- One shared visual identity governs both web and mobile.
- Platforms may adapt layout and interaction, but token semantics, status semantics, and hierarchy rules stay aligned.
- Color must communicate state consistently across platforms.
- Statuses and compliance cues must be immediately legible.

## Component Expectations

- Buttons require explicit primary, secondary, destructive, and quiet variants.
- Forms require visible error, success, disabled, loading, and focus states.
- Tables, cards, and lists must present scope, ownership, and status clearly.
- Empty states must explain next actions, not just absence.

## Localization and RTL

- All user-facing features must support English and Arabic in the same slice.
- Arabic layouts must be reviewed in RTL mode.
- Components must tolerate text expansion and mirrored layout behavior.
- Truncation rules must not hide critical financial or security information.

## Accessibility

- Visible keyboard focus is required where applicable.
- Color contrast must remain readable in default themes.
- Motion must be purposeful and avoid blocking comprehension.
- Important status cannot rely on color alone.

## Platform Adaptation

- Web may use denser data layouts for operational work.
- Mobile may simplify interaction steps for speed and ergonomics.
- Visual identity, terminology, and state semantics must remain consistent.
