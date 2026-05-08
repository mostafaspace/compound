# Admin Operations UX and Security Foundations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved admin operations UX/security foundations: easier admin navigation, compound-admin isolation, penalty points, vehicle lookup, mobile poll creation, building notification targeting, and admin security visibility.

**Architecture:** Keep the existing Laravel API, Next.js admin, and React Native mobile patterns. Add small domain services/resources/controllers where new behavior is needed, and improve the admin shell without rewriting every page. Compound scoping stays enforced server-side through `CompoundContextService`; web/mobile UX hides cross-compound concepts for compound admins.

**Tech Stack:** Laravel 13, Sanctum, Spatie Permission, PHPUnit, Next.js App Router, TypeScript, React Native, RTK Query, Node test runner.

---

## File Structure Map

### API

- Modify `apps/api/app/Enums/Permission.php` to add `lookup_vehicles`, `manage_apartment_penalty_points`, `view_admin_security`, and `manage_admin_security`.
- Modify seeders that grant admin permissions, especially `apps/api/database/seeders/UatSeeder.php`, `apps/api/database/seeders/NextPointSeeder.php`, and permission/role seeders discovered during implementation.
- Create `apps/api/database/migrations/2026_05_09_000100_add_penalty_points_to_apartments.php`.
- Create `apps/api/database/migrations/2026_05_09_000200_create_admin_security_tables.php`.
- Create `apps/api/app/Models/Apartments/ApartmentPenaltyEvent.php`.
- Create `apps/api/database/factories/Apartments/ApartmentPenaltyEventFactory.php`.
- Modify `apps/api/app/Models/Apartments/ViolationRule.php` to expose `default_points`.
- Modify `apps/api/app/Http/Resources/Apartments/ViolationRuleResource.php` and `ApartmentViolationResource.php`.
- Create `apps/api/app/Http/Resources/Apartments/ApartmentPenaltyEventResource.php`.
- Create `apps/api/app/Services/Apartments/PenaltyPointService.php`.
- Modify `apps/api/app/Services/Apartments/ViolationRuleService.php` and `ViolationApplicationService.php`.
- Create `apps/api/app/Http/Requests/Admin/Apartments/StorePenaltyPointRequest.php`.
- Create `apps/api/app/Http/Requests/Admin/Apartments/VoidPenaltyPointRequest.php`.
- Modify `apps/api/app/Http/Requests/Admin/Apartments/StoreViolationRuleRequest.php`, `UpdateViolationRuleRequest.php`, and `ApplyViolationRequest.php`.
- Create `apps/api/app/Http/Controllers/Api/V1/Admin/Apartments/PenaltyPointController.php`.
- Create `apps/api/app/Http/Controllers/Api/V1/Admin/VehicleLookupController.php`.
- Create `apps/api/app/Http/Resources/Admin/VehicleLookupResource.php`.
- Create `apps/api/app/Http/Controllers/Api/V1/Announcements/AnnouncementTargetPreviewController.php` or add a focused method to the existing announcement controller if that is the established pattern.
- Create `apps/api/app/Models/Admin/AdminSession.php`.
- Create `apps/api/app/Models/Admin/AdminSecurityFlag.php`.
- Create `apps/api/database/factories/Admin/AdminSessionFactory.php`.
- Create `apps/api/database/factories/Admin/AdminSecurityFlagFactory.php`.
- Create `apps/api/app/Services/AdminSecurity/AdminSessionRecorder.php`.
- Create `apps/api/app/Services/AdminSecurity/AdminSecurityFlagger.php`.
- Create `apps/api/app/Http/Middleware/RecordAdminSession.php`.
- Create `apps/api/app/Http/Controllers/Api/V1/Admin/AdminSecurityController.php`.
- Create `apps/api/app/Http/Resources/Admin/AdminSessionResource.php`.
- Create `apps/api/app/Http/Resources/Admin/AdminSecurityFlagResource.php`.
- Modify `apps/api/routes/api.php`.
- Add tests under `apps/api/tests/Feature/Api/V1/Apartments/Admin`, `apps/api/tests/Feature/Api/V1/Admin`, and existing announcement/poll/security test files.

### Admin Web

- Create `apps/admin/src/lib/admin-navigation.ts`.
- Create `apps/admin/src/lib/admin-navigation.test.mjs`.
- Modify `apps/admin/src/components/site-nav.tsx`.
- Create `apps/admin/src/components/admin-shell.tsx`.
- Create `apps/admin/src/components/admin-sidebar.tsx`.
- Create `apps/admin/src/components/admin-command-bar.tsx`.
- Modify `apps/admin/src/app/layout.tsx`.
- Modify `apps/admin/src/app/page.tsx`.
- Modify `apps/admin/src/app/login/actions.ts`.
- Modify `apps/admin/src/components/compound-context-banner.tsx`.
- Modify `apps/admin/src/lib/dashboard-routes.ts` and `apps/admin/src/lib/dashboard-routes.test.mjs`.
- Modify `apps/admin/src/lib/api.ts`.
- Create `apps/admin/src/app/vehicles/page.tsx`.
- Create `apps/admin/src/app/vehicles/actions.ts`.
- Modify `apps/admin/src/app/units/[unitId]/page.tsx`.
- Modify `apps/admin/src/app/units/[unitId]/violations/page.tsx` and `actions.ts`.
- Modify `apps/admin/src/app/violation-rules/page.tsx` and `apps/admin/src/app/violation-rules/new/page.tsx`.
- Modify `apps/admin/src/app/announcements/page.tsx` and `actions.ts`.
- Create `apps/admin/src/app/security/admin-activity/page.tsx`.
- Create `apps/admin/src/app/security/admin-activity/actions.ts`.
- Modify `apps/admin/src/app/support/users/[userId]/page.tsx` and `actions.ts`.

### Mobile

- Modify `apps/mobile/src/services/polls.ts`.
- Modify `apps/mobile/src/services/admin.ts`.
- Modify `apps/mobile/src/services/property.ts` if announcement target preview or building picker data belongs there.
- Create `apps/mobile/src/features/polls/screens/CreatePollScreen.tsx`.
- Modify `apps/mobile/src/features/polls/screens/PollsScreen.tsx`.
- Modify `apps/mobile/src/features/admin/admin-dashboard-routes.ts` and `.test.mjs`.
- Modify `apps/mobile/src/navigation/types.ts`, `RootNavigator.tsx`, and `linking.ts`.
- Modify `apps/mobile/src/features/announcements/screens/CreateAnnouncementScreen.tsx`.

---

### Task 1: Permission Enum and Seed Baseline

**Files:**
- Modify: `apps/api/app/Enums/Permission.php`
- Modify: `apps/api/database/seeders/UatSeeder.php`
- Modify: `apps/api/database/seeders/NextPointSeeder.php`
- Search/Modify: any permission or role seeder returned by `rg -n "Permission::|permissions" apps/api/database/seeders apps/api/database/migrations`
- Test: `apps/api/tests/Feature/Api/V1/Admin/PermissionBaselineTest.php`

- [ ] **Step 1: Write the failing permission baseline test**

Create `apps/api/tests/Feature/Api/V1/Admin/PermissionBaselineTest.php`:

```php
<?php

namespace Tests\Feature\Api\V1\Admin;

use App\Enums\Permission;
use Tests\TestCase;

class PermissionBaselineTest extends TestCase
{
    public function test_admin_operations_permissions_exist_in_enum(): void
    {
        $this->assertContains('lookup_vehicles', Permission::values());
        $this->assertContains('manage_apartment_penalty_points', Permission::values());
        $this->assertContains('view_admin_security', Permission::values());
        $this->assertContains('manage_admin_security', Permission::values());
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api && php artisan test --filter PermissionBaselineTest`

Expected: FAIL because the enum cases do not exist.

- [ ] **Step 3: Add enum cases**

Modify `apps/api/app/Enums/Permission.php`:

```php
case LookupVehicles = 'lookup_vehicles';
case ManageApartmentPenaltyPoints = 'manage_apartment_penalty_points';
case ViewAdminSecurity = 'view_admin_security';
case ManageAdminSecurity = 'manage_admin_security';
```

Place them near the related security/apartments permissions.

- [ ] **Step 4: Grant permissions in seeders**

In seeders that assign compound admin, support agent, security, and super admin permissions, grant:

```php
Permission::LookupVehicles->value,
Permission::ManageApartmentPenaltyPoints->value,
Permission::ViewAdminSecurity->value,
Permission::ManageAdminSecurity->value,
```

Recommended grants:

- `super_admin`: all new permissions.
- `compound_admin`: all new permissions.
- `support_agent`: `lookup_vehicles`, `view_admin_security`.
- `security_guard`: `lookup_vehicles`.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd apps/api && php artisan test --filter PermissionBaselineTest`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/app/Enums/Permission.php apps/api/database/seeders apps/api/tests/Feature/Api/V1/Admin/PermissionBaselineTest.php
git commit -m "feat(admin): add operations security permissions"
```

---

### Task 2: Compound-Admin Isolation and Admin Navigation Model

**Files:**
- Create: `apps/admin/src/lib/admin-navigation.ts`
- Create: `apps/admin/src/lib/admin-navigation.test.mjs`
- Modify: `apps/admin/src/app/login/actions.ts`
- Modify: `apps/admin/src/components/compound-context-banner.tsx`
- Modify: `apps/admin/src/lib/dashboard-routes.ts`
- Modify: `apps/admin/src/lib/dashboard-routes.test.mjs`

- [ ] **Step 1: Write failing admin navigation tests**

Create `apps/admin/src/lib/admin-navigation.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";

import {
  getAdminSections,
  getCompoundAdminLoginDestination,
  shouldShowCompoundContext,
} from "./admin-navigation.ts";

test("compound admins land on command center instead of compound detail", () => {
  assert.equal(getCompoundAdminLoginDestination(), "/");
});

test("compound admins do not see compound context banners", () => {
  assert.equal(shouldShowCompoundContext({ roles: ["compound_admin"] }), false);
  assert.equal(shouldShowCompoundContext({ roles: ["super_admin"] }), true);
});

test("compound admins get neutral property navigation", () => {
  const sections = getAdminSections({ roles: ["compound_admin"] });
  assert.equal(sections.some((section) => section.label === "Compounds"), false);
  assert.equal(sections.some((section) => section.label === "Apartments"), true);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/admin && node --loader ts-node/esm src/lib/admin-navigation.test.mjs`

Expected: FAIL because `admin-navigation.ts` does not exist.

- [ ] **Step 3: Create navigation helper**

Create `apps/admin/src/lib/admin-navigation.ts`:

```ts
interface RoleLike {
  roles?: string[];
}

interface AdminSection {
  href: string;
  label: string;
  group: "operate" | "community" | "govern" | "secure" | "system";
}

function hasRole(user: RoleLike, role: string): boolean {
  return user.roles?.includes(role) ?? false;
}

export function getCompoundAdminLoginDestination(): string {
  return "/";
}

export function shouldShowCompoundContext(user: RoleLike): boolean {
  return hasRole(user, "super_admin");
}

export function getAdminSections(user: RoleLike): AdminSection[] {
  const isSuperAdmin = hasRole(user, "super_admin");
  const sections: AdminSection[] = [
    { href: "/", label: "Command Center", group: "operate" },
    { href: "/units/assign", label: "Apartments", group: "operate" },
    { href: "/vehicles", label: "Vehicles", group: "operate" },
    { href: "/finance", label: "Finance", group: "operate" },
    { href: "/announcements", label: "Communications", group: "community" },
    { href: "/polls", label: "Polls", group: "govern" },
    { href: "/security", label: "Security", group: "secure" },
    { href: "/security/admin-activity", label: "Admin Activity", group: "secure" },
    { href: "/audit-logs", label: "Audit", group: "secure" },
    { href: "/settings", label: "Settings", group: "system" },
  ];

  if (isSuperAdmin) {
    sections.splice(1, 0, { href: "/compounds", label: "Compounds", group: "operate" });
  }

  return sections;
}
```

- [ ] **Step 4: Route compound admins to command center**

In `apps/admin/src/app/login/actions.ts`, change the compound-admin destination branch to:

```ts
if (hasEffectiveRole(result.user, "compound_admin") && result.user.compoundId) {
  await setCompoundContext(result.user.compoundId);
  destination = getCompoundAdminLoginDestination();
} else {
  await setCompoundContext(null);
}
```

Import `getCompoundAdminLoginDestination`.

- [ ] **Step 5: Hide compound context banner for compound admins**

Change `CompoundContextBanner` call sites so only super admins pass `isSuperAdmin={true}`. Inside `compound-context-banner.tsx`, keep this guard:

```ts
if (!isSuperAdmin) return null;
```

- [ ] **Step 6: Update dashboard route safety**

Add `/vehicles` and `/security/admin-activity` to `SAFE_DASHBOARD_PATHS` in `apps/admin/src/lib/dashboard-routes.ts`. Add assertions in `dashboard-routes.test.mjs`:

```js
assert.equal(resolveDashboardRoute("/vehicles?q=ABC"), "/vehicles?q=ABC");
assert.equal(resolveDashboardRoute("/security/admin-activity"), "/security/admin-activity");
```

- [ ] **Step 7: Run tests**

Run: `cd apps/admin && node --loader ts-node/esm src/lib/admin-navigation.test.mjs && node --loader ts-node/esm src/lib/dashboard-routes.test.mjs`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/admin/src/lib/admin-navigation.ts apps/admin/src/lib/admin-navigation.test.mjs apps/admin/src/app/login/actions.ts apps/admin/src/components/compound-context-banner.tsx apps/admin/src/lib/dashboard-routes.ts apps/admin/src/lib/dashboard-routes.test.mjs
git commit -m "feat(admin): isolate compound admin navigation"
```

---

### Task 3: Admin Shell and Command Center UX

**Files:**
- Create: `apps/admin/src/components/admin-shell.tsx`
- Create: `apps/admin/src/components/admin-sidebar.tsx`
- Create: `apps/admin/src/components/admin-command-bar.tsx`
- Modify: `apps/admin/src/components/site-nav.tsx`
- Modify: `apps/admin/src/app/layout.tsx`
- Modify: `apps/admin/src/app/page.tsx`

- [ ] **Step 1: Add shell components**

Create `apps/admin/src/components/admin-shell.tsx`:

```tsx
import type { ReactNode } from "react";

import type { AuthenticatedUser } from "@compound/contracts";
import { AdminCommandBar } from "./admin-command-bar";
import { AdminSidebar } from "./admin-sidebar";

export function AdminShell({ children, user }: { children: ReactNode; user: AuthenticatedUser }) {
  return (
    <div className="min-h-screen bg-background text-foreground lg:grid lg:grid-cols-[280px_1fr]">
      <AdminSidebar user={user} />
      <div className="min-w-0">
        <AdminCommandBar />
        {children}
      </div>
    </div>
  );
}
```

Create `apps/admin/src/components/admin-sidebar.tsx`:

```tsx
import Link from "next/link";
import type { AuthenticatedUser } from "@compound/contracts";

import { getAdminSections } from "@/lib/admin-navigation";

export function AdminSidebar({ user }: { user: AuthenticatedUser }) {
  const sections = getAdminSections({ roles: user.roles ?? [] });

  return (
    <aside className="hidden border-r border-line bg-panel px-4 py-5 lg:block">
      <Link href="/" className="text-sm font-bold text-brand">Compound</Link>
      <nav className="mt-6 space-y-1">
        {sections.map((item) => (
          <Link key={item.href} href={item.href} className="block rounded-xl px-3 py-2 text-sm font-semibold text-muted hover:bg-background hover:text-foreground">
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
```

Create `apps/admin/src/components/admin-command-bar.tsx`:

```tsx
import Link from "next/link";

import { LogoutButton } from "./logout-button";

export function AdminCommandBar() {
  return (
    <div className="sticky top-0 z-30 border-b border-line bg-panel/95 px-5 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-3">
        <Link href="/vehicles" className="hidden h-10 min-w-0 flex-1 items-center rounded-xl border border-line bg-background px-4 text-sm text-muted md:flex">
          Search people, apartments, vehicle plates, audit events
        </Link>
        <Link href="/vehicles" className="inline-flex h-10 items-center rounded-xl border border-line px-3 text-sm font-semibold md:hidden">
          Search
        </Link>
        <LogoutButton />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Integrate shell without breaking public pages**

In `apps/admin/src/app/layout.tsx`, keep the HTML/body setup unchanged. Do not wrap public login pages here because `getCurrentUser` redirects unauthenticated users. Wrap authenticated pages individually where needed.

In `apps/admin/src/app/page.tsx`, load `user` as it already does and wrap the existing command center content:

```tsx
<AdminShell user={user}>
  <main className="min-h-screen bg-background text-foreground">
    <DashboardContent user={user} dashboard={dashboard} status={status} />
  </main>
</AdminShell>
```

Remove the top-level `<SiteNav />` on the dashboard to avoid duplicate navigation.

- [ ] **Step 3: Keep `SiteNav` available for legacy pages**

Leave `SiteNav` functional for pages not yet migrated. The sidebar is introduced first on the dashboard; later pages can be wrapped incrementally.

- [ ] **Step 4: Run admin checks**

Run: `cd apps/admin && npm run typecheck && npm run lint`

Expected: typecheck passes. Existing lint warnings may remain, but no new errors.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/components/admin-shell.tsx apps/admin/src/components/admin-sidebar.tsx apps/admin/src/components/admin-command-bar.tsx apps/admin/src/app/page.tsx apps/admin/src/components/site-nav.tsx apps/admin/src/app/layout.tsx
git commit -m "feat(admin): add task oriented operations shell"
```

---

### Task 4: Penalty Point Data Model

**Files:**
- Create: `apps/api/database/migrations/2026_05_09_000100_add_penalty_points_to_apartments.php`
- Create: `apps/api/app/Models/Apartments/ApartmentPenaltyEvent.php`
- Create: `apps/api/database/factories/Apartments/ApartmentPenaltyEventFactory.php`
- Modify: `apps/api/app/Models/Apartments/ViolationRule.php`
- Modify: `apps/api/app/Models/Property/Unit.php`
- Test: `apps/api/tests/Feature/Api/V1/Apartments/Admin/PenaltyPointModelTest.php`

- [ ] **Step 1: Write failing model test**

Create `apps/api/tests/Feature/Api/V1/Apartments/Admin/PenaltyPointModelTest.php`:

```php
<?php

namespace Tests\Feature\Api\V1\Apartments\Admin;

use App\Models\Apartments\ApartmentPenaltyEvent;
use App\Models\Apartments\ViolationRule;
use App\Models\Property\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PenaltyPointModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_unit_active_penalty_points_exclude_voided_and_expired_events(): void
    {
        $unit = Unit::factory()->create();
        $admin = User::factory()->create();

        ApartmentPenaltyEvent::factory()->create(['unit_id' => $unit->id, 'applied_by' => $admin->id, 'points' => 3]);
        ApartmentPenaltyEvent::factory()->create(['unit_id' => $unit->id, 'applied_by' => $admin->id, 'points' => 2, 'expires_at' => now()->subDay()]);
        ApartmentPenaltyEvent::factory()->create(['unit_id' => $unit->id, 'applied_by' => $admin->id, 'points' => 9, 'voided_at' => now(), 'voided_by' => $admin->id]);

        $this->assertSame(3, $unit->fresh()->activePenaltyPoints());
    }

    public function test_violation_rule_has_default_points(): void
    {
        $rule = ViolationRule::factory()->create(['default_points' => 4]);

        $this->assertSame(4, $rule->fresh()->default_points);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api && php artisan test --filter PenaltyPointModelTest`

Expected: FAIL because the model/table/method do not exist.

- [ ] **Step 3: Add migration**

Create migration:

```php
Schema::table('violation_rules', function (Blueprint $table): void {
    $table->unsignedInteger('default_points')->default(0)->after('default_fee');
});

Schema::create('apartment_penalty_events', function (Blueprint $table): void {
    $table->id();
    $table->foreignUlid('unit_id')->constrained('units')->cascadeOnDelete();
    $table->foreignId('violation_rule_id')->nullable()->constrained('violation_rules')->nullOnDelete();
    $table->integer('points');
    $table->string('reason');
    $table->text('notes')->nullable();
    $table->foreignId('applied_by')->constrained('users')->restrictOnDelete();
    $table->timestamp('expires_at')->nullable()->index();
    $table->timestamp('voided_at')->nullable()->index();
    $table->foreignId('voided_by')->nullable()->constrained('users')->nullOnDelete();
    $table->text('void_reason')->nullable();
    $table->timestamps();

    $table->index(['unit_id', 'voided_at', 'expires_at']);
    $table->index(['violation_rule_id', 'created_at']);
});
```

- [ ] **Step 4: Add model and factory**

Create `ApartmentPenaltyEvent` with fillable fields and casts:

```php
protected $fillable = [
    'unit_id', 'violation_rule_id', 'points', 'reason', 'notes', 'applied_by',
    'expires_at', 'voided_at', 'voided_by', 'void_reason',
];

protected function casts(): array
{
    return [
        'points' => 'integer',
        'expires_at' => 'datetime',
        'voided_at' => 'datetime',
    ];
}
```

Add relationships to `Unit`, `ViolationRule`, and `User`.

- [ ] **Step 5: Add Unit relationship and total method**

In `apps/api/app/Models/Property/Unit.php`:

```php
public function apartmentPenaltyEvents(): HasMany
{
    return $this->hasMany(ApartmentPenaltyEvent::class);
}

public function activePenaltyPoints(): int
{
    return (int) $this->apartmentPenaltyEvents()
        ->whereNull('voided_at')
        ->where(fn ($query) => $query->whereNull('expires_at')->orWhere('expires_at', '>', now()))
        ->sum('points');
}
```

- [ ] **Step 6: Add ViolationRule fillable/cast/resource field**

Add `default_points` to the model fillable/casts and factory defaults.

- [ ] **Step 7: Run test**

Run: `cd apps/api && php artisan test --filter PenaltyPointModelTest`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/api/database/migrations/2026_05_09_000100_add_penalty_points_to_apartments.php apps/api/app/Models/Apartments/ApartmentPenaltyEvent.php apps/api/database/factories/Apartments/ApartmentPenaltyEventFactory.php apps/api/app/Models/Apartments/ViolationRule.php apps/api/app/Models/Property/Unit.php apps/api/tests/Feature/Api/V1/Apartments/Admin/PenaltyPointModelTest.php
git commit -m "feat(apartments): add penalty point model"
```

---

### Task 5: Penalty Point API and Violation Integration

**Files:**
- Create: `apps/api/app/Services/Apartments/PenaltyPointService.php`
- Create: `apps/api/app/Http/Resources/Apartments/ApartmentPenaltyEventResource.php`
- Create: `apps/api/app/Http/Requests/Admin/Apartments/StorePenaltyPointRequest.php`
- Create: `apps/api/app/Http/Requests/Admin/Apartments/VoidPenaltyPointRequest.php`
- Create: `apps/api/app/Http/Controllers/Api/V1/Admin/Apartments/PenaltyPointController.php`
- Modify: `apps/api/app/Http/Requests/Admin/Apartments/ApplyViolationRequest.php`
- Modify: `apps/api/app/Services/Apartments/ViolationApplicationService.php`
- Modify: `apps/api/routes/api.php`
- Test: `apps/api/tests/Feature/Api/V1/Apartments/Admin/PenaltyPointControllerTest.php`
- Test: `apps/api/tests/Feature/Api/V1/Apartments/Admin/ViolationApplicationControllerTest.php`

- [ ] **Step 1: Write failing controller tests**

Create `PenaltyPointControllerTest.php` with:

```php
public function test_admin_can_add_and_void_penalty_points(): void
{
    $unit = Unit::factory()->create();
    $admin = $this->penaltyAdmin();
    Sanctum::actingAs($admin);

    $eventId = $this->postJson("/api/v1/admin/apartments/{$unit->id}/penalty-points", [
        'points' => 5,
        'reason' => 'Repeated parking misuse',
        'notes' => 'Second warning this month.',
    ])
        ->assertCreated()
        ->assertJsonPath('data.points', 5)
        ->json('data.id');

    $this->assertDatabaseHas('audit_logs', [
        'actor_id' => $admin->id,
        'action' => 'apartments.penalty_points_added',
    ]);

    $this->patchJson("/api/v1/admin/apartment-penalty-points/{$eventId}/void", [
        'reason' => 'Applied to wrong apartment.',
    ])
        ->assertOk()
        ->assertJsonPath('data.voidReason', 'Applied to wrong apartment.');
}
```

Add helper:

```php
private function penaltyAdmin(): User
{
    $user = User::factory()->create();
    $user->givePermissionTo(SpatiePermission::findOrCreate(Permission::ManageApartmentPenaltyPoints->value, 'sanctum'));
    return $user;
}
```

- [ ] **Step 2: Add violation integration test**

Append to `ViolationApplicationControllerTest`:

```php
public function test_admin_can_apply_violation_with_default_points(): void
{
    $compound = Compound::factory()->create();
    $unit = Unit::factory()->create(['compound_id' => $compound->id]);
    $rule = ViolationRule::factory()->create([
        'compound_id' => $compound->id,
        'default_fee' => 100,
        'default_points' => 3,
    ]);

    Sanctum::actingAs($this->violationAdmin());

    $this->postJson("/api/v1/admin/apartments/{$unit->id}/violations", [
        'violation_rule_id' => $rule->id,
        'points' => 3,
    ])->assertCreated();

    $this->assertDatabaseHas('apartment_penalty_events', [
        'unit_id' => $unit->id,
        'violation_rule_id' => $rule->id,
        'points' => 3,
    ]);
}
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd apps/api && php artisan test --filter PenaltyPointControllerTest && php artisan test --filter ViolationApplicationControllerTest`

Expected: FAIL because endpoints and service are missing.

- [ ] **Step 4: Implement service**

Create service methods:

```php
public function add(Unit $unit, User $actor, array $data): ApartmentPenaltyEvent
{
    return DB::transaction(function () use ($unit, $actor, $data): ApartmentPenaltyEvent {
        $event = ApartmentPenaltyEvent::create([
            'unit_id' => $unit->id,
            'violation_rule_id' => $data['violation_rule_id'] ?? null,
            'points' => $data['points'],
            'reason' => $data['reason'],
            'notes' => $data['notes'] ?? null,
            'expires_at' => $data['expires_at'] ?? null,
            'applied_by' => $actor->id,
        ]);

        $this->auditLogger->record('apartments.penalty_points_added', actor: $actor, auditableType: Unit::class, auditableId: $unit->id, metadata: [
            'unit_id' => $unit->id,
            'points' => $event->points,
            'compound_id' => $unit->compound_id,
        ]);

        return $event;
    });
}
```

Add `void(ApartmentPenaltyEvent $event, User $actor, string $reason)`.

- [ ] **Step 5: Implement controller, requests, resource, routes**

Routes:

```php
Route::get('/admin/apartments/{unit}/penalty-points', [PenaltyPointController::class, 'index']);
Route::post('/admin/apartments/{unit}/penalty-points', [PenaltyPointController::class, 'store']);
Route::patch('/admin/apartment-penalty-points/{event}/void', [PenaltyPointController::class, 'void']);
```

Gate with `Permission::ManageApartmentPenaltyPoints`.

- [ ] **Step 6: Integrate violation application**

In `ApplyViolationRequest`, add:

```php
'points' => ['nullable', 'integer', 'min:0', 'max:100'],
```

In `ViolationApplicationService`, after creating the violation, call `PenaltyPointService` when requested points are greater than zero.

- [ ] **Step 7: Run tests**

Run: `cd apps/api && php artisan test --filter PenaltyPointControllerTest && php artisan test --filter ViolationApplicationControllerTest`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/api/app/Services/Apartments/PenaltyPointService.php apps/api/app/Http/Resources/Apartments/ApartmentPenaltyEventResource.php apps/api/app/Http/Requests/Admin/Apartments/StorePenaltyPointRequest.php apps/api/app/Http/Requests/Admin/Apartments/VoidPenaltyPointRequest.php apps/api/app/Http/Controllers/Api/V1/Admin/Apartments/PenaltyPointController.php apps/api/app/Http/Requests/Admin/Apartments/ApplyViolationRequest.php apps/api/app/Services/Apartments/ViolationApplicationService.php apps/api/routes/api.php apps/api/tests/Feature/Api/V1/Apartments/Admin/PenaltyPointControllerTest.php apps/api/tests/Feature/Api/V1/Apartments/Admin/ViolationApplicationControllerTest.php
git commit -m "feat(apartments): expose penalty point management"
```

---

### Task 6: Admin Penalty Points UI

**Files:**
- Modify: `apps/admin/src/lib/api.ts`
- Modify: `apps/admin/src/app/units/[unitId]/page.tsx`
- Modify: `apps/admin/src/app/units/[unitId]/violations/page.tsx`
- Modify: `apps/admin/src/app/units/[unitId]/violations/actions.ts`
- Modify: `apps/admin/src/app/violation-rules/page.tsx`
- Modify: `apps/admin/src/app/violation-rules/new/page.tsx`

- [ ] **Step 1: Add API client functions**

In `apps/admin/src/lib/api.ts`, add:

```ts
export type ApartmentPenaltyEvent = {
  id: number;
  unitId: string;
  violationRuleId: number | null;
  points: number;
  reason: string;
  notes: string | null;
  expiresAt: string | null;
  voidedAt: string | null;
  voidReason: string | null;
  createdAt: string | null;
};

export async function listPenaltyPoints(unitId: string): Promise<ApartmentPenaltyEvent[]> {
  const response = await fetch(`${config.apiBaseUrl}/admin/apartments/${unitId}/penalty-points`, {
    cache: "no-store",
    headers: await apiHeaders(true),
  });
  if (!response.ok) return [];
  const payload = (await response.json()) as PaginatedEnvelope<ApartmentPenaltyEvent>;
  return payload.data;
}
```

Add `addPenaltyPoints` and `voidPenaltyPoint`.

- [ ] **Step 2: Add violation form fields**

In unit violations page form:

```tsx
<label className="text-sm font-medium">
  Penalty points
  <input className="mt-2 h-11 w-full rounded-lg border border-line bg-background px-3" min="0" name="points" step="1" type="number" />
</label>
```

In `applyViolationAction`, send `points`.

- [ ] **Step 3: Show points on apartment command view**

In `apps/admin/src/app/units/[unitId]/page.tsx`, fetch `listPenaltyPoints(unitId)` and render active total:

```tsx
const activePenaltyPoints = penaltyEvents
  .filter((event) => !event.voidedAt && (!event.expiresAt || new Date(event.expiresAt) > new Date()))
  .reduce((sum, event) => sum + event.points, 0);
```

Add a card titled `Penalty points` next to finance/violations.

- [ ] **Step 4: Expose default points on violation rules**

Add `default_points` field to new/edit rule forms and display it in the rule table.

- [ ] **Step 5: Run admin checks**

Run: `cd apps/admin && npm run typecheck && npm run lint`

Expected: typecheck passes. No new lint errors.

- [ ] **Step 6: Commit**

```bash
git add apps/admin/src/lib/api.ts 'apps/admin/src/app/units/[unitId]/page.tsx' 'apps/admin/src/app/units/[unitId]/violations/page.tsx' 'apps/admin/src/app/units/[unitId]/violations/actions.ts' apps/admin/src/app/violation-rules/page.tsx apps/admin/src/app/violation-rules/new/page.tsx
git commit -m "feat(admin): show and apply apartment penalty points"
```

---

### Task 7: Vehicle Plate Lookup API

**Files:**
- Create: `apps/api/app/Http/Controllers/Api/V1/Admin/VehicleLookupController.php`
- Create: `apps/api/app/Http/Resources/Admin/VehicleLookupResource.php`
- Modify: `apps/api/routes/api.php`
- Test: `apps/api/tests/Feature/Api/V1/Admin/VehicleLookupTest.php`

- [ ] **Step 1: Write failing tests**

Create `VehicleLookupTest.php`:

```php
public function test_admin_can_search_apartment_vehicle_by_plate(): void
{
    $compound = Compound::factory()->create();
    $unit = Unit::factory()->create(['compound_id' => $compound->id]);
    $resident = ApartmentResident::factory()->create(['unit_id' => $unit->id, 'resident_name' => 'Mona Nabil']);
    ApartmentVehicle::factory()->create([
        'unit_id' => $unit->id,
        'apartment_resident_id' => $resident->id,
        'plate' => 'ABC-1234',
    ]);
    $admin = $this->lookupAdmin($compound);
    Sanctum::actingAs($admin);

    $this->getJson('/api/v1/admin/vehicle-lookup?q=ABC')
        ->assertOk()
        ->assertJsonPath('data.0.plate', 'ABC-1234')
        ->assertJsonPath('data.0.unit.id', $unit->id)
        ->assertJsonPath('data.0.residents.0.name', 'Mona Nabil');
}
```

Add a second test proving compound admins cannot see another compound's plate.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api && php artisan test --filter VehicleLookupTest`

Expected: FAIL because the endpoint does not exist.

- [ ] **Step 3: Implement controller**

Search `ApartmentVehicle` by plate/sticker:

```php
$vehicles = ApartmentVehicle::query()
    ->with(['unit.building', 'unit.apartmentResidents.user'])
    ->where(fn ($query) => $query
        ->where('plate', 'like', "%{$term}%")
        ->orWhere('sticker_code', 'like', "%{$term}%"))
    ->whereHas('unit', fn ($query) => $this->compoundContext->scopePropertyQuery($query, $request->user()))
    ->limit(25)
    ->get();
```

If visitor request lookup is added in this task, return those as `source: "visitor_request"`; otherwise reserve the field and include visitor lookup in the same commit only if tests cover it.

- [ ] **Step 4: Implement resource**

Return:

```php
[
    'source' => 'apartment_vehicle',
    'vehicleId' => $this->id,
    'plate' => $this->plate,
    'stickerCode' => $this->sticker_code,
    'make' => $this->make,
    'model' => $this->model,
    'color' => $this->color,
    'unit' => [
        'id' => $this->unit?->id,
        'unitNumber' => $this->unit?->unit_number,
        'buildingName' => $this->unit?->building?->name,
    ],
    'residents' => $this->unit?->apartmentResidents
        ?->map(fn (ApartmentResident $resident): array => [
            'id' => $resident->user_id,
            'name' => $resident->resident_name ?? $resident->user?->name ?? 'Resident',
            'phone' => $resident->phone_public ? $resident->resident_phone : null,
            'email' => $resident->email_public ? $resident->resident_email : null,
        ])
        ->values()
        ->all() ?? [],
]
```

- [ ] **Step 5: Register route and permission gate**

Route:

```php
Route::get('/admin/vehicle-lookup', VehicleLookupController::class)
    ->middleware('role:lookup_vehicles')
    ->name('admin.vehicle-lookup');
```

- [ ] **Step 6: Run tests**

Run: `cd apps/api && php artisan test --filter VehicleLookupTest`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/api/app/Http/Controllers/Api/V1/Admin/VehicleLookupController.php apps/api/app/Http/Resources/Admin/VehicleLookupResource.php apps/api/routes/api.php apps/api/tests/Feature/Api/V1/Admin/VehicleLookupTest.php
git commit -m "feat(admin): add vehicle plate lookup api"
```

---

### Task 8: Vehicle Lookup Web UX and Command Bar Link

**Files:**
- Modify: `apps/admin/src/lib/api.ts`
- Create: `apps/admin/src/app/vehicles/page.tsx`
- Create: `apps/admin/src/app/vehicles/actions.ts`
- Modify: `apps/admin/src/components/admin-command-bar.tsx`

- [ ] **Step 1: Add admin API client**

In `apps/admin/src/lib/api.ts`:

```ts
export type VehicleLookupResult = {
  source: "apartment_vehicle" | "visitor_request";
  vehicleId: number | string;
  plate: string;
  stickerCode: string | null;
  make: string | null;
  model: string | null;
  color: string | null;
  unit: { id: string | null; unitNumber: string | null; buildingName: string | null };
  residents: Array<{ id: number | null; name: string; phone: string | null; email: string | null }>;
};

export async function lookupVehicles(q: string): Promise<VehicleLookupResult[]> {
  if (q.trim().length < 2) return [];
  const response = await fetch(`${config.apiBaseUrl}/admin/vehicle-lookup?q=${encodeURIComponent(q.trim())}`, {
    cache: "no-store",
    headers: await apiHeaders(true),
  });
  if (!response.ok) return [];
  const payload = (await response.json()) as { data: VehicleLookupResult[] };
  return payload.data;
}
```

- [ ] **Step 2: Create vehicles page**

Create `apps/admin/src/app/vehicles/page.tsx` with a search form reading `searchParams.q`, calling `lookupVehicles`, and rendering result cards. Each result with a unit id links to `/units/{unit.id}`.

- [ ] **Step 3: Wire command bar search**

Make command bar input a GET form:

```tsx
<form action="/vehicles" className="hidden min-w-0 flex-1 md:block">
  <input name="q" className="h-10 w-full rounded-xl border border-line bg-background px-4 text-sm" placeholder="Search vehicle plate, sticker, resident, apartment" />
</form>
```

- [ ] **Step 4: Run admin checks**

Run: `cd apps/admin && npm run typecheck && npm run lint`

Expected: typecheck passes. No new lint errors.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/lib/api.ts apps/admin/src/app/vehicles/page.tsx apps/admin/src/app/vehicles/actions.ts apps/admin/src/components/admin-command-bar.tsx
git commit -m "feat(admin): add vehicle plate lookup page"
```

---

### Task 9: Building Notification Target Preview API and Web UX

**Files:**
- Create or Modify: `apps/api/app/Http/Controllers/Api/V1/Announcements/AnnouncementTargetPreviewController.php`
- Modify: `apps/api/routes/api.php`
- Test: `apps/api/tests/Feature/Api/V1/AnnouncementsTest.php`
- Modify: `apps/admin/src/lib/api.ts`
- Modify: `apps/admin/src/app/announcements/page.tsx`
- Modify: `apps/admin/src/app/announcements/actions.ts`

- [ ] **Step 1: Add failing API test**

Append to `AnnouncementsTest`:

```php
public function test_admin_can_preview_building_announcement_recipient_count(): void
{
    [$admin, , , $building] = $this->buildingScenario();
    Sanctum::actingAs($admin);

    $this->postJson('/api/v1/announcements/target-preview', [
        'targetType' => AnnouncementTargetType::Building->value,
        'targetIds' => [$building->id],
        'requiresVerifiedMembership' => true,
    ])
        ->assertOk()
        ->assertJsonPath('data.recipientCount', 1);
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api && php artisan test --filter AnnouncementsTest`

Expected: FAIL for missing route.

- [ ] **Step 3: Implement target preview endpoint**

Use the same target resolution logic used by announcement publish. Return:

```php
return response()->json([
    'data' => [
        'recipientCount' => $recipients->count(),
    ],
]);
```

- [ ] **Step 4: Run API tests**

Run: `cd apps/api && php artisan test --filter AnnouncementsTest`

Expected: PASS.

- [ ] **Step 5: Add web preview client and UI**

In `apps/admin/src/lib/api.ts`, add `previewAnnouncementTarget(input)`.

In announcement form UI:

- make `targetType` visible;
- show building picker for `building`;
- show preview text: `Estimated recipients: {recipientCount}`.

- [ ] **Step 6: Run admin checks**

Run: `cd apps/admin && npm run typecheck && npm run lint`

Expected: typecheck passes. No new lint errors.

- [ ] **Step 7: Commit**

```bash
git add apps/api/app/Http/Controllers/Api/V1/Announcements/AnnouncementTargetPreviewController.php apps/api/routes/api.php apps/api/tests/Feature/Api/V1/AnnouncementsTest.php apps/admin/src/lib/api.ts apps/admin/src/app/announcements/page.tsx apps/admin/src/app/announcements/actions.ts
git commit -m "feat(announcements): preview building notification reach"
```

---

### Task 10: Mobile Poll Creation API Slice

**Files:**
- Modify: `apps/mobile/src/services/polls.ts`
- Test: add or modify mobile service tests if a service test pattern exists after `rg -n "injectEndpoints|pollsApi" apps/mobile/src/**/*.test.*`

- [ ] **Step 1: Add create input type**

In `apps/mobile/src/services/polls.ts`:

```ts
export type CreatePollInput = {
  title: string;
  description?: string | null;
  pollTypeId?: string | null;
  scope: "compound" | "building";
  buildingId?: string | null;
  eligibility: "all_verified" | "owners" | "tenants";
  allowMultiple: boolean;
  maxChoices?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  options: Array<{ label: string; sortOrder: number }>;
};
```

- [ ] **Step 2: Add mutations**

Add:

```ts
createPoll: builder.mutation<Poll, CreatePollInput>({
  query: (body) => ({
    url: "/polls",
    method: "POST",
    body,
  }),
  transformResponse: (response: ApiEnvelope<Poll>) => response.data,
  invalidatesTags: ["Poll"],
}),
```

Export `useCreatePollMutation`.

- [ ] **Step 3: Run mobile typecheck**

Run: `cd apps/mobile && npm run typecheck`

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/services/polls.ts
git commit -m "feat(mobile): add poll creation api mutation"
```

---

### Task 11: Mobile Create Poll Screen and Navigation

**Files:**
- Create: `apps/mobile/src/features/polls/screens/CreatePollScreen.tsx`
- Modify: `apps/mobile/src/features/polls/screens/PollsScreen.tsx`
- Modify: `apps/mobile/src/features/admin/admin-dashboard-routes.ts`
- Modify: `apps/mobile/src/features/admin/admin-dashboard-routes.test.mjs`
- Modify: `apps/mobile/src/navigation/types.ts`
- Modify: `apps/mobile/src/navigation/RootNavigator.tsx`
- Modify: `apps/mobile/src/navigation/linking.ts`

- [ ] **Step 1: Update route helper tests**

In `admin-dashboard-routes.test.mjs`, assert a create-poll route:

```js
test("create poll shortcut routes to the root create poll screen", () => {
  assert.deepEqual(getAdminDashboardNavigationTarget("CreatePoll"), {
    screen: "CreatePoll",
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/mobile && node --loader ts-node/esm src/features/admin/admin-dashboard-routes.test.mjs`

Expected: FAIL because route type does not include `CreatePoll`.

- [ ] **Step 3: Add route type and helper**

Add `CreatePoll` to `AdminDashboardActionRoute`, quick actions, and navigation target.

- [ ] **Step 4: Add screen**

Create `CreatePollScreen.tsx` with:

- local state for title/description/scope/options;
- validation requiring title and at least two non-empty options;
- `useCreatePollMutation`;
- optional publish-now by calling existing `usePublishPollMutation`.

Submit handler shape:

```ts
const created = await createPoll({
  title: title.trim(),
  description: description.trim() || null,
  scope,
  buildingId: scope === "building" ? buildingId : null,
  eligibility,
  allowMultiple,
  maxChoices: allowMultiple ? Number(maxChoices) || null : null,
  options: optionLabels.filter(Boolean).map((label, index) => ({ label, sortOrder: index })),
}).unwrap();
```

- [ ] **Step 5: Register navigation**

Add `CreatePoll: undefined` to `RootStackParamList`, add stack screen in `RootNavigator`, and add linking path `admin/polls/new`.

- [ ] **Step 6: Add create action to Polls screen for admins**

Use current user role/permission helpers. Render a button only for admin users with governance management permission or effective admin role:

```tsx
navigation.navigate("CreatePoll");
```

- [ ] **Step 7: Run tests and typecheck**

Run: `cd apps/mobile && node --loader ts-node/esm src/features/admin/admin-dashboard-routes.test.mjs && npm run typecheck`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/mobile/src/features/polls/screens/CreatePollScreen.tsx apps/mobile/src/features/polls/screens/PollsScreen.tsx apps/mobile/src/features/admin/admin-dashboard-routes.ts apps/mobile/src/features/admin/admin-dashboard-routes.test.mjs apps/mobile/src/navigation/types.ts apps/mobile/src/navigation/RootNavigator.tsx apps/mobile/src/navigation/linking.ts
git commit -m "feat(mobile): add admin poll creation flow"
```

---

### Task 12: Mobile Building Announcement Targeting

**Files:**
- Modify: `apps/mobile/src/features/announcements/screens/CreateAnnouncementScreen.tsx`
- Modify: `apps/mobile/src/services/property.ts`
- Modify: `apps/mobile/src/services/admin.ts`

- [ ] **Step 1: Add building selector data**

Use existing `useGetBuildingsQuery(compoundId)` if compound id is available. If not available in mobile auth state, use the current admin compound id from the authenticated user.

- [ ] **Step 2: Send full announcement payload**

Update `CreateAnnouncementScreen` submission body from simplified fields to API field names:

```ts
await createAnnouncement({
  titleEn: title,
  titleAr: title,
  bodyEn: content,
  bodyAr: content,
  category,
  priority,
  targetType,
  targetIds: targetType === "building" && selectedBuildingId ? [selectedBuildingId] : [],
  requiresAcknowledgement: mustAcknowledge,
}).unwrap();
```

- [ ] **Step 3: Add clear target UI**

Add segmented controls:

- Everyone
- Building

When Building is selected, require a selected building before submit.

- [ ] **Step 4: Run mobile typecheck**

Run: `cd apps/mobile && npm run typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/announcements/screens/CreateAnnouncementScreen.tsx apps/mobile/src/services/property.ts apps/mobile/src/services/admin.ts
git commit -m "feat(mobile): support building targeted announcements"
```

---

### Task 13: Admin Security Data Model and Session Recording

**Files:**
- Create: `apps/api/database/migrations/2026_05_09_000200_create_admin_security_tables.php`
- Create: `apps/api/app/Models/Admin/AdminSession.php`
- Create: `apps/api/app/Models/Admin/AdminSecurityFlag.php`
- Create: `apps/api/database/factories/Admin/AdminSessionFactory.php`
- Create: `apps/api/database/factories/Admin/AdminSecurityFlagFactory.php`
- Create: `apps/api/app/Services/AdminSecurity/AdminSessionRecorder.php`
- Create: `apps/api/app/Services/AdminSecurity/AdminSecurityFlagger.php`
- Create: `apps/api/app/Http/Middleware/RecordAdminSession.php`
- Modify: `apps/api/bootstrap/app.php` or the route middleware registration location used by this app.
- Test: `apps/api/tests/Feature/Api/V1/Admin/AdminSecuritySessionTest.php`

- [ ] **Step 1: Write failing session tests**

Create test:

```php
public function test_admin_request_records_session_and_new_ip_flag(): void
{
    $admin = User::factory()->create(['role' => UserRole::CompoundAdmin->value]);
    $admin->givePermissionTo(SpatiePermission::findOrCreate(Permission::ViewAdminSecurity->value, 'sanctum'));

    Sanctum::actingAs($admin);

    $this->withServerVariables(['REMOTE_ADDR' => '10.0.0.9'])
        ->withHeader('User-Agent', 'Codex Browser')
        ->getJson('/api/v1/dashboard')
        ->assertOk();

    $this->assertDatabaseHas('admin_sessions', [
        'user_id' => $admin->id,
        'ip_address' => '10.0.0.9',
    ]);
    $this->assertDatabaseHas('admin_security_flags', [
        'user_id' => $admin->id,
        'type' => 'new_ip',
        'status' => 'open',
    ]);
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api && php artisan test --filter AdminSecuritySessionTest`

Expected: FAIL because tables/middleware do not exist.

- [ ] **Step 3: Add migration and models**

Create `admin_sessions` and `admin_security_flags` exactly as specified in the design. Use indexes:

```php
$table->index(['user_id', 'last_seen_at']);
$table->index(['ip_address', 'last_seen_at']);
$table->index(['user_id', 'status']);
$table->index(['type', 'severity', 'status']);
```

- [ ] **Step 4: Implement recorder and flagger**

Recorder should update or create a session by `user_id + ip_address + user_agent` and update `last_seen_at`.

Flagger should create:

- `new_ip` if no prior session for this admin had the IP.
- `new_device` if no prior session for this admin had the same user agent hash.
- `too_many_ips` if more than 3 distinct IPs in the last 24 hours.

- [ ] **Step 5: Register middleware for authenticated API routes**

Apply middleware inside the authenticated API group so resident routes are not harmed. The recorder should no-op unless the user has an admin/staff role.

- [ ] **Step 6: Run tests**

Run: `cd apps/api && php artisan test --filter AdminSecuritySessionTest`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/api/database/migrations/2026_05_09_000200_create_admin_security_tables.php apps/api/app/Models/Admin apps/api/database/factories/Admin apps/api/app/Services/AdminSecurity apps/api/app/Http/Middleware/RecordAdminSession.php apps/api/bootstrap/app.php apps/api/tests/Feature/Api/V1/Admin/AdminSecuritySessionTest.php
git commit -m "feat(admin): record admin sessions and security flags"
```

---

### Task 14: Admin Security API

**Files:**
- Create: `apps/api/app/Http/Controllers/Api/V1/Admin/AdminSecurityController.php`
- Create: `apps/api/app/Http/Resources/Admin/AdminSessionResource.php`
- Create: `apps/api/app/Http/Resources/Admin/AdminSecurityFlagResource.php`
- Modify: `apps/api/routes/api.php`
- Test: `apps/api/tests/Feature/Api/V1/Admin/AdminSecurityControllerTest.php`

- [ ] **Step 1: Write failing API tests**

Create tests for:

- listing open flags;
- listing sessions for one admin;
- dismissing a flag;
- compound admin cannot access another compound's admin activity.

Example:

```php
public function test_admin_can_list_open_security_flags(): void
{
    $admin = $this->securityAdmin();
    AdminSecurityFlag::factory()->create(['user_id' => $admin->id, 'type' => 'new_ip', 'status' => 'open']);
    Sanctum::actingAs($admin);

    $this->getJson('/api/v1/admin/security/flags')
        ->assertOk()
        ->assertJsonPath('data.0.type', 'new_ip');
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api && php artisan test --filter AdminSecurityControllerTest`

Expected: FAIL because routes/controllers do not exist.

- [ ] **Step 3: Implement controller**

Endpoints:

```php
GET /admin/security/flags
PATCH /admin/security/flags/{flag}/review
GET /admin/security/users/{user}/sessions
GET /admin/security/users/{user}/timeline
```

Use `view_admin_security` for reads and `manage_admin_security` for review/dismiss.

- [ ] **Step 4: Implement resources**

Return user, IP, user agent/device label, timestamps, flag status/severity, and metadata.

- [ ] **Step 5: Run tests**

Run: `cd apps/api && php artisan test --filter AdminSecurityControllerTest`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/app/Http/Controllers/Api/V1/Admin/AdminSecurityController.php apps/api/app/Http/Resources/Admin/AdminSessionResource.php apps/api/app/Http/Resources/Admin/AdminSecurityFlagResource.php apps/api/routes/api.php apps/api/tests/Feature/Api/V1/Admin/AdminSecurityControllerTest.php
git commit -m "feat(admin): expose admin security investigation api"
```

---

### Task 15: Admin Security Web Center

**Files:**
- Modify: `apps/admin/src/lib/api.ts`
- Create: `apps/admin/src/app/security/admin-activity/page.tsx`
- Create: `apps/admin/src/app/security/admin-activity/actions.ts`
- Modify: `apps/admin/src/app/security/page.tsx`
- Modify: `apps/admin/src/app/support/users/[userId]/page.tsx`
- Modify: `apps/admin/src/app/support/users/actions.ts`

- [ ] **Step 1: Add API client**

Add types/functions:

```ts
export type AdminSecurityFlag = {
  id: number;
  type: string;
  severity: "info" | "warning" | "critical";
  status: "open" | "reviewed" | "dismissed";
  summary: string;
  user?: { id: number; name: string; email: string };
  createdAt: string | null;
};

export type AdminSession = {
  id: number;
  ipAddress: string;
  userAgent: string;
  deviceLabel: string | null;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  revokedAt: string | null;
};

export async function getAdminSecurityFlags(): Promise<AdminSecurityFlag[]> {
  const response = await fetch(`${config.apiBaseUrl}/admin/security/flags`, {
    cache: "no-store",
    headers: await apiHeaders(true),
  });
  if (!response.ok) return [];
  const payload = (await response.json()) as PaginatedEnvelope<AdminSecurityFlag>;
  return payload.data;
}

export async function reviewAdminSecurityFlag(flagId: number, status: "reviewed" | "dismissed"): Promise<void> {
  const response = await fetch(`${config.apiBaseUrl}/admin/security/flags/${flagId}/review`, {
    body: JSON.stringify({ status }),
    headers: {
      ...(await apiHeaders(true)),
      "Content-Type": "application/json",
    },
    method: "PATCH",
  });
  if (!response.ok) {
    throw new Error(`Failed to review admin security flag: ${response.status}`);
  }
}

export async function getAdminSessions(userId: number): Promise<AdminSession[]> {
  const response = await fetch(`${config.apiBaseUrl}/admin/security/users/${userId}/sessions`, {
    cache: "no-store",
    headers: await apiHeaders(true),
  });
  if (!response.ok) return [];
  const payload = (await response.json()) as PaginatedEnvelope<AdminSession>;
  return payload.data;
}
```

- [ ] **Step 2: Create admin activity page**

Render:

- open flags first;
- severity badges;
- actor/admin user;
- IP/device summary;
- review/dismiss forms.

- [ ] **Step 3: Link from security landing**

Add card to `apps/admin/src/app/security/page.tsx` linking to `/security/admin-activity`.

- [ ] **Step 4: Add support user security panel**

On support user detail page, show:

- recent sessions;
- recent flags;
- "Suspend admin" copy if the user has an admin role;
- existing suspend action with required reason.

- [ ] **Step 5: Run admin checks**

Run: `cd apps/admin && npm run typecheck && npm run lint`

Expected: typecheck passes. No new lint errors.

- [ ] **Step 6: Commit**

```bash
git add apps/admin/src/lib/api.ts apps/admin/src/app/security/admin-activity/page.tsx apps/admin/src/app/security/admin-activity/actions.ts apps/admin/src/app/security/page.tsx 'apps/admin/src/app/support/users/[userId]/page.tsx' apps/admin/src/app/support/users/actions.ts
git commit -m "feat(admin): add admin security activity center"
```

---

### Task 16: Apartment Command View and Command Center Polish

**Files:**
- Modify: `apps/admin/src/app/page.tsx`
- Modify: `apps/admin/src/app/units/[unitId]/page.tsx`
- Modify: `apps/admin/src/lib/api.ts`

- [ ] **Step 1: Add command center cards**

Use existing API calls where available; do not add new endpoints unless the page cannot load with existing calls. Add cards for:

- document reviews: `/document-reviews`;
- payment submissions: `/finance`;
- vehicle lookup: `/vehicles`;
- admin activity: `/security/admin-activity`;
- polls: `/polls`;
- violation rules: `/violation-rules`.

- [ ] **Step 2: Improve unit apartment action rail**

Add top action rail:

```tsx
<div className="flex flex-wrap gap-3">
  <Link href={`/units/${unit.id}/violations`}>Apply violation</Link>
  <Link href={`/vehicles?q=${encodeURIComponent(apartment.vehicles[0]?.plate ?? "")}`}>Vehicle lookup</Link>
  <Link href={`/audit-logs?auditableType=${encodeURIComponent("App\\\\Models\\\\Property\\\\Unit")}&auditableId=${unit.id}`}>Audit timeline</Link>
</div>
```

- [ ] **Step 3: Keep compound-admin language neutral**

Replace labels visible to compound admins:

- `Compounds` -> `Property structure`
- `Viewing` -> hidden
- `Choose active compound` -> hidden or `Open property structure`

- [ ] **Step 4: Run admin checks**

Run: `cd apps/admin && npm run typecheck && npm run lint`

Expected: typecheck passes. No new lint errors.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/app/page.tsx 'apps/admin/src/app/units/[unitId]/page.tsx' apps/admin/src/lib/api.ts
git commit -m "feat(admin): polish operations command center"
```

---

### Task 17: Final Verification and Documentation

**Files:**
- Modify: `docs/superpowers/specs/2026-05-08-admin-operations-ux-security-design.md` if implementation details changed during execution.
- Modify: `docs/superpowers/plans/2026-05-09-admin-operations-ux-security.md` by checking completed tasks.

- [ ] **Step 1: Run targeted API suites**

Run:

```bash
cd apps/api && php artisan test --filter PenaltyPoint
cd apps/api && php artisan test --filter VehicleLookup
cd apps/api && php artisan test --filter AdminSecurity
cd apps/api && php artisan test --filter AnnouncementsTest
cd apps/api && php artisan test --filter ViolationApplicationControllerTest
```

Expected: PASS.

- [ ] **Step 2: Run full API quality gates**

Run:

```bash
cd apps/api && php artisan test
cd apps/api && composer pint -- --test
cd apps/api && composer phpstan
```

Expected: PASS.

- [ ] **Step 3: Run admin checks**

Run:

```bash
cd apps/admin && npm run typecheck && npm run lint
```

Expected: PASS or only documented pre-existing warnings.

- [ ] **Step 4: Run mobile checks**

Run:

```bash
cd apps/mobile && npm run typecheck && npm test
```

Expected: PASS.

- [ ] **Step 5: Commit verification docs if changed**

```bash
git add docs/superpowers/specs/2026-05-08-admin-operations-ux-security-design.md docs/superpowers/plans/2026-05-09-admin-operations-ux-security.md
git commit -m "docs: finalize admin operations implementation evidence"
```

Skip this commit if no docs changed.

---

## Parallel-Safe Work

- Tasks 4 and 7 can run in parallel after Task 1.
- Tasks 10 and 11 can run in parallel with API Tasks 4-9, but Task 11 depends on Task 10.
- Tasks 13 and 14 are sequential.
- Task 15 depends on Task 14.
- Task 16 should wait until Tasks 2, 3, 6, 8, and 15 are complete.

## Self-Review Coverage

- Admin web navigation and workflow cleanup: Tasks 2, 3, 8, 15, 16.
- Compound-admin isolation: Tasks 2 and 16.
- Apartment penalty points: Tasks 4, 5, 6.
- Vehicle plate lookup: Tasks 7 and 8.
- Mobile admin poll creation: Tasks 10 and 11.
- Building-level notifications: Tasks 9 and 12.
- Admin security center: Tasks 13, 14, 15.
- Apartment ban/restriction: excluded by design and not present in the task list.
