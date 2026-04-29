# Compound System Architecture

Status: Canonical
Last updated: 2026-04-29
Change control: Updates require explicit approval and a constitution change-log entry

## Architecture Summary

The platform is a monorepo with one backend system of record, one admin web application, one mobile client, and shared contracts that keep data shapes aligned across surfaces.

## Bounded Contexts

- Identity and Access
- Property Registry
- Documents and Compliance
- Visitors and Security
- Issues and Escalation
- Announcements and Notifications
- Finance Ledger and Collections
- Governance and Representation
- Audit and Reporting

## App Responsibilities

- `apps/api` is the system of record for business rules, persistence, authorization, audit trails, and integration events.
- `apps/admin` is the operational interface for administrators, finance reviewers, support users, governance managers, and association operators.
- `apps/mobile` is the resident and guard operational client.
- `packages/contracts` is the shared contract layer and must match backend behavior.

## Backend Responsibilities

The backend owns:

- authentication tokens and session lifecycle
- authorization and scope evaluation
- property hierarchy integrity
- finance ledger integrity
- audit events
- file metadata and document review state
- notifications and delivery state
- governance workflow state
- visitor validation state

No frontend may be treated as the authority for protected business rules.

## Frontend Responsibilities

The admin web app owns:

- privileged operational dashboards
- management workflows
- review queues
- scoped navigation and route guards

The mobile app owns:

- resident daily workflows
- security and guard workflows
- mobile-specific notifications and scanning interactions
- simplified but semantically consistent presentation of platform state

## Realtime And Fallbacks

- Realtime transport is preferred for actionable operational screens.
- Non-critical views must degrade cleanly to polling or explicit refresh.
- Realtime enhancements must not be the only source of truth for state changes.

## Data Storage

- Relational storage is authoritative for transactional business data.
- Redis-like infrastructure may support queues, cache, locks, and ephemeral state.
- Object storage holds uploaded file content; the backend owns metadata and access rules.

## Shared Contracts

Any data shape consumed by both admin and mobile should be defined in shared contracts where practical. Contracts must follow backend behavior, not diverge from it.

## Isolation Requirements

Compound, building, floor, and unit scoping must be enforced in backend logic. UI filtering alone is not sufficient isolation.

## Cross-Cutting Concerns

All bounded contexts must respect:

- RBAC and scope
- bilingual and RTL expectations for user-facing output
- auditability for sensitive mutations
- explicit status models
- traceability back to canon
