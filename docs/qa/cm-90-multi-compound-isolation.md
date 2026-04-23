# CM-90 Multi-Compound Tenancy QA Test Plan

This document covers the acceptance criteria for CM-73 (multi-compound tenancy). All tests must pass before CM-73 is moved to Done.

---

## 1. Two-Compound Isolation — API

Provision two compounds (A and B), each with buildings, units, and a resident. Then run:

### Issues
1. Log in as `compound_admin` scoped to compound A.
2. Call `GET /api/v1/issues` — confirm only compound A issues are returned.
3. Call `GET /api/v1/issues` as `compound_admin` scoped to compound B — confirm only compound B issues are returned.
4. Log in as `super_admin` without `X-Compound-Id` header — confirm issues from both compounds are returned.
5. Log in as `super_admin` with `X-Compound-Id: <compoundA>` — confirm only compound A issues are returned.

### Visitor Requests
6. Log in as `security_guard` scoped to compound A.
7. Call `GET /api/v1/visitor-requests` — confirm only compound A visitor requests are returned.
8. Call `GET /api/v1/visitor-requests` as `security_guard` of compound B — confirm only compound B requests are returned.

### Finance
9. Log in as `finance_reviewer` scoped to compound A.
10. Call `GET /api/v1/finance/unit-accounts` — confirm only accounts for compound A units.
11. Call `GET /api/v1/finance/reports/summary` — confirm totals reflect only compound A balances.
12. Call `GET /api/v1/finance/reports/accounts` — confirm only compound A unit accounts are listed.
13. Repeat steps 9–12 as `finance_reviewer` of compound B — confirm no cross-compound data.

### Announcements
14. Log in as `compound_admin` of compound A.
15. Call `POST /api/v1/announcements` with `compoundId: <compoundA>` — confirm announcement is created.
16. Call `GET /api/v1/announcements` — confirm only compound A announcements are returned.
17. As `compound_admin` of compound B, confirm compound A announcement is NOT visible in `GET /api/v1/announcements`.

### Resident Invitations
18. Log in as `compound_admin` of compound A.
19. Call `GET /api/v1/resident-invitations` — confirm only invitations for compound A units.
20. Log in as `compound_admin` of compound B — confirm no compound A invitations appear.

---

## 2. Super-Admin Compound Switching

21. Log in as `super_admin`.
22. Call `GET /api/v1/issues` without header — confirm all compounds' issues are returned.
23. Call `GET /api/v1/issues` with `X-Compound-Id: <compoundA>` — confirm only compound A issues.
24. Call `GET /api/v1/issues` with `X-Compound-Id: <compoundB>` — confirm only compound B issues.
25. Call `GET /api/v1/finance/reports/summary` with `X-Compound-Id: <compoundA>` — confirm totals are compound A only.
26. Verify the same `X-Compound-Id` filtering works for visitor requests, announcements, unit accounts.

---

## 3. Per-Compound Settings

27. Create compound A with currency `EGP` and compound B with currency `USD`.
28. Call `GET /api/v1/settings/finance?compoundId=<compoundA>` — confirm `currency: "EGP"`.
29. Call `GET /api/v1/settings/finance?compoundId=<compoundB>` — confirm `currency: "USD"`.
30. Update a setting for compound A only; verify compound B setting is unchanged.

---

## 4. Per-Compound Timezone

31. Create compound A with timezone `Africa/Cairo` and compound B with `Asia/Dubai`.
32. Call `GET /api/v1/compounds/<compoundA>` — confirm `timezone: "Africa/Cairo"`.
33. Call `GET /api/v1/compounds/<compoundB>` — confirm `timezone: "Asia/Dubai"`.

---

## 5. Finance Reports Never Mix Cross-Property Data

34. Create one unit account in compound A with balance 500 EGP.
35. Create one unit account in compound B with balance 1000 USD.
36. Call `GET /api/v1/finance/reports/summary` as `finance_reviewer` of compound A — confirm `totalOutstanding: "500.00"`.
37. Call `GET /api/v1/finance/reports/summary` as `finance_reviewer` of compound B — confirm `totalOutstanding: "1000.00"`.
38. As `super_admin` with `X-Compound-Id: <compoundA>` — confirm only 500 EGP in summary.

---

## 6. Compound Onboarding Checklist

39. Create a fresh compound (no buildings, units, or residents).
40. Call `GET /api/v1/compounds/{id}/onboarding-checklist` — confirm:
    - `compound_activated` = false (status is `draft`)
    - `has_buildings` = false
    - `has_units` = false
    - `residents_invited` = false
    - `percentComplete` = 0
41. Activate the compound (status → `active`) — confirm `compound_activated` = true.
42. Add a building — confirm `has_buildings` = true.
43. Add a unit — confirm `has_units` = true.
44. Invite a resident — confirm `residents_invited` = true.
45. Confirm `percentComplete` increments with each completed step.

---

## 7. Admin Web — Compound Context Banner

46. Log in as `super_admin`.
47. Verify the dashboard shows a yellow/amber **compound context banner** above the content.
48. Verify the banner includes a compound selector dropdown listing all compounds.
49. Switch to compound A — verify pages refresh with compound A data.
50. Switch to compound B — verify pages refresh with compound B data.
51. Select "All compounds" — verify unfiltered data returns.
52. Log in as `compound_admin` scoped to compound A.
53. Verify no compound switcher is shown (they're always scoped to their compound).
54. Verify the banner shows the name of compound A.

---

## 8. Admin Web — Onboarding Checklist UI

55. Navigate to `/compounds/{id}/onboarding`.
56. Verify the progress bar reflects the `percentComplete` value.
57. Verify each step shows a checkmark or empty indicator correctly.
58. Verify the page renders in Arabic (RTL) without layout breakage.
59. Verify completed steps show a "Done" badge.
60. Complete all steps via the API and verify the checklist shows 100% and the completion message.

---

## 9. Human Sign-Off Gate

| Reviewer role       | Area                                            | Sign-off method             |
|---------------------|-------------------------------------------------|-----------------------------|
| Technical lead      | Compound scoping in all API modules             | Comment on CM-88 in Jira    |
| Finance reviewer    | Finance reports never mix cross-property data   | Comment on CM-88 in Jira    |
| Security operations | Compound isolation for visitors and issues      | Comment on CM-88 in Jira    |
| Product/UX          | Compound context banner and onboarding checklist UI | Comment on CM-89 in Jira |

All four sign-offs must be recorded in Jira before CM-73 transitions to Done.
