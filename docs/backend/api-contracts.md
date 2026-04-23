# API Contracts — Backend Reference

All endpoints are prefixed with `/api/v1`. Authentication uses `Authorization: Bearer <token>` (Sanctum personal access tokens).

## Conventions

| Item | Convention |
|------|-----------|
| Response envelope | `{"data": ..., "meta": {...}}` for single resources |
| Paginated envelope | `{"data": [...], "links": {...}, "meta": {current_page, last_page, per_page, total, ...}}` |
| Timestamps | ISO 8601 UTC strings, e.g. `"2025-01-15T10:30:00.000000Z"` |
| IDs | Integers for users, UUIDs (strings) for compound, building, floor, unit resources |
| Empty 200 | `{"data": null}` for actions that return nothing |
| Validation errors | HTTP 422 with `{"errors": {"field": ["message"]}}` |
| Auth errors | HTTP 401 `{"message": "Unauthenticated."}` |
| Permission errors | HTTP 403 `{"message": "Forbidden."}` |
| Not found | HTTP 404 `{"message": "Not Found."}` |

### Role Abbreviations Used Below

| Abbrev | Role |
|--------|------|
| SA | super_admin |
| CA | compound_admin |
| BM | board_member |
| FR | finance_reviewer |
| SG | security_guard |
| RO | resident_owner |
| RT | resident_tenant |
| SU | support_agent |

---

## Auth

### POST /auth/login
Throttle: 5/min. No auth required.

**Request**
```json
{ "email": "admin@example.com", "password": "secret", "deviceName": "web" }
```

**Response 200**
```json
{
  "data": {
    "token": "1|abc123...",
    "tokenType": "Bearer",
    "user": {
      "id": 1, "name": "Admin", "email": "admin@example.com",
      "role": "super_admin", "status": "active",
      "phone": null, "emailVerifiedAt": "2025-01-01T00:00:00.000000Z",
      "lastLoginAt": "2026-04-22T08:00:00.000000Z"
    }
  }
}
```

**Errors**
- `422` — wrong credentials → `{"errors": {"email": ["These credentials do not match our records."]}}`
- `403` — suspended/archived account

---

### GET /auth/me
Auth required.

**Response 200** — `ApiEnvelope<AuthenticatedUser>`

---

### POST /auth/logout
Auth required.

**Response 200** — `{"data": null}` — current device token deleted.

---

## Notifications

All routes: `auth:sanctum`.

### GET /notifications
Query: `page`, `per_page` (default 20), `category`, `unread_only`.

**Response 200** — `PaginatedEnvelope<UserNotification>`

### GET /notifications/unread-count
**Response 200** — `{"data": {"count": 5}}`

### POST /notifications/read-all
**Response 200** — `{"data": null}`

### POST /notifications/archive-all
**Response 200** — `{"data": null}`

### GET /notifications/{id}
**Response 200** — `ApiEnvelope<UserNotification>`

### POST /notifications/{id}/read
**Response 200** — `{"data": null}`

### POST /notifications/{id}/archive
**Response 200** — `{"data": null}`

### GET /notification-preferences
**Response 200** — `ApiEnvelope<NotificationPreference>`

### PUT /notification-preferences
**Request** — `UpdateNotificationPreferenceInput` (all fields optional)
**Response 200** — `ApiEnvelope<NotificationPreference>`

---

## Document Types

Roles: SA, CA, BM, FR, SU, RO, RT.

### GET /document-types
**Response 200**
```json
{"data": [{"id": 1, "name": "National ID", "slug": "national_id", "required": true}]}
```

---

## Documents

Roles: SA, CA, BM, FR, SU, RO, RT (scoped to own docs for residents).

### GET /documents
**Response 200** — `PaginatedEnvelope<UserDocument>`

```json
{
  "data": [{
    "id": 1, "userId": 42, "documentTypeId": 1,
    "documentType": {"id": 1, "name": "National ID"},
    "status": "pending_review",
    "fileUrl": null, "reviewNote": null,
    "reviewedAt": null, "reviewedBy": null,
    "expiresAt": "2027-01-01", "createdAt": "2026-01-01T00:00:00.000000Z"
  }]
}
```

### POST /documents
Multipart form upload.

**Request fields**: `document_type_id` (int), `file` (binary, max 10 MB, mime: pdf/jpg/png), `expires_at` (date, optional)

**Response 201** — `ApiEnvelope<UserDocument>`

### GET /documents/{id}/download
Redirects to signed S3 URL (60 s TTL).

**Response 302** or **200** with binary stream.

### PATCH /documents/{id}/review
Roles: SA, CA, SU. Status must be `pending_review`.

**Request** `{ "status": "approved" | "rejected", "note": "optional" }`
**Response 200** — `ApiEnvelope<UserDocument>`

---

## Resident Invitations

### GET /resident-invitations/{token} *(public)*
Returns invitation metadata without secret fields.

**Response 200**
```json
{"data": {"id": 1, "email": "user@example.com", "role": "resident_owner", "status": "pending", "unit": {...}}}
```

### POST /resident-invitations/{token}/accept *(public, throttle)*
**Request** `AcceptResidentInvitationInput`
```json
{"name": "Ahmed", "phone": "+201000000000", "password": "secure", "password_confirmation": "secure"}
```
**Response 200** — `ApiEnvelope<LoginResult>` (auto-login after accept)

### GET /resident-invitations
Roles: SA, CA, BM, FR, SU.
**Response 200** — `PaginatedEnvelope<ResidentInvitation>`

### POST /resident-invitations
Roles: SA, CA, BM, FR, SU.
**Request** — `CreateResidentInvitationInput`
**Response 201** — `ApiEnvelope<ResidentInvitation>`

### POST /resident-invitations/{id}/revoke
**Response 200** — `{"data": null}`

### POST /resident-invitations/{id}/resend
**Response 200** — `{"data": null}` — new email dispatched.

---

## Verification Requests

### GET /my/verification-requests
Roles: RO, RT.
**Response 200** — `PaginatedEnvelope<VerificationRequest>`

### GET /verification-requests
Roles: SA, CA, BM, FR, SU.
Query: `status`, `page`, `per_page`.
**Response 200** — `PaginatedEnvelope<VerificationRequest>`

### PATCH /verification-requests/{id}/approve
Roles: SA, CA, BM, FR, SU.
**Request** — `ReviewVerificationRequestInput` (`note` optional)
**Response 200** — `ApiEnvelope<VerificationRequest>`

### PATCH /verification-requests/{id}/reject
Same as approve but status → `rejected`.

### PATCH /verification-requests/{id}/request-more-info
**Request** `{ "note": "Please provide utility bill." }`
**Response 200** — `ApiEnvelope<VerificationRequest>`

---

## Property Registry

Roles: SA, CA, BM, FR, SU.

### GET /compounds
**Response 200** — `PaginatedEnvelope<CompoundSummary>`

### POST /compounds
**Request**
```json
{"name": "Maadi Compound", "legalName": "Maadi Dev Co", "code": "MDC", "timezone": "Africa/Cairo", "currency": "EGP"}
```
**Response 201** — `ApiEnvelope<CompoundDetail>`

### GET /compounds/{id}
**Response 200** — `ApiEnvelope<CompoundDetail>` (includes buildings)

### PATCH /compounds/{id}
Partial update. **Response 200** — `ApiEnvelope<CompoundDetail>`

### POST /compounds/{id}/archive
**Request** `{ "reason": "optional" }`
**Response 200** — `{"data": null}`

### GET /compounds.buildings (nested)
`GET /compounds/{compoundId}/buildings`
**Response 200** — `PaginatedEnvelope<BuildingSummary>`

### POST /compounds.buildings
`POST /compounds/{compoundId}/buildings`
**Request** `{ "name": "Tower A", "code": "A", "sort_order": 1 }`
**Response 201** — `ApiEnvelope<BuildingDetail>`

### GET /buildings/{id}
**Response 200** — `ApiEnvelope<BuildingDetail>`

### PATCH /buildings/{id}
**Response 200** — `ApiEnvelope<BuildingDetail>`

### POST /buildings/{id}/archive
**Response 200** — `{"data": null}`

### GET/POST /buildings/{id}/floors
**Response 200** — `PaginatedEnvelope<FloorSummary>`
**POST Request** `{ "label": "Ground", "level_number": 0, "sort_order": 1 }`

### GET /floors/{id}
### PATCH /floors/{id}
### POST /floors/{id}/archive

### GET/POST /buildings/{buildingId}/units (shallow route)
### GET /units/{id}
### PATCH /units/{id}
### POST /units/{id}/archive

**Unit fields**: `unit_number`, `type` (apartment/studio/villa/duplex/retail/office/other), `area_sqm`, `bedrooms`, `floor_id` (optional)

### GET /units
Query: `compound_id`, `building_id`, `floor_id`, `status`, `q` (unit number search), `page`.
Roles: SA, CA, BM, FR, SU.
**Response 200** — `PaginatedEnvelope<UnitSummary>`

### POST /buildings/{id}/units/import
Multipart CSV upload. Max 1000 rows. Validates all rows before inserting.
**Response 200** — `{"data": {"imported": 42, "errors": []}}`

### GET /buildings/{id}/units/export
**Response** — CSV file download

### GET /units/{id}/memberships
**Response 200** — `PaginatedEnvelope<UnitMembership>`

### POST /units/{id}/memberships
**Request** `{ "user_id": 5, "relation_type": "owner", "starts_at": "2025-01-01", "is_primary": true }`

### PATCH /unit-memberships/{id}
Partial update.

### POST /unit-memberships/{id}/end
Ends active membership.

---

## My Units

Roles: RO, RT.

### GET /my/units
**Response 200** — `ApiEnvelope<UnitSummary[]>`

---

## Visitor Requests

### GET /visitor-requests
Roles: SA, CA, SG, SU, RO, RT (residents see own; guards/admins see all).
Query: `status`, `compound_id`, `date`, `page`.

**Response 200** — `PaginatedEnvelope<VisitorRequest>`
```json
{
  "data": [{
    "id": 1,
    "hostUserId": 42,
    "visitorName": "Mohammed Ali",
    "visitorPhone": "+201000000000",
    "expectedArrivalAt": "2026-04-22T14:00:00.000000Z",
    "passCode": "VR-ABC123",
    "status": "pending",
    "arrivedAt": null, "allowedAt": null, "deniedAt": null, "completedAt": null,
    "cancelledAt": null, "cancelNote": null,
    "createdAt": "2026-04-22T10:00:00.000000Z"
  }]
}
```

### POST /visitor-requests
Roles: SA, CA, SG, SU, RO, RT.
**Request** `{ "visitor_name": "Mohammed Ali", "visitor_phone": "+201...", "expected_arrival_at": "2026-04-22T14:00:00Z", "note": "optional" }`
**Response 201** — `ApiEnvelope<VisitorRequest>`

### POST /visitor-requests/{id}/cancel
Roles: owner of request or admin.
**Request** `{ "note": "optional" }`
**Response 200** — `{"data": null}`

### POST /visitor-requests/validate-pass
Roles: SA, CA, SG, SU.
**Request** `{ "pass_code": "VR-ABC123" }`
**Response 200** — `ApiEnvelope<VisitorRequest>` or 404.

### POST /visitor-requests/{id}/arrive
Roles: SA, CA, SG, SU.
**Response 200** — `{"data": null}`

### POST /visitor-requests/{id}/allow
### POST /visitor-requests/{id}/deny
**Request** (deny only) `{ "note": "optional" }`
**Response 200** — `{"data": null}`

### POST /visitor-requests/{id}/complete
**Response 200** — `{"data": null}`

---

## Issues

### POST /issues
Any authenticated user.
**Request** `{ "title": "Water leak", "description": "...", "category": "maintenance", "priority": "normal", "unit_id": "uuid", "attachments": [file] }`
**Response 201** — `ApiEnvelope<Issue>`

### GET /my/issues
Roles: RO, RT (own issues only).
**Response 200** — `PaginatedEnvelope<Issue>`

### GET /issues
Roles: SA, CA, BM, FR, SU.
Query: `status`, `category`, `priority`, `unit_id`, `assignee_id`, `page`.
**Response 200** — `PaginatedEnvelope<Issue>`

### GET /issues/{id}
Roles: SA, CA, BM, FR, SU.

**Issue shape**
```json
{
  "id": 1, "title": "Water leak", "description": "...",
  "category": "maintenance", "priority": "normal",
  "status": "open",
  "unitId": "uuid", "reportedByUserId": 42,
  "assignedToUserId": null, "escalatedAt": null,
  "resolvedAt": null, "closedAt": null,
  "createdAt": "2026-01-01T00:00:00.000000Z"
}
```

### PATCH /issues/{id} (or PUT)
Roles: SA, CA, BM, FR, SU.
Fields: `status`, `assignee_id`, `priority`, `title`, `description`.
**Response 200** — `ApiEnvelope<Issue>`

### POST /issues/{id}/escalate
**Response 200** — `{"data": null}`

### GET /issues/{id}/attachments
**Response 200** — `ApiEnvelope<IssueAttachment[]>`

### POST /issues/{id}/attachments
Multipart. Field: `file`.
**Response 201** — `ApiEnvelope<IssueAttachment>`

### POST /issues/{id}/comments
Any authenticated user (must have access to issue).
**Request** `{ "body": "Text..." }`
**Response 201** — `ApiEnvelope<IssueComment>`

---

## Announcements

### GET /my/announcements
Any authenticated user. Returns published announcements targeted to the user's role/unit.
**Response 200** — `PaginatedEnvelope<Announcement>`

### GET /announcements/{id}
Any authenticated user.

### GET /announcements/{id}/attachments/{attachmentId}/download
Returns signed download URL.

### POST /announcements/{id}/acknowledge
**Response 200** — `{"data": null}`

### GET /announcements
Roles: SA, CA, BM, FR, SU.
Query: `status`, `page`.
**Response 200** — `PaginatedEnvelope<Announcement>`

**Announcement shape**
```json
{
  "id": 1, "title": "Maintenance Notice", "body": "...",
  "status": "draft" | "published" | "archived",
  "targetAudience": "all" | "residents" | "owners" | "staff",
  "publishedAt": null, "archivedAt": null,
  "attachments": [], "createdAt": "..."
}
```

### POST /announcements
Roles: SA, CA, BM, FR, SU.
**Request** `{ "title": "...", "body": "...", "target_audience": "all", "attachments": [file] }`
**Response 201** — `ApiEnvelope<Announcement>`

### PATCH /announcements/{id}
**Response 200** — `ApiEnvelope<Announcement>`

### POST /announcements/{id}/publish
**Response 200** — `{"data": null}`

### POST /announcements/{id}/archive
**Response 200** — `{"data": null}`

### POST /announcements/{id}/attachments
Multipart. Field: `file` (max 20 MB).
**Response 201** — `ApiEnvelope<AnnouncementAttachment>`

### GET /announcements/{id}/acknowledgements
**Response 200** — `PaginatedEnvelope<AnnouncementAcknowledgement>`

---

## Organization Chart

### GET /compounds/{compoundId}/org-chart
Any authenticated user.
**Response 200** — representative assignments tree for the compound.

### GET /units/{unitId}/responsible-party
Any authenticated user.
**Response 200** — the assigned representative for a unit.

### GET /compounds/{compoundId}/representatives
Roles: SA, CA, BM, FR, SU.
**Response 200** — `PaginatedEnvelope<RepresentativeAssignment>`

**RepresentativeAssignment shape**
```json
{
  "id": 1, "compoundId": "uuid", "userId": 42,
  "user": {"id": 42, "name": "Ahmed", "role": "resident_owner"},
  "role": "floor_representative",
  "scopeLevel": "floor", "buildingId": "uuid", "floorId": "uuid",
  "isActive": true, "startsAt": "2026-01-01", "endsAt": null,
  "notes": null
}
```

### POST /compounds/{compoundId}/representatives
Roles: SA, CA, BM, FR, SU.
**Request** `{ "user_id": 42, "role": "floor_representative", "scope_level": "floor", "building_id": "uuid", "floor_id": "uuid", "starts_at": "2026-01-01", "ends_at": null, "notes": null }`
**Response 201** — `ApiEnvelope<RepresentativeAssignment>`

### GET /representative-assignments/{id}
### PATCH /representative-assignments/{id}
### POST /representative-assignments/{id}/expire
**Response 200** — `{"data": null}`

---

## Finance

Roles: SA, CA, BM, FR for all finance admin routes. Residents use `/my/finance/...`.

### GET /finance/unit-accounts
Query: `compound_id`, `building_id`, `unit_id`, `balance_min`, `balance_max`, `page`.
**Response 200** — `PaginatedEnvelope<UnitAccount>`

**UnitAccount shape**
```json
{
  "id": 1, "unitId": "uuid", "unit": {...},
  "balance": "1500.00", "currency": "EGP",
  "lastChargedAt": null, "lastPaidAt": null,
  "createdAt": "..."
}
```

### POST /finance/unit-accounts
**Request** `{ "unit_id": "uuid" }`
**Response 201** — `ApiEnvelope<UnitAccount>`

### GET /finance/unit-accounts/{id}
Includes ledger entries.

### POST /finance/unit-accounts/{id}/ledger-entries
**Request** `{ "type": "charge" | "credit", "amount": "500.00", "note": "Monthly service fee" }`
**Response 201** — `ApiEnvelope<LedgerEntry>`

### GET /my/finance/unit-accounts
Roles: RO, RT. Returns own accounts.

### POST /finance/unit-accounts/{id}/payment-submissions
Roles: SA, CA, BM, FR, SU, RO, RT.
Multipart: `amount`, `payment_method`, `payment_date`, `reference_number`, `file` (receipt).
**Response 201** — `ApiEnvelope<PaymentSubmission>`

### GET /finance/payment-submissions
**Response 200** — `PaginatedEnvelope<PaymentSubmission>`

### GET /my/finance/payment-submissions
Roles: RO, RT.

### PATCH /finance/payment-submissions/{id}/approve
**Request** `{ "note": "optional" }`
**Response 200** — `{"data": null}`

### PATCH /finance/payment-submissions/{id}/reject
**Request** `{ "reason": "Blurry receipt." }`
**Response 200** — `{"data": null}`

### GET /finance/charge-types
**Response 200** — `ApiEnvelope<ChargeType[]>`

### POST /finance/charge-types
**Request** `{ "name": "Monthly Fee", "default_amount": "500.00", "currency": "EGP", "is_recurring": true }`

### GET /finance/charge-types/{id}
### PATCH /finance/charge-types/{id}

### GET /finance/recurring-charges
### POST /finance/recurring-charges
**Request** `{ "charge_type_id": 1, "unit_id": "uuid", "amount": "500.00", "billing_day": 1, "starts_at": "2026-01-01" }`

### GET /finance/recurring-charges/{id}
### PATCH /finance/recurring-charges/{id}/deactivate

### GET /finance/collection-campaigns
### POST /finance/collection-campaigns
**Request** `{ "name": "Q1 2026", "description": "...", "due_date": "2026-03-31", "charge_type_id": 1, "amount": "500.00" }`

### GET /finance/collection-campaigns/{id}
### PATCH /finance/collection-campaigns/{id}
### PATCH /finance/collection-campaigns/{id}/publish
### PATCH /finance/collection-campaigns/{id}/archive
### POST /finance/collection-campaigns/{id}/charges
Applies campaign charges to all eligible unit accounts.

---

## Audit Logs

Roles: SA, CA, SU.

### GET /audit-logs
Query: `action`, `actor_id`, `from`, `to`, `method`, `q` (path search), `per_page`.

**Response 200** — `PaginatedEnvelope<AuditLogEntry>`

**AuditLogEntry shape**
```json
{
  "id": 1, "actorId": 1, "actor": {...},
  "action": "auth.login_succeeded",
  "auditableType": "App\\Models\\User", "auditableId": "1",
  "ipAddress": "127.0.0.1", "userAgent": "...",
  "method": "POST", "path": "/api/v1/auth/login",
  "statusCode": 200, "metadata": {},
  "createdAt": "2026-04-22T08:00:00.000000Z"
}
```

Known action strings:
- `auth.login_succeeded`, `auth.login_failed`, `auth.logout`
- `documents.uploaded`, `documents.reviewed`
- `finance.payment_approved`, `finance.payment_rejected`
- `issues.escalated`
- `announcements.published`
- `visitor_requests.allowed`, `visitor_requests.denied`

---

## System Status

### GET /status *(public)*
**Response 200**
```json
{
  "data": {
    "service": "compound-api",
    "status": "ok",
    "environment": "production",
    "timezone": "Africa/Cairo",
    "appVersion": "13.5.0",
    "timestamp": "2026-04-23T17:31:52+02:00"
  }
}
```

### GET /system/ops-status *(auth:sanctum, roles: SA, CA, SU)*
Operator-only readiness view for production support.

**Response 200**
```json
{
  "data": {
    "service": "compound-api",
    "status": "ok",
    "environment": "production",
    "timezone": "Africa/Cairo",
    "appVersion": "13.5.0",
    "timestamp": "2026-04-23T17:31:52+02:00",
    "checks": {
      "database": { "status": "ok", "driver": "mysql", "latencyMs": 4 },
      "redis": { "status": "ok", "client": "phpredis", "latencyMs": 1 },
      "queue": { "status": "ok", "connection": "redis", "failedJobs": 0, "latencyMs": 2 },
      "storage": { "status": "ok", "disk": "s3", "driver": "s3", "latencyMs": 90 },
      "broadcasting": {
        "status": "configured",
        "connection": "reverb",
        "driver": "reverb",
        "host": "reverb",
        "port": "8080"
      }
    },
    "warnings": ["APP_DEBUG is enabled."]
  }
}
```

If a dependency is degraded, the corresponding check includes a short `message` string and the top-level `status` becomes `degraded`.

---

## Pagination

Default `per_page` is 20. Max is 100. Use `?page=2&per_page=50` query params.

## Error Codes Summary

| HTTP | Meaning |
|------|---------|
| 200 | Success |
| 201 | Resource created |
| 302 | Redirect (file download) |
| 401 | Unauthenticated |
| 403 | Forbidden (wrong role or account suspended) |
| 404 | Not found |
| 422 | Validation error |
| 429 | Rate limited |
| 500 | Internal server error |
