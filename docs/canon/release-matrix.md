# Compound Release Matrix

Status: Canonical
Last updated: 2026-05-05

## Purpose

This file is the release evidence ledger for the recovery branch. It exists to prevent false `Ready for Human Test` and false `Done` states.

Every critical flow must be tracked here by:

- persona
- platform
- surface
- current release classification
- automated evidence
- runtime evidence
- remaining blockers

## Classification Rules

- `Verified healthy`
  Automated evidence exists and runtime proof exists for the critical path.
- `Needs runtime proof`
  Automated evidence exists, but runtime/browser/device proof is still missing or incomplete.
- `Known partial`
  Important behavior is still incomplete, under-polished, or only partly verified.
- `Known broken`
  A reproducible blocker, crash, access failure, or dead-end still exists.

## Global Gate

No subsystem or route is ready for human test unless all of the following are true:

- automated checks passed for the affected area
- runtime verification passed on the real target platform
- no crash or dead-end route remains on the critical path
- empty, loading, and error states are acceptable
- authorization and scope behavior were explicitly checked
- evidence is written here

## Current Program Snapshot

| Area | Classification | Evidence | Main Remaining Gap |
|---|---|---|---|
| Auth / Session | Needs runtime proof | Backend auth/RBAC suites green; canonical UAT persona credentials repaired in seeders and mobile dev chips; API login for `security-guard@uat.compound.local` returned HTTP 200 locally; test bootstrap now forces SQLite `:memory:` and proves tests no longer wipe live UAT login users; XcodeBuildMCP build/run launches the app | Final multi-persona mobile tap walkthrough, session expiry/logout, and realtime proof |
| Dashboards | Known partial | Active code changes on web and mobile | Action usefulness, shortcut truth, and UX polish not fully evidenced |
| Units / Assignment | Needs runtime proof | `PropertyRegistryTest.php` and `DashboardTest.php` green; web assignment route exists; 2026-05-04 browser proof assigned UAT Resident Owner to Building A Unit 101 and count changed; mobile admin stale unit/membership selection and unit type/area display contract repaired, with mobile/admin typechecks green | Full mobile assign/edit walkthrough still missing |
| Issues / Escalation | Needs runtime proof | Issues suite green | Full mobile and web runtime submit/escalate/close proof |
| Visitors / Security | Needs runtime proof | Visitor/security suites green; scanner no longer crashes; QR token persistence and reopen/share validation now covered in `VisitorRequestsTest.php`; staff QR token leakage removed; mobile guard lifecycle now includes `allowed -> complete`; 2026-05-05 scanner UX is button-driven, closes cleanly after scan, supports scan-another loops, and keeps recent scan history | Human physical-camera scan proof delegated to product owner; full guard invitations runtime walkthrough still pending |
| Org Chart | Needs runtime proof | Org-chart suite green; vacant buildings/floors are regression-covered; mobile no longer auto-collapses all buildings by default; shared contracts include building/floor/unit/resident hierarchy | Authenticated assignment/detail/search walkthrough |
| Finance | Known partial | Scoping and finance suites improved | Deeper ledger/payment trust and runtime/UAT proof |
| Polls / Voting | Needs runtime proof | Poll/vote suites green; formal vote lifecycle writes audit logs covered in `VoteTest.php`; poll publish/vote/unvote audit path covered in `PollsTest.php`; admin transparency utilities covered in `poll-transparency.test.mjs`; admin build/typecheck green | Authenticated polls admin walkthrough, seeded live proof data, and remaining lifecycle/runtime proof |
| Notifications / Realtime | Known partial | Broadcasting auth fixed and tested; local Reverb handshake and private-channel auth verified | Real websocket session proof under login/navigation/logout inside the browser/app shells |
| Documents / Compliance | Needs runtime proof | Onboarding/docs suites green | Final invite/review/document workflow walkthrough |

## Surface Matrix

| Surface | Persona | Platform | Classification | Automated Evidence | Runtime Evidence | Remaining Blockers |
|---|---|---|---|---|---|---|
| Login / shell routing | Admin, Resident, Security, Board | Web, Mobile | Needs runtime proof | `AuthTest.php`, `PersonaScenarioTest.php`; 2026-05-05 `login-personas.test.mjs`; mobile/admin typechecks | Resident mobile login re-verified on simulator after local seed repair; 2026-05-04 admin web login verified in in-app browser after reseeding UAT personas/data, `compound-admin@uat.compound.local` landed at active compound route; 2026-05-05 API login for security persona returned HTTP 200 and XcodeBuildMCP build/run launched the app | Final persona-by-persona mobile landing/logout evidence missing; simulator coordinate tapping was unreliable because the RN accessibility tree was not exposed to the MCP runtime |
| Admin dashboard | Compound admin | Web | Known partial | Admin typecheck/build; `DashboardTest.php` | Authenticated runtime walkthrough completed for dashboard shell and sanitized quick actions | Action usefulness polish and final browser console/session proof |
| Resident dashboard | Resident | Mobile | Known partial | Mobile typecheck | Partial runtime only | Shortcut usefulness and full downstream path proof |
| Admin units list/detail | Compound admin | Web | Needs runtime proof | `PropertyRegistryTest.php`, admin typecheck/build | 2026-05-04 authenticated in-app browser walkthrough verified active compound route, `/units/assign`, Unit 101 detail, membership count after assignment, profile field save, and profile field clear-to-null behavior | Invite/end-member evidence is still partial, and mobile equivalent proof is tracked separately |
| Apartment assignment | Compound admin | Web | Verified healthy | `PropertyRegistryTest.php`, `DashboardTest.php`, admin typecheck/build | 2026-05-04 in-app browser proof: UAT compound admin opened `/units/assign`, expanded first unassigned user, selected Building A Unit 101, submitted `Assign to apartment`, saw `?assigned=1`, queue dropped from 7 to 6, and Unit 101 resident count became 1 | None for core web assignment path; profile editor/invite/end-member are tracked separately |
| Apartment membership editing | Compound admin | Web, Mobile | Known partial | `PropertyRegistryTest.php`, typecheck; 2026-05-04 web clearable resident profile fields now send `null` intentionally; mobile admin stale selection reset and canonical `type`/`areaSqm` display fixed | Web profile save/clear proof exists; mobile runtime proof is incomplete | Full mobile edit/save UX proof |
| Invitations | Compound admin | Mobile | Needs runtime proof | Mobile typecheck | Not fully walked | Create/send/runtime validation still needs proof |
| Create issue | Resident, Floor rep | Mobile | Needs runtime proof | `IssuesTest.php`, mobile typecheck, `apps/mobile/src/features/issues/issue-flow-utils.test.mjs`; 2026-05-04 keyboard flow improved with title-to-description focus and description done dismissal | Screen render plus live route-target UI verified on simulator; submit proof attempted but blocked by agent-device runner timeout | Full submit/target/escalation proof |
| Issue management | Admin, President, Building rep, Floor rep | Web, Mobile | Needs runtime proof | `IssuesTest.php` | Incomplete runtime proof | Close/escalate/history/runtime truth |
| Org chart detail/search/assignment | Admin, Resident | Web, Mobile | Needs runtime proof | `OrgChartTest.php`, typechecks; 2026-05-05 vacant building/floor regression and shared contract hierarchy coverage | Incomplete authenticated walkthrough | Search/detail/assignment UX proof |
| Gate validation | Security | Mobile | Verified healthy | `SecurityOperationsTest.php`, `VisitorRequestsTest.php`, mobile typecheck | Simulator walkthrough completed with seeded visitor request: guard login, `qr_issued -> arrived -> allowed -> completed`, then empty-state recovery | Physical-device QR scan proof still separate to scanner surface |
| QR scanner | Security | Mobile | Needs runtime proof | Mobile typecheck, `scanner-utils.test.mjs`; Android manifest deep-link processing passed with `compound://scanner`, `compound://guard-invitations`, and `compound://gate` hosts | Simulator proof confirms screen loads, no crash, and manual-token fallback message renders cleanly; 2026-05-05 scanner UX supports `Open QR camera`, scan result close, `Scan another`, manual fallback, and recent scan list | Product-owner physical iPhone live-camera proof and Android runtime deep-link proof still pending |
| Guard invitations | Security | Mobile | Needs runtime proof | Security/visitor backend suites, mobile typecheck | Action surfaces now cover arrive/allow/deny plus completion for allowed visits, but invitations tab itself is not yet runtime-proven | End-to-end invitation validation and live walkthrough |
| Poll detail / voting | Resident | Mobile | Known partial | `PollsTest.php`, `VoteTest.php` | Not fully walked | Transparency and live UX proof |
| Poll admin | Admin, Board | Web | Needs runtime proof | `PollsTest.php`, `VoteTest.php`, `apps/admin/src/lib/poll-transparency.test.mjs`, admin typecheck/build | Transparency summaries and participation ledgers now implemented in admin detail surfaces, but not yet walked live with seeded poll/vote data | Authenticated walkthrough, admin immutability proof, seeded notification/read-receipt proof, and real-session verification |
| Notification center / realtime | All authenticated roles | Web, Mobile | Known partial | `AuthTest.php` broadcasting auth coverage | Local `/api/broadcasting-auth` success and Reverb socket handshake verified; active in-shell session proof still missing | Reverb/Pusher lifecycle proof under login, navigation, and logout |
| Verification / documents | Resident, Reviewer, Admin | Web, Mobile | Needs runtime proof | `OnboardingAndDocumentsTest.php` | Incomplete walkthrough | Invite, upload, review, and status flows need proof |
| Finance operations | Admin, Finance reviewer, Resident | Web, Mobile | Known partial | Finance suites improved in recovery | Not fully walked | High-trust runtime and audit proof still missing |

## 2026-05-05 Evidence Log

- Login stabilization: `UatPersonaSeeder` now delegates to canonical `UatSeeder`, `UatSeeder` repairs stale persona rows with `updateOrCreate`, and mobile dev persona chips use the canonical `*@uat.compound.local` / `uat-password-2026` credentials.
- Seed-user protection: root cause was Laravel tests inheriting the Docker dev MySQL database, allowing `RefreshDatabase` / `migrate:fresh` to wipe local login users. `phpunit.xml` and the shared API `Tests\TestCase` now force SQLite `:memory:` before the app boots and fail fast if a test ever points at the live database. The SQLite migration path was repaired by dropping `type` indexes before dropping the columns.
- Seed-user proof: live login for `security-guard@uat.compound.local` self-healed the four canonical UAT users, `AuthTest.php --filter=active_user_can_login --env=testing` passed, and a post-test DB check confirmed all four users remained active. Full `AuthTest.php` + `PersonaScenarioTest.php` then passed with 34 tests / 86 assertions and the same live rows remained active.
- Login proof: local API login for `security-guard@uat.compound.local` returned HTTP 200; XcodeBuildMCP `build_run_sim` compiled, installed, and launched the mobile app. Simulator tap automation remains unreliable because the React Native accessibility tree was not exposed to the MCP runtime, so this is not counted as full mobile runtime proof.
- Security scanner: mobile scanner now uses a button-driven camera flow, validates normalized QR/deep-link tokens, closes after each scan result, exposes a `Scan another` path, keeps recent scan history, and preserves manual-token fallback.
- Org chart: API tests now prove vacant buildings and floors remain in the chart with empty representative arrays; mobile no longer hides unassigned/vacant hierarchy by default collapse; shared contracts now model building/floor/unit/resident depth.
- Design system: mobile has a shared semantic status-badge tone layer, polls screens were migrated away from local one-off status color maps, and core web/mobile navigation surfaces now use consistent text glyph badges instead of emoji placeholders.
- Product-facing Polls rename: admin `/governance` pages were removed, admin build route list no longer includes `/governance`, mobile main tab route is `Polls`, dashboard shortcuts resolve to `/polls`, and remaining `/governance` strings are internal compatibility aliases/API/RBAC names only.
- Verification run: `git diff --check`, `npm run typecheck -w apps/mobile`, `npm run typecheck -w apps/admin`, `npm run typecheck -w packages/contracts`, `npm run build -w apps/admin`, targeted Node tests, XcodeBuildMCP `build_run_sim`, and the UAT/org-chart/visitor/dashboard PHP slice passed.

## Required Verification Commands

Run these before any release-readiness claim:

```bash
npm run build -w apps/admin
npm run typecheck -w apps/admin
npm run typecheck -w apps/mobile
docker compose -f infra/docker-compose.yml exec -T api php artisan test tests/Feature/Api/V1/AuthTest.php tests/Feature/Api/V1/PropertyRegistryTest.php tests/Feature/Api/V1/IssuesTest.php tests/Feature/Api/V1/VisitorRequestsTest.php tests/Feature/Api/V1/OrgChartTest.php tests/Feature/Api/V1/PollsTest.php tests/Feature/Api/V1/VoteTest.php tests/Feature/Api/V1/SecurityOperationsTest.php
docker compose -f infra/docker-compose.yml exec -T api php artisan test tests/Feature/Api/V1/OnboardingAndDocumentsTest.php tests/Feature/Api/V1/OperationalStatusTest.php tests/Feature/UAT/PersonaScenarioTest.php
docker compose -f infra/docker-compose.yml exec -T api php artisan test tests/Feature/Api/V1/FinanceTest.php tests/Feature/Api/V1/ChargesTest.php tests/Feature/Api/V1/OnlinePaymentTest.php tests/Feature/Api/V1/AdvancedFinanceTest.php
docker compose -f infra/docker-compose.yml exec -T api php artisan test tests/Feature/Api/V1/AuditReportingTest.php tests/Feature/Api/V1/OperationalStatusTest.php
```

Laravel suites must be run sequentially only.

## Required Runtime Walkthroughs

### Web admin

- login as `compound admin`
- walk dashboard
- walk `/units/assign`
- walk unit detail edit flow
- walk issues list/detail
- walk org chart assignment/detail/search
- walk polls and voting admin surfaces
- verify realtime connection stability during login, navigation, and logout

### Mobile admin/resident/security

- admin: login, dashboard, units, invitations, apartment membership updates
- resident: dashboard, create issue, org chart, polls/voting
- security: gate, scanner, invitations, allow/deny/arrive flows

### Physical-device-only proof

- live QR scan on a real iPhone for security scanner
- confirm camera permission, scan capture, validate, and action flow

## Evidence Logging Rules

For each critical flow that becomes green, add:

- date
- persona
- platform
- route or screen
- exact commands or walkthrough steps used
- result
- remaining caveats, if any

Do not upgrade a row to `Verified healthy` without both automated and runtime evidence.
