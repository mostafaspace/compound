# CM-93 QA Test Plan — Data Import & Production Seeding (P20)

This document covers the acceptance criteria for CM-74 (P20 — Initial data import, migration, validation, and production seeding). All tests must pass before CM-74 is moved to Done.

---

## 1. CSV Template Downloads

1. Log in as `compound_admin`.
2. Navigate to `/imports`.
3. Click **Units template** — confirm a CSV downloads with headers: `building_code,unit_number,type,area_sqm,bedrooms,floor_number`.
4. Click **Users template** — confirm headers: `name,email,phone,role,unit_code,membership_type`.
5. Click **Opening balances template** — confirm headers: `unit_code,amount,currency,description,date`.
6. Request `GET /api/v1/imports/templates/invalid_type` — confirm `422` response.

---

## 2. Units Import

### 2a. Dry-run validation (no records written)

7. Prepare a CSV with one valid unit row (valid `building_code`, `unit_number`, `type`).
8. Upload with `dry_run = true`.
9. Confirm response `status = completed`, `isDryRun = true`, `createdCount = 1`, `errorCount = 0`.
10. Verify no unit rows exist in the database.

### 2b. Real import creates units

11. Upload the same CSV with `dry_run = false`.
12. Confirm `createdCount = 1`, `errorCount = 0`.
13. Verify the unit exists in the database with the correct `compound_id` and `building_id`.

### 2c. Duplicate unit is updated, not duplicated

14. Upload the same CSV again with `dry_run = false`.
15. Confirm `updatedCount = 1`, `createdCount = 0`, no duplicate rows created.

### 2d. Invalid building code produces row-level error

16. Upload a CSV with a `building_code` that does not exist in the compound.
17. Confirm `errorCount = 1`, `errors[0].row = 2`, `errors[0].field` includes `building_code`.
18. Verify no unit was created.

### 2e. Invalid unit type produces row-level error

19. Upload a CSV with `type = invalid_type`.
20. Confirm `errorCount = 1`.

### 2f. Floor auto-creation

21. Upload a unit with a `floor_number` that does not yet exist in the building.
22. Confirm the floor is created automatically and the unit references it.

---

## 3. Users Import

### 3a. Dry-run

23. Upload a valid users CSV with `dry_run = true`.
24. Confirm `createdCount > 0`, no user rows written to the database.

### 3b. Real import creates user

25. Upload a users CSV with `dry_run = false`.
26. Confirm new user exists with correct role and `compound_id`.
27. If `unit_code` is specified, confirm a `unit_memberships` row is created.

### 3c. Existing user is updated, not duplicated

28. Upload the same users CSV again.
29. Confirm `updatedCount = 1`, no duplicate users.

### 3d. Invalid email produces row error

30. Upload a row with `email = not-an-email`.
31. Confirm `errorCount = 1`, no user created.

### 3e. Invalid role produces row error

32. Upload a row with `role = super_admin` (not importable).
33. Confirm `errorCount = 1`, no user created.

---

## 4. Opening Balances Import

### 4a. Dry-run creates no ledger entries

34. Upload a valid opening balances CSV with `dry_run = true`.
35. Confirm `createdCount = 1`, no `ledger_entries` rows written.

### 4b. Real import creates opening balance ledger entry

36. Upload with `dry_run = false`.
37. Confirm a `UnitAccount` exists for the unit.
38. Confirm a `LedgerEntry` with `type = opening_balance` was created.
39. Confirm the unit account `balance` equals the imported amount.

### 4c. Multiple balances are additive

40. Import two opening balance rows for the same unit.
41. Confirm two ledger entries exist and the balance equals the sum.

### 4d. Unknown unit code produces row error

42. Import a row with a `unit_code` that does not exist in the compound.
43. Confirm `errorCount = 1`, no ledger entry written.

### 4e. Non-numeric amount produces row error

44. Import a row with `amount = abc`.
45. Confirm `errorCount = 1`.

---

## 5. Import Batch History

46. Navigate to `/imports` as `compound_admin` of compound A.
47. Confirm only batches for compound A are listed.
48. Switch to `super_admin` without header — confirm all compounds' batches are shown.
49. Filter by `type = units` — confirm only units batches are returned.
50. Click **View** on a batch — confirm the detail page renders with summary cards and error table.

---

## 6. Compound Isolation for Imports

51. Log in as `compound_admin` of compound A.
52. Attempt `POST /api/v1/imports` with `compound_id = <compoundB_id>`.
53. Confirm `403 Forbidden` response.

54. Log in as `super_admin` with `X-Compound-Id: <compoundA>`.
55. `GET /api/v1/imports` — confirm only compound A batches returned.

---

## 7. Baseline Seeder

56. Run `php artisan db:seed` on a fresh database.
57. Confirm the following charge types exist: `monthly_service`, `annual_subscription`, `maintenance_fee`, `parking_fee`, `late_payment_penalty`, `club_membership`, `utility_recovery`, `sinking_fund`, `one_time_charge`.
58. Re-run the seeder — confirm no duplicates are created (idempotent).
59. Confirm document types from `DocumentTypeSeeder` are also present: `ownership_contract`, `rental_contract`, `national_id`, `occupancy_proof`.

---

## 8. Admin Web UI

60. Navigate to `/imports` — confirm page renders in English with correct navigation breadcrumb.
61. Switch locale to Arabic — confirm layout is RTL, all labels are translated, table headers align correctly.
62. The import form renders without JavaScript errors.
63. Dry-run checkbox is checked by default.
64. Submitting the form without a file shows browser-native validation.
65. After a successful import, the batch history table updates with the new row.
66. The batch detail page (`/imports/<id>`) shows the error table when errors > 0.

---

## 9. Human Sign-Off Gate

| Reviewer role       | Area                                                 | Sign-off method          |
|---------------------|------------------------------------------------------|--------------------------|
| Technical lead      | Import service parsers and dry-run logic             | Comment on CM-91 in Jira |
| Finance reviewer    | Opening balance ledger entries and account balances  | Comment on CM-91 in Jira |
| Product/UX          | Admin import centre, template downloads, Arabic RTL  | Comment on CM-92 in Jira |
| QA lead             | Full test-plan execution and row-error reconciliation | Comment on CM-93 in Jira |

All four sign-offs must be recorded in Jira before CM-74 transitions to Done.
