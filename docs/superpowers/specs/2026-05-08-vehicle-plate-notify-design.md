# Vehicle Plate & Resident-to-Resident Notify Design

Status: Draft
Last updated: 2026-05-08
Owner: Mostafa Magdy

## Purpose

Extend the apartments feature so residents can manage vehicles directly from the mobile app (already partially shipped), search any vehicle plate to send a private message to the vehicle's owner+co-residents, and persist plate data in a structured form aligned with the Egyptian license-plate format.

## Scope

1. Persist plate data in normalized columns to support cross-format search (Arabic letters + digits, or digits only).
2. Mobile vehicle entry form gains a format toggle (`letters_numbers` vs `numbers_only`) and structured fields.
3. Always surface vehicle CRUD on the apartment hub (no longer conditional on `unit.has_vehicle`). The capability flag still disables the Add control with a clear reason.
4. Merge the Vehicles and Parking tabs into a single "Vehicles & Parking" tab with two stacked sub-sections.
5. Mobile resident-to-resident plate-notify flow: search by plate → write message → deliver to all active verified residents of the vehicle's unit. No owner PII exposed to the sender.
6. Admin vehicle lookup expanded to hit normalized + variant columns.

## Non-Goals

- Inline two-way chat. Notifications are one-shot messages.
- Visitor request plate (`visitor_requests.vehicle_plate`) reformat — left as raw string for now.
- Out-of-compound vehicle search.
- Owner identity disclosure to the sender.

## Roles and Permissions

- **Verified active resident** of any apartment in the compound: send plate-notify messages, search plates, manage own vehicles.
- **Admin (`apartments.admin` or `lookup_vehicles`):** full vehicle lookup with owner identity (existing).

Plate-notify never exposes owner identity to senders, regardless of admin status — admins use the existing `vehicle-lookup` page for that.

## Domain Model

### `apartment_vehicles` additions

- `plate_format` string — enum `letters_numbers` | `numbers_only`. Default `letters_numbers`.
- `plate_letters_ar` nullable string — Arabic letters as user entered, space-separated, e.g. `"أ ب ج"`.
- `plate_letters_en` nullable string — Latin transliteration derived via `PlateNormalizer`, e.g. `"A B G"`.
- `plate_digits` string — digits as user entered (Arabic-Indic or Latin).
- `plate_digits_normalized` string — Latin digits only.
- `plate_normalized` string indexed — `lower(plate_letters_en + plate_digits_normalized)` with whitespace stripped. Used as primary search column.

`plate` column stays as canonical display string assembled by the service on write.

### `vehicle_notifications` (new)

- `id` bigint
- `sender_user_id` foreign id, restrict on delete
- `sender_unit_id` foreign ulid (unit the sender resides in, resolved at send), null on delete
- `sender_mode` string — `anonymous` | `identified`
- `sender_alias` nullable string (max 50)
- `target_vehicle_id` foreign id nullable, null on delete (resolved at send; null if no live match)
- `target_unit_id` foreign ulid nullable
- `target_plate_query` string — raw input as typed by sender
- `message` text (max 1000)
- `created_at`, `updated_at`

### `vehicle_notification_recipients` (new)

- `id`
- `vehicle_notification_id` foreign id cascade on delete
- `user_id` foreign id cascade on delete
- `read_at` timestamp nullable
- `created_at`, `updated_at`

Index `(user_id, read_at)`.

## PlateNormalizer Service

Pure helper. Two methods:

- `normalize(string $format, ?string $lettersInput, string $digitsInput): NormalizedPlate` — returns DTO with `plate`, `lettersAr`, `lettersEn`, `digits`, `digitsNormalized`, `plateNormalized`.
- `searchTerms(string $query): array{normalized: string, lettersAr: string, digitsNormalized: string}` — derives variants from a free-text input for search.

Mapping tables (subset, full set in `PlateNormalizer::ARABIC_LETTER_MAP`):

```
ا → A    ب → B    ج → G    د → D    ر → R    س → S
ص → S    ط → T    ع → A    ف → F    ق → Q    ك → K
ل → L    م → M    ن → N    ه → H    و → W    ي → Y
```

Arabic-Indic digits map: `٠١٢٣٤٥٦٧٨٩` → `0123456789`. Reverse during display.

Whitespace stripped before normalization. Diacritics removed.

## Backend Architecture

### `VehicleService` (extend)

`create`/`update` accept `plate_format`, `plate_letters_input` (Arabic), `plate_digits_input`. Service:

1. Calls `PlateNormalizer::normalize`.
2. Persists all derived columns plus the canonical `plate` string for backward compat.

Existing capacity + capability guards unchanged.

### `VehicleNotificationService` (new)

```
search(string $plate, User $sender): SearchResult
  // Resolves sender's compound. Resolves vehicle by normalized variants
  // within sender's compound. Returns recipient count + anonymized unit label
  // (e.g. "An apartment in <Building Name>") or null.

send(string $plate, string $message, SenderMode $mode, ?string $alias, User $sender): VehicleNotification
  // Resolves vehicle. Throws if not found. Computes recipients
  // = active verified ApartmentResident on the target unit with
  // user_id non-null. Creates VehicleNotification + recipient rows
  // in a transaction. Dispatches NotificationService for in-app +
  // push using existing notification pipeline. Sender info passed
  // to delivery payload according to mode.

listForUser(User $user): Paginator
  // Returns recipient rows joined to notifications, latest first.

markRead(int $recipientRowId, User $user): void
```

### `VehicleNotificationController` (new, resident-scoped)

Routes under `Route::prefix('v1/vehicle-notifications')->middleware('auth:sanctum')`:

- `POST /search` — `{ plate }` → `{ found, recipientCount, anonymizedUnitLabel }`.
- `POST /` — `{ plate, message, sender_mode, sender_alias? }` → `{ id, recipientCount }`.
- `GET /` — paginated list of received notifications.
- `PATCH /{recipient}/read` — marks one row read; 404 if recipient row not for this user.

Form requests for each write endpoint validate plate length, message ≤ 1000, sender_mode enum, alias ≤ 50 only when mode = anonymous.

Authorization: any authenticated user with at least one active verified `apartment_residents` row in the compound. Otherwise 403.

### `VehicleLookupController` (admin) update

Search clause expands:

```
$q->where('plate', 'like', "%{$query}%")
  ->orWhere('plate_normalized', 'like', "%{$normalized}%")
  ->orWhere('plate_letters_ar', 'like', "%{$query}%")
  ->orWhere('plate_digits_normalized', 'like', "%{$digitsNormalized}%")
  ->orWhere('sticker_code', 'like', "%{$query}%");
```

Where `$normalized`/`$digitsNormalized` come from `PlateNormalizer::searchTerms`.

## Mobile Architecture

### Tab merge

- Replace `VehiclesTab.tsx` and `ParkingTab.tsx` with `VehiclesParkingTab.tsx` containing:
  - Header: capability badges (`hasVehicle`, `hasParking`).
  - Section "Vehicles" with FlatList + Add button (disabled when at cap or `hasVehicle=false`, with reason).
  - Divider.
  - Section "Parking" with FlatList + Add button (same disabled logic with `hasParking`).
- `ApartmentDetailScreen.tsx` always renders the merged tab (drops the `hasVehicle` conditional). Capability disablement happens inside the tab.

### Plate input

`VehicleSheet.tsx` gains:

- Segmented control toggle `letters_numbers` / `numbers_only` (Arabic labels: `حروف وأرقام` / `أرقام فقط`).
- When `letters_numbers`: separate inputs for letters (Arabic chars, max 3) and digits (max 4) following typical Egyptian private-plate layout. Right-to-left arrangement matches user screenshot.
- When `numbers_only`: single digits input (commercial / numeric-only plates).
- Submit assembles canonical display string locally for optimistic display only; server is source of truth.

### Plate-notify

Two new screens under `apps/mobile/src/features/apartments/screens/notify/`:

- `VehicleNotifySearchScreen.tsx` — entry from apartment hub action button "Notify a vehicle". Single plate input (raw text). On submit, calls `/v1/vehicle-notifications/search`. Shows `recipientCount` and anonymized unit label, plus message composer.
- `VehicleNotifyComposeScreen.tsx` (or inline within search screen) — message textarea, sender-mode segmented toggle (`identified` / `anonymous`), alias input (only when anonymous). Submit calls `POST /v1/vehicle-notifications` and shows confirmation.

Inbox: extend existing notifications list to include vehicle-notify items, or add a small "Vehicle messages" subsection. Reuse `notificationsApi`.

### Service slices

- Extend `vehiclesApi` with new fields. No tag changes.
- New `vehicleNotificationsApi` with `searchPlate`, `sendNotification`, `listMyNotifications`, `markRead` endpoints.

## Data Flow

1. Resident on mobile opens "Notify a vehicle" → enters plate (Arabic or Latin, with or without spaces).
2. Mobile calls `POST /v1/vehicle-notifications/search`. Server normalizes via `PlateNormalizer`, looks up `apartment_vehicles` scoped to sender's compound, returns `{ found, recipientCount, anonymizedUnitLabel }`. Owner identity never returned.
3. Sender enters message + chooses identity mode + alias (if anonymous) → `POST /v1/vehicle-notifications`.
4. Server resolves recipients (active verified residents of target unit with `user_id` non-null), inserts notification + recipients, dispatches in-app + push via existing notification service.
5. Recipients open notification → see message + plate + sender label per mode.

## Errors

- 422 plate invalid format (empty / too long).
- 404 plate not found (search returns `{ found: false }` instead).
- 403 sender not a verified resident in any compound apartment.
- 422 message too long / sender mode invalid.
- 422 anonymous mode without alias when alias required (alias mandatory in anonymous mode? — yes, otherwise label fallback is "Another resident". Make alias optional, default to that).

Update: alias optional. When anonymous + no alias → label `"Another resident"`.

## Migration Plan

1. New migration `2026_05_08_000100_add_plate_normalized_columns_to_apartment_vehicles.php`:
   - Adds the new columns nullable.
   - Backfill: iterate existing rows, run service-equivalent normalization, persist normalized columns. For rows where the normalized output would be empty, leave the new columns null and keep `plate` as-is.
   - Adds index on `plate_normalized`.
2. New migration `2026_05_08_000200_create_vehicle_notification_tables.php`:
   - Creates `vehicle_notifications` and `vehicle_notification_recipients`.
3. Existing rows: new columns are best-effort. Sender search works on `plate_normalized` (when populated) plus the legacy `plate` LIKE fallback.

## Testing

- `PlateNormalizerTest` — table-driven tests for letter and digit mapping, whitespace and diacritic handling, both formats.
- `VehicleServiceTest` extended for new fields.
- `VehicleNotificationServiceTest` covering search hits/misses, send happy path, recipient set computation, anonymous vs identified payloads, transaction rollback on failure.
- `VehicleNotificationControllerTest` covering 200/404/403/422.
- `VehicleLookupControllerTest` extended for normalized search hits.
- Mobile component tests for `VehiclesParkingTab`, `VehicleSheet` plate toggle, notify screens.

## Risks

- Egyptian plate transliteration can be ambiguous (e.g. ع → A or A'). Mitigate by storing both `plate_letters_ar` and the canonical Latin map in `PlateNormalizer::ARABIC_LETTER_MAP`. Search hits both columns so ambiguity does not break lookup.
- Anonymous notifications could be abused. Mitigate by:
  - Keeping the audit row with full sender identity in `vehicle_notifications.sender_user_id` regardless of mode.
  - Rate limiting `POST /v1/vehicle-notifications` per sender to N per hour (use existing rate-limiting middleware).
- Push payloads exposing too much. Mitigate by truncating in push body to message preview only; full message in app.

## Open Items (Resolved)

- Sender identity: sender chooses (`identified` | `anonymous` with optional alias).
- Plate storage: Arabic + Latin variants both, single search box hits both.
- Recipients: all active verified residents of the vehicle's unit.

## Out of Scope (Backlog)

- Two-way replies on notifications.
- Visitor plate normalization in `visitor_requests`.
- Cross-compound search.
- Sender block-lists.
