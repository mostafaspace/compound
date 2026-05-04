# Release Hardening Program Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the platform to a real production-ready state across API, admin web, and mobile by freezing feature scope, closing functional gaps, enforcing evidence-based release gates, and validating critical flows by persona.

**Architecture:** This is a release program, not a single feature. Work is executed in tightly scoped hardening tracks that preserve the current recovery branch, add missing regressions first, fix root-cause behavior, and only advance a subsystem when automated and runtime evidence both exist. The repo canon remains the single source of truth, while this plan defines execution order and release gates.

**Tech Stack:** Laravel API, Next.js admin web, React Native mobile, RTK Query, Sanctum, Spatie roles/permissions, MySQL, Docker Compose, canon docs under `docs/canon`

---

## Program Rules

- [ ] Freeze scope: no new product ideas enter this branch unless they are required to complete an already-approved requirement from canon or the current recovery backlog.
- [ ] Keep Jira execution-only. No ticket moves to `Ready for Human Test` or `Done` without evidence that satisfies `docs/canon/definition-of-done.md`.
- [ ] Treat current working behavior as untrusted until backed by tests or runtime verification.
- [ ] Run Laravel suites sequentially only. Do not run PHP suites in parallel against the shared MySQL test database.
- [ ] Do not merge to `main` as a release signal until release matrix evidence is complete.

## Release Gate

A track is only considered hardened when all of the following are true:

- [ ] Canon requirement mapping is explicit.
- [ ] Missing/partial behavior is identified and resolved.
- [ ] Regression tests exist for the repaired behavior.
- [ ] Admin web typecheck/build pass for affected surfaces.
- [ ] Mobile typecheck passes for affected surfaces.
- [ ] Targeted runtime smoke passes for affected surfaces.
- [ ] The release matrix includes evidence links, commands, and observed outcomes.

## Workstream Map

### Workstream 1: Auth, Session, Navigation, and Shell Stability

**Why first:** If login, role resolution, session context, or app shell routing is unstable, every page-level verification becomes misleading.

**Primary files**
- `apps/api/app/Http/Controllers/Api/V1/AuthController.php`
- `apps/api/app/Services/CompoundContextService.php`
- `packages/contracts/src/auth-access.ts`
- `packages/contracts/src/platform.ts`
- `apps/admin/src/lib/session.ts`
- `apps/admin/src/app/login/actions.ts`
- `apps/mobile/src/navigation/RootNavigator.tsx`
- `apps/mobile/src/navigation/types.ts`

**Exit criteria**
- [ ] Admin, resident, security, and representative-adjacent users land in the correct shell.
- [ ] No stale cookie/session context survives login changes.
- [ ] Effective role resolution is consistent across API, admin web, and mobile.
- [ ] Public pages do not initialize authenticated operator-only features.

### Workstream 2: Apartment Assignment and Resident Membership Integrity

**Why second:** Unit assignment is the center of resident identity, verification, voting, visitors, and issue routing.

**Primary files**
- `apps/api/app/Http/Controllers/Api/V1/UnitMembershipController.php`
- `apps/api/app/Http/Requests/Property/StoreUnitMembershipRequest.php`
- `apps/api/app/Http/Requests/Property/UpdateUnitMembershipRequest.php`
- `apps/api/app/Http/Resources/UnitMembershipResource.php`
- `packages/contracts/src/property.ts`
- `apps/admin/src/app/units/[unitId]/page.tsx`
- `apps/mobile/src/features/admin/screens/AdminUnitsScreen.tsx`
- `apps/mobile/src/services/admin.ts`
- `apps/mobile/src/services/property.ts`
- `apps/api/tests/Feature/Api/V1/PropertyRegistryTest.php`

**Exit criteria**
- [ ] Admin web has a real apartment assignment workflow, not dead shortcut links.
- [ ] Operators can add, update, end, and review apartment memberships cleanly.
- [ ] Resident profile fields are editable: resident name, phone, phone visibility, email, email visibility, vehicle, plate, parking code, garage sticker.
- [ ] Multiple residents per apartment are supported cleanly across API and surfaces.
- [ ] “Users without apartment assignment” links to a real working page/flow.

### Workstream 3: Complaint Routing, Representative Scope, and Escalation

**Why third:** The current issues system is functional but does not yet implement the requested target model faithfully.

**Primary files**
- `apps/api/app/Http/Requests/Issues/StoreIssueRequest.php`
- `apps/api/app/Http/Controllers/Api/V1/IssueController.php`
- `apps/api/app/Services/IssueService.php`
- `apps/api/app/Http/Resources/Issues/IssueResource.php`
- `apps/api/tests/Feature/Api/V1/IssuesTest.php`
- `apps/admin/src/app/issues/[issueId]/page.tsx`
- `apps/mobile/src/features/issues/screens/CreateIssueScreen.tsx`
- `apps/mobile/src/features/issues/screens/IssueDetailScreen.tsx`
- `apps/mobile/src/services/property.ts`

**Exit criteria**
- [ ] Residents can report complaints to the intended target path: floor rep, building rep, president, or admin, per canon rules.
- [ ] Floor reps only see their building/floor complaint scope.
- [ ] Building reps can escalate to president with an explicit reason trail.
- [ ] Presidents see what admins are supposed to see for complaint oversight.
- [ ] Mobile uses the dedicated escalate flow, not only raw status mutation.

### Workstream 4: Org Chart, Assignment UX, and Representative Contact Trust

**Why fourth:** Org chart is now close, but still needs runtime trust and integration with assignment/role behavior.

**Primary files**
- `apps/api/app/Services/OrgChartService.php`
- `apps/api/app/Http/Controllers/Api/V1/OrgChartController.php`
- `apps/admin/src/components/orgchart-view.tsx`
- `apps/admin/src/lib/orgchart-actions.ts`
- `apps/mobile/src/features/orgchart/screens/OrgChartScreenV2.tsx`
- `apps/mobile/src/services/orgchart.ts`
- `apps/api/tests/Feature/Api/V1/OrgChartTest.php`

**Exit criteria**
- [ ] Assignment UX is operator-usable on web and mobile.
- [ ] Contact visibility obeys scope and privacy rules.
- [ ] Representative role displays are truthful and consistent.
- [ ] Authenticated runtime verification passes on the main org-chart flows.

### Workstream 5: Polls, Governance, and Transparency

**Why fifth:** The stack already has good foundations, but this is high-trust functionality and must be proven, not assumed.

**Primary files**
- `apps/api/app/Http/Controllers/Api/V1/Polls/PollController.php`
- `apps/api/app/Http/Resources/Polls/PollResource.php`
- `apps/api/app/Models/Polls/Poll*.php`
- `packages/contracts/src/polls.ts`
- `apps/admin/src/app/polls/[pollId]/page.tsx`
- `apps/mobile/src/features/polls/screens/PollDetailScreen.tsx`
- `apps/mobile/src/services/polls.ts`
- `apps/api/tests/Feature/Api/V1/PollsTest.php`
- `apps/api/tests/Feature/Api/V1/VoteTest.php`

**Exit criteria**
- [ ] One vote per apartment is enforced and regression-covered.
- [ ] Unvote/revote is allowed only while poll is active.
- [ ] Closed/expired polls cannot be changed.
- [ ] All voters are visible where transparency requires it.
- [ ] Notification delivery logs and view logs are exposed consistently where intended.
- [ ] Admin cannot alter results outside legitimate lifecycle actions.

### Workstream 6: Dashboard Usefulness and Persona Shell Polish

**Why sixth:** Dashboard quality matters, but only after the underlying workflows are trustworthy.

**Primary files**
- `apps/api/app/Http/Controllers/Api/V1/DashboardController.php`
- `apps/admin/src/app/page.tsx`
- `apps/mobile/src/features/dashboard/screens/DashboardScreen.tsx`
- `apps/mobile/src/features/admin/screens/AdminDashboardScreen.tsx`

**Exit criteria**
- [ ] Dashboards show only actionable items.
- [ ] Shortcuts link to working flows.
- [ ] Role/persona shortcuts align with actual capability.
- [ ] Empty/loading/error states are polished and useful.

### Workstream 7: Security and Visitor Runtime Hardening

**Why seventh:** Security surfaces are high-risk and must be runtime-verified after app-shell and assignment stability.

**Primary files**
- `apps/api/tests/Feature/Api/V1/SecurityOperationsTest.php`
- `apps/api/tests/Feature/Api/V1/VisitorRequestsTest.php`
- `apps/mobile/src/features/security/screens/GateScreen.tsx`
- `apps/mobile/src/features/visitors/screens/*.tsx`
- `apps/mobile/src/navigation/RootNavigator.tsx`

**Exit criteria**
- [ ] QR scanner and guard actions are functional.
- [ ] Entry history and manual entry flows work without crash.
- [ ] Visitor validation and resident guest workflows are runtime-verified.

### Workstream 8: Full-System Release Matrix and Runtime Evidence

**Why last:** This is the final proof layer after subsystem hardening.

**Artifacts to create**
- `docs/canon/release-matrix.md`
- `docs/canon/uat-checklists/` (if needed)
- `docs/canon/release-evidence/` (if needed)

**Exit criteria**
- [ ] Every critical page/flow is mapped by persona and platform.
- [ ] Every critical page/flow has automated evidence and runtime evidence.
- [ ] Remaining known issues are explicitly documented and accepted.
- [ ] No crash, dead-end route, or unauthorized flow remains on critical paths.

## Execution Order

- [ ] Execute Workstream 1 first.
- [ ] Execute Workstream 2 second.
- [ ] Execute Workstream 3 third.
- [ ] Execute Workstream 4 fourth.
- [ ] Execute Workstream 5 fifth.
- [ ] Execute Workstream 6 sixth.
- [ ] Execute Workstream 7 seventh.
- [ ] Execute Workstream 8 last.

## First Tranche

This is the first release-hardening tranche to execute immediately after approving this plan:

- [ ] Finish apartment assignment as a real operator workflow.
- [ ] Finish apartment membership editing for resident profile and vehicle fields on admin web and mobile.
- [ ] Replace complaint auto-routing-by-building with explicit, tested complaint routing and escalation behavior.
- [ ] Re-verify dashboard shortcuts that currently point to non-existent or incomplete flows.

## Verification Baseline Before Tranche 1 Starts

- [ ] `npm run build -w apps/admin`
- [ ] `npm run typecheck -w apps/admin`
- [ ] `npm run typecheck -w apps/mobile`
- [ ] `docker compose -f infra/docker-compose.yml exec -T api php artisan test tests/Feature/Api/V1/PropertyRegistryTest.php`
- [ ] `docker compose -f infra/docker-compose.yml exec -T api php artisan test tests/Feature/Api/V1/IssuesTest.php`
- [ ] `docker compose -f infra/docker-compose.yml exec -T api php artisan test tests/Feature/Api/V1/OrgChartTest.php`
- [ ] `docker compose -f infra/docker-compose.yml exec -T api php artisan test tests/Feature/Api/V1/PollsTest.php`
- [ ] `docker compose -f infra/docker-compose.yml exec -T api php artisan test tests/Feature/Api/V1/VoteTest.php`

## Notes For Future Workers

- The worktree is already active and partially dirty. Do not revert unrelated changes.
- The recovery branch contains genuine improvements alongside incomplete UI/runtime slices. Verify before assuming either “done” or “broken.”
- When a route or shortcut exists, confirm the destination screen/page exists and is usable before treating it as complete.
- Runtime verification matters here as much as automated tests. A green suite is necessary but not sufficient for release readiness.
