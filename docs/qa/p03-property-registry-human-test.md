# P03 Property Registry Human Test Checklist

Related Jira tickets: CM-3, CM-25, CM-26, CM-27

Use this checklist before accepting P03 as production-ready from the human review side. The automated backend suite validates the critical integrity rules, but this document captures the exact manual checks for hierarchy accuracy, bilingual UI quality, API behavior, import/export data handling, and downstream module readiness.

## Scope

P03 covers the compound/property hierarchy and unit membership registry:

- Compounds
- Buildings
- Floors
- Units
- Unit memberships for owners, residents, tenants, shop holders, and authorized occupants
- Unit lookup/filter APIs for downstream modules
- Resident-scoped unit access
- CSV import/export foundation
- Archive behavior that preserves operational and finance history

## Required Environment

- Docker stack is running from `D:\apps\compound`.
- API is available at `http://localhost:8000`.
- Admin web is available at `http://localhost:3001` unless another local server maps it differently.
- Database migrations are current.
- Test users exist for at least one admin and one resident with a verified active unit membership.

## Backend API Checks

### Admin Unit Lookup

Endpoint:

```http
GET /api/v1/units
```

Test with combinations of these filters:

- `compoundId`
- `buildingId`
- `floorId`
- `status`
- `type`
- `userId`
- `relationType`
- `verificationStatus`
- `activeMembershipOnly`
- `includeArchived`
- `search`
- `perPage`

Acceptance checks:

- Admin can find units by unit number, compound name/code, building name/code, linked user name, and linked user email.
- Building and floor filters only return units from the selected hierarchy branch.
- `activeMembershipOnly=true` excludes expired, future, pending, rejected, and archived unit memberships.
- Archived units are hidden by default.
- `includeArchived=true` includes archived units without deleting history.
- Pagination metadata is present and stable.

### Resident Unit Scope

Endpoint:

```http
GET /api/v1/my/units
```

Acceptance checks:

- Resident sees only units linked through active, verified, non-archived memberships.
- Expired memberships do not grant access but remain visible in admin history where applicable.
- Pending or rejected memberships do not grant resident scope.
- A resident with multiple valid units receives all allowed units and can use them for downstream scoped workflows.

### Unit CSV Import

Endpoint:

```http
POST /api/v1/buildings/{building}/units/import
```

Form data:

- `file`: CSV file using `docs/templates/p03-units-import-template.csv`
- `dryRun`: `1` for validation only, `0` or omitted to create units

Acceptance checks:

- Dry run validates every row and creates no units.
- Valid import creates all rows transactionally.
- Invalid import creates no partial units.
- Duplicate unit numbers in the same file are rejected.
- Duplicate unit numbers already existing in the target building are rejected.
- `floorId` must belong to the selected building.
- `type`, `status`, `areaSqm`, and `bedrooms` validation errors are returned with row context.
- Audit log records validation and successful import actions.

### Unit CSV Export

Endpoint:

```http
GET /api/v1/buildings/{building}/units/export
```

Acceptance checks:

- Response downloads a CSV file.
- Header is exactly:

```csv
unitNumber,type,status,floorId,floorLabel,areaSqm,bedrooms
```

- Export includes units for the selected building only.
- Archived units are included only if the product decision requires it; otherwise note the expected behavior in Jira before accepting.
- Audit log records export action.

## Admin Web Human Checks

Run these checks in both English and Arabic.

### English

- Compound, building, floor, and unit screens load with translated labels, table headers, filters, action buttons, empty states, validation errors, and success messages.
- Create, edit, archive, and list flows preserve the selected hierarchy context.
- Search and filter controls remain usable on desktop and mobile-width browser sizes.
- Unit profile/history screens make ownership and occupancy changes understandable to a non-technical admin.
- Import/export controls, if exposed in the UI, use the same CSV fields and validation expectations documented above.

### Arabic and RTL

- Switch to Arabic and confirm the same screens are translated.
- Layout direction is right-to-left where applicable.
- Long Arabic labels do not overflow buttons, table cells, filters, modals, or empty states.
- Status and relation labels are understandable in Arabic:
  - Owner: `مالك`
  - Resident: `ساكن`
  - Tenant: `مستأجر`
  - Representative: `ممثل`
  - Active: `نشطة`
  - Archived: `مؤرشفة`
  - Vacant: `شاغرة`

## Mobile Human Checks

Run these checks in both English and Arabic. The resident mobile shell now exposes a dedicated **My unit profile** / **ملف وحدتي** card backed by `GET /api/v1/my/units`.

- Resident sees only the units returned by `GET /api/v1/my/units`.
- The unit profile card shows compound, building, floor, unit number, unit type, relation, primary badge, verification status, unit status, and membership active window.
- If the resident has multiple active verified memberships, all units are visible and the primary membership appears first.
- Visitor pass creation and mobile issue creation use the primary active membership unit first, with verification-request unit history only as a fallback.
- The empty state explains that the administration must approve unit membership before scoped workflows are fully available.
- Resident cannot see another user's units by changing local state or replaying API calls.
- Arabic mobile copy is translated and uses right-to-left layout where applicable, including badges, metadata labels, empty state, and refresh states.
- Unit/building/floor labels and long Arabic membership notes do not overflow on small devices.

## Regression Checks

- Archiving a unit does not delete historical memberships.
- Archiving a membership removes access but preserves history.
- Unit IDs remain stable for future finance, visitor, issue, announcement, and voting records.
- Deleting or archiving hierarchy records cannot orphan units or floors.
- Non-admin users cannot call admin-only registry endpoints.
- API errors are explicit enough for the admin UI to show useful bilingual validation messages.

## Validation Commands

Use these commands when preparing the Jira handoff:

```powershell
docker compose -f infra/docker-compose.yml exec -T api php artisan migrate:fresh --force
docker compose -f infra/docker-compose.yml exec -T api php artisan test tests/Feature/Api/V1/PropertyRegistryTest.php
docker compose -f infra/docker-compose.yml exec -T api sh -lc "QUEUE_CONNECTION=sync BROADCAST_CONNECTION=null php artisan test"
docker compose -f infra/docker-compose.yml exec -T api php artisan queue:failed
docker compose -f infra/docker-compose.yml ps
npm run typecheck -w apps/mobile
npm run typecheck -w apps/admin
```

Expected results:

- Focused P03 backend feature tests pass.
- Full backend suite passes.
- No failed queue jobs remain.
- API status endpoint returns 200.
- Admin login page returns 200.
- Mobile TypeScript typecheck passes after the shared property contract update.
- Admin TypeScript typecheck passes after the shared property contract update.

## Human Sign-Off

Only accept CM-3 after all rows below pass.

| Area | Reviewer | Result | Notes |
| --- | --- | --- | --- |
| Backend hierarchy integrity |  |  |  |
| Admin registry UI in English |  |  |  |
| Admin registry UI in Arabic/RTL |  |  |  |
| CSV dry run/import/export |  |  |  |
| Resident scoped unit access |  |  |  |
| Mobile unit context in English and Arabic/RTL |  |  |  |
| Downstream readiness for finance/visitors/issues/voting |  |  |  |
