# Compound Recovery Backlog

Status: Canonical
Last updated: 2026-04-29

## P0 Foundations

- Auth / Verification / RBAC
- Property hierarchy and scoping
- Shared contracts
- Design-system convergence
- Delivery-gate and QA trust reset
- Finance ledger integrity

## P1 Core Operations

- Onboarding and compliance
- Visitors and security
- Issues and escalation
- Announcements and notifications
- Governance, polls, elections, and org chart

## P2 Production Hardening

- Reporting and operational tooling
- Launch readiness validation
- Persona-based end-to-end regression packs

## Exit Criteria Example

### Auth / Verification / RBAC

- login works for required personas
- role and scope checks are trustworthy
- admin and resident boundaries are regression-tested
- `/auth/me` contract is trustworthy across clients

### Finance

- unit-ledger rules are enforced
- submissions and approvals are separate
- balances are auditable
- resident statements and admin review queues agree on state
