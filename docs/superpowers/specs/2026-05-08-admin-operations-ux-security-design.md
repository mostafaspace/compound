# Admin Operations UX and Security Foundations Design

Status: Approved
Last updated: 2026-05-09
Owner: Mostafa Magdy

## Purpose

Make the admin experience easier to navigate and faster to operate, while adding the missing security and enforcement foundations admins need for day-to-day compound operations. The delivery focuses on task clarity: admins should be able to find an apartment, resident, vehicle, poll, notification, audit event, or security concern without memorizing the app's route structure.

## Scope

1. Admin web navigation and workflow cleanup.
2. Compound-admin isolation in web admin UX.
3. Apartment penalty points, separate from monetary violation fees.
4. Vehicle plate lookup for admins and security operators.
5. Mobile admin poll creation, matching web poll creation capability.
6. Building-level notification UX verification and improvements.
7. Admin security center with audit, IP/device/session visibility, suspicious flags, and admin suspension actions.

## Non-Goals

- Apartment ban or apartment restriction. This is explicitly deferred until the intended behavior is clear.
- Replacing the existing audit log system.
- Building a visual diff for documents.
- Rewriting all admin pages. This delivery introduces a better shell, search, and key task flows, then migrates high-value pages into that structure.
- Cross-compound visibility for compound admins.

## Current State Summary

The codebase already has useful primitives:

- Violation rules and apartment violations with fees.
- Announcement targeting with `all`, `compound`, `building`, `floor`, `unit`, and `role` target types.
- Audit logs with actor, IP address, user agent, method, path, status code, severity, reason, metadata, export, and timeline APIs.
- User suspension/reactivation through `UserLifecycleController`.
- Admin web pages for polls, announcements, audit logs, security devices, support users, violation rules, and unit violations.
- Mobile admin dashboard, units, finance, visitors, audit logs, and resident poll participation.

The main gap is not only missing features; it is operational friction. Admin web has many pages, but the common shell is brand + breadcrumbs + logout. Operators must remember where work lives. Mobile has admin tabs, but poll creation is not exposed.

## UX Direction

Use a role-aware operations shell for admin web.

### Web Admin Shell

Replace the minimal top-only navigation with a task-oriented shell:

- Primary sections: `Command Center`, `People`, `Apartments`, `Vehicles`, `Finance`, `Communications`, `Polls`, `Security`, `Audit`, `Settings`.
- Persistent desktop sidebar with section groups and active state.
- Mobile/tablet collapsible drawer.
- Top command bar with global search.
- Per-page "next action" panels for the most common task on that page.
- Breadcrumbs remain, but become secondary orientation rather than the primary navigation mechanism.

The command bar searches across:

- users by name, email, phone;
- apartments by unit/building;
- vehicles by plate/sticker;
- documents awaiting review;
- violations and penalty events;
- audit logs by actor/IP/action;
- support users when permitted.

### Command Center

The home page should answer "what needs my attention now?"

Recommended cards:

- Pending document reviews.
- Pending owner or verification reviews.
- Open issues.
- Pending payment submissions.
- Recent severe audit events.
- Suspicious admin activity.
- Active polls ending soon.
- Recent apartment violations and penalty points.

Each card links directly to the task. No "choose compound" prompt should appear for compound admins.

### Apartment Command View

The unit detail page becomes the operational apartment view:

- Header: unit, building, current status, outstanding finance balance, violations balance, penalty points.
- Action rail: apply violation, add penalty points, send notification, view audit timeline, open finance, review documents.
- Tabs/cards: residents, vehicles, parking, documents, finance, violations, penalty points, notes, audit.
- Vehicle plate matches should deep-link here.

Existing view-only apartment tabs stay, but the page should become action-oriented for admins with permission.

## Compound-Admin Isolation

Compound admins should never feel they are inside a multi-compound product.

Rules:

- Do not render `CompoundContextBanner` or "Viewing: {compound}" for `compound_admin`.
- Do not show "All compounds" language to compound admins.
- Do not route compound admins to `/compounds/{compoundId}` after login. Route them to `/`.
- Hide `/compounds` registry and compound switcher from compound admins unless the page is reframed as "Property structure" and scoped to their own compound.
- Dashboard shortcuts for compound admins should use neutral labels like `Buildings`, `Apartments`, `Organization`, not `Compounds`.
- API scoping remains enforced server-side through existing compound context and scope services.

Super admins keep cross-compound switching and cross-compound views.

## Apartment Penalty Points

Penalty points are separate from violation fees and finance balances.

### Data Model

Add `apartment_penalty_events`:

- `id`
- `unit_id`
- `violation_rule_id` nullable
- `points` integer, positive for added points, negative for corrections
- `reason`
- `notes` nullable
- `applied_by`
- `expires_at` nullable
- `voided_at` nullable
- `voided_by` nullable
- `void_reason` nullable
- timestamps

Computed apartment points:

- Active total is the sum of non-voided events where `expires_at` is null or future.
- Historical total remains queryable for audit.

Violation rules gain optional `default_points` integer, default `0`.

### Admin Behavior

Admins can:

- apply a violation fee only;
- apply points only;
- apply both fee and points from the same violation rule;
- add manual penalty points without a fee;
- void a penalty event with a reason.

Applying or voiding points writes an audit log with severity `warning` or `critical` depending on point threshold.

## Vehicle Plate Lookup

Admins and security operators need to identify a vehicle owner quickly.

### API

Add an admin search endpoint:

- `GET /api/v1/admin/vehicle-lookup?q={plate}`

The endpoint searches:

- `apartment_vehicles.plate`
- `apartment_vehicles.sticker_code`
- visitor request vehicle plates as secondary matches

Returned fields:

- vehicle id, plate, sticker, make, model, color;
- unit id, unit number, building name;
- active residents with name, phone, email visibility rules;
- resident user id when linked;
- last updated timestamp;
- source: `apartment_vehicle` or `visitor_request`.

Access:

- compound scoped;
- available to compound admins, support agents, and security guards with the right permission.

### UX

Add a `Vehicles` section and a global command-bar search mode.

Vehicle result actions:

- open apartment;
- call/copy resident phone when visible;
- view related visitor records;
- create security incident if needed.

## Mobile Admin Poll Creation

The API already supports poll CRUD and the web admin already has poll creation. Mobile should expose a compact admin poll creation flow.

### Mobile Screens

Add `CreatePollScreen` for admin users with governance permission:

- title;
- description;
- poll type/category;
- scope: compound or building;
- building picker when scope is building;
- eligibility;
- options, minimum 2;
- allow multiple choices;
- max choices when multiple;
- starts at, ends at;
- publish now toggle.

After create:

- if publish now is enabled, call publish endpoint;
- otherwise save as draft;
- navigate to poll detail.

### Mobile Navigation

Add create action from:

- admin dashboard quick action;
- polls list header;
- optional More menu entry.

Resident users must not see create actions.

## Building-Level Notifications

Building-level targeting already exists through announcements. This delivery makes it obvious and safe to use.

### Admin Web

Announcement creation/edit forms should expose a clear target selector:

- Everyone;
- Compound;
- Building;
- Floor;
- Unit;
- Role.

When `Building` is selected:

- show building picker scoped to the current compound;
- require at least one building;
- preview recipient count using a new scoped target-preview endpoint;
- show clear copy: "Only residents in selected buildings will receive this."

Add `POST /api/v1/announcements/target-preview` for admins. It accepts the same targeting fields as announcement creation and returns `recipientCount`, scoped to the acting admin's compound access.

### Mobile Admin

Mobile announcement creation should support building targeting or clearly hide the option until supported. Preferred delivery is to add building targeting to mobile so admins can send building-level notices on the go.

## Admin Security Center

Existing audit logs are event records. The new security center turns them into an investigation and prevention workflow.

### Data Model

Add `admin_sessions`:

- `id`
- `user_id`
- `token_id` nullable
- `ip_address`
- `user_agent`
- `device_label` nullable
- `device_fingerprint_hash` nullable
- `country` nullable
- `city` nullable
- `first_seen_at`
- `last_seen_at`
- `revoked_at` nullable
- timestamps

Add `admin_security_flags`:

- `id`
- `user_id`
- `admin_session_id` nullable
- `type` (`new_device`, `new_ip`, `too_many_ips`, `high_risk_action`, `failed_login_spike`)
- `severity` (`info`, `warning`, `critical`)
- `status` (`open`, `reviewed`, `dismissed`)
- `summary`
- `metadata`
- `reviewed_by` nullable
- `reviewed_at` nullable
- timestamps

### Capture

On admin login and authenticated admin requests:

- update `admin_sessions`;
- record IP and user agent;
- derive coarse device label from user agent;
- create flags for new device/IP and obvious anomalies;
- keep all raw high-value events in `audit_logs`.

Suspicious detection starts simple and deterministic:

- same admin uses more than 3 IPs in 24 hours;
- new device after 30 days of stable device usage;
- critical action from a new IP/device;
- repeated failed logins for the same admin email.

No geolocation provider is required for v1. `country`/`city` stay nullable unless configured later.

### Admin Web UX

Add `Security > Admin Activity`.

Views:

- Flag queue with severity and status.
- Admin profile security tab: recent sessions, IPs, devices, flags, audit events.
- Session list with revoke action when the session is linked to a Sanctum token; otherwise the UI shows the session as historical evidence only.
- Suspend admin button for users with `manage_users`.

Suspending an admin reuses the existing user suspension endpoint, but the UI copy must say "Suspend admin" and require a reason.

### Mobile Admin

Mobile audit log screens can stay read-only in this delivery. Mobile admin security actions are deferred unless already easy to expose through existing support-user flows.

## API and Permission Design

New permissions:

- `lookup_vehicles`
- `manage_apartment_penalty_points`
- `view_admin_security`
- `manage_admin_security`

Poll creation should use existing `manage_governance`. Poll reading and resident voting continue to use existing `view_governance`.

Existing permissions remain:

- `apartments_admin`
- `apply_apartment_violation`
- `view_audit_logs`
- `manage_users`

Important policy rule:

- Compound admins can only view and act on users, apartments, vehicles, audit entries, sessions, and flags inside their compound.

## Testing Strategy

API tests:

- penalty event creation, point totals, voiding, audit events;
- violation rule default points;
- vehicle plate lookup exact and partial matches with compound scoping;
- security session capture and suspicious flag creation;
- admin suspension authorization;
- compound admin cannot query other compounds;
- building-targeted announcement validation.

Admin web tests:

- compound admin does not see compound switcher/banner/all-compounds language;
- dashboard nav exposes task groups;
- vehicle lookup links to the apartment view;
- admin security center shows flags and suspend action;
- announcement building target validation.

Mobile tests:

- create poll screen validation;
- draft poll creation;
- publish-now flow;
- create action hidden for residents;
- building-targeted announcement UI when included.

Verification gates:

- `cd apps/api && php artisan test --filter <new test classes>`
- `cd apps/api && composer pint -- --test && composer phpstan`
- `cd apps/admin && npm run typecheck && npm run lint`
- `cd apps/mobile && npm run typecheck && npm test`

## Delivery Order

1. Compound-admin isolation and admin shell/navigation cleanup.
2. Vehicle plate lookup API and web UX.
3. Penalty points backend and apartment admin UI.
4. Building notification UX improvements.
5. Mobile admin poll creation.
6. Admin security sessions, flags, and security center.

This order improves daily navigation first, then adds high-frequency operations, then deeper security foundations.

## Open Decisions

- Apartment ban/restriction is intentionally skipped.
- Geolocation for admin sessions is optional and not part of v1.
- Mobile admin security actions are deferred unless they fall out naturally from existing support-user APIs.
