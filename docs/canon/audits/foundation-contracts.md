# Foundation Audit: Shared Contracts

Status: Initial audit
Last updated: 2026-04-29

## Canon Reference

- `docs/canon/system-architecture.md`
- `docs/canon/domain-rules.md`

## Current Code Surfaces

- `packages/contracts/src/platform.ts`
- `apps/api/app/Http/Resources/UserResource.php`
- `apps/api/app/Http/Controllers/Api/V1/AuthController.php`
- `apps/admin/src/lib/api.ts`
- `apps/admin/src/lib/session.ts`
- `apps/mobile/src/store/authSlice.ts`
- `apps/mobile/src/hooks/usePermission.ts`

## Expected Behavior

Shared contracts must match backend behavior across admin and mobile clients.

## Observed Behavior

- The shared `AuthenticatedUser` contract includes both legacy `role` and newer `roles`, `permissions`, and `scopes`.
- `UserResource` mirrors that dual model, which means clients are expected to handle both worlds at once.
- Admin and mobile both use permissions arrays for feature gating, but legacy `role` checks still appear in some client logic.
- This dual-shape contract is workable during migration, but it is risky unless the recovery program makes the transitional rules explicit.

## Classification

Implemented partially

## Risks

- API/client drift
- stale permission shapes
- role and scope mismatch across apps

## Required Recovery Actions

- Define the canonical migration contract for legacy `role` versus effective RBAC fields.
- Audit every client-side authorization helper for legacy shortcuts.
- Add contract tests around `/auth/me`.
- Decide when legacy `role` becomes informational only rather than authoritative.

## Tests To Trust / Tests Missing

Current evidence:

- shared TypeScript definitions exist
- `/auth/me` resource shape exists in backend

Missing confidence areas:

- contract drift tests
- admin/mobile snapshot or integration checks for authorization payloads
- explicit tests covering null or inconsistent scope assignment payloads
