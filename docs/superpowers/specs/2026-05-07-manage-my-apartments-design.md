# Manage My Apartment(s) Design

Status: Draft
Last updated: 2026-05-07
Owner: Mostafa Magdy

## Purpose

Give residents (especially owners with multiple units) a single, unit-scoped surface for managing the people, vehicles, parking, finance, documents, violations, and notes attached to each apartment they hold. Move document and finance access under apartment scope so unit-level history and balances stay coherent regardless of which user currently lives in the unit.

## Scope

Single-spec delivery covering:

1. Apartment hub on mobile (replaces `property` feature).
2. Resident management (family + renter records).
3. Vehicle CRUD (max 4 per unit).
4. Parking spot CRUD (max 4 per unit; some units have 0 by default 1).
5. Violation rules + violation application (admin web).
6. Notes timeline.
7. Document relocation under apartment scope with admin review of replacements.
8. Finance summary under apartment scope with offline payment receipt submission.

Web access for residents is deferred. Mobile is the only resident surface in this delivery.

## Non-Goals

- Inline payment processing. Receipts only.
- Rich document diffing in admin review (visual side-by-side is enough).
- Cross-unit reporting for owners (per-unit only).
- New finance primitives. Existing `UnitAccount`, `LedgerEntry`, `RecurringCharge`, `PaymentSubmission`, `PaymentAllocation` are reused.
- Edit history on notes (append-only timeline).

## Roles and Permissions

- **Resident edit (any verified active membership on the unit):** add/edit/delete residents, vehicles, parking spots, notes, documents (upload + replace). Permissive baseline. Will tighten in a later iteration.
- **Admin (`apartments.admin`):** violation rule CRUD, document review queue, view-only tabs on unit page mirroring mobile.
- **Admin (`apartments.violations.apply`):** apply violation to a unit, mark paid/waived.

## Domain Model

New namespace `App\Models\Apartments\*`. New tables. The `units` table stays — canon retains "Unit" terminology in the database. "Apartment" is the user-facing label and the namespace for new feature entities.

### Renamed

| Old | New |
| --- | --- |
| `unit_memberships` table + `App\Models\Property\UnitMembership` | `apartment_residents` table + `App\Models\Apartments\ApartmentResident` |

`user_id` becomes nullable. `photo_path` added. All existing columns preserved (`relation_type`, `is_primary`, `verification_status`, `resident_name`, `resident_phone`, `phone_public`, `resident_email`, `email_public`, `starts_at`, `ends_at`, `created_by`). Legacy single-vehicle/parking columns (`has_vehicle`, `vehicle_plate`, `parking_spot_code`, `garage_sticker_code`) drop after backfill into the new tables.

All consumers update atomically: verification, scoping (`UserScopeAssignment`), security access, visitor flows, finance ownership lookups. No alias class. No compatibility shim.

### New Tables

- `apartment_vehicles` — `id`, `unit_id`, `apartment_resident_id` (nullable), `plate`, `make`, `model`, `color`, `sticker_code`, `notes`, `created_by`, timestamps. Service caps at 4 per unit. Soft delete.
- `apartment_parking_spots` — `id`, `unit_id`, `code`, `notes`, `created_by`, timestamps. Service caps at 4 per unit. Soft delete.
- `apartment_notes` — `id`, `unit_id`, `author_id`, `body`, `created_at`, `updated_at`. No edit/delete in v1.
- `violation_rules` — `id`, `compound_id`, `name`, `name_ar`, `description`, `default_fee` (decimal), `is_active`, `created_by`, timestamps. Soft delete.
- `apartment_violations` — `id`, `unit_id`, `violation_rule_id`, `applied_by`, `fee` (snapshot), `notes`, `status` (`pending`|`paid`|`waived`), `paid_at`, `waived_reason`, timestamps. Holds its own balance. Not posted to `LedgerEntry`.
- `apartment_documents` — `id`, `unit_id`, `uploaded_by_user_id`, `document_type` (enum: `ownership_proof`, `lease`, `id_copy`, `utility_bill`, `other`), `file_path`, `mime_type`, `size_bytes`, `status` (`active`|`archived`), `version` (int), `replaced_by_id` (nullable), timestamps. Net-new uploads insert with `status=active`. Replaces archive prior version on approval.
- `apartment_document_versions` — `id`, `apartment_document_id`, `uploaded_by`, `file_path`, `mime_type`, `size_bytes`, `status` (`pending_review`|`approved`|`rejected`), `reviewed_by`, `reviewed_at`, `review_notes`, timestamps. On approval: copies `file_path`/`size_bytes` to the parent doc as a new version, archives the old row, marks the version row `approved`.

### Unit Capability Flags

`units.has_vehicle` (boolean, default true) — admin-set. When false, mobile hides vehicles tab and API rejects creates with 422.
`units.has_parking` (boolean, default true) — admin-set. Same behaviour for parking.

The legacy `unit_memberships.has_vehicle` boolean migrates to `units.has_vehicle` (true if any membership had it true). Then drops.

### Unchanged

`units`, `buildings`, `floors`, `compounds`, `unit_accounts`, `ledger_entries`, `recurring_charges`, `payment_submissions`, `payment_allocations`, `gateway_transactions`, `expense*`, `budget*`, `vendors`, `reserve_funds*`, `charge_types`, `collection_campaigns`. No rename, no schema change.

### Document Migration

`user_documents` rows: those with apartment context (linked to a registration that resolves to a unit, or with explicit unit metadata) move to `apartment_documents` with `version=1`, `status=active`. Pure user-personal docs stay in `user_documents`. `OwnerRegistrationDocument` rows merge into `apartment_documents` with type `ownership_proof` and the resolved `unit_id`.

The data migration enumerates source rows, resolves `unit_id`, copies file paths into `apartment_documents`, and writes a `migrated_to_apartment_document_id` reference column on the source rows (`user_documents`, `owner_registration_documents`) to make the operation idempotent. Source rows stay in place for audit and rollback. Rollback truncates `apartment_documents` and clears the reference columns.

## Backend Architecture

### Services (`App\Services\Apartments\*`)

- `ResidentService` — add, update, archive (soft delete) `apartment_residents`. Handles user-linked vs name-only. Photo upload to existing media storage adapter. Publishes `ApartmentResidentChanged` event for downstream (verification, scoping).
- `VehicleService` — CRUD with capacity enforcement and unit capability check.
- `ParkingSpotService` — CRUD with capacity enforcement and unit capability check.
- `NoteService` — append, list (paginated by `created_at desc`).
- `ViolationRuleService` — admin CRUD scoped by compound.
- `ViolationApplicationService` — admin apply (creates `apartment_violations` row), mark `paid` (records `paid_at`), mark `waived` (records reason).
- `ApartmentDocumentService` — list, upload (active immediately), replace (creates `apartment_document_versions` row pending review), archive.
- `ApartmentDocumentReviewService` — admin queue listing, approve (swap), reject (records reason).

### Controllers (`App\Http\Controllers\Api\V1\Apartments\*`)

Resident-facing:
- `ApartmentController` — `index` (units the user has membership on), `show($unit)` (full payload: residents, vehicles, parking, violations, notes summary, documents, finance summary).
- `ApartmentResidentController` — nested CRUD.
- `ApartmentVehicleController` — nested CRUD.
- `ApartmentParkingSpotController` — nested CRUD.
- `ApartmentNoteController` — `index`, `store`.
- `ApartmentViolationController` — `index` (read-only).
- `ApartmentDocumentController` — `index`, `store`, `replace` (creates version), download.

Admin (`App\Http\Controllers\Api\V1\Admin\Apartments\*`):
- `ViolationRuleController` — CRUD scoped by compound.
- `ViolationApplicationController` — `store` (apply rule to unit), `markPaid`, `markWaived`.
- `ApartmentDocumentReviewController` — `index` (queue), `approve`, `reject`.

### Authorization

Policies (`App\Policies\Apartments\*`):
- Resident-edit policy used by all CRUD on resident-facing controllers — passes if the user has an active verified `apartment_residents` row on the unit.
- Admin policies require `apartments.admin` permission for violation rules and doc review, `apartments.violations.apply` for application actions. Compound scoping enforced via existing `UserScopeAssignment` middleware.

Seeders grant `apartments.admin` and `apartments.violations.apply` to `admin` and `finance_manager` roles.

### Routing

`routes/api.php`:
- `Route::prefix('v1/apartments')->middleware(['auth:sanctum', 'verified.member'])->group(...)` — resident endpoints.
- `Route::prefix('v1/admin/apartments')->middleware(['auth:sanctum', 'admin.scope'])->group(...)` — admin endpoints.

### Validation

Form Requests under `App\Http\Requests\Apartments\*` (and `\Admin\Apartments\*` for admin). Per-endpoint rules. Photo size and mime gates aligned with existing `UserDocument` settings.

### Errors

- 422 — validation
- 403 — policy denied
- 404 — unknown unit / resource not on this unit
- 409 — capacity exceeded (max-4 vehicles/parking)
- 422 — capability disabled (`unit.has_vehicle=false` / `unit.has_parking=false`)

Body shape follows existing problem-detail format used by other v1 controllers.

## Mobile Architecture (`apps/mobile`)

### Feature Replacement

`apps/mobile/src/features/property/` deleted in this delivery. New feature directory `apps/mobile/src/features/apartments/`.

Bottom tab "Property" → "My Apartment(s)" pointing to `ApartmentsListScreen`. Tab label localised in EN + AR.

`apps/mobile/src/features/finance` and `apps/mobile/src/features/documents` are removed from primary nav. Their internal flows survive as embedded sub-routes invoked from inside the apartment detail tabs (so deep links keep working). The bottom tab entries are dropped.

### Screens

- `ApartmentsListScreen` — fetch `GET /v1/apartments`. If 1 unit, replace stack with detail. If 2+, render card list with unit label, building, role badge, balance summary.
- `ApartmentDetailScreen` — header (unit label, building, floor, role) + horizontal tab bar:
  - **Residents** — list, add/edit/delete sheet, owner/family/tenant/renter relation toggle, optional `user_id` link or name-only.
  - **Vehicles** — list (max 4), CRUD sheet. Hidden if `unit.has_vehicle === false`.
  - **Parking** — list (max 4), CRUD sheet. Hidden if `unit.has_parking === false`.
  - **Violations** — read-only list with status badges and total balance. Tap-through shows rule details.
  - **Notes** — composer at top, timeline below. Each entry shows author + timestamp.
  - **Documents** — grouped by `document_type`. Replace action triggers pending version, badge shows pending state.
  - **Finance** — balance summary from `unit_accounts`, recurring charges list, unpaid items, "Submit Receipt" button → existing `PaymentSubmission` flow scoped to selected unpaid items.

### State Management

RTK Query slices under `apps/mobile/src/services/apartments/`:
- `apartmentsApi` (list, show)
- `residentsApi`
- `vehiclesApi`
- `parkingApi`
- `notesApi`
- `violationsApi`
- `documentsApi`
- existing `paymentSubmissionsApi` reused

Per-unit cache keys. Writes invalidate the parent `apartmentsApi.show` query plus the child query.

### Navigation

`navigation/RootNavigator.tsx`, `navigation/types.ts`, `navigation/linking.ts` updated. Stack route `Apartments` parented to the renamed bottom tab. Detail route accepts `unitId` param. Resident dashboard "My Apartment" card deep-links to detail.

## Admin Web Architecture (`apps/admin`)

Additions, no removals:

- `apps/admin/src/app/violation-rules/` — index, `new`, `[ruleId]/edit` pages. Compound-scoped CRUD list with toggle for `is_active`.
- `apps/admin/src/app/units/[unitId]/violations/` — list view with "Apply violation" action (modal: rule picker, optional fee override, notes). Inline mark paid/waived actions.
- `apps/admin/src/app/document-reviews/` — pending-version queue. Per-row preview links and approve/reject controls with review notes.
- `apps/admin/src/app/units/[unitId]/page.tsx` extended with view-only tabs mirroring mobile (residents, vehicles, parking, notes, finance summary). No edit controls. Uses the same v1 endpoints.

API client extensions in `apps/admin/src/lib/api.ts`. Server actions per existing pattern in `actions.ts` next to each page.

Permission gate via existing role middleware — `apartments.admin` required for the new admin pages, `apartments.violations.apply` required for the apply-violation action.

## Data Flow

1. Client opens apartment detail.
2. Mobile dispatches `apartmentsApi.show(unitId)`.
3. Controller invokes `ApartmentService::show($unit)`, eager-loads residents, vehicles, parking, violations summary, latest notes, document summary, and embeds the `UnitAccount` summary + outstanding charges.
4. Resource serialises payload.
5. Client renders, cached by unit id.
6. Write actions (e.g. add vehicle) hit nested controller, validate via form request, call service, invalidate cache.

## Migrations Plan

Order:
1. Create new `apartments_*` tables.
2. Add `units.has_vehicle`, `units.has_parking`.
3. Backfill data (idempotent migration):
   - `units.has_vehicle` from any-membership-true.
   - `units.has_parking` defaults true; legacy `parking_spot_code` rows produce `apartment_parking_spots` records.
   - `unit_memberships` rows with `vehicle_plate` produce `apartment_vehicles` records.
   - `unit_memberships` → `apartment_residents` content move (this is the rename — table copy + foreign key remap, atomic with consumer code change).
   - `user_documents` + `owner_registration_documents` apartment-context rows → `apartment_documents`.
4. Drop the `unit_memberships` table once all consumers point at `apartment_residents`. Hard cutover, no shim.
5. Update consumers in the same release: verification flows, scoping, visitor flows, security access, finance ownership lookup.

`--pretend` dry runs validated in staging. Rollback: truncate new tables + reverse-rename via prior migration restored from `db:rollback`.

## Testing

- Pest feature tests for every new controller (resident-facing + admin) following TDD. Cover happy paths, 403, 404, 409, capability disabled.
- Service unit tests for capacity guards and version-swap logic.
- Factories for `ApartmentResident`, `ApartmentVehicle`, `ApartmentParkingSpot`, `ApartmentNote`, `ViolationRule`, `ApartmentViolation`, `ApartmentDocument`, `ApartmentDocumentVersion`.
- Migration tests asserting backfill correctness on a seeded fixture.
- Mobile tests for resident/vehicle/parking forms via existing RTL setup. Cache invalidation smoke test per slice.

Quality gates: `pint`, PHPStan, ESLint, TypeScript, mobile component tests.

## Risks

- Renaming `UnitMembership` is the largest blast radius change. Consumers across verification, visitors, security, scoping, and finance all touch it. Mitigation: single PR with the rename + all consumer updates and feature work; atomic migration; comprehensive test pass before merge.
- Document migration touches user-uploaded files. Mitigation: copy-not-move at storage layer in v1; keep source rows intact for audit.
- Permissive resident-edit policy is broad. Mitigation: documented as "v1 baseline, will tighten" in the spec; track tightening as follow-up backlog item.

## Open Items (Resolved)

- Web for owners: deferred. Mobile only in v1.
- Pay action: receipts only via existing `PaymentSubmission`.
- Notes: append-only timeline.
- Capability flags: `unit.has_vehicle`, `unit.has_parking` admin-set.
- Violation balance: separate from `LedgerEntry`.
- Doc review: replacement creates pending version, current stays active until approval.

## Out of Scope (Backlog)

- Tightening the resident-edit policy (owner vs family vs tenant).
- Visual diff in admin doc review.
- Cross-unit owner reporting.
- Inline payment processing.
- Edit/delete on notes.
- Bulk violation application.
