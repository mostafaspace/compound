# Compound Product Spec

Status: Canonical
Last updated: 2026-04-29
Change control: Updates require explicit approval and a constitution change-log entry

## Product Vision

Compound is a private, role-based operating system for residential communities. It replaces fragmented chats and ad hoc coordination with accountable workflows for access, governance, finance, security, complaints, documents, and communication.

The product must feel trustworthy, controlled, bilingual, and operationally useful from day one. It is not a chat app with add-ons. It is a system of record for community operations.

## Personas

- Owner
- Resident / Occupant
- Tenant
- Shop Holder / Commercial Occupant
- Floor Representative
- Building Representative
- Owners Association Member
- President / Head of Association
- Treasurer / Finance Admin
- Security Staff
- Admin / Verification Panel
- Super Admin

## Product Principles

- The platform is private by default.
- Workflows beat chat-based ambiguity.
- Responsibilities must be visible and scoped.
- Financial records must be transparent and auditable.
- Governance actions must be formal and traceable.
- Every module must respect role and scope boundaries.

## Access, Verification, and Roles

- Authentication proves identity.
- Verification proves the user is linked to the right property context and has satisfied required onboarding and document checks.
- Authorization determines allowed actions and data scope.
- No workflow may collapse authentication, verification, and authorization into a single role flag.
- Access is restricted. A person must not self-enroll into trusted platform areas without controlled onboarding or invitation.

## Property Hierarchy

The property model is the structural backbone of the platform.

- Compound
- Building
- Floor
- Unit
- Occupant or owner linkage

All scoped permissions, reporting filters, finance accounts, visitor destinations, and representative roles depend on this hierarchy being trustworthy.

## Documents and Compliance

The platform must support collection and review of legal and compliance documents.

Document types include:

- Ownership contract
- Rental contract
- National ID copy
- Occupancy proof
- Commercial unit proof
- Additional supporting documents

Required capabilities:

- Upload one or more files by document type
- Mark required vs optional documents
- View existing submissions
- Review, approve, reject, or request missing items
- Track per-document status and overall compliance state
- Show compliance status on user profile surfaces

Canonical document statuses:

- Not Submitted
- Partially Submitted
- Submitted
- Under Review
- Approved
- Rejected
- Missing Documents

## Organization Structure

The platform must expose a clear responsibility map showing:

- floor representatives
- building representatives
- owners association members
- association head or president
- administrative contacts
- security contacts

Org charts and responsibility views must reflect actual scoped assignments, not decorative placeholders disconnected from RBAC.

## Security and Visitor Management

The visitor workflow supports residents and guards through one controlled process.

Core flow:

1. A resident creates a visitor request.
2. The request captures visitor identity and visit details.
3. The system issues a unique visitor pass or QR code.
4. Security can validate, review, and process the visitor at the gate.
5. Visit history remains available for audit and review.

Canonical visitor statuses:

- Pending
- QR Issued
- Arrived
- Allowed
- Denied
- Completed

Visitor validation must support expiration, cancellation, limited-use behavior, and audit logs.

## Issues and Escalation

The platform must support formal issue and complaint handling with accountability.

Required capabilities:

- create issue or complaint
- attach photos or videos
- assign category and location
- route to the responsible party
- track comments, updates, and escalation
- retain history

Canonical issue statuses:

- New
- In Progress
- Escalated
- Resolved
- Closed

## Announcements and Notifications

The platform must support official communication, not just broadcast text.

Required announcement categories include:

- general announcements
- building-specific notices
- association decisions
- security alerts
- maintenance notices
- meeting reminders

Notifications must support delivery status, read state, and user preferences where appropriate.

## Finance

Finance is a first-class subsystem tied primarily to units, not just people.

The core financial model is a ledger:

- Charges increase balance
- Payments reduce balance
- Adjustments modify balance with reason
- Allocations determine how payments apply
- Credits and refunds are explicit records

Required finance capabilities:

- unit statement of account
- recurring dues
- one-time charges
- campaign collections
- partial payments
- payment submission and review
- receipts and statements
- overdue and penalty visibility
- auditable corrections

Canonical account statuses:

- Clear
- Due
- Partially Due
- Overdue
- Credit Balance

Canonical charge statuses:

- Draft
- Active
- Due
- Partially Paid
- Paid
- Overdue
- Waived
- Cancelled

Canonical payment statuses:

- Submitted
- Pending Review
- Approved
- Rejected
- Allocated
- Partially Allocated
- Refunded

Canonical campaign statuses:

- Draft
- Active
- Closed
- Archived

## Governance, Polls, and Elections

The platform must distinguish lightweight polls from formal governance actions.

Formal governance must support:

- electing association heads or presidents
- electing association members
- electing building or floor representatives
- replacing members who leave or are removed
- binding votes on major decisions

Eligibility rules:

- Verified owners vote in official owners association elections by default.
- Tenants or residents may vote only when a configured non-governance rule allows it.
- Some votes are compound-wide; others are building-scoped.
- Document completion may be required for eligibility.

## Cross-Platform UX Principles

- Web and mobile must express one design language.
- Important statuses must be legible at a glance.
- Finance explanations must be explicit, never vague.
- User-facing features must ship in Arabic and English together.
- Arabic support includes RTL layout behavior, not just translated strings.
- Interactions may adapt per platform, but behavior and semantics must stay aligned.

## Non-Goals

- Open self-service public registration into privileged product areas
- Silent balance editing
- Chat-first workflows replacing formal process records
- English-only releases of user-facing product features
- Story-level redefinition of business rules outside canon
