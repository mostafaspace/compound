# Architecture

## Monorepo Layout

```text
apps/
  api/      Laravel backend API and background workers
  admin/    Next.js operations/admin web app
  mobile/   React Native resident and security app
packages/
  contracts/          Shared API schemas, enums, fixtures
  typescript-config/  Shared TypeScript config
infra/
  docker-compose.yml  Local MySQL, Redis, S3-compatible storage, Mailpit
docs/
  architecture.md
  local-development.md
```

## Backend

Laravel is the system of record. It owns auth, authorization, domain workflows, finance ledger integrity, audit history, events, notifications, file metadata, and integration webhooks.

Primary backend modules:

- Identity and access: Sanctum tokens, roles, permissions, account lifecycle, support impersonation controls.
- Property registry: compounds, buildings, floors, units, resident ownership/occupancy relationships.
- Finance: ledger, invoices, recurring charges, campaigns, payments, allocations, receipts, close periods, audit packs.
- Operations: complaints, work orders, vendors, approvals, visitor QR, gates, security shifts, incidents.
- Governance: announcements, polls, formal elections, meetings, minutes, representatives.
- Platform: notifications, Reverb channels, polling fallback endpoints, audit trail, exports, imports, retention.

## Frontend

The admin web app is a Next.js application for operators, board members, finance reviewers, support, and compound administrators. It should use server-friendly data loading for admin screens, authenticated client interactions for realtime workflows, and strict route guards.

The mobile app is React Native for residents and guards. Shared contracts from `packages/contracts` keep DTO names, enum values, and validation expectations aligned with the backend.

## Realtime

Laravel Reverb is the preferred realtime transport for actionable screens: visitor entry, complaint status, payment review, notifications, elections, and operations dashboards. Non-critical screens must degrade to polling using explicit refresh intervals and ETags where practical.

## Data Storage

MySQL or MariaDB is the transactional store. Redis supports queues, cache, rate limits, Horizon, and ephemeral locks. File storage uses S3-compatible object storage in production and may use local disk in early development.

## Delivery

CI must run backend tests, frontend lint/typecheck/build, mobile lint/typecheck, contract checks, and migration safety checks before production deployment. Production launch is gated by the Jira `P43` go-live acceptance story.
