# Domain Rules — Backend

This document captures the business rules enforced by the backend. Read this before implementing any story that touches auth, roles, finance, or lifecycle state.

---

## 1. Auth & Account Lifecycle

### Token Issuance
- Tokens are Sanctum personal access tokens issued per device (`deviceName`).
- Each successful login creates a new token; old tokens from other devices remain valid until the user explicitly logs out.
- Logout revokes only the current request's token.

### Account Status Rules
| Status | Can Login? | Access Level |
|--------|-----------|--------------|
| `invited` | No | Cannot authenticate |
| `pending_review` | Yes | Restricted — can upload documents and view document-types. Cannot access compounds/units/finance routes. |
| `active` | Yes | Full access for their role |
| `suspended` | No | HTTP 403 on login |
| `archived` | No | HTTP 403 on login |

### Status Transitions
- `invited` → `pending_review` (after invitation accepted)
- `pending_review` → `active` (after verification request approved)
- `active` ↔ `suspended` (admin action)
- `active` → `archived` (admin permanent deactivation)

---

## 2. Role-Based Access Control (RBAC)

Roles are exclusive (one per user). The `role` middleware checks the authenticated user's `role` column.

### Role Capabilities Matrix

| Capability | SA | CA | BM | FR | SG | RO | RT | SU |
|-----------|----|----|----|----|----|----|----|----|
| Manage compounds/buildings/units | ✓ | ✓ | — | — | — | — | — | — |
| Import/export units | ✓ | ✓ | ✓ | ✓ | — | — | — | ✓ |
| Invite residents | ✓ | ✓ | ✓ | ✓ | — | — | — | ✓ |
| Review verification requests | ✓ | ✓ | ✓ | ✓ | — | — | — | ✓ |
| View/upload own documents | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓ | ✓ |
| Review documents | ✓ | ✓ | — | — | — | — | — | ✓ |
| Manage visitor requests | ✓ | ✓ | — | — | ✓ | ✓ | ✓ | ✓ |
| Gate control (allow/deny/arrive) | ✓ | ✓ | — | — | ✓ | — | — | ✓ |
| Manage org chart / representatives | ✓ | ✓ | ✓ | ✓ | — | — | — | ✓ |
| View org chart | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Finance admin (accounts, charges, campaigns) | ✓ | ✓ | ✓ | ✓ | — | — | — | — |
| Submit payment | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓ | ✓ |
| View own finance | — | — | — | — | — | ✓ | ✓ | — |
| Create/manage issues | all | all | all | all | all | all | all | all |
| Administer issues | ✓ | ✓ | ✓ | ✓ | — | — | — | ✓ |
| Manage announcements | ✓ | ✓ | ✓ | ✓ | — | — | — | ✓ |
| Read announcements (feed) | all | all | all | all | all | all | all | all |
| View audit logs | ✓ | ✓ | — | — | — | — | — | ✓ |

---

## 3. Verification & Onboarding Flow

1. Admin creates a `ResidentInvitation` for a unit (optional), specifying email, role, and relation type.
2. Invitation email sent. Token valid for 7 days (configurable).
3. Resident visits the invitation URL and calls `POST /resident-invitations/{token}/accept` with name, phone, password.
4. System creates a `User` with status `pending_review` and a `VerificationRequest` linked to the invitation.
5. Resident uploads documents via `POST /documents`.
6. Admin reviews verification request and calls `approve` or `reject`.
7. On approval: user status → `active`, `UnitMembership` created if `unit_id` was on invitation.

### Invitation Constraints
- An invitation can only be accepted once (`status = accepted`).
- Revoked or expired invitations return 404/403 on accept.
- `resend` resets `expires_at` to now + 7 days and re-sends email.

---

## 4. Documents

- Document types are seeded and read-only in production (managed via seeder).
- File upload max: **10 MB**. Accepted MIME types: `application/pdf`, `image/jpeg`, `image/png`.
- Files are stored in S3 (or local disk in development). File paths are never exposed directly; always use signed URLs.
- Status values: `pending_review`, `approved`, `rejected`.
- Only admins (SA/CA/SU) can review documents.
- A resident can upload a new version of a document even if a previous version is pending.

---

## 5. Visitor Requests

### Status Flow
```
pending → arrived → allowed → completed
                 → denied
pending → cancelled (by host or admin)
```

### Rules
- `pass_code` is auto-generated (format: `VR-XXXXXXXX`, 8 random alphanumeric chars, uppercase).
- `validate-pass` endpoint is for security guards to scan QR codes. Returns the request if valid, 404 if not found.
- A cancelled or denied request cannot be reactivated.
- Only the host (creator) or an admin can cancel.
- Gate actions (`arrive`, `allow`, `deny`, `complete`) require SA/CA/SG/SU roles.
- `complete` can only be called after `allowed`.

---

## 6. Issues

### Categories
`maintenance`, `security`, `finance`, `noise`, `parking`, `utilities`, `other`

### Priority Values
`low`, `normal`, `high`, `urgent`

### Status Flow
```
open → in_progress → resolved → closed
open → closed (direct close by admin)
```

### Escalation
- `POST /issues/{id}/escalate` sets `escalated_at` timestamp and increases priority to `urgent`.
- Notifications are dispatched to admin on escalation.

### Attachments
- Max 5 attachments per issue.
- Max file size: 10 MB each.
- MIME: images + PDF.

---

## 7. Announcements

### Status Flow
```
draft → published → archived
```

### Rules
- Only `published` announcements appear in resident feeds (`/my/announcements`).
- `target_audience` values: `all`, `residents`, `owners`, `staff`.
- Acknowledgement is per-user per-announcement (unique constraint).
- Attachments max: 10 MB each.

---

## 8. Organization Chart

### Representative Roles
`floor_representative`, `building_representative`, `association_member`, `president`, `treasurer`, `security_contact`, `admin_contact`

### Scope Levels
`compound`, `building`, `floor`

### Rules
- An assignment is `active` when `is_active = true` AND `starts_at <= today` AND (`ends_at IS NULL` OR `ends_at >= today`).
- `expire` sets `ends_at = today` and `is_active = false`.
- Multiple active assignments per user are allowed (e.g. building rep + association member).
- Responsible party lookup (`/units/{id}/responsible-party`) returns the most specific active rep for the unit's floor/building/compound.

---

## 9. Finance

### Ledger
- `balance` on `unit_accounts` is a **computed** running total: sum of all credit ledger entries minus sum of all charge entries.
- Always work with ledger entries; never update `balance` directly.
- Currencies are stored as strings (e.g. `"EGP"`) at the account level. Amounts are `DECIMAL(15,2)`.

### Payment Submissions
- Status: `pending` → `approved` | `rejected`
- On approval: a credit ledger entry is created for the unit account.
- Receipt file is stored in S3. Signed URL for download.

### Recurring Charges
- A background job (`ProcessRecurringChargesJob`) runs daily. It charges all active recurring-charge entries where `billing_day` matches today's day of month.
- `deactivate` sets `is_active = false` and stops future charges.

### Collection Campaigns
- A campaign is a one-time targeted charge batch.
- `publish` transitions status `draft → active` and sends notifications.
- `POST .../charges` applies a charge ledger entry to all unit accounts in the campaign scope. Idempotent per campaign per account.

---

## 10. Audit Logging

Every request that modifies state emits an `AuditLog` record via the `RecordsAuditLog` trait or service.

### Required Fields
- `actor_id` — authenticated user ID (null for system/background jobs)
- `action` — dot-notation string (e.g. `finance.payment_approved`)
- `ip_address` — from request
- `method` / `path` / `status_code`
- `auditable_type` / `auditable_id` — the model affected

### Rule
Audit logs are **append-only**. They must never be deleted or modified, even in tests with `RefreshDatabase`. Tests should use `assertDatabaseHas('audit_logs', [...])`.

---

## 11. Notifications

### Delivery Channels
- `in_app` — always delivered (stored in DB)
- `email` — if user preference `email_enabled = true` and category not muted
- `push` — reserved for mobile (push token required)

### Quiet Hours
- If `quiet_hours_start` and `quiet_hours_end` are set, non-urgent notifications are queued and delivered after the quiet window.
- Urgent notifications bypass quiet hours.

---

## 12. Data Integrity Rules

- **Soft-deletes are not used** for core entities. Use `archived_at` + `status = 'archived'` instead.
- **UUID primary keys** for: compounds, buildings, floors, units.
- **Integer primary keys** for: users, audit_logs, notifications, documents, issues, etc.
- **No orphan prevention via DB constraints** for soft-archivable entities — handle in service layer.
- **Transactions** must wrap any operation that modifies multiple tables (e.g. payment approval → ledger entry creation).
