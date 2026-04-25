# Story → Test Traceability Matrix

Maps every Jira parent story to its automated test coverage. Used for production sign-off and as a gap-analysis tool for the QA reviewer.

Legend:
- ✅ Automated test exists and passing
- ⚠️ Partial coverage (happy path only, no edge cases)
- ❌ No automated test yet
- 🔬 Manual-only (human review required)

---

## Platform & Auth (P01–P02)

| Story | Jira | Test File | Key Test Cases | Status |
|-------|------|-----------|----------------|--------|
| P01 Platform Foundation | CM-1 | — | Architecture, migrations, seeders | ✅ (via migrations run in all tests) |
| P02 Authentication & RBAC | CM-2 | `AuthTest.php` | Login, logout, token revoke, role-based 403, suspended/archived 403, pending_review restricted, audit log on login | ✅ |

### P02 AuthTest.php Coverage
- `test_active_user_can_login_and_fetch_profile` ✅
- `test_suspended_user_cannot_login` ✅
- `test_pending_review_resident_can_login_with_restricted_access` ✅
- `test_user_can_logout_and_token_is_revoked` ✅
- `test_unauthenticated_request_to_protected_endpoint_returns_401` ✅
- `test_wrong_credentials_return_validation_error` ✅
- `test_super_admin_can_access_admin_only_endpoint` ✅
- `test_security_guard_cannot_access_finance_endpoints` ✅
- `test_security_guard_can_access_visitor_endpoints` ✅
- `test_resident_cannot_access_admin_endpoints` ✅
- `test_finance_reviewer_can_access_finance_routes` ✅
- `test_board_member_can_read_finance_routes` ✅
- `test_resident_cannot_access_other_resident_data` ✅
- `test_inactive_user_account_cannot_be_used` ✅
- `test_audit_log_is_created_on_login` ✅

---

## Property Registry (P03)

| Story | Jira | Test File | Key Test Cases | Status |
|-------|------|-----------|----------------|--------|
| P03 Property Registry | CM-3 | `PropertyRegistryTest.php` | Compound/building/floor/unit CRUD, archive, import CSV, export CSV | ✅ |
| P03 Human Test Guide | CM-3 | `docs/qa/p03-property-registry-human-test.md` | Manual happy-path walkthrough | 🔬 |

---

## Onboarding & Documents (P04–P05)

| Story | Jira | Test File | Key Test Cases | Status |
|-------|------|-----------|----------------|--------|
| P04 Resident Onboarding | CM-4 | `OnboardingAndDocumentsTest.php` | Invitation create/revoke/resend, accept flow, verification approve/reject/request-more-info | ✅ |
| P05 Document Management | CM-5 | `OnboardingAndDocumentsTest.php` | Upload, review, download signed URL | ✅ |
| P04 Human Test Guide | CM-4 | `docs/qa/p04-onboarding-human-test.md` | Manual invitation acceptance walkthrough | 🔬 |

---

## Org Chart (P06)

| Story | Jira | Test File | Key Test Cases | Status |
|-------|------|-----------|----------------|--------|
| P06 Organization Chart | CM-6 | `OrgChartTest.php` | Create/expire/update assignment, org chart view, responsible-party lookup | ✅ |

---

## Visitor Management (P08)

| Story | Jira | Test File | Key Test Cases | Status |
|-------|------|-----------|----------------|--------|
| P08 Visitor Requests | CM-8 | `VisitorRequestsTest.php` | Create, cancel, validate-pass, arrive, allow, deny, complete, RBAC | ✅ |

---

## Notifications (P09)

| Story | Jira | Test File | Key Test Cases | Status |
|-------|------|-----------|----------------|--------|
| P09 Notifications | CM-9 | `NotificationsTest.php` | Index, mark-read, mark-all-read, archive, unread-count, preferences | ✅ |

---

## Announcements (P10)

| Story | Jira | Test File | Key Test Cases | Status |
|-------|------|-----------|----------------|--------|
| P10 Announcements | CM-10 | `AnnouncementsTest.php` | CRUD, publish, archive, attachments, resident feed, acknowledge | ✅ |
| P10 Human Test Guide | CM-10 | `docs/qa/p10-announcements-human-test.md` | Manual review of announcement flow | 🔬 |

---

## Issues (P11)

| Story | Jira | Test File | Key Test Cases | Status |
|-------|------|-----------|----------------|--------|
| P11 Issue Management | CM-11 | `IssuesTest.php` | Create, list (admin + resident), show, update status, escalate, attachments, comments | ✅ |

---

## Finance (P14–P16)

| Story | Jira | Test File | Key Test Cases | Status |
|-------|------|-----------|----------------|--------|
| P14 Finance Ledger | CM-14 | `FinanceTest.php` | Unit account create/list, ledger entries, balance | ✅ |
| P15 Payments | CM-15 | `FinanceTest.php` | Submit payment (with receipt), approve, reject | ✅ |
| P16 Charge Types & Recurring | CM-16 | `ChargesTest.php` | Create charge type, recurring charge, deactivate | ✅ |
| P17 Collection Campaigns | CM-17 | `ChargesTest.php` | Create, publish, archive, apply charges | ✅ |

---

## Audit Logs (P19)

| Story | Jira | Test File | Key Test Cases | Status |
|-------|------|-----------|----------------|--------|
| P19 Audit Logs | CM-19 | `AuditLogTest.php` | Index with filters, action/actor filtering, RBAC (resident 403) | ✅ |

---

## API Contracts & Documentation (P33)

| Story | Jira | Deliverable | Status |
|-------|------|-------------|--------|
| P33 Backend Contracts | CM-130 | `docs/backend/api-contracts.md` | ✅ |
| P33 Domain Rules | CM-130 | `docs/backend/domain-rules.md` | ✅ |
| P33 Backend Coding Standards | CM-130 | `docs/backend/coding-standards.md` | ✅ |
| P33 Frontend Handoff Guide | CM-131 | `docs/frontend/handoff-guide.md` | ✅ |
| P33 Component Patterns | CM-131 | `docs/frontend/component-patterns.md` | ✅ |
| P33 Story-Test Traceability | CM-132 | `docs/qa/story-test-traceability.md` | ✅ (this file) |
| P33 Agent Continuation Prompt | CM-87 | `docs/agent-continuation-prompt.md` | ✅ |
| P33 Architecture | CM-87 | `docs/architecture.md` | ✅ |
| P33 Local Development | CM-87 | `docs/local-development.md` | ✅ |
| P33 Technical Decisions | CM-87 | `docs/technical-decisions.md` | ✅ |

---

## UAT, Launch & Handover (P32)

| Story | Jira | Deliverable | Status |
|-------|------|-------------|--------|
| P32 UAT Persona Seeder | CM-127 | `UatPersonaSeeder.php` — 8 persona accounts | ✅ |
| P32 Ops Status Checks | CM-127 | `OperationalStatusService.php` — notifications + scheduledJobs checks | ✅ |
| P32 UAT Checklist | CM-128 | `docs/qa/cm-86-uat-checklist.md` — 50+ scenarios across 8 personas | ✅ |
| P32 Launch Readiness | CM-128 | `docs/qa/cm-86-launch-readiness.md` — infrastructure, data, security checks | ✅ |
| P32 Training Guide | CM-128 | `docs/qa/cm-86-training-guide.md` — admin, treasurer, security, resident guides | ✅ |
| P32 QA Sign-off | CM-129 | `docs/qa/cm-86-uat-checklist.md` sign-off section | 🔬 (human review) |

---

## Stories Without Automated Test Coverage (Gaps)

The following areas need tests if/when implementation is added:

| Area | Notes |
|------|-------|
| Recurring charge job | `ProcessRecurringChargesJob` — unit test that simulates `billing_day` match |
| Notification delivery | Email/push channel dispatch — needs a queue fake assertion |
| File download signed URL | Requires S3 mock or local disk assertion |
| Payment receipt upload | Multipart upload in test environment |
| Invitation expiry | Test that expired token returns 403 on `accept` |
| Quiet hours (notifications) | Test that non-urgent notifications are deferred |
| Realtime (Reverb) | Broadcasting assertions via `Event::fake()` |

---

## Human Review Checklist (QA Sign-off)

Before transitioning P33 to Done:

- [ ] All test files in `tests/Feature/Api/V1/` pass with `php artisan test`
- [ ] `docs/backend/api-contracts.md` matches actual implemented routes (spot-check 5 endpoints)
- [ ] `docs/backend/domain-rules.md` reflects role/status rules in middleware and services
- [ ] `docs/frontend/handoff-guide.md` mentions bilingual requirement and design tokens
- [ ] A new agent following `docs/agent-continuation-prompt.md` + these docs can implement a small story without extra clarification
- [ ] Arabic translations exist for all currently implemented admin pages

---

## Running the Full Test Suite

```bash
cd apps/api
php artisan migrate:fresh --env=testing
php artisan test
```

Expected: all tests pass (420 tests as of 2026-04-25).

To run a specific file:
```bash
php artisan test tests/Feature/Api/V1/AuthTest.php
```
