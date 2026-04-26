# QA Test Matrix — Launch Sign-off

**Compound Management Platform — CM-129**
**Date:** 2026-04-26 | **Owner:** QA Lead

Legend: ✅ Pass | ❌ Fail | ⚠️ Partial | ⬜ Not tested

---

## Section 1: Infrastructure & Health

| # | Test | Expected | Result | Notes |
|---|------|----------|--------|-------|
| INF-01 | `GET /api/v1/status` | 200 `"status":"ok"` | ⬜ | |
| INF-02 | `GET /api/v1/system/ops-status` (super_admin) | 200, all checks ok | ⬜ | |
| INF-03 | `GET /api/v1/system/launch-readiness` (super_admin) | `"overall":"ready"` | ⬜ | |
| INF-04 | Launch readiness — APP_DEBUG=false | `debug_mode` check passes | ⬜ | |
| INF-05 | Launch readiness — no failed queue jobs | `scheduledJobs.failedJobs=0` | ⬜ | |
| INF-06 | Launch readiness — compounds exist | `compounds.total > 0` | ⬜ | |
| INF-07 | Launch readiness — seed data present | `seed_data.superAdmins > 0` | ⬜ | |
| INF-08 | Queue worker processes notification job | Notification delivered within 60s | ⬜ | |
| INF-09 | Cron runs scheduled commands | Overdue issues auto-escalated | ⬜ | |
| INF-10 | DB backup runs without error | Backup file created in S3 | ⬜ | |

---

## Section 2: Authentication & Authorization

| # | Test | Expected | Result | Notes |
|---|------|----------|--------|-------|
| AUTH-01 | Login with valid credentials | 200 + token returned | ⬜ | |
| AUTH-02 | Login with invalid credentials | 401 | ⬜ | |
| AUTH-03 | Access protected endpoint without token | 401 | ⬜ | |
| AUTH-04 | Resident accessing admin endpoint | 403 | ⬜ | |
| AUTH-05 | Compound admin accessing other compound data | 403 | ⬜ | |
| AUTH-06 | Super admin accessing all compounds | 200 | ⬜ | |
| AUTH-07 | Token revoked on logout | Subsequent requests return 401 | ⬜ | |
| AUTH-08 | Suspended user login attempt | 401/403 with clear message | ⬜ | |

---

## Section 3: UAT Workflow Sign-off

| # | Scenario | Persona | Result | Tested by |
|---|----------|---------|--------|-----------|
| UAT-SA-01 | Compound onboarding | Super Admin | ⬜ | |
| UAT-SA-02 | Settings management | Super Admin | ⬜ | |
| UAT-SA-03 | User support console | Super Admin | ⬜ | |
| UAT-SA-04 | Launch readiness gate | Super Admin | ⬜ | |
| UAT-CA-01 | Building and unit management | Compound Admin | ⬜ | |
| UAT-CA-02 | Resident invitation flow | Compound Admin | ⬜ | |
| UAT-CA-03 | Issue management | Compound Admin | ⬜ | |
| UAT-CA-04 | Announcement publishing | Compound Admin | ⬜ | |
| UAT-CA-05 | Work order lifecycle | Compound Admin | ⬜ | |
| UAT-BM-01 | Governance vote | Board Member | ⬜ | |
| UAT-BM-02 | Meeting management | Board Member | ⬜ | |
| UAT-FR-01 | Unit account and charge | Finance Reviewer | ⬜ | |
| UAT-FR-02 | Payment submission review | Finance Reviewer | ⬜ | |
| UAT-FR-03 | Finance reports | Finance Reviewer | ⬜ | |
| UAT-FR-04 | Budget and reserve fund | Finance Reviewer | ⬜ | |
| UAT-SG-01 | Visitor pass validation | Security Guard | ⬜ | |
| UAT-SG-02 | Incident reporting | Security Guard | ⬜ | |
| UAT-SG-03 | Shift management | Security Guard | ⬜ | |
| UAT-AGT-01 | Duplicate detection | Support Agent | ⬜ | |
| UAT-AGT-02 | Account merge | Support Agent | ⬜ | |
| UAT-RO-01 | Onboarding document upload | Resident Owner | ⬜ | |
| UAT-RO-02 | Issue submission | Resident Owner | ⬜ | |
| UAT-RO-03 | Privacy consent | Resident Owner | ⬜ | |
| UAT-RO-04 | Data export request | Resident Owner | ⬜ | |
| UAT-RT-01 | Visitor request | Resident Tenant | ⬜ | |
| UAT-RT-02 | Announcement feed | Resident Tenant | ⬜ | |
| UAT-RT-03 | Voting eligibility | Resident Tenant | ⬜ | |

---

## Section 4: Notification Delivery

| # | Test | Expected | Result | Notes |
|---|------|----------|--------|-------|
| NOTIF-01 | Invitation email sent | Email received within 60s | ⬜ | |
| NOTIF-02 | Issue escalation email to board | Email received within 60s | ⬜ | |
| NOTIF-03 | Urgent announcement push notification | Push received within 60s | ⬜ | |
| NOTIF-04 | Payment approval notification | Notification in resident feed | ⬜ | |
| NOTIF-05 | SMS notification when sms_enabled=true | SMS received (if configured) | ⬜ | |
| NOTIF-06 | Delivery log written for each send | Log visible in admin | ⬜ | |
| NOTIF-07 | Failed delivery retried via admin | Retry succeeds | ⬜ | |

---

## Section 5: Data Integrity

| # | Test | Expected | Result | Notes |
|---|------|----------|--------|-------|
| DATA-01 | Compound isolation — admin A cannot see compound B data | 403 | ⬜ | |
| DATA-02 | Resident can only see their own data | 403 for other residents | ⬜ | |
| DATA-03 | Payment allocated to correct unit account | Balance changes correctly | ⬜ | |
| DATA-04 | Audit log entry created for every sensitive action | Entries in audit_logs table | ⬜ | |
| DATA-05 | Anonymized user data is scrubbed | name/email replaced, anonymized_at set | ⬜ | |
| DATA-06 | Legal hold prevents anonymization | 422 returned | ⬜ | |
| DATA-07 | Revoked consent cannot be used | Latest active consent only | ⬜ | |
| DATA-08 | Unit account balance does not go negative without explicit allow | Reject on over-payment | ⬜ | |

---

## Section 6: Localization & Accessibility

| # | Test | Expected | Result | Notes |
|---|------|----------|--------|-------|
| L10N-01 | Admin UI renders correctly in Arabic | RTL layout, Arabic text | ⬜ | |
| L10N-02 | Admin UI renders correctly in English | LTR layout, English text | ⬜ | |
| L10N-03 | `GET /api/v1/locale` returns correct defaults | `locale=ar`, `timezone=Africa/Cairo` | ⬜ | |
| L10N-04 | Compound locale override applied | Compound-specific locale returned | ⬜ | |
| L10N-05 | Date format respects `date_format` setting | Dates formatted as DD/MM/YYYY for ar | ⬜ | |
| L10N-06 | Currency formatted correctly for EGP | Amounts show ج.م symbol | ⬜ | |
| L10N-07 | All UI strings translated in both locales | No missing translation keys | ⬜ | |
| L10N-08 | Phone number formatted with country code | `+20 01012345678` | ⬜ | |

---

## Section 7: Pilot Rollout Validation

| # | Test | Expected | Result | Notes |
|---|------|----------|--------|-------|
| PILOT-01 | 20 pilot invitations sent in batch | All 20 delivered within 5 minutes | ⬜ | |
| PILOT-02 | Pilot residents can sign in and complete onboarding | Zero errors reported | ⬜ | |
| PILOT-03 | Pause new invitations (emergency stop) | No new invitations sent | ⬜ | |
| PILOT-04 | Pilot-group compound settings applied | Pilot compound uses UAT settings | ⬜ | |

---

## Sign-off Summary

| Reviewer | Role | Sections | Signature | Date |
|----------|------|----------|-----------|------|
| | Technical Lead | INF, AUTH | | |
| | Finance Lead | FR scenarios, DATA | | |
| | Security Lead | SG scenarios, NOTIF | | |
| | Admin Operator | CA, BM, SA scenarios | | |
| | Resident Rep | RO, RT scenarios | | |
| | QA Lead | All sections | | |
| | Product Owner | Final approval | | |

**Launch Approved:** _________________ Date: _________

---

## Open Issues at Sign-off

| # | Description | Severity | Owner | ETA |
|---|-------------|----------|-------|-----|
| | | | | |

> All P1 and P2 issues must be resolved before launch approval is granted.
