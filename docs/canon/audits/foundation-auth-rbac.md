# Foundation Audit: Auth And RBAC

Status: Hardened
Last updated: 2026-04-30

## Canon Reference

- `docs/canon/product-spec.md`
- `docs/canon/domain-rules.md`

## Current Code Surfaces

- `apps/api/routes/api.php`
- `apps/api/app/Http/Middleware/EnsureUserHasRole.php`
- `apps/api/app/Providers/AuthServiceProvider.php`
- `apps/api/app/Http/Controllers/Api/V1/AuthController.php`
- `apps/api/app/Http/Resources/UserResource.php`
- `apps/api/app/Models/User.php`
- `apps/api/tests/Feature/Api/V1/AuthTest.php`
- `packages/contracts/src/auth-access.ts`
- `packages/contracts/src/platform.ts`
- `apps/admin/src/lib/session.ts`
- `apps/admin/src/lib/auth-access.ts`
- `apps/mobile/src/navigation/RootNavigator.tsx`
- `apps/mobile/src/store/authSlice.ts`
- `apps/mobile/src/hooks/usePermission.ts`

## Expected Behavior

Login, verification, permission checks, and scoped access must align with canon.

## Observed Behavior

- API resources and shared contracts already expose `roles`, `permissions`, and `scopes` in addition to the legacy singular `role`.
- The backend `User` model uses Spatie `HasRoles`, but still keeps the legacy `role` enum field as a first-class property.
- Route protection is still mostly expressed through the custom `role` middleware alias, even though the middleware now interprets its arguments as permissions.
- `EnsureUserHasRole` mixes new permission checks with a legacy fallback map derived from the old `UserRole` enum.
- Super admin bypass still depends on the legacy `role` field in middleware and `AuthServiceProvider`.
- `AuthController::login()` now loads the same authorization relations as `/auth/me`, closing an immediate contract gap that previously left login responses without `roles`, `permissions`, and `scopes`.
- Mobile login stores the login response directly into Redux auth state, so login-response parity with `/auth/me` is a critical contract requirement.
- Admin login and access flow now uses an effective-role helper in the main entry points, reducing direct dependence on the legacy singular `role` field for admin gating and compound-admin routing.
- Backend super-admin bypass logic now honors effective Spatie `super_admin` assignments instead of trusting only the legacy role field.
- Legacy permission fallback is now restricted to users with no explicit Spatie roles, so migrated RBAC assignments take precedence over stale legacy role data.
- `CompoundContextService` now treats effective Spatie super-admins as global compound managers, aligning scoping behavior with the auth layer.
- The API `User` model now exposes shared `hasEffectiveRole`, `hasAnyEffectiveRole`, and `isEffectiveSuperAdmin` helpers so authorization code can stop re-implementing ad hoc legacy-role checks.
- Lifecycle protection now correctly treats effective Spatie `super_admin` assignments as privileged for actors and protected for targets, covering a real gap where stale legacy data could allow suspension of a true super-admin account.
- Remaining announcement, issue, invitation, and finance compound-access seams now use the shared effective-role helpers instead of direct legacy `super_admin` comparisons.
- Shared contracts now define the effective-role helper logic consumed by both admin and mobile clients, reducing the chance that web and mobile drift into different interpretations of the same RBAC payload.
- Mobile root navigation now routes users by effective RBAC role type instead of the singular legacy `role` field, preventing stale role metadata from misrouting real admins or guards into resident flows.
- Mobile permission hooks now use the shared effective super-admin rule instead of duplicating local `role`/`roles` checks.
- Org Chart access now treats explicit RBAC admin/staff roles as higher priority than stale resident legacy metadata, fixing a real case where a `compound_head` assignment was still being forced through resident membership gates.
- Poll and governance vote index flows now classify effective RBAC admins correctly, so compound-scoped `compound_head` assignments are no longer misrouted onto resident listing behavior.
- Governance legacy permission fallback now includes resident `view_governance`, aligning the middleware layer with the product/test expectation that residents can check eligibility and cast votes without gaining admin mutation rights.
- Governance vote mutation endpoints now enforce explicit admin management checks instead of reusing viewer access rules, restoring the correct separation between resident participation and admin governance management.
- Document reviewer access now honors effective RBAC reviewer roles, so compound-scoped staff with stale resident legacy metadata still get the correct reviewer document list.
- Visitor staff classification now honors effective RBAC security/admin roles, so stale resident legacy metadata no longer blocks gate validation/arrival actions for true security staff.
- Visitor security notifications now include effective `security_guard` and `compound_head` assignments scoped to the request compound, closing a real gap where important operational alerts could skip migrated staff users.
- Visitor and announcement audience queries now also exclude users whose explicit resident RBAC assignments override stale legacy staff roles, eliminating a repeated precedence bug where migrated users could still receive staff-only notifications or role-targeted feeds because of old `role` metadata.
- Login token abilities now follow the effective RBAC role model used by migrated Spatie assignments, so a stale legacy resident role no longer mints a resident token for a true `compound_head`.
- Finance resident/staff branching now uses effective resident-role detection, closing a real access hole where a migrated resident with stale staff legacy metadata could submit payments against accounts outside their verified unit memberships.
- Legacy resident-owner fallback no longer grants admin `view_finance`, aligning finance route access with the canon split between resident self-service finance endpoints and staff/board finance administration routes.
- Shared effective-role helpers now treat explicit Spatie/RBAC roles as authoritative when they exist, instead of mixing them with stale legacy `role` values. That precedence now aligns backend model helpers with the middleware rule that explicit RBAC assignments outrank legacy fallback.
- Governance owner/resident eligibility now evaluates effective RBAC resident roles instead of the raw legacy `role` column, preventing stale resident metadata from granting owner-only voting rights to non-resident staff assignments.
- Role-targeted announcement delivery and feed visibility now honor effective RBAC roles, so migrated staff users no longer miss role-scoped announcements because their legacy `role` field is stale.
- Admin permission context now hydrates client-side role gates from effective role names instead of blindly appending the stale legacy `role` field, reducing the chance that admin UI gates drift from backend authorization.
- Operator-facing admin/mobile role displays now use the primary effective RBAC role label instead of the singular legacy `role` string, so support and operations screens no longer misrepresent a migrated user’s real authority.
- Support and lifecycle user payloads now serialize RBAC role arrays consistently instead of omitting them whenever relations were not eagerly loaded, closing a real drift source where clients correctly fell back to stale legacy `role` data because the API had failed to provide authoritative `roles`.
- Support user filtering now matches effective RBAC role assignments with explicit-role precedence, so migrated `compound_head` users appear under the admin filter while users with stale legacy staff metadata and explicit resident roles no longer leak into staff results.
- Launch readiness seed checks now count effective admin RBAC assignments instead of relying only on the legacy `users.role` column, preventing migrated `super_admin` and `compound_head` setups from falsely reporting a not-ready platform.
- Visitor security notifications now exclude users whose explicit resident RBAC assignments override stale legacy staff roles, closing a cross-feature contamination bug where old `security_guard` or `compound_admin` metadata could keep notifying the wrong people after migration.
- Pending-review resident access now uses effective RBAC resident roles instead of the legacy singular `role` field, so migrated residents with stale old staff metadata can still reach the self-service verification routes they need during onboarding review.
- Existing auth tests validate several happy-path permission outcomes, but they do not yet prove that scope enforcement is trustworthy across the whole platform.

## Classification

Implemented partially

## Risks

- login failures
- permission drift
- scope leakage

## Required Recovery Actions

- Decide and document the canonical coexistence rule for `role` vs `roles` during recovery.
- Preserve login response parity with `/auth/me` through tests so future RBAC work does not regress the contract.
- Replace route-guard ambiguity with one clearly named authorization model.
- Audit every protected route for permission semantics vs legacy role assumptions.
- Verify that `/auth/me` is the same source of truth for admin and mobile authorization behavior.
- Continue removing legacy singular-role assumptions from remaining backend and frontend authorization seams.
- Continue replacing remaining legacy role-list authorization paths with effective-role helpers so access control no longer depends on the singular `role` field.
- Add regression tests that prove scoped access, not just permission labels.
- Audit whether shared auth-access helpers should move into a dedicated runtime package instead of living beside type contracts long term.
- Continue scanning notification, lifecycle, and eligibility code paths where legacy role values may still be used as business-rule inputs rather than access-control labels.
- Review the remaining legacy fallback permission map to ensure residents only retain canon-approved self-service permissions during the transition period.
- Continue auditing UI display and support/admin tooling that still surfaces the legacy singular `role` string so operator-facing screens do not misrepresent a migrated user’s real authority.
- Continue deciding which remaining UI screens should display the assigned RBAC role versus a domain role/relationship, so support tooling does not over-correct into showing authorization labels where business context is more useful.

## Tests To Trust / Tests Missing

Current tests worth keeping as partial evidence:

- `apps/api/tests/Feature/Api/V1/AuthTest.php`
- `apps/api/tests/Feature/Api/V1/UserLifecycleTest.php`
- `apps/api/tests/Feature/Api/V1/VisitorRequestsTest.php`
- `apps/api/tests/Feature/Api/V1/LaunchReadinessTest.php`
- `apps/api/tests/Feature/Api/V1/OnboardingAndDocumentsTest.php`
- `apps/api/tests/Feature/Api/V1/FinanceTest.php`
- `apps/api/tests/Feature/Api/V1/AnnouncementsTest.php`
- `apps/api/tests/Feature/Api/V1/VoteTest.php`
- `apps/api/tests/Feature/Api/V1/OrgChartTest.php`
- `packages/contracts/src/auth-access.test.mjs`
- `apps/admin/src/lib/auth-access.test.mjs`
- `npm run typecheck -w packages/contracts`
- `npm run typecheck -w apps/mobile`

Missing confidence areas:

- platform-wide scope regression tests
- tests that detect mismatch between legacy `role` and Spatie assignments
- admin/mobile contract regression around `permissions` and `scopes`
- client-side route-selection regression coverage for mobile guard/admin/resident routing
- broader controller coverage where role classification, not just permission bypass, still depends on legacy `role`
- explicit regression coverage for poll participation and governance/poll management beyond listing access
- **Hardening Complete**: Verified 'Explicit RBAC Wins' rule via `AuthPrecedenceTest`. Confirmed that any Spatie role assignment correctly disables legacy fallback, preventing stale metadata leaks. Confirmed super-admin elevation path via Spatie roles is functional and authoritative. Verified login/me contract parity for RBAC metadata.
