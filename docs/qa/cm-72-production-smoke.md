# CM-72 Production Smoke, Security & Launch Sign-Off

This document is the QA test plan for CM-72. It must be completed before the CM-18 parent story is moved to Done.

---

## 1. Full End-to-End Staging Smoke Test

Execute the following flow as a super-admin then as a verified resident owner. All steps must succeed without unhandled errors.

### Onboarding flow
1. Log in as super_admin.
2. Invite a new resident owner via POST `/resident-invitations`.
3. Open the invitation link and accept it (set password).
4. Log in as the new resident.
5. Submit a verification request.
6. Log in as admin; approve the verification request from `/onboarding`.

### Document flow
7. Upload a PDF document for the verified resident from `/documents`.
8. Approve the document from the review queue.
9. Confirm the resident sees the document in their profile (via mobile or API).

### Visitor & gate flow
10. As the resident, create a visitor request via POST `/visitor-requests`.
11. As security_guard, call POST `/visitor-requests/validate-pass` with the generated token.
12. Confirm result is `valid`.
13. Call allow, then complete on the visitor request.
14. Confirm `status` = `completed` via GET `/visitor-requests/{id}`.

### Issue & maintenance flow
15. As the resident, create an issue (category: maintenance) via POST `/issues`.
16. As admin, update the issue status to `in_progress`, add a comment, then escalate.
17. Confirm issue status = `escalated`.

### Announcement flow
18. As admin, create an announcement (bilingual, category: general, requiresAcknowledgement: true).
19. Publish it.
20. As resident, call POST `/announcements/{id}/acknowledge`.
21. Confirm acknowledgement appears in the admin acknowledgements panel.

### Finance flow
22. As admin, create a unit account for the resident's unit.
23. Post a charge of 500 EGP.
24. As resident, submit a payment submission (POST `/finance/unit-accounts/{id}/payment-submissions`) with a proof file.
25. As admin, approve the payment.
26. Confirm ledger balance is updated.

### Voting flow
27. As admin, create a poll (type: poll, eligibility: owners_only, 2+ options).
28. Activate the poll.
29. As resident, check eligibility via GET `/governance/votes/{id}/eligibility`.
30. Cast a vote via POST `/governance/votes/{id}/cast`.
31. Confirm 409 on a second cast attempt.
32. Close the poll as admin.

### Reports flow
33. As admin, load GET `/finance/reports/summary` and confirm it includes the approved payment.
34. Load GET `/finance/reports/accounts` and confirm the unit account balance is correct.

---

## 2. Role-Based Access Regression

For each of the following roles, verify the listed endpoints return the expected status codes.

| Role              | Allowed                                           | Forbidden (expect 403)                 |
|-------------------|---------------------------------------------------|----------------------------------------|
| super_admin       | All endpoints                                     | —                                      |
| compound_admin    | All except super_admin-only scopes                | —                                      |
| board_member      | Governance, read-only finance, announcements      | POST /finance/unit-accounts            |
| finance_reviewer  | Finance read + payment approval                   | POST /governance/votes                 |
| support_agent     | Issues, onboarding read, visitors read            | Finance approvals, governance writes   |
| resident_owner    | /my/* endpoints, visitor requests, issues submit  | Admin finance, governance create       |
| resident_tenant   | Same as resident_owner                            | Same as resident_owner                 |
| security_guard    | /visitor-requests read + validate/allow/deny      | Finance, governance, documents         |

---

## 3. Security Tests

### Authentication
- `GET /api/v1/auth/me` without token → expect 401.
- `GET /api/v1/auth/me` with revoked token → expect 401.
- `POST /api/v1/auth/login` with wrong password 6× → expect 429 on 6th attempt.

### Rate limits
- `POST /api/v1/resident-invitations/{token}/accept` 11 times from same IP → expect 429 on 11th.
- `POST /api/v1/visitor-requests/validate-pass` 61 times → expect 429 on 61st.
- `POST /api/v1/documents` 11 times in 1 minute → expect 429.
- `POST /api/v1/issues` 9 times in 1 minute → expect 429.
- `POST /finance/unit-accounts/{id}/payment-submissions` 7 times in 1 minute → expect 429.

### Sensitive document access
- Attempt to access a document download URL while authenticated as a different resident → expect 403.
- Attempt to access a private storage path directly (not through the API) → expect 403/404.

### CORS
- Send a preflight OPTIONS request from an origin not in `ADMIN_APP_URL` or `RESIDENT_APP_URL` → expect CORS rejection.

---

## 4. Backup and Restore Procedure Test

1. Create a MySQL dump of the staging database:
   ```sh
   docker compose exec db mysqldump -u root -p compound > backup_$(date +%Y%m%d).sql
   ```
2. Drop and recreate the staging database schema.
3. Restore from the dump:
   ```sh
   docker compose exec -T db mysql -u root -p compound < backup_$(date +%Y%m%d).sql
   ```
4. Run `php artisan migrate:status` — confirm all migrations are present with `Ran` status.
5. Run `php artisan test` — confirm all tests pass against the restored database.
6. Verify the restored compound, unit, membership, and finance data are accessible via the API.

---

## 5. Observability & Queue Health

1. Trigger a job failure (e.g., disable SMTP and send a notification).
2. Confirm the failed job appears in `GET /api/v1/ops/status` response under `failed_jobs`.
3. Confirm `/api/v1/ops/status` returns `status: degraded` (not `ok`) when failed jobs > 0.
4. Check Laravel Horizon dashboard is accessible and shows queue worker status.
5. Confirm Reverb WebSocket server responds to a connection on `ws://localhost:8080`.
6. Check MinIO or local storage health endpoint returns OK.

---

## 6. Performance & Response Times (Realistic Data)

Seed 100+ compounds, 500+ units, 1000+ unit memberships, 200+ issues, and 500+ visitor requests, then:

1. `GET /api/v1/issues` — expect < 500 ms.
2. `GET /api/v1/visitor-requests` — expect < 500 ms.
3. `GET /api/v1/finance/reports/summary` — expect < 1000 ms.
4. `GET /api/v1/notifications` — expect < 300 ms.
5. `GET /api/v1/governance/votes` — expect < 300 ms.
6. Admin `/finance` page load — expect < 3 s.
7. Admin `/issues` page load — expect < 3 s.

---

## 7. Production Runbook Walkthrough

1. Open `docs/backend/production-runbook.md`.
2. Follow the "Deploy new release" section. Confirm each step can be executed by a reviewer unfamiliar with the project.
3. Confirm the rollback section includes clear instructions.
4. Confirm the Horizon, Reverb, MySQL backup, and storage health check sections are present and accurate.

---

## 8. Human Sign-Off Gate

The following sign-offs are required before CM-18 is moved to Done:

| Reviewer role            | Area                                      | Sign-off method          |
|--------------------------|-------------------------------------------|--------------------------|
| Technical lead           | Full smoke flow, security tests, runbook  | Comment on CM-18 in Jira |
| Finance reviewer         | Finance flow, payment approval, reports   | Comment on CM-18 in Jira |
| Association/admin        | Announcements, issues, onboarding         | Comment on CM-18 in Jira |
| Security operations      | Visitor gate, rate limits, auth           | Comment on CM-18 in Jira |

All four sign-offs must be recorded in Jira before CM-18 transitions to Done.
