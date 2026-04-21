# P10 Announcements Human Test Checklist

Related Jira tickets: CM-10, CM-46, CM-47, CM-48

Use this checklist before accepting P10 as production-ready from the human review side. Automated tests should cover the core API contracts, but this document captures manual checks for official announcement lifecycle, targeting, notification integration, archive behavior, acknowledgements, permissions, English/Arabic wording, RTL layout, admin web, mobile feed, and regression risk.

## Scope

P10 covers official association announcements and notices:

- Draft, scheduled, published, expired, and archived announcements.
- Categories: general, building, association decision, security alert, maintenance notice, meeting reminder.
- Priority levels: low, normal, high, critical.
- Targeting by all users, compound, building, floor, unit, and role.
- Verified-membership-only targeting where enabled.
- Bilingual title/body content and notification metadata.
- Resident/mobile feed and admin archive/search.
- Optional acknowledgement for critical or formal notices.
- Audit trail for create, publish, edit, archive, and acknowledge actions.

## Required Environment

- Docker stack is running from `D:\apps\compound`.
- API is available at `http://localhost:8000`.
- Admin web is available at `http://localhost:3001` unless another local server maps it differently.
- Database migrations are current.
- Notification center is enabled and can show in-app notifications for targeted users.
- Test users exist for:
  - `super_admin` or `compound_admin`
  - `board_member`
  - `support_agent`
  - `security_guard`
  - `resident_owner` with verified membership in Building A
  - `resident_tenant` with verified membership in Building A
  - `resident_owner` or `resident_tenant` with verified membership in Building B
  - At least one resident with pending, rejected, expired, or archived membership
- Property fixtures exist for at least one compound with two buildings, floors, and units.

Use `docs/templates/p10-announcements-api-fixtures.json` as sample request bodies and `docs/templates/p10-announcements-wording-review-template.md` for bilingual copy review.

## Backend API Checks

### Admin List and Search

Endpoint:

```http
GET /api/v1/announcements
```

Test with combinations of these filters:

- `status`
- `category`
- `targetType`
- `search`
- `perPage`

Acceptance checks:

- Admin roles can list announcements with pagination metadata.
- Search matches English title/body and Arabic title/body.
- Status filters isolate `draft`, `scheduled`, `published`, `expired`, and `archived` records if those states exist.
- Category filters isolate official notice types without mixing security, maintenance, meeting, and association decision notices.
- Target type filters make it easy to find all, property-scoped, and role-scoped notices.
- Archived notices remain visible to authorized admins through archive/list filters.
- Non-admin residents cannot call the admin list endpoint.

### Create Draft

Endpoint:

```http
POST /api/v1/announcements
```

Acceptance checks:

- Creating a draft requires English and Arabic title/body.
- `category`, `priority`, `targetType`, `targetIds`, `targetRole`, `requiresVerifiedMembership`, `requiresAcknowledgement`, `scheduledAt`, `expiresAt`, and `attachments` validate predictably.
- Role targeting requires `targetRole`.
- Property targeting by compound, building, floor, or unit requires at least one `targetIds` value.
- `expiresAt` after `scheduledAt` is enforced on create.
- Invalid target IDs do not silently create broad announcements.
- Response includes stable machine values plus bilingual content:

```json
{
  "status": "draft",
  "title": {
    "en": "...",
    "ar": "..."
  },
  "body": {
    "en": "...",
    "ar": "..."
  }
}
```

- Create action is recorded in audit logs with actor, target announcement ID, request metadata, and status.

### Publish and Schedule Lifecycle

Endpoints:

```http
POST /api/v1/announcements/{announcement}/publish
PATCH /api/v1/announcements/{announcement}
```

Acceptance checks:

- Publishing an unscheduled draft moves it to `published` and sets `publishedAt`.
- Publishing a future-dated announcement moves it to `scheduled`, leaves `publishedAt` empty until it becomes visible, and hides it from resident feed before `scheduledAt`.
- Scheduled announcements become visible only after `scheduledAt` in the expected timezone behavior.
- Expired announcements leave the resident feed after `expiresAt`.
- Expired or past notices remain retrievable in the admin archive/list for official recordkeeping.
- Editing non-content fields does not change revision unexpectedly.
- Editing title/body after publish increments `revision` and preserves the previous published snapshot or audit evidence.
- Published edits are audit logged and visible enough for admins to understand that content changed after publication.
- Archived announcements cannot be edited or re-published unless the product explicitly supports an unarchive flow.

### Targeting Matrix

Run each scenario with at least one matching user and one non-matching user.

| Target | Expected visible users | Expected excluded users |
| --- | --- | --- |
| `all`, verified membership off | Active authenticated users allowed by product policy | Inactive/suspended users |
| `all`, verified membership on | Users with active verified unit membership | Users without verified active membership |
| `compound` | Residents attached to units in selected compound | Residents in another compound |
| `building` | Residents attached to units in selected building | Residents in another building |
| `floor` | Residents attached to units on selected floor | Residents on other floors |
| `unit` | Residents attached to selected unit | Residents in other units |
| `role=security_guard` | Security staff only | Residents, finance, board, support unless explicitly included |

Acceptance checks:

- Pending, rejected, expired, or archived memberships do not grant feed access when verified active membership is required.
- A user with multiple units sees the notice if any active verified membership matches the target.
- Duplicate memberships or multiple matching units do not duplicate the same announcement in the feed.
- Targeting is enforced by the API, not only hidden in the UI.

### Resident and Mobile Feed

Endpoints:

```http
GET /api/v1/my/announcements
GET /api/v1/announcements/{announcement}
```

Acceptance checks:

- Feed contains only published or currently active scheduled announcements targeted to the logged-in user.
- Feed excludes drafts, future scheduled notices, archived notices, expired notices, and notices targeted to another role/property scope.
- Detail endpoint returns 403 for a user outside the target audience.
- Detail endpoint includes acknowledgement state for the current user when acknowledgement is required.
- Pagination is stable and does not skip or duplicate announcements when new notices are published.
- Feed ordering puts the newest relevant notice first unless product design defines a pinned/priority order.
- Critical notices have a visible priority treatment in the consuming UI without making normal notices look like emergencies.

### Acknowledgement

Endpoints:

```http
POST /api/v1/announcements/{announcement}/acknowledge
GET /api/v1/announcements/{announcement}/acknowledgements
```

Acceptance checks:

- Only targeted users can acknowledge.
- A notice without `requiresAcknowledgement=true` rejects acknowledgement with a clear validation error.
- A targeted user can acknowledge exactly once; repeating the action is idempotent or updates the timestamp according to product decision.
- Resident feed/detail shows `acknowledgedAt` after acknowledgement.
- Admin acknowledgement summary includes `targetedCount`, `acknowledgedCount`, and `pendingCount`.
- Admin completion numbers match the targeting matrix, including users with multiple units and excluded memberships.
- Acknowledgement audit logs include actor, announcement ID, and timestamp.
- Archived notices preserve acknowledgement history.

### Notification Integration

Endpoints:

```http
GET /api/v1/notifications
GET /api/v1/notifications/unread-count
POST /api/v1/notifications/{notification}/read
POST /api/v1/notifications/{notification}/archive
```

Acceptance checks:

- Publishing an immediate announcement creates in-app notifications for targeted active users only.
- Future scheduled announcements do not notify early.
- If a scheduled-notification job exists, it sends once when due; if it does not yet exist, record the gap in Jira before accepting P10.
- Notification category is `announcements`.
- Notification priority matches announcement priority.
- Notification metadata includes announcement ID, action URL, acknowledgement requirement, and Arabic title/body metadata.
- Notification center opens the correct announcement detail.
- Unauthorized users cannot open an announcement by copying a notification URL from another user.
- Read/archive actions on notifications do not hide the official announcement from the feed or archive.
- Failed notification jobs are visible in queue checks and retriable without duplicate notices.

### Attachments

Acceptance checks:

- Attachment metadata is stored and returned consistently on list/detail responses.
- Attachment links are accessible only to users targeted by the announcement and authorized admins.
- Copying an attachment URL to a non-targeted user does not bypass access checks.
- Archived announcements retain attachment evidence unless retention policy requires removal.
- Attachment names, descriptions, and any UI labels are bilingual where shown to residents/admins.
- Large or missing attachments produce clear errors and do not block unrelated announcements.

### Permissions and Security

Acceptance checks:

- Only approved announcement-management roles can create, edit, publish, archive, and view acknowledgement reports.
- Residents can read only targeted announcements and acknowledge only their own targeted notices.
- Security guards receive role-targeted notices but cannot publish announcements unless explicitly allowed by product policy.
- Finance reviewers can access announcement management only if the product owner explicitly confirms that role should publish official notices.
- Support agents can manage announcements only within the intended support policy.
- All mutating endpoints require authenticated Sanctum requests.
- Invalid IDs return 404/403 without leaking whether another user is targeted.
- Validation errors are clear enough for admin web/mobile to localize.
- Audit logs exist for create, publish, update, archive, and acknowledgement actions.

## Admin Web Human Checks

Run these checks in both English and Arabic.

### Composer and Preview

- Admin can create a draft with English and Arabic title/body.
- Category, priority, target type, target IDs, target role, schedule, expiry, attachments, and acknowledgement controls are visible and understandable.
- Target selector prevents impossible combinations, such as role target without role or building target without building.
- Preview shows the resident-facing English and Arabic versions before publish.
- Required fields, invalid dates, invalid targets, and missing Arabic/English content show localized validation.
- Publish, schedule, save draft, edit, and archive actions have clear success/error states.
- Destructive archive action uses an explicit confirmation pattern.

### Admin List, Archive, and Acknowledgements

- Announcement list shows title, category, priority, status, target, author, schedule/publish/expiry dates, revision, and acknowledgement state.
- Filters work for category, status, target type, date range, building, author, and search where implemented.
- Archive view distinguishes archived notices from expired notices.
- Acknowledgement report shows targeted, acknowledged, and pending counts.
- Acknowledgement detail list is exportable or reviewable enough for association follow-up if product scope requires it.
- Revision/audit information is visible enough that admins do not silently overwrite official records.
- Empty states, loading states, and API error states are localized and do not imply data loss.
- Keyboard navigation and focus order work for forms, modals, filters, and tables.
- Desktop and mobile-width browser layouts do not overlap controls or truncate critical information.

## Mobile Human Checks

Run these checks on the mobile app if the P10 feed is exposed there; otherwise record the mobile gap under CM-47/CM-48.

- Resident feed loads targeted announcements from `GET /api/v1/my/announcements`.
- Pull-to-refresh or polling behavior does not duplicate items.
- Critical/security/maintenance/meeting/decision badges are visible and understandable.
- Tapping a notification opens the correct announcement detail.
- Acknowledgement button is visible only when required and disappears or changes state after acknowledgement.
- Users outside the target audience cannot open a notice from a deep link.
- Attachments open only for authorized targeted users.
- Offline or slow-network states do not mark notices acknowledged.
- Arabic mode uses RTL layout for list, detail, badges, dates, and acknowledgement controls.
- Long Arabic titles and body text wrap cleanly on small screens.

## English, Arabic, and RTL Wording Review

Use `docs/templates/p10-announcements-wording-review-template.md` for sign-off.

Acceptance checks:

- English and Arabic copy communicate the same operational meaning.
- Arabic copy is formal and appropriate for association notices, not informal chat wording.
- Security alerts are urgent but not alarmist.
- Maintenance notices include affected place, date/time, expected impact, and contact/follow-up where available.
- Meeting reminders include date/time, location or remote link, and any attendance requirement.
- Association decisions distinguish between a decision, reminder, and request for acknowledgement.
- Category labels are translated and not shown as machine values like `security_alert`.
- Status labels are translated and not shown as machine values like `requiresAcknowledgement`.
- Dates/times are formatted clearly for the user's locale and avoid ambiguous relative wording for scheduled/expired notices.
- RTL mode mirrors layout, alignment, icons with directionality, input order, and table/action placement where appropriate.
- Arabic text does not overflow buttons, cards, badges, notifications, modals, or mobile headers.

Suggested Arabic label review set:

| Machine value | English label | Arabic label to review |
| --- | --- | --- |
| `general` | General | عام |
| `building` | Building notice | إعلان مبنى |
| `association_decision` | Association decision | قرار اتحاد |
| `security_alert` | Security alert | تنبيه أمني |
| `maintenance_notice` | Maintenance notice | إشعار صيانة |
| `meeting_reminder` | Meeting reminder | تذكير باجتماع |
| `draft` | Draft | مسودة |
| `scheduled` | Scheduled | مجدول |
| `published` | Published | منشور |
| `expired` | Expired | منتهي |
| `archived` | Archived | مؤرشف |
| `requires_acknowledgement` | Requires acknowledgement | يتطلب تأكيد الاطلاع |

## Regression Checks

- Existing notification center behavior still works for non-announcement notifications.
- Unread notification counts remain correct after publish, read, archive, and acknowledge flows.
- P03 unit membership access rules still gate property-scoped announcements.
- P08 security-guard workflows are not disrupted by role-targeted security notices.
- P09 issue/maintenance workflows are not confused with maintenance announcements.
- Audit log filters can still find announcement actions after other audit-heavy workflows.
- Queue workers do not create duplicate notifications after retry.
- Archiving announcements does not delete audit logs, notifications, acknowledgements, or attachment evidence.
- API responses do not expose another user's acknowledgement state.
- Pagination remains stable with many announcements and notifications.
- Timezone-sensitive checks work around schedule and expiry boundaries.
- Arabic/RTL support does not regress existing English admin/mobile screens.

## Validation Commands

Use these commands when preparing the Jira handoff:

```powershell
docker compose -f infra/docker-compose.yml exec -T api php artisan migrate:fresh --force
docker compose -f infra/docker-compose.yml exec -T api php artisan test tests/Feature/Api/V1/AnnouncementsTest.php
docker compose -f infra/docker-compose.yml exec -T api sh -lc "QUEUE_CONNECTION=sync BROADCAST_CONNECTION=null php artisan test"
docker compose -f infra/docker-compose.yml exec -T api php artisan queue:failed
docker compose -f infra/docker-compose.yml ps
```

Also confirm:

- API status endpoint returns 200.
- Admin login page returns 200.
- Admin announcement screens pass typecheck, lint, build, and bilingual visual review.
- Mobile typecheck passes, and any exposed announcement screens pass English/Arabic manual review.

## Human Sign-Off

Only accept CM-48 after all rows below pass or have an explicit Jira blocker.

| Area | Reviewer | Result | Notes |
| --- | --- | --- | --- |
| Backend lifecycle and audit |  |  |  |
| Targeting by property and role |  |  |  |
| Notification center integration |  |  |  |
| Archive and expired notice behavior |  |  |  |
| Acknowledgement flow and admin counts |  |  |  |
| Permissions and deep-link security |  |  |  |
| Attachment authorization |  |  |  |
| English wording review |  |  |  |
| Arabic wording and RTL review |  |  |  |
| Admin web manual test |  |  |  |
| Mobile feed manual test |  |  |  |
| Regression checks |  |  |  |
