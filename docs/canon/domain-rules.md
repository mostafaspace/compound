# Compound Domain Rules

Status: Canonical
Last updated: 2026-04-29
Change control: Updates require explicit approval and a constitution change-log entry

## Identity, Verification, and Authorization

- Authentication proves identity only.
- Verification determines whether a user is approved for the linked property context.
- Authorization determines what the user may do and which records they may access.
- Suspended, archived, or otherwise inactive accounts must not behave like active trusted users.

## RBAC and Scope

- Authorization must be database-driven and scope-aware.
- Scope may be platform, compound, building, floor, or unit.
- A user may hold multiple scoped assignments.
- Protected queries must filter by effective scope, not by UI visibility alone.
- Scoped assignments must be auditable.
- Org-chart or representative displays must reflect actual scoped assignments.

## Property Hierarchy Integrity

- Compound, building, floor, and unit relationships must be trustworthy before dependent workflows are considered trustworthy.
- Unit linkage is foundational for finance, occupants, visitors, and responsibility views.
- Scope inference must not cross compounds accidentally.

## Documents and Compliance

- Compliance state must be derived from document review status, not guessed from profile completeness alone.
- Required document rules may vary by occupant type, but rule evaluation must be explicit.
- Rejections and missing-items requests must preserve reason history.

## Visitor Workflow Rules

- Each visitor request must have a durable status trail.
- Visitor validation must support valid, expired, denied, cancelled, and already-used outcomes where applicable.
- Security actions must be auditable.
- Visitor authorization must be tied to a destination unit and resident context.

## Issue Workflow Rules

- Issues must preserve history of creation, reassignment, escalation, and closure.
- Responsibility routing must be explicit and traceable.
- Resolved and closed are distinct states when business process needs both.

## Finance Ledger Rules

- Unit accounts are the primary financial entity.
- Balances change only through charges, payments, allocations, adjustments, waivers, refunds, or reversals.
- Silent balance edits are forbidden.
- Every financial mutation must be auditable and explainable.
- Partial payments and partial allocations are first-class flows.
- Payment submission and payment approval are separate actions.

## Governance Rules

- Polls are not equivalent to formal elections or binding votes.
- Eligibility rules must be explicit for every governance action.
- Scope of voting must be compound-specific or building-specific as configured.
- Governance records must be historically traceable.

## Announcement And Notification Rules

- Announcement visibility must respect scope and audience rules.
- Delivery attempts, read state, and acknowledgement state must not be conflated.

## Audit Rules

- Sensitive reads and writes may require audit trails depending on data type and role.
- All role assignment, financial mutation, and key approval actions must be auditable.
- Audit records must identify actor, action, target, timestamp, and key context.
