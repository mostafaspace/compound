# Foundation Audit: Scoping And Isolation

Status: Initial audit
Last updated: 2026-04-30

## Canon Reference

- `docs/canon/product-spec.md`
- `docs/canon/domain-rules.md`
- `docs/canon/system-architecture.md`

## Current Code Surfaces

- `apps/api/routes/api.php`
- `apps/api/tests/Feature/Api/V1/CompoundIsolationTest.php`
- `apps/api/app/Models/UserScopeAssignment.php` or equivalent scope linkage through `scopeAssignments`
- property models under `apps/api/app/Models/Property/*`
- representative and governance models carrying compound/building/floor references
- finance, issues, visitors, and announcements models carrying property scope fields

## Expected Behavior

Compound, building, floor, and unit boundaries must be enforced in backend logic.

## Observed Behavior

- Shared contracts and many backend models consistently carry `compoundId`, `buildingId`, `floorId`, or `unitId`.
- There is an explicit compound-isolation feature test file, which is a good sign.
- The auth and RBAC layer already exposes `scopeAssignments`, but the route layer still needs a full audit to prove scope is enforced consistently instead of inferred loosely.
- Current evidence suggests the data model is scope-aware, but enforcement trust is still unproven system-wide.
- The support console had a real scoping bug: resident users with `compound_id = null` were invisible or forbidden to compound-scoped admins even when those residents belonged to the admin’s compound through unit memberships. Support list/detail/duplicate flows now scope by either direct `compound_id` or membership-derived compound ownership.
- Notification delivery logs and audit-log reporting had the same blind spot: compound-scoped admins could miss resident-owned records when the resident actor/user belonged to the compound only through unit memberships. Delivery-log list/retry and audit-log index/timeline now use the same membership-aware compound scoping rule instead of trusting only the direct user column.
- User lifecycle and account-merge flows had the same blind spot: suspend/recover/move-out access and merge list/show/initiate/confirm/cancel flows were still trusting `users.compound_id` for resident scope checks. Those paths now use shared membership-aware user scoping, so compound-scoped admins can manage in-compound residents and merges even when the resident record itself has `compound_id = null`.
- External notification dispatch had the same data-truth gap on the recipient side: compound-specific template selection was derived only from `users.compound_id`, so membership-scoped residents could miss their compound template and fall back to global/no-template behavior. Notification dispatch now resolves recipient compound through active unit membership when needed.
- Governance had both leakage and overreach risks: resident poll detail access could bypass compound membership checks, and effective RBAC admins with stale `compound_id = null` could be treated as globally scoped in vote/poll admin flows. Votes and polls now resolve managed compound scope through explicit staff scope or membership-derived compound ownership, and resident poll access now enforces compound membership consistently.
- Org Chart had a parallel privacy and membership-scope drift on both API and clients: resident contact visibility was cached too coarsely and evaluated against non-authoritative viewer scope, while person-detail access and client detail panels were not consistently hydrating from the canonical member-detail endpoint. Org chart contact visibility now resolves against membership-derived building/floor scope per viewer with versioned cache invalidation, person-detail access now uses canonical user-access checks, and both admin and mobile detail panels now hydrate from the person-detail endpoint instead of trusting the thin tree payload.
- Announcements had the same stale-scope split across both routing and controller layers: admin announcement routes were grouped under unrelated `view_users` middleware, and announcement admin access treated scoped admins with `compound_id = null` as either blocked or globally trusted depending on the path. Admin announcement routes now require announcement permissions directly, and announcement create/manage access now resolves managed compound scope through explicit staff scope or membership-derived compound ownership.
- Documents and verification review had the same reviewer-scope blind spot: reviewer/admin flows still keyed off direct actor `compound_id`, so membership-scoped effective admins could list, review, and decide across compounds or bypass scoping entirely depending on the endpoint. User-document review and verification-request review now resolve reviewer scope through managed compound ownership, including membership-derived scope for effective `compound_head` reviewers.
- Finance had the same stale-scope leak in recurring charges, collection campaigns, payment-submission review, unit-account admin flows, and online-payment admin flows: effective `compound_admin` actors with `compound_id = null` but a membership-derived managed compound were treated as global finance operators. Those finance controllers now resolve compound-admin finance scope through managed compound ownership, while preserving explicitly global behavior for super admins and the existing global finance-reviewer workflows.
- Finance had a second, deeper scope-assignment leak too: RBAC finance reviewers with explicit `scopeAssignments` but no direct `compound_id` were still treated as global in unit-account, payment-review, recurring-charge, collection-campaign, and payment-session admin flows. Shared compound-context resolution now honors assigned compound scopes for those operator paths, while still preserving intentionally global legacy reviewer/support behavior when no explicit scope exists.
- Visitor operations had the same stale-scope drift on the staff side: a `compound_admin` with `compound_id = null` but a membership-derived managed compound was treated as globally trusted for visitor lists and gate actions. Visitor staff list and action guards now resolve compound-admin scope through managed compound ownership instead of defaulting to global access.
- Governance poll-type administration had the same raw-column drift: membership-scoped `compound_head` users with `compound_id = null` could bypass managed scope when creating or mutating poll types, and global poll types were not explicitly reserved to global operators. Poll-type list/create/update/delete now resolve through managed compound ownership, and global poll-type management is reserved to global access.
- Notification template administration now has explicit membership-scoped regression coverage too: membership-scoped compound admins can list and manage their own compound templates, but cannot drift into foreign-compound or global template management.
- Issue administration had the same service-layer blind spot: issue access treated any admin-like actor without a direct `compound_id` as global, which let membership-scoped `compound_admin` users drift into foreign-compound issue visibility and mutation. Issue access now resolves compound-admin scope through managed compound ownership, while preserving the existing global behavior for explicitly global admin/support roles.
- Shared compound-context resolution had a deeper stale-scope precedence bug too: effective `compound_head` and `compound_admin` users with a valid membership-scoped compound but a stale non-null `users.compound_id` were still being resolved against the raw profile column first. Managed compound resolution now prefers active membership-derived scope for effective compound-admin roles and only falls back to the direct user-row compound when no active membership scope exists, with service-level and governance regression coverage to prove it.
- Property registry still had two operator-scope leaks after that root fix: compound listing and unit lookup were still reading direct actor `compound_id` instead of the shared managed-compound context, and unit-membership management was skipping scope checks entirely for scoped admins whose direct `compound_id` was null. Compound index, unit lookup, and unit-membership access now all resolve through the shared context service, with membership-scoped and stale-direct-compound regressions in `PropertyRegistryTest`.
- Property registry had one more mixed-scope seam after that: compound index treated "no accessible compounds" the same as global access, while unit lookup/detail still forced membership-scoped compound admins through explicit scope-assignment checks. Compound index now uses explicit accessible-compound resolution instead of `resolve()` null semantics, login clears stale compound context when a new session has no scoped compound, and unit lookup/detail now honor membership-derived managed compound access without requiring `user_scope_assignments`, with fresh regressions in `PropertyRegistryTest`.
- Audit reporting had the same final-mile drift: audit index/timeline/export decided whether an actor was scoped using the shared context service, but then filtered records using the raw user-row `compound_id`. Audit log filtering now uses the resolved managed compound consistently, so membership-scoped compound admins can see only their own compound’s actor and metadata events even when `compound_id` is null or stale.
- Visitor creation still had a resident-side hosting leak after the staff action guards were fixed: `canHostUnit()` was still trusting raw actor `compound_id`, which let membership-scoped compound admins fall back to global unit targeting and let stale non-null profile compound data outrank the actor’s real managed compound. Visitor request creation now resolves staff host scope through the same managed-compound path used by staff listing and gate actions.
- Notification delivery retry had the same recipient-scope drift: retry access still keyed off the notified user’s raw `compound_id`, so a resident with stale direct compound metadata but correct membership scope could be incorrectly hidden from compound-scoped admins. Delivery retry now resolves recipient compound through the shared user-compound resolver before enforcing access.
- Finance expense, budget, vendor, reserve fund, and finance report list endpoints had a third scope-assignment leak: these controllers used `CompoundContextService::resolve()` followed by a soft `if ($compoundId)` guard, but `resolve()` returns `null` for any non-super-admin, non-compound-admin staff with `compound_id = null` — the same result as a super-admin with global access. Scope-assigned RBAC finance reviewers with no direct `compound_id` could therefore list all expenses, budgets, vendors, reserve funds, and see aggregated finance reports across all compounds. All five controllers now use `resolveAccessibleCompoundIds()` for list endpoints and `ensureUserCanAccessCompound()` for single-resource endpoints, with explicit regression coverage in `FinanceScopingTest`.
- Security operations had the same dual-layer scope leak: SecurityGateController, SecurityShiftController, SecurityDeviceController, SecurityIncidentController, and ManualVisitorEntryController all used `resolve()` + `if ($compoundId !== null)` for list endpoints (global leak for any non-super-admin, non-compound-admin staff with `compound_id = null`), and their show/update/mutation endpoints had NO compound access check at all — allowing any `manage_security` user to view, modify, resolve, or revoke resources from any compound. All five controllers now use `resolveRequestedAccessibleCompoundIds()` for list endpoints (supporting optional `X-Compound-Id` header filtering for super-admins while locking scoped users), and `ensureUserCanAccessCompound()` for all single-resource endpoints, with explicit regression coverage in `SecurityScopingTest`.
- Operational subsystems (Issues and Announcements) were discovered to have critical scoping bypasses. `IssueService->userCanAccessIssue()` incorrectly granted global access to any user with `compound_id = null` (including scope-assigned staff), which has been remediated using `CompoundContextService::userCanAccessCompoundById()`. `IssueController` and `AnnouncementController` also relied on the vulnerable `resolve()` pattern in `index()`, leaking global data to scoped operators. These have been hardened using `resolveRequestedAccessibleCompoundIds()`, and all mutation/detail endpoints now utilize `ensureUserCanAccessCompound()`. Strict isolation is now enforced for cross-compound listing, viewing, updating, escalating, and archiving, with comprehensive coverage in `OperationalScopingTest`.

## Classification

Implemented partially

## Risks

- cross-compound leakage
- incorrect role scope
- UI-only filtering

## Required Recovery Actions

- Audit scope enforcement on every high-risk bounded context: finance, visitors, issues, announcements, governance.
- Verify that compound-scoped staff cannot cross into other compounds through list, show, search, export, or lookup endpoints.
- Verify that building, floor, and unit scoping are enforced below compound level.
- Add an explicit impact-area regression pack for scope leakage.

## Tests To Trust / Tests Missing

Current evidence:

- `apps/api/tests/Feature/Api/V1/CompoundIsolationTest.php`
- `apps/api/tests/Feature/Api/V1/UserLifecycleTest.php`
- `apps/api/tests/Feature/Api/V1/PropertyRegistryTest.php`
- `apps/api/tests/Feature/Api/V1/FinanceTest.php`
- `apps/api/tests/Feature/Api/V1/FinanceScopingTest.php`
- `apps/api/tests/Feature/Api/V1/ChargesTest.php`
- `apps/api/tests/Feature/Api/V1/OnlinePaymentTest.php`
- `apps/api/tests/Feature/Api/V1/SecurityOperationsTest.php`
- `apps/api/tests/Feature/Api/V1/SecurityScopingTest.php`
- `apps/api/tests/Feature/Api/V1/OrgChartTest.php`
- `node --test apps/admin/src/lib/orgchart-utils.test.mjs`
- `node --test apps/mobile/src/features/orgchart/orgchart-utils.test.mjs`
- `npm run typecheck -w apps/admin`
- `npm run typecheck -w apps/mobile`

Missing confidence areas:

- cross-feature scope tests beyond issues
- UI-level contract checks that match backend scope boundaries
- remaining operational/admin surfaces that still rely on direct actor compound columns and have not yet been locked with membership-scoped regressions
