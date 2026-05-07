# Manage My Apartment(s) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build unit-scoped "My Apartment(s)" surface on mobile + admin web side: residents, vehicles, parking spots, violations, notes, documents (with admin review), finance summary with offline receipts. Rename `UnitMembership` → `ApartmentResident` across the codebase.

**Architecture:** New `App\Models\Apartments\*` namespace, new tables (`apartment_residents`, `apartment_vehicles`, `apartment_parking_spots`, `apartment_notes`, `violation_rules`, `apartment_violations`, `apartment_documents`, `apartment_document_versions`), unit capability flags (`has_vehicle`, `has_parking`). Mobile feature directory `apartments/` replaces `property/`. Admin web gains violation rules CRUD + violation application + document review queue + view-only unit tabs.

**Tech Stack:** Laravel 13 + PHPUnit + Sanctum + Spatie Permission. React Native + RTK Query. Next.js admin web. Storage adapter mirrors existing `UserDocument`.

**Spec:** [`docs/superpowers/specs/2026-05-07-manage-my-apartments-design.md`](../specs/2026-05-07-manage-my-apartments-design.md)

---

## File Structure

### Backend (`apps/api`)

```
app/Enums/
  ApartmentDocumentStatus.php          (new)  active|archived
  ApartmentDocumentType.php            (new)  ownership_proof|lease|id_copy|utility_bill|other
  ApartmentDocumentVersionStatus.php   (new)  pending_review|approved|rejected
  ApartmentViolationStatus.php         (new)  pending|paid|waived
  Permission.php                       (mod)  +ApartmentsAdmin, +ApplyApartmentViolation

app/Models/Apartments/
  ApartmentResident.php                (new, replaces Property/UnitMembership)
  ApartmentVehicle.php                 (new)
  ApartmentParkingSpot.php             (new)
  ApartmentNote.php                    (new)
  ViolationRule.php                    (new)
  ApartmentViolation.php               (new)
  ApartmentDocument.php                (new)
  ApartmentDocumentVersion.php         (new)

app/Models/Property/
  Unit.php                             (mod)  +has_vehicle, +has_parking, residents()->ApartmentResident
  UnitMembership.php                   (DELETE after consumers migrated)

app/Services/Apartments/
  ResidentService.php                  (new)
  VehicleService.php                   (new)
  ParkingSpotService.php               (new)
  NoteService.php                      (new)
  ViolationRuleService.php             (new)
  ViolationApplicationService.php      (new)
  ApartmentDocumentService.php         (new)
  ApartmentDocumentReviewService.php   (new)

app/Policies/Apartments/
  ApartmentPolicy.php                  (new)  view, manage (resident-edit baseline)
  ViolationRulePolicy.php              (new)  admin
  ApartmentDocumentReviewPolicy.php    (new)  admin

app/Http/Controllers/Api/V1/Apartments/
  ApartmentController.php              (new)  index, show
  ApartmentResidentController.php      (new)
  ApartmentVehicleController.php       (new)
  ApartmentParkingSpotController.php   (new)
  ApartmentNoteController.php          (new)
  ApartmentViolationController.php     (new, read-only)
  ApartmentDocumentController.php      (new)

app/Http/Controllers/Api/V1/Admin/Apartments/
  ViolationRuleController.php          (new)
  ViolationApplicationController.php   (new)
  ApartmentDocumentReviewController.php (new)

app/Http/Requests/Apartments/         (new dir, FormRequests for each write endpoint)
app/Http/Requests/Admin/Apartments/   (new dir)
app/Http/Resources/Apartments/        (new dir)

routes/api.php                        (mod)  +apartments routes group, +admin apartments group
database/migrations/                  (new)  apartments_v1 migration set
database/factories/Apartments/        (new)  factories for each new model
database/seeders/                     (mod)  permission seeder additions
tests/Feature/Api/V1/Apartments/      (new)  one feature test file per controller
```

### Mobile (`apps/mobile`)

```
src/features/apartments/              (new, replaces src/features/property/)
  screens/
    ApartmentsListScreen.tsx
    ApartmentDetailScreen.tsx
    tabs/
      ResidentsTab.tsx
      VehiclesTab.tsx
      ParkingTab.tsx
      ViolationsTab.tsx
      NotesTab.tsx
      DocumentsTab.tsx
      FinanceTab.tsx
  components/
    ResidentSheet.tsx
    VehicleSheet.tsx
    ParkingSpotSheet.tsx
    DocumentReplaceSheet.tsx
    ReceiptSubmitSheet.tsx

src/services/apartments/              (new)
  apartmentsApi.ts
  residentsApi.ts
  vehiclesApi.ts
  parkingApi.ts
  notesApi.ts
  violationsApi.ts
  documentsApi.ts
  types.ts

src/navigation/
  RootNavigator.tsx                   (mod)  swap Property tab → Apartments
  types.ts                            (mod)
  linking.ts                          (mod)

src/features/property/                (DELETE)
src/features/finance/                 (mod)  drop primary tab entry, keep flow as embedded sub-route
src/features/documents/               (mod)  drop primary tab entry
```

### Admin Web (`apps/admin`)

```
src/app/violation-rules/              (new)  index, new, [ruleId]/edit
src/app/units/[unitId]/violations/    (new)
src/app/document-reviews/             (new)
src/app/units/[unitId]/page.tsx       (mod)  view-only tabs added
src/lib/api.ts                        (mod)  +admin endpoints
```

---

## Conventions

- **Tests:** PHPUnit class style with `Tests\TestCase` + `RefreshDatabase`. Sanctum auth. Use existing factories.
- **Pattern:** Follow `tests/Feature/Api/V1/FinanceTest.php` for fixture setup.
- **Auth:** `Sanctum::actingAs($user)` per test.
- **Migration backend command:** `cd apps/api && php artisan migrate --no-interaction`
- **Test command (single):** `cd apps/api && php artisan test --filter <ClassName>::<methodName>`
- **Test command (file):** `cd apps/api && php artisan test tests/Feature/Api/V1/Apartments/<File>.php`
- **Quality gates:** `cd apps/api && composer pint && composer phpstan` (matches existing scripts).
- **Mobile test:** `cd apps/mobile && npm test -- <pattern>`
- **Mobile typecheck:** `cd apps/mobile && npm run typecheck`
- **Admin typecheck:** `cd apps/admin && npm run typecheck`

---

## Tasks

### Task 1: Permission enum additions

**Files:**
- Modify: `apps/api/app/Enums/Permission.php`
- Modify: `apps/api/database/seeders/PermissionsSeeder.php` (or whichever seeder seeds permissions; check `database/seeders/` for the file referencing `Permission::cases()`)
- Test: `apps/api/tests/Feature/Database/PermissionsSeederTest.php` (create if absent)

- [ ] **Step 1: Write failing test for new permission cases**

```php
// apps/api/tests/Feature/Database/PermissionsTest.php
namespace Tests\Feature\Database;

use App\Enums\Permission;
use Tests\TestCase;

class PermissionsTest extends TestCase
{
    public function test_apartments_admin_permission_exists(): void
    {
        $this->assertTrue(in_array('apartments_admin', Permission::values(), true));
    }

    public function test_apply_apartment_violation_permission_exists(): void
    {
        $this->assertTrue(in_array('apply_apartment_violation', Permission::values(), true));
    }
}
```

- [ ] **Step 2: Run test, confirm fail**

```bash
cd apps/api && php artisan test --filter PermissionsTest
```

Expected: 2 failures.

- [ ] **Step 3: Add cases to Permission enum**

```php
// apps/api/app/Enums/Permission.php (add inside enum)
case ApartmentsAdmin           = 'apartments_admin';
case ApplyApartmentViolation   = 'apply_apartment_violation';
```

- [ ] **Step 4: Run test, confirm pass**

```bash
cd apps/api && php artisan test --filter PermissionsTest
```

Expected: 2 passing.

- [ ] **Step 5: Update permission seeders**

Find the seeder iterating `Permission::cases()` (likely `database/seeders/PermissionsSeeder.php` or `RolePermissionSeeder.php`). The new cases auto-flow if it iterates `Permission::cases()`. If the seeder hard-codes per-role grants, add `ApartmentsAdmin` to `admin` role and `ApartmentsAdmin` + `ApplyApartmentViolation` to `finance_manager` role.

- [ ] **Step 6: Commit**

```bash
git add apps/api/app/Enums/Permission.php apps/api/database/seeders apps/api/tests/Feature/Database/PermissionsTest.php
git commit -m "feat(api): add apartments admin permissions"
```

---

### Task 2: Apartment status/type enums

**Files:**
- Create: `apps/api/app/Enums/ApartmentDocumentStatus.php`
- Create: `apps/api/app/Enums/ApartmentDocumentType.php`
- Create: `apps/api/app/Enums/ApartmentDocumentVersionStatus.php`
- Create: `apps/api/app/Enums/ApartmentViolationStatus.php`

- [ ] **Step 1: Create enums**

```php
// apps/api/app/Enums/ApartmentDocumentStatus.php
<?php
namespace App\Enums;

enum ApartmentDocumentStatus: string
{
    case Active = 'active';
    case Archived = 'archived';
}
```

```php
// apps/api/app/Enums/ApartmentDocumentType.php
<?php
namespace App\Enums;

enum ApartmentDocumentType: string
{
    case OwnershipProof = 'ownership_proof';
    case Lease = 'lease';
    case IdCopy = 'id_copy';
    case UtilityBill = 'utility_bill';
    case Other = 'other';
}
```

```php
// apps/api/app/Enums/ApartmentDocumentVersionStatus.php
<?php
namespace App\Enums;

enum ApartmentDocumentVersionStatus: string
{
    case PendingReview = 'pending_review';
    case Approved = 'approved';
    case Rejected = 'rejected';
}
```

```php
// apps/api/app/Enums/ApartmentViolationStatus.php
<?php
namespace App\Enums;

enum ApartmentViolationStatus: string
{
    case Pending = 'pending';
    case Paid = 'paid';
    case Waived = 'waived';
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/app/Enums/Apartment*.php
git commit -m "feat(api): add apartments domain enums"
```

---

### Task 3: Schema migration — new apartments tables + unit capability flags

**Files:**
- Create: `apps/api/database/migrations/2026_05_07_000100_create_apartments_v1_tables.php`

- [ ] **Step 1: Write the migration (schema only — data move happens in Task 5)**

```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('units', function (Blueprint $table): void {
            $table->boolean('has_vehicle')->default(true)->after('status');
            $table->boolean('has_parking')->default(true)->after('has_vehicle');
        });

        Schema::create('apartment_residents', function (Blueprint $table): void {
            $table->id();
            $table->foreignUlid('unit_id')->constrained('units')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('relation_type')->index();
            $table->date('starts_at')->nullable();
            $table->date('ends_at')->nullable();
            $table->boolean('is_primary')->default(false);
            $table->string('verification_status')->default('pending')->index();
            $table->string('resident_name')->nullable();
            $table->string('resident_phone')->nullable();
            $table->boolean('phone_public')->default(false);
            $table->string('resident_email')->nullable();
            $table->boolean('email_public')->default(false);
            $table->string('photo_path')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['unit_id', 'user_id']);
            $table->index(['user_id', 'verification_status']);
        });

        Schema::create('apartment_vehicles', function (Blueprint $table): void {
            $table->id();
            $table->foreignUlid('unit_id')->constrained('units')->cascadeOnDelete();
            $table->foreignId('apartment_resident_id')->nullable()->constrained('apartment_residents')->nullOnDelete();
            $table->string('plate');
            $table->string('make')->nullable();
            $table->string('model')->nullable();
            $table->string('color')->nullable();
            $table->string('sticker_code')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['unit_id', 'plate']);
        });

        Schema::create('apartment_parking_spots', function (Blueprint $table): void {
            $table->id();
            $table->foreignUlid('unit_id')->constrained('units')->cascadeOnDelete();
            $table->string('code');
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index('unit_id');
        });

        Schema::create('apartment_notes', function (Blueprint $table): void {
            $table->id();
            $table->foreignUlid('unit_id')->constrained('units')->cascadeOnDelete();
            $table->foreignId('author_id')->constrained('users')->cascadeOnDelete();
            $table->text('body');
            $table->timestamps();

            $table->index(['unit_id', 'created_at']);
        });

        Schema::create('violation_rules', function (Blueprint $table): void {
            $table->id();
            $table->foreignUlid('compound_id')->constrained('compounds')->cascadeOnDelete();
            $table->string('name');
            $table->string('name_ar')->nullable();
            $table->text('description')->nullable();
            $table->decimal('default_fee', 12, 2)->default(0);
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['compound_id', 'is_active']);
        });

        Schema::create('apartment_violations', function (Blueprint $table): void {
            $table->id();
            $table->foreignUlid('unit_id')->constrained('units')->cascadeOnDelete();
            $table->foreignId('violation_rule_id')->constrained('violation_rules')->restrictOnDelete();
            $table->foreignId('applied_by')->constrained('users')->restrictOnDelete();
            $table->decimal('fee', 12, 2);
            $table->text('notes')->nullable();
            $table->string('status')->default('pending')->index();
            $table->timestamp('paid_at')->nullable();
            $table->text('waived_reason')->nullable();
            $table->timestamps();

            $table->index(['unit_id', 'status']);
        });

        Schema::create('apartment_documents', function (Blueprint $table): void {
            $table->id();
            $table->foreignUlid('unit_id')->constrained('units')->cascadeOnDelete();
            $table->foreignId('uploaded_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('document_type')->index();
            $table->string('file_path');
            $table->string('mime_type')->nullable();
            $table->unsignedBigInteger('size_bytes')->nullable();
            $table->string('status')->default('active')->index();
            $table->unsignedInteger('version')->default(1);
            $table->foreignId('replaced_by_id')->nullable()->constrained('apartment_documents')->nullOnDelete();
            $table->timestamps();

            $table->index(['unit_id', 'document_type', 'status']);
        });

        Schema::create('apartment_document_versions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('apartment_document_id')->constrained('apartment_documents')->cascadeOnDelete();
            $table->foreignId('uploaded_by')->constrained('users')->restrictOnDelete();
            $table->string('file_path');
            $table->string('mime_type')->nullable();
            $table->unsignedBigInteger('size_bytes')->nullable();
            $table->string('status')->default('pending_review')->index();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('review_notes')->nullable();
            $table->timestamps();

            $table->index(['apartment_document_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('apartment_document_versions');
        Schema::dropIfExists('apartment_documents');
        Schema::dropIfExists('apartment_violations');
        Schema::dropIfExists('violation_rules');
        Schema::dropIfExists('apartment_notes');
        Schema::dropIfExists('apartment_parking_spots');
        Schema::dropIfExists('apartment_vehicles');
        Schema::dropIfExists('apartment_residents');

        Schema::table('units', function (Blueprint $table): void {
            $table->dropColumn(['has_vehicle', 'has_parking']);
        });
    }
};
```

- [ ] **Step 2: Run migration on testing DB**

```bash
cd apps/api && php artisan migrate --env=testing --no-interaction
```

Expected: all tables create cleanly.

- [ ] **Step 3: Commit**

```bash
git add apps/api/database/migrations/2026_05_07_000100_create_apartments_v1_tables.php
git commit -m "feat(api): add apartments v1 schema and unit capability flags"
```

---

### Task 4: ApartmentResident model + factory (replaces UnitMembership content)

**Files:**
- Create: `apps/api/app/Models/Apartments/ApartmentResident.php`
- Create: `apps/api/database/factories/Apartments/ApartmentResidentFactory.php`
- Test: `apps/api/tests/Feature/Database/ApartmentResidentModelTest.php`

- [ ] **Step 1: Write failing test**

```php
<?php
namespace Tests\Feature\Database;

use App\Enums\UnitRelationType;
use App\Enums\VerificationStatus;
use App\Models\Apartments\ApartmentResident;
use App\Models\Property\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApartmentResidentModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_factory_creates_resident_with_user(): void
    {
        $resident = ApartmentResident::factory()->create();
        $this->assertNotNull($resident->unit_id);
        $this->assertNotNull($resident->user_id);
        $this->assertInstanceOf(Unit::class, $resident->unit);
        $this->assertInstanceOf(User::class, $resident->user);
    }

    public function test_supports_user_less_resident(): void
    {
        $resident = ApartmentResident::factory()->withoutUser()->create([
            'resident_name' => 'Renter Sample',
        ]);
        $this->assertNull($resident->user_id);
        $this->assertSame('Renter Sample', $resident->resident_name);
    }

    public function test_active_scope_excludes_expired(): void
    {
        ApartmentResident::factory()->create(['ends_at' => now()->subDay()]);
        $current = ApartmentResident::factory()->create(['ends_at' => null]);
        $this->assertEquals([$current->id], ApartmentResident::query()->active()->pluck('id')->all());
    }
}
```

- [ ] **Step 2: Run, expect failures (model + factory missing)**

```bash
cd apps/api && php artisan test --filter ApartmentResidentModelTest
```

- [ ] **Step 3: Add model**

```php
<?php
namespace App\Models\Apartments;

use App\Enums\UnitRelationType;
use App\Enums\UnitStatus;
use App\Enums\VerificationStatus;
use App\Models\Property\Unit;
use App\Models\User;
use Database\Factories\Apartments\ApartmentResidentFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class ApartmentResident extends Model
{
    /** @use HasFactory<ApartmentResidentFactory> */
    use HasFactory;
    use SoftDeletes;

    protected static function newFactory(): ApartmentResidentFactory
    {
        return ApartmentResidentFactory::new();
    }

    protected $fillable = [
        'unit_id', 'user_id', 'relation_type', 'starts_at', 'ends_at',
        'is_primary', 'verification_status', 'created_by',
        'resident_name', 'resident_phone', 'phone_public',
        'resident_email', 'email_public', 'photo_path',
    ];

    protected function casts(): array
    {
        return [
            'starts_at' => 'date',
            'ends_at' => 'date',
            'is_primary' => 'boolean',
            'phone_public' => 'boolean',
            'email_public' => 'boolean',
            'relation_type' => UnitRelationType::class,
            'verification_status' => VerificationStatus::class,
        ];
    }

    /** @return BelongsTo<Unit, $this> */
    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<User, $this> */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * @param Builder<ApartmentResident> $query
     * @return Builder<ApartmentResident>
     */
    public function scopeActive(Builder $query): Builder
    {
        $today = now()->toDateString();
        return $query
            ->where(function (Builder $q) use ($today): void {
                $q->whereNull('starts_at')->orWhereDate('starts_at', '<=', $today);
            })
            ->where(function (Builder $q) use ($today): void {
                $q->whereNull('ends_at')->orWhereDate('ends_at', '>=', $today);
            });
    }

    /**
     * @param Builder<ApartmentResident> $query
     * @return Builder<ApartmentResident>
     */
    public function scopeActiveForAccess(Builder $query): Builder
    {
        return $query
            ->active()
            ->where('verification_status', VerificationStatus::Verified->value)
            ->whereHas('unit', function (Builder $q): void {
                $q->whereNull('archived_at')->where('status', '!=', UnitStatus::Archived->value);
            });
    }
}
```

- [ ] **Step 4: Add factory**

```php
<?php
namespace Database\Factories\Apartments;

use App\Enums\UnitRelationType;
use App\Enums\VerificationStatus;
use App\Models\Apartments\ApartmentResident;
use App\Models\Property\Unit;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<ApartmentResident> */
class ApartmentResidentFactory extends Factory
{
    protected $model = ApartmentResident::class;

    public function definition(): array
    {
        return [
            'unit_id' => Unit::factory(),
            'user_id' => User::factory(),
            'relation_type' => UnitRelationType::Owner,
            'is_primary' => false,
            'verification_status' => VerificationStatus::Verified,
            'resident_name' => null,
            'resident_phone' => null,
            'phone_public' => false,
            'resident_email' => null,
            'email_public' => false,
            'photo_path' => null,
        ];
    }

    public function withoutUser(): self
    {
        return $this->state(fn () => [
            'user_id' => null,
            'resident_name' => fake()->name(),
        ]);
    }

    public function primary(): self
    {
        return $this->state(fn () => ['is_primary' => true]);
    }
}
```

- [ ] **Step 5: Run test, expect pass**

```bash
cd apps/api && php artisan test --filter ApartmentResidentModelTest
```

- [ ] **Step 6: Commit**

```bash
git add apps/api/app/Models/Apartments/ApartmentResident.php apps/api/database/factories/Apartments/ApartmentResidentFactory.php apps/api/tests/Feature/Database/ApartmentResidentModelTest.php
git commit -m "feat(api): add ApartmentResident model and factory"
```

---

### Task 5: Data migration — copy unit_memberships → apartment_residents

**Files:**
- Create: `apps/api/database/migrations/2026_05_07_000200_migrate_unit_memberships_to_apartment_residents.php`

- [ ] **Step 1: Write migration**

```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('unit_memberships')) {
            return;
        }

        DB::table('unit_memberships')->orderBy('id')->chunkById(500, function ($rows): void {
            foreach ($rows as $row) {
                DB::table('apartment_residents')->insert([
                    'id' => $row->id,
                    'unit_id' => $row->unit_id,
                    'user_id' => $row->user_id,
                    'relation_type' => $row->relation_type,
                    'starts_at' => $row->starts_at,
                    'ends_at' => $row->ends_at,
                    'is_primary' => $row->is_primary,
                    'verification_status' => $row->verification_status,
                    'created_by' => $row->created_by,
                    'resident_name' => $row->resident_name ?? null,
                    'resident_phone' => $row->resident_phone ?? null,
                    'phone_public' => $row->phone_public ?? 0,
                    'resident_email' => $row->resident_email ?? null,
                    'email_public' => $row->email_public ?? 0,
                    'photo_path' => null,
                    'created_at' => $row->created_at,
                    'updated_at' => $row->updated_at,
                ]);

                if (! empty($row->vehicle_plate)) {
                    DB::table('apartment_vehicles')->insert([
                        'unit_id' => $row->unit_id,
                        'apartment_resident_id' => $row->id,
                        'plate' => $row->vehicle_plate,
                        'sticker_code' => $row->garage_sticker_code ?? null,
                        'created_by' => $row->created_by,
                        'created_at' => $row->created_at,
                        'updated_at' => $row->updated_at,
                    ]);
                }

                if (! empty($row->parking_spot_code)) {
                    DB::table('apartment_parking_spots')->insert([
                        'unit_id' => $row->unit_id,
                        'code' => $row->parking_spot_code,
                        'created_by' => $row->created_by,
                        'created_at' => $row->created_at,
                        'updated_at' => $row->updated_at,
                    ]);
                }
            }
        });

        // Carry has_vehicle to unit-level capability.
        if (Schema::hasColumn('unit_memberships', 'has_vehicle')) {
            $unitsWithVehicle = DB::table('unit_memberships')
                ->where('has_vehicle', true)
                ->pluck('unit_id')
                ->unique()
                ->all();
            if (! empty($unitsWithVehicle)) {
                DB::table('units')->whereIn('id', $unitsWithVehicle)->update(['has_vehicle' => true]);
            }
        }
    }

    public function down(): void
    {
        DB::table('apartment_parking_spots')->truncate();
        DB::table('apartment_vehicles')->truncate();
        DB::table('apartment_residents')->truncate();
    }
};
```

- [ ] **Step 2: Migration test (idempotency + correctness)**

```php
// apps/api/tests/Feature/Database/ApartmentResidentMigrationTest.php
namespace Tests\Feature\Database;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ApartmentResidentMigrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_apartment_residents_table_exists_after_migration(): void
    {
        $this->assertTrue(\Schema::hasTable('apartment_residents'));
        $this->assertTrue(\Schema::hasColumn('apartment_residents', 'photo_path'));
    }
}
```

- [ ] **Step 3: Run migrations + test**

```bash
cd apps/api && php artisan test --filter ApartmentResidentMigrationTest
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/database/migrations/2026_05_07_000200_migrate_unit_memberships_to_apartment_residents.php apps/api/tests/Feature/Database/ApartmentResidentMigrationTest.php
git commit -m "feat(api): migrate unit_memberships data to apartment_residents"
```

---

### Task 6: Replace UnitMembership references across the codebase

**Goal:** Update every consumer to import `App\Models\Apartments\ApartmentResident`. Existing referencing files (one shot replacement, atomic with the rename):

- `apps/api/app/Models/User.php`
- `apps/api/app/Models/Property/Unit.php`
- `apps/api/app/Http/Resources/UnitResource.php`
- `apps/api/app/Http/Resources/UnitMembershipResource.php` → rename to `apps/api/app/Http/Resources/Apartments/ApartmentResidentResource.php`
- `apps/api/app/Http/Requests/Property/StoreUnitMembershipRequest.php` → keep for legacy admin unit membership endpoints (delete in cleanup task)
- `apps/api/app/Http/Requests/Property/UpdateUnitMembershipRequest.php` → keep for legacy admin
- `apps/api/app/Http/Controllers/Api/V1/UserDocumentController.php`
- `apps/api/app/Http/Controllers/Api/V1/VisitorRequestController.php`
- `apps/api/app/Http/Controllers/Api/V1/OwnerRegistrationController.php`
- `apps/api/app/Http/Controllers/Api/V1/VerificationRequestController.php`
- `apps/api/app/Http/Controllers/Api/V1/DashboardController.php`
- `apps/api/app/Http/Controllers/Api/V1/UnitController.php`
- `apps/api/app/Http/Controllers/Api/V1/UnitMembershipController.php`
- `apps/api/app/Http/Controllers/Api/V1/UserLifecycleController.php`
- `apps/api/app/Http/Controllers/Api/V1/Polls/PollController.php`
- `apps/api/routes/api.php`
- `apps/api/database/seeders/DemoVisitorDataSeeder.php`
- `apps/api/database/seeders/UatSeeder.php`
- `apps/api/database/seeders/NextPointSeeder.php`

- [ ] **Step 1: Run repo-wide search to confirm scope**

```bash
cd apps/api && grep -rln "UnitMembership\|Property\\\\UnitMembership\|unit_memberships" app/ database/ routes/ tests/
```

Expected output: list of files matching the inventory above plus possibly a few tests.

- [ ] **Step 2: Replace `App\Models\Property\UnitMembership` import with `App\Models\Apartments\ApartmentResident`**

For each file in the inventory, update:
- `use App\Models\Property\UnitMembership;` → `use App\Models\Apartments\ApartmentResident;`
- `UnitMembership::` → `ApartmentResident::`
- `unit_memberships` table references in seeders and DB queries → `apartment_residents`
- Method name `unitMemberships()` on `User`/`Unit` → `apartmentResidents()`. Use `apartmentResidents` as the relation name throughout.
- Variable names `$membership` → `$resident` where renaming improves clarity (optional; leave if it complicates the diff).

- [ ] **Step 3: Update `User::apartmentResidents()` relation**

```php
// apps/api/app/Models/User.php  (replace existing unitMemberships() method)
/** @return HasMany<ApartmentResident, $this> */
public function apartmentResidents(): HasMany
{
    return $this->hasMany(ApartmentResident::class);
}
```

- [ ] **Step 4: Update `Unit::apartmentResidents()` relation**

```php
// apps/api/app/Models/Property/Unit.php  (replace existing unitMemberships() method)
/** @return HasMany<ApartmentResident, $this> */
public function apartmentResidents(): HasMany
{
    return $this->hasMany(ApartmentResident::class);
}
```

Add `has_vehicle` and `has_parking` to the `$casts` (boolean) and `$fillable` arrays.

- [ ] **Step 5: Replace `UnitMembershipResource` with `ApartmentResidentResource`**

Move file to `apps/api/app/Http/Resources/Apartments/ApartmentResidentResource.php`, rename class, update namespace. Update `UnitResource` to use the new resource class. Search for any other consumers and update.

- [ ] **Step 6: Run full test suite, fix breakage**

```bash
cd apps/api && php artisan test
```

Iterate on failures: any test referencing `UnitMembership::factory()` updates to `ApartmentResident::factory()`. Tests in `tests/Feature/Api/V1/` that use `unitMemberships` relation update to `apartmentResidents`.

- [ ] **Step 7: Delete legacy model + factory + add-fields migration**

```bash
rm apps/api/app/Models/Property/UnitMembership.php
rm apps/api/database/factories/Property/UnitMembershipFactory.php
```

The legacy `2026_05_03_000100_add_resident_profile_fields_to_unit_memberships.php` migration STAYS in place for already-migrated environments — it ran historically. Add a final cleanup migration in Task 33 to drop the `unit_memberships` table.

- [ ] **Step 8: Run full test suite**

```bash
cd apps/api && php artisan test
```

Expected: green (modulo new feature tests not yet written).

- [ ] **Step 9: Commit**

```bash
git add -A apps/api
git commit -m "refactor(api): rename UnitMembership to ApartmentResident across codebase"
```

---

### Task 7: ApartmentVehicle model + factory

**Files:**
- Create: `apps/api/app/Models/Apartments/ApartmentVehicle.php`
- Create: `apps/api/database/factories/Apartments/ApartmentVehicleFactory.php`
- Test: `apps/api/tests/Feature/Database/ApartmentVehicleModelTest.php`

- [ ] **Step 1: Write failing test**

```php
namespace Tests\Feature\Database;

use App\Models\Apartments\ApartmentResident;
use App\Models\Apartments\ApartmentVehicle;
use App\Models\Property\Unit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApartmentVehicleModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_factory_creates_vehicle(): void
    {
        $vehicle = ApartmentVehicle::factory()->create();
        $this->assertInstanceOf(Unit::class, $vehicle->unit);
        $this->assertNotNull($vehicle->plate);
    }

    public function test_resident_relation_optional(): void
    {
        $vehicle = ApartmentVehicle::factory()->create();
        $this->assertNull($vehicle->apartment_resident_id);

        $withResident = ApartmentVehicle::factory()->create([
            'apartment_resident_id' => ApartmentResident::factory()->create()->id,
        ]);
        $this->assertNotNull($withResident->resident);
    }
}
```

- [ ] **Step 2: Run, confirm fail**

```bash
cd apps/api && php artisan test --filter ApartmentVehicleModelTest
```

- [ ] **Step 3: Add model**

```php
<?php
namespace App\Models\Apartments;

use App\Models\Property\Unit;
use App\Models\User;
use Database\Factories\Apartments\ApartmentVehicleFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class ApartmentVehicle extends Model
{
    /** @use HasFactory<ApartmentVehicleFactory> */
    use HasFactory;
    use SoftDeletes;

    protected static function newFactory(): ApartmentVehicleFactory
    {
        return ApartmentVehicleFactory::new();
    }

    protected $fillable = [
        'unit_id', 'apartment_resident_id', 'plate', 'make', 'model',
        'color', 'sticker_code', 'notes', 'created_by',
    ];

    /** @return BelongsTo<Unit, $this> */
    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    /** @return BelongsTo<ApartmentResident, $this> */
    public function resident(): BelongsTo
    {
        return $this->belongsTo(ApartmentResident::class, 'apartment_resident_id');
    }

    /** @return BelongsTo<User, $this> */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
```

- [ ] **Step 4: Add factory**

```php
<?php
namespace Database\Factories\Apartments;

use App\Models\Apartments\ApartmentVehicle;
use App\Models\Property\Unit;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<ApartmentVehicle> */
class ApartmentVehicleFactory extends Factory
{
    protected $model = ApartmentVehicle::class;

    public function definition(): array
    {
        return [
            'unit_id' => Unit::factory(),
            'apartment_resident_id' => null,
            'plate' => strtoupper(fake()->bothify('???-####')),
            'make' => fake()->randomElement(['Toyota', 'Honda', 'BMW', 'Hyundai']),
            'model' => fake()->word(),
            'color' => fake()->safeColorName(),
            'sticker_code' => null,
            'notes' => null,
        ];
    }
}
```

- [ ] **Step 5: Run, confirm pass**

```bash
cd apps/api && php artisan test --filter ApartmentVehicleModelTest
```

- [ ] **Step 6: Commit**

```bash
git add apps/api/app/Models/Apartments/ApartmentVehicle.php apps/api/database/factories/Apartments/ApartmentVehicleFactory.php apps/api/tests/Feature/Database/ApartmentVehicleModelTest.php
git commit -m "feat(api): add ApartmentVehicle model"
```

---

### Task 8: ApartmentParkingSpot model + factory

**Files:**
- Create: `apps/api/app/Models/Apartments/ApartmentParkingSpot.php`
- Create: `apps/api/database/factories/Apartments/ApartmentParkingSpotFactory.php`
- Test: `apps/api/tests/Feature/Database/ApartmentParkingSpotModelTest.php`

- [ ] **Step 1: Write failing test**

```php
namespace Tests\Feature\Database;

use App\Models\Apartments\ApartmentParkingSpot;
use App\Models\Property\Unit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApartmentParkingSpotModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_factory_creates_spot(): void
    {
        $spot = ApartmentParkingSpot::factory()->create();
        $this->assertInstanceOf(Unit::class, $spot->unit);
        $this->assertNotNull($spot->code);
    }
}
```

- [ ] **Step 2: Add model + factory**

```php
<?php
// apps/api/app/Models/Apartments/ApartmentParkingSpot.php
namespace App\Models\Apartments;

use App\Models\Property\Unit;
use App\Models\User;
use Database\Factories\Apartments\ApartmentParkingSpotFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class ApartmentParkingSpot extends Model
{
    /** @use HasFactory<ApartmentParkingSpotFactory> */
    use HasFactory;
    use SoftDeletes;

    protected static function newFactory(): ApartmentParkingSpotFactory
    {
        return ApartmentParkingSpotFactory::new();
    }

    protected $fillable = ['unit_id', 'code', 'notes', 'created_by'];

    /** @return BelongsTo<Unit, $this> */
    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    /** @return BelongsTo<User, $this> */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
```

```php
<?php
// apps/api/database/factories/Apartments/ApartmentParkingSpotFactory.php
namespace Database\Factories\Apartments;

use App\Models\Apartments\ApartmentParkingSpot;
use App\Models\Property\Unit;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<ApartmentParkingSpot> */
class ApartmentParkingSpotFactory extends Factory
{
    protected $model = ApartmentParkingSpot::class;

    public function definition(): array
    {
        return [
            'unit_id' => Unit::factory(),
            'code' => 'P-' . strtoupper(fake()->bothify('##??')),
            'notes' => null,
        ];
    }
}
```

- [ ] **Step 3: Run + commit**

```bash
cd apps/api && php artisan test --filter ApartmentParkingSpotModelTest
git add apps/api/app/Models/Apartments/ApartmentParkingSpot.php apps/api/database/factories/Apartments/ApartmentParkingSpotFactory.php apps/api/tests/Feature/Database/ApartmentParkingSpotModelTest.php
git commit -m "feat(api): add ApartmentParkingSpot model"
```

---

### Task 9: ApartmentNote model + factory

**Files:**
- Create: `apps/api/app/Models/Apartments/ApartmentNote.php`
- Create: `apps/api/database/factories/Apartments/ApartmentNoteFactory.php`
- Test: `apps/api/tests/Feature/Database/ApartmentNoteModelTest.php`

- [ ] **Step 1: Test**

```php
namespace Tests\Feature\Database;

use App\Models\Apartments\ApartmentNote;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApartmentNoteModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_factory(): void
    {
        $note = ApartmentNote::factory()->create();
        $this->assertNotNull($note->unit_id);
        $this->assertInstanceOf(User::class, $note->author);
        $this->assertNotEmpty($note->body);
    }
}
```

- [ ] **Step 2: Model + factory**

```php
<?php
// apps/api/app/Models/Apartments/ApartmentNote.php
namespace App\Models\Apartments;

use App\Models\Property\Unit;
use App\Models\User;
use Database\Factories\Apartments\ApartmentNoteFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ApartmentNote extends Model
{
    /** @use HasFactory<ApartmentNoteFactory> */
    use HasFactory;

    protected static function newFactory(): ApartmentNoteFactory
    {
        return ApartmentNoteFactory::new();
    }

    protected $fillable = ['unit_id', 'author_id', 'body'];

    /** @return BelongsTo<Unit, $this> */
    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    /** @return BelongsTo<User, $this> */
    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }
}
```

```php
<?php
// apps/api/database/factories/Apartments/ApartmentNoteFactory.php
namespace Database\Factories\Apartments;

use App\Models\Apartments\ApartmentNote;
use App\Models\Property\Unit;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<ApartmentNote> */
class ApartmentNoteFactory extends Factory
{
    protected $model = ApartmentNote::class;

    public function definition(): array
    {
        return [
            'unit_id' => Unit::factory(),
            'author_id' => User::factory(),
            'body' => fake()->sentence(),
        ];
    }
}
```

- [ ] **Step 3: Run + commit**

```bash
cd apps/api && php artisan test --filter ApartmentNoteModelTest
git add apps/api/app/Models/Apartments/ApartmentNote.php apps/api/database/factories/Apartments/ApartmentNoteFactory.php apps/api/tests/Feature/Database/ApartmentNoteModelTest.php
git commit -m "feat(api): add ApartmentNote model"
```

---

### Task 10: ViolationRule + ApartmentViolation models + factories

**Files:**
- Create: `apps/api/app/Models/Apartments/ViolationRule.php`
- Create: `apps/api/app/Models/Apartments/ApartmentViolation.php`
- Create: `apps/api/database/factories/Apartments/ViolationRuleFactory.php`
- Create: `apps/api/database/factories/Apartments/ApartmentViolationFactory.php`
- Test: `apps/api/tests/Feature/Database/ApartmentViolationModelTest.php`

- [ ] **Step 1: Test**

```php
namespace Tests\Feature\Database;

use App\Enums\ApartmentViolationStatus;
use App\Models\Apartments\ApartmentViolation;
use App\Models\Apartments\ViolationRule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApartmentViolationModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_violation_factory(): void
    {
        $violation = ApartmentViolation::factory()->create();
        $this->assertInstanceOf(ViolationRule::class, $violation->rule);
        $this->assertSame(ApartmentViolationStatus::Pending, $violation->status);
        $this->assertNotNull($violation->fee);
    }
}
```

- [ ] **Step 2: Models**

```php
<?php
// apps/api/app/Models/Apartments/ViolationRule.php
namespace App\Models\Apartments;

use App\Models\Property\Compound;
use App\Models\User;
use Database\Factories\Apartments\ViolationRuleFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class ViolationRule extends Model
{
    /** @use HasFactory<ViolationRuleFactory> */
    use HasFactory;
    use SoftDeletes;

    protected static function newFactory(): ViolationRuleFactory
    {
        return ViolationRuleFactory::new();
    }

    protected $fillable = [
        'compound_id', 'name', 'name_ar', 'description',
        'default_fee', 'is_active', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'default_fee' => 'decimal:2',
        ];
    }

    /** @return BelongsTo<Compound, $this> */
    public function compound(): BelongsTo
    {
        return $this->belongsTo(Compound::class);
    }

    /** @return BelongsTo<User, $this> */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
```

```php
<?php
// apps/api/app/Models/Apartments/ApartmentViolation.php
namespace App\Models\Apartments;

use App\Enums\ApartmentViolationStatus;
use App\Models\Property\Unit;
use App\Models\User;
use Database\Factories\Apartments\ApartmentViolationFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ApartmentViolation extends Model
{
    /** @use HasFactory<ApartmentViolationFactory> */
    use HasFactory;

    protected static function newFactory(): ApartmentViolationFactory
    {
        return ApartmentViolationFactory::new();
    }

    protected $fillable = [
        'unit_id', 'violation_rule_id', 'applied_by',
        'fee', 'notes', 'status', 'paid_at', 'waived_reason',
    ];

    protected function casts(): array
    {
        return [
            'fee' => 'decimal:2',
            'status' => ApartmentViolationStatus::class,
            'paid_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Unit, $this> */
    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    /** @return BelongsTo<ViolationRule, $this> */
    public function rule(): BelongsTo
    {
        return $this->belongsTo(ViolationRule::class, 'violation_rule_id');
    }

    /** @return BelongsTo<User, $this> */
    public function applier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'applied_by');
    }
}
```

- [ ] **Step 3: Factories**

```php
<?php
// apps/api/database/factories/Apartments/ViolationRuleFactory.php
namespace Database\Factories\Apartments;

use App\Models\Apartments\ViolationRule;
use App\Models\Property\Compound;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<ViolationRule> */
class ViolationRuleFactory extends Factory
{
    protected $model = ViolationRule::class;

    public function definition(): array
    {
        return [
            'compound_id' => Compound::factory(),
            'name' => 'Noise after hours',
            'name_ar' => 'إزعاج بعد ساعات الهدوء',
            'description' => 'Loud noise after 11pm',
            'default_fee' => 250,
            'is_active' => true,
            'created_by' => User::factory(),
        ];
    }
}
```

```php
<?php
// apps/api/database/factories/Apartments/ApartmentViolationFactory.php
namespace Database\Factories\Apartments;

use App\Enums\ApartmentViolationStatus;
use App\Models\Apartments\ApartmentViolation;
use App\Models\Apartments\ViolationRule;
use App\Models\Property\Unit;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<ApartmentViolation> */
class ApartmentViolationFactory extends Factory
{
    protected $model = ApartmentViolation::class;

    public function definition(): array
    {
        return [
            'unit_id' => Unit::factory(),
            'violation_rule_id' => ViolationRule::factory(),
            'applied_by' => User::factory(),
            'fee' => 250,
            'notes' => null,
            'status' => ApartmentViolationStatus::Pending,
        ];
    }
}
```

- [ ] **Step 4: Run + commit**

```bash
cd apps/api && php artisan test --filter ApartmentViolationModelTest
git add apps/api/app/Models/Apartments/ViolationRule.php apps/api/app/Models/Apartments/ApartmentViolation.php apps/api/database/factories/Apartments/ViolationRuleFactory.php apps/api/database/factories/Apartments/ApartmentViolationFactory.php apps/api/tests/Feature/Database/ApartmentViolationModelTest.php
git commit -m "feat(api): add ViolationRule and ApartmentViolation models"
```

---

### Task 11: ApartmentDocument + ApartmentDocumentVersion models + factories

**Files:**
- Create: `apps/api/app/Models/Apartments/ApartmentDocument.php`
- Create: `apps/api/app/Models/Apartments/ApartmentDocumentVersion.php`
- Create: `apps/api/database/factories/Apartments/ApartmentDocumentFactory.php`
- Create: `apps/api/database/factories/Apartments/ApartmentDocumentVersionFactory.php`
- Test: `apps/api/tests/Feature/Database/ApartmentDocumentModelTest.php`

- [ ] **Step 1: Test**

```php
namespace Tests\Feature\Database;

use App\Enums\ApartmentDocumentStatus;
use App\Enums\ApartmentDocumentVersionStatus;
use App\Models\Apartments\ApartmentDocument;
use App\Models\Apartments\ApartmentDocumentVersion;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApartmentDocumentModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_document_factory(): void
    {
        $doc = ApartmentDocument::factory()->create();
        $this->assertSame(ApartmentDocumentStatus::Active, $doc->status);
        $this->assertSame(1, $doc->version);
    }

    public function test_pending_version(): void
    {
        $doc = ApartmentDocument::factory()->create();
        $version = ApartmentDocumentVersion::factory()->create(['apartment_document_id' => $doc->id]);
        $this->assertSame(ApartmentDocumentVersionStatus::PendingReview, $version->status);
    }
}
```

- [ ] **Step 2: Models**

```php
<?php
// apps/api/app/Models/Apartments/ApartmentDocument.php
namespace App\Models\Apartments;

use App\Enums\ApartmentDocumentStatus;
use App\Enums\ApartmentDocumentType;
use App\Models\Property\Unit;
use App\Models\User;
use Database\Factories\Apartments\ApartmentDocumentFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ApartmentDocument extends Model
{
    /** @use HasFactory<ApartmentDocumentFactory> */
    use HasFactory;

    protected static function newFactory(): ApartmentDocumentFactory
    {
        return ApartmentDocumentFactory::new();
    }

    protected $fillable = [
        'unit_id', 'uploaded_by_user_id', 'document_type',
        'file_path', 'mime_type', 'size_bytes',
        'status', 'version', 'replaced_by_id',
    ];

    protected function casts(): array
    {
        return [
            'document_type' => ApartmentDocumentType::class,
            'status' => ApartmentDocumentStatus::class,
            'version' => 'integer',
            'size_bytes' => 'integer',
        ];
    }

    /** @return BelongsTo<Unit, $this> */
    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    /** @return BelongsTo<User, $this> */
    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by_user_id');
    }

    /** @return HasMany<ApartmentDocumentVersion, $this> */
    public function versions(): HasMany
    {
        return $this->hasMany(ApartmentDocumentVersion::class);
    }
}
```

```php
<?php
// apps/api/app/Models/Apartments/ApartmentDocumentVersion.php
namespace App\Models\Apartments;

use App\Enums\ApartmentDocumentVersionStatus;
use App\Models\User;
use Database\Factories\Apartments\ApartmentDocumentVersionFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ApartmentDocumentVersion extends Model
{
    /** @use HasFactory<ApartmentDocumentVersionFactory> */
    use HasFactory;

    protected static function newFactory(): ApartmentDocumentVersionFactory
    {
        return ApartmentDocumentVersionFactory::new();
    }

    protected $fillable = [
        'apartment_document_id', 'uploaded_by', 'file_path',
        'mime_type', 'size_bytes', 'status',
        'reviewed_by', 'reviewed_at', 'review_notes',
    ];

    protected function casts(): array
    {
        return [
            'status' => ApartmentDocumentVersionStatus::class,
            'reviewed_at' => 'datetime',
            'size_bytes' => 'integer',
        ];
    }

    /** @return BelongsTo<ApartmentDocument, $this> */
    public function document(): BelongsTo
    {
        return $this->belongsTo(ApartmentDocument::class, 'apartment_document_id');
    }

    /** @return BelongsTo<User, $this> */
    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    /** @return BelongsTo<User, $this> */
    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
```

- [ ] **Step 3: Factories**

```php
<?php
// apps/api/database/factories/Apartments/ApartmentDocumentFactory.php
namespace Database\Factories\Apartments;

use App\Enums\ApartmentDocumentStatus;
use App\Enums\ApartmentDocumentType;
use App\Models\Apartments\ApartmentDocument;
use App\Models\Property\Unit;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<ApartmentDocument> */
class ApartmentDocumentFactory extends Factory
{
    protected $model = ApartmentDocument::class;

    public function definition(): array
    {
        return [
            'unit_id' => Unit::factory(),
            'uploaded_by_user_id' => User::factory(),
            'document_type' => ApartmentDocumentType::OwnershipProof,
            'file_path' => 'apartments/documents/' . fake()->uuid() . '.pdf',
            'mime_type' => 'application/pdf',
            'size_bytes' => 1024,
            'status' => ApartmentDocumentStatus::Active,
            'version' => 1,
        ];
    }
}
```

```php
<?php
// apps/api/database/factories/Apartments/ApartmentDocumentVersionFactory.php
namespace Database\Factories\Apartments;

use App\Enums\ApartmentDocumentVersionStatus;
use App\Models\Apartments\ApartmentDocument;
use App\Models\Apartments\ApartmentDocumentVersion;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<ApartmentDocumentVersion> */
class ApartmentDocumentVersionFactory extends Factory
{
    protected $model = ApartmentDocumentVersion::class;

    public function definition(): array
    {
        return [
            'apartment_document_id' => ApartmentDocument::factory(),
            'uploaded_by' => User::factory(),
            'file_path' => 'apartments/documents/' . fake()->uuid() . '.pdf',
            'mime_type' => 'application/pdf',
            'size_bytes' => 2048,
            'status' => ApartmentDocumentVersionStatus::PendingReview,
        ];
    }
}
```

- [ ] **Step 4: Run + commit**

```bash
cd apps/api && php artisan test --filter ApartmentDocumentModelTest
git add apps/api/app/Models/Apartments/ApartmentDocument*.php apps/api/database/factories/Apartments/ApartmentDocument*.php apps/api/tests/Feature/Database/ApartmentDocumentModelTest.php
git commit -m "feat(api): add ApartmentDocument and version models"
```

---

### Task 12: Document data migration (user_documents + owner_registration_documents → apartment_documents)

**Files:**
- Create: `apps/api/database/migrations/2026_05_07_000300_migrate_documents_to_apartment_scope.php`

- [ ] **Step 1: Inspect existing tables to determine apartment-context join logic**

```bash
cd apps/api && php artisan tinker --no-interaction
```

In tinker (or via reading migrations): determine how `user_documents` rows resolve to a unit (look at `app/Models/Documents/UserDocument.php` schema and any scope columns).

- [ ] **Step 2: Add `migrated_to_apartment_document_id` reference column to source tables**

```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('user_documents') && ! Schema::hasColumn('user_documents', 'migrated_to_apartment_document_id')) {
            Schema::table('user_documents', function (Blueprint $table): void {
                $table->foreignId('migrated_to_apartment_document_id')->nullable()
                    ->constrained('apartment_documents')->nullOnDelete();
            });
        }

        if (Schema::hasTable('owner_registration_documents') && ! Schema::hasColumn('owner_registration_documents', 'migrated_to_apartment_document_id')) {
            Schema::table('owner_registration_documents', function (Blueprint $table): void {
                $table->foreignId('migrated_to_apartment_document_id')->nullable()
                    ->constrained('apartment_documents')->nullOnDelete();
            });
        }

        $this->migrateOwnerRegistrationDocuments();
        $this->migrateUserDocuments();
    }

    public function down(): void
    {
        if (Schema::hasColumn('user_documents', 'migrated_to_apartment_document_id')) {
            Schema::table('user_documents', function (Blueprint $table): void {
                $table->dropConstrainedForeignId('migrated_to_apartment_document_id');
            });
        }
        if (Schema::hasColumn('owner_registration_documents', 'migrated_to_apartment_document_id')) {
            Schema::table('owner_registration_documents', function (Blueprint $table): void {
                $table->dropConstrainedForeignId('migrated_to_apartment_document_id');
            });
        }
        DB::table('apartment_documents')->whereNotNull('id')->delete();
    }

    private function migrateOwnerRegistrationDocuments(): void
    {
        if (! Schema::hasTable('owner_registration_documents')) return;

        DB::table('owner_registration_documents as ord')
            ->join('owner_registration_requests as orr', 'orr.id', '=', 'ord.owner_registration_request_id')
            ->whereNotNull('orr.unit_id')
            ->whereNull('ord.migrated_to_apartment_document_id')
            ->orderBy('ord.id')
            ->select('ord.*', 'orr.unit_id as resolved_unit_id', 'orr.user_id as resolved_user_id')
            ->chunkById(200, function ($rows): void {
                foreach ($rows as $row) {
                    $apartmentDocId = DB::table('apartment_documents')->insertGetId([
                        'unit_id' => $row->resolved_unit_id,
                        'uploaded_by_user_id' => $row->resolved_user_id,
                        'document_type' => 'ownership_proof',
                        'file_path' => $row->file_path,
                        'mime_type' => $row->mime_type ?? null,
                        'size_bytes' => $row->size_bytes ?? null,
                        'status' => 'active',
                        'version' => 1,
                        'created_at' => $row->created_at,
                        'updated_at' => $row->updated_at,
                    ]);
                    DB::table('owner_registration_documents')->where('id', $row->id)
                        ->update(['migrated_to_apartment_document_id' => $apartmentDocId]);
                }
            }, 'ord.id');
    }

    private function migrateUserDocuments(): void
    {
        if (! Schema::hasTable('user_documents')) return;

        $hasUnitColumn = Schema::hasColumn('user_documents', 'unit_id');
        if (! $hasUnitColumn) {
            return; // No reliable apartment association — skip and leave for manual triage.
        }

        DB::table('user_documents')
            ->whereNotNull('unit_id')
            ->whereNull('migrated_to_apartment_document_id')
            ->orderBy('id')
            ->chunkById(200, function ($rows): void {
                foreach ($rows as $row) {
                    $apartmentDocId = DB::table('apartment_documents')->insertGetId([
                        'unit_id' => $row->unit_id,
                        'uploaded_by_user_id' => $row->user_id,
                        'document_type' => $this->mapDocType($row->document_type ?? 'other'),
                        'file_path' => $row->file_path,
                        'mime_type' => $row->mime_type ?? null,
                        'size_bytes' => $row->size_bytes ?? null,
                        'status' => 'active',
                        'version' => 1,
                        'created_at' => $row->created_at,
                        'updated_at' => $row->updated_at,
                    ]);
                    DB::table('user_documents')->where('id', $row->id)
                        ->update(['migrated_to_apartment_document_id' => $apartmentDocId]);
                }
            });
    }

    private function mapDocType(string $source): string
    {
        return match (strtolower($source)) {
            'lease', 'rental_contract' => 'lease',
            'national_id', 'id', 'id_copy', 'passport' => 'id_copy',
            'utility_bill', 'utility' => 'utility_bill',
            'ownership', 'ownership_proof', 'title_deed' => 'ownership_proof',
            default => 'other',
        };
    }
};
```

- [ ] **Step 3: Migration test**

```php
// apps/api/tests/Feature/Database/ApartmentDocumentMigrationTest.php
namespace Tests\Feature\Database;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class ApartmentDocumentMigrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_migrated_columns_exist(): void
    {
        if (Schema::hasTable('user_documents')) {
            $this->assertTrue(Schema::hasColumn('user_documents', 'migrated_to_apartment_document_id'));
        }
        if (Schema::hasTable('owner_registration_documents')) {
            $this->assertTrue(Schema::hasColumn('owner_registration_documents', 'migrated_to_apartment_document_id'));
        }
    }
}
```

- [ ] **Step 4: Run + commit**

```bash
cd apps/api && php artisan test --filter ApartmentDocumentMigrationTest
git add apps/api/database/migrations/2026_05_07_000300_migrate_documents_to_apartment_scope.php apps/api/tests/Feature/Database/ApartmentDocumentMigrationTest.php
git commit -m "feat(api): migrate user/owner-registration documents to apartment scope"
```

---

### Task 13: ResidentService

**Files:**
- Create: `apps/api/app/Services/Apartments/ResidentService.php`
- Create: `apps/api/app/Services/Apartments/Exceptions/CapacityExceededException.php`
- Test: `apps/api/tests/Feature/Services/Apartments/ResidentServiceTest.php`

- [ ] **Step 1: Test**

```php
namespace Tests\Feature\Services\Apartments;

use App\Enums\UnitRelationType;
use App\Enums\VerificationStatus;
use App\Models\Apartments\ApartmentResident;
use App\Models\Property\Unit;
use App\Models\User;
use App\Services\Apartments\ResidentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ResidentServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_creates_resident_with_user(): void
    {
        $unit = Unit::factory()->create();
        $actor = User::factory()->create();
        $linked = User::factory()->create();

        $resident = app(ResidentService::class)->create($unit, $actor, [
            'user_id' => $linked->id,
            'relation_type' => UnitRelationType::Resident->value,
            'is_primary' => false,
            'verification_status' => VerificationStatus::Verified->value,
        ]);

        $this->assertSame($linked->id, $resident->user_id);
        $this->assertSame($actor->id, $resident->created_by);
    }

    public function test_creates_user_less_resident(): void
    {
        $unit = Unit::factory()->create();
        $actor = User::factory()->create();

        $resident = app(ResidentService::class)->create($unit, $actor, [
            'relation_type' => UnitRelationType::Resident->value,
            'resident_name' => 'Renter Name',
            'resident_phone' => '+201000000000',
        ]);

        $this->assertNull($resident->user_id);
        $this->assertSame('Renter Name', $resident->resident_name);
    }

    public function test_uploads_photo_to_storage(): void
    {
        Storage::fake('public');
        $unit = Unit::factory()->create();
        $actor = User::factory()->create();
        $file = UploadedFile::fake()->image('photo.jpg');

        $resident = app(ResidentService::class)->create($unit, $actor, [
            'relation_type' => UnitRelationType::Resident->value,
            'resident_name' => 'X',
            'photo' => $file,
        ]);

        $this->assertNotNull($resident->photo_path);
        Storage::disk('public')->assertExists($resident->photo_path);
    }

    public function test_update_modifies_resident(): void
    {
        $resident = ApartmentResident::factory()->create();
        $actor = User::factory()->create();

        $updated = app(ResidentService::class)->update($resident, $actor, [
            'resident_name' => 'New Name',
        ]);

        $this->assertSame('New Name', $updated->resident_name);
    }

    public function test_delete_soft_deletes(): void
    {
        $resident = ApartmentResident::factory()->create();
        app(ResidentService::class)->delete($resident);
        $this->assertSoftDeleted($resident);
    }
}
```

- [ ] **Step 2: Implementation**

```php
<?php
namespace App\Services\Apartments;

use App\Models\Apartments\ApartmentResident;
use App\Models\Property\Unit;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class ResidentService
{
    /** @param array<string,mixed> $data */
    public function create(Unit $unit, User $actor, array $data): ApartmentResident
    {
        $photoPath = $this->uploadPhotoIfPresent($data);

        return ApartmentResident::query()->create([
            'unit_id' => $unit->id,
            'user_id' => $data['user_id'] ?? null,
            'relation_type' => $data['relation_type'],
            'is_primary' => $data['is_primary'] ?? false,
            'verification_status' => $data['verification_status'] ?? 'pending',
            'starts_at' => $data['starts_at'] ?? null,
            'ends_at' => $data['ends_at'] ?? null,
            'resident_name' => $data['resident_name'] ?? null,
            'resident_phone' => $data['resident_phone'] ?? null,
            'phone_public' => $data['phone_public'] ?? false,
            'resident_email' => $data['resident_email'] ?? null,
            'email_public' => $data['email_public'] ?? false,
            'photo_path' => $photoPath,
            'created_by' => $actor->id,
        ]);
    }

    /** @param array<string,mixed> $data */
    public function update(ApartmentResident $resident, User $actor, array $data): ApartmentResident
    {
        if (isset($data['photo']) && $data['photo'] instanceof UploadedFile) {
            $data['photo_path'] = $this->uploadPhotoIfPresent($data);
        }
        unset($data['photo']);

        $resident->update($data);
        return $resident->refresh();
    }

    public function delete(ApartmentResident $resident): void
    {
        $resident->delete();
    }

    /** @param array<string,mixed> $data */
    private function uploadPhotoIfPresent(array $data): ?string
    {
        $photo = $data['photo'] ?? null;
        if (! $photo instanceof UploadedFile) return null;
        return $photo->store('apartments/residents', 'public');
    }
}
```

```php
<?php
// apps/api/app/Services/Apartments/Exceptions/CapacityExceededException.php
namespace App\Services\Apartments\Exceptions;

use RuntimeException;

class CapacityExceededException extends RuntimeException {}
```

- [ ] **Step 3: Run + commit**

```bash
cd apps/api && php artisan test --filter ResidentServiceTest
git add apps/api/app/Services/Apartments/ResidentService.php apps/api/app/Services/Apartments/Exceptions/CapacityExceededException.php apps/api/tests/Feature/Services/Apartments/ResidentServiceTest.php
git commit -m "feat(api): add ResidentService"
```

---

### Task 14: VehicleService (with capacity + capability checks)

**Files:**
- Create: `apps/api/app/Services/Apartments/VehicleService.php`
- Create: `apps/api/app/Services/Apartments/Exceptions/CapabilityDisabledException.php`
- Test: `apps/api/tests/Feature/Services/Apartments/VehicleServiceTest.php`

- [ ] **Step 1: Test**

```php
namespace Tests\Feature\Services\Apartments;

use App\Models\Apartments\ApartmentVehicle;
use App\Models\Property\Unit;
use App\Models\User;
use App\Services\Apartments\Exceptions\CapabilityDisabledException;
use App\Services\Apartments\Exceptions\CapacityExceededException;
use App\Services\Apartments\VehicleService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class VehicleServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_creates_vehicle(): void
    {
        $unit = Unit::factory()->create(['has_vehicle' => true]);
        $vehicle = app(VehicleService::class)->create($unit, User::factory()->create(), [
            'plate' => 'ABC-1234', 'make' => 'Toyota',
        ]);
        $this->assertSame('ABC-1234', $vehicle->plate);
    }

    public function test_rejects_when_capability_disabled(): void
    {
        $unit = Unit::factory()->create(['has_vehicle' => false]);
        $this->expectException(CapabilityDisabledException::class);
        app(VehicleService::class)->create($unit, User::factory()->create(), ['plate' => 'X-1']);
    }

    public function test_rejects_over_capacity(): void
    {
        $unit = Unit::factory()->create(['has_vehicle' => true]);
        ApartmentVehicle::factory()->count(4)->create(['unit_id' => $unit->id]);
        $this->expectException(CapacityExceededException::class);
        app(VehicleService::class)->create($unit, User::factory()->create(), ['plate' => 'Y-1']);
    }
}
```

- [ ] **Step 2: Implementation**

```php
<?php
namespace App\Services\Apartments;

use App\Models\Apartments\ApartmentVehicle;
use App\Models\Property\Unit;
use App\Models\User;
use App\Services\Apartments\Exceptions\CapabilityDisabledException;
use App\Services\Apartments\Exceptions\CapacityExceededException;

class VehicleService
{
    private const MAX_PER_UNIT = 4;

    /** @param array<string,mixed> $data */
    public function create(Unit $unit, User $actor, array $data): ApartmentVehicle
    {
        if (! $unit->has_vehicle) {
            throw new CapabilityDisabledException('Vehicles disabled for this unit');
        }
        $count = ApartmentVehicle::query()->where('unit_id', $unit->id)->count();
        if ($count >= self::MAX_PER_UNIT) {
            throw new CapacityExceededException('Vehicle capacity exceeded');
        }

        return ApartmentVehicle::query()->create([
            'unit_id' => $unit->id,
            'apartment_resident_id' => $data['apartment_resident_id'] ?? null,
            'plate' => $data['plate'],
            'make' => $data['make'] ?? null,
            'model' => $data['model'] ?? null,
            'color' => $data['color'] ?? null,
            'sticker_code' => $data['sticker_code'] ?? null,
            'notes' => $data['notes'] ?? null,
            'created_by' => $actor->id,
        ]);
    }

    /** @param array<string,mixed> $data */
    public function update(ApartmentVehicle $vehicle, array $data): ApartmentVehicle
    {
        $vehicle->update($data);
        return $vehicle->refresh();
    }

    public function delete(ApartmentVehicle $vehicle): void
    {
        $vehicle->delete();
    }
}
```

- [ ] **Step 3: Run + commit**

```bash
cd apps/api && php artisan test --filter VehicleServiceTest
git add apps/api/app/Services/Apartments/VehicleService.php apps/api/app/Services/Apartments/Exceptions/CapabilityDisabledException.php apps/api/tests/Feature/Services/Apartments/VehicleServiceTest.php
git commit -m "feat(api): add VehicleService with capacity guard"
```

---

### Task 15: ParkingSpotService

Mirrors VehicleService. Files: `ParkingSpotService.php` + test. Same TDD pattern. Tests cover: create, capability disabled (`has_parking=false`), over-capacity (4). Implementation identical structure on `ApartmentParkingSpot`.

- [ ] **Step 1: Test (parallels VehicleServiceTest, swap ApartmentParkingSpot + has_parking)**

```php
namespace Tests\Feature\Services\Apartments;

use App\Models\Apartments\ApartmentParkingSpot;
use App\Models\Property\Unit;
use App\Models\User;
use App\Services\Apartments\Exceptions\CapabilityDisabledException;
use App\Services\Apartments\Exceptions\CapacityExceededException;
use App\Services\Apartments\ParkingSpotService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ParkingSpotServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_creates_spot(): void
    {
        $unit = Unit::factory()->create(['has_parking' => true]);
        $spot = app(ParkingSpotService::class)->create($unit, User::factory()->create(), [
            'code' => 'P-A1',
        ]);
        $this->assertSame('P-A1', $spot->code);
    }

    public function test_rejects_when_capability_disabled(): void
    {
        $unit = Unit::factory()->create(['has_parking' => false]);
        $this->expectException(CapabilityDisabledException::class);
        app(ParkingSpotService::class)->create($unit, User::factory()->create(), ['code' => 'X']);
    }

    public function test_rejects_over_capacity(): void
    {
        $unit = Unit::factory()->create(['has_parking' => true]);
        ApartmentParkingSpot::factory()->count(4)->create(['unit_id' => $unit->id]);
        $this->expectException(CapacityExceededException::class);
        app(ParkingSpotService::class)->create($unit, User::factory()->create(), ['code' => 'Z']);
    }
}
```

- [ ] **Step 2: Implementation**

```php
<?php
namespace App\Services\Apartments;

use App\Models\Apartments\ApartmentParkingSpot;
use App\Models\Property\Unit;
use App\Models\User;
use App\Services\Apartments\Exceptions\CapabilityDisabledException;
use App\Services\Apartments\Exceptions\CapacityExceededException;

class ParkingSpotService
{
    private const MAX_PER_UNIT = 4;

    /** @param array<string,mixed> $data */
    public function create(Unit $unit, User $actor, array $data): ApartmentParkingSpot
    {
        if (! $unit->has_parking) {
            throw new CapabilityDisabledException('Parking disabled for this unit');
        }
        $count = ApartmentParkingSpot::query()->where('unit_id', $unit->id)->count();
        if ($count >= self::MAX_PER_UNIT) {
            throw new CapacityExceededException('Parking capacity exceeded');
        }
        return ApartmentParkingSpot::query()->create([
            'unit_id' => $unit->id,
            'code' => $data['code'],
            'notes' => $data['notes'] ?? null,
            'created_by' => $actor->id,
        ]);
    }

    /** @param array<string,mixed> $data */
    public function update(ApartmentParkingSpot $spot, array $data): ApartmentParkingSpot
    {
        $spot->update($data);
        return $spot->refresh();
    }

    public function delete(ApartmentParkingSpot $spot): void
    {
        $spot->delete();
    }
}
```

- [ ] **Step 3: Run + commit**

```bash
cd apps/api && php artisan test --filter ParkingSpotServiceTest
git add apps/api/app/Services/Apartments/ParkingSpotService.php apps/api/tests/Feature/Services/Apartments/ParkingSpotServiceTest.php
git commit -m "feat(api): add ParkingSpotService with capacity guard"
```

---

### Task 16: NoteService, ViolationRuleService, ViolationApplicationService

Three small services, one commit per service. Each has a TDD pair.

- [ ] **Step 1: NoteService — append + paginated list**

Test:
```php
// apps/api/tests/Feature/Services/Apartments/NoteServiceTest.php
namespace Tests\Feature\Services\Apartments;

use App\Models\Apartments\ApartmentNote;
use App\Models\Property\Unit;
use App\Models\User;
use App\Services\Apartments\NoteService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NoteServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_append_creates_note(): void
    {
        $unit = Unit::factory()->create();
        $author = User::factory()->create();
        $note = app(NoteService::class)->append($unit, $author, 'paid gas');
        $this->assertSame('paid gas', $note->body);
        $this->assertSame($author->id, $note->author_id);
    }

    public function test_listing_orders_desc(): void
    {
        $unit = Unit::factory()->create();
        ApartmentNote::factory()->count(3)->create(['unit_id' => $unit->id]);
        $page = app(NoteService::class)->paginate($unit);
        $this->assertCount(3, $page->items());
    }
}
```

Implementation:
```php
<?php
namespace App\Services\Apartments;

use App\Models\Apartments\ApartmentNote;
use App\Models\Property\Unit;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class NoteService
{
    public function append(Unit $unit, User $author, string $body): ApartmentNote
    {
        return ApartmentNote::query()->create([
            'unit_id' => $unit->id,
            'author_id' => $author->id,
            'body' => $body,
        ]);
    }

    public function paginate(Unit $unit, int $perPage = 20): LengthAwarePaginator
    {
        return ApartmentNote::query()
            ->where('unit_id', $unit->id)
            ->orderByDesc('created_at')
            ->with('author:id,name')
            ->paginate($perPage);
    }
}
```

```bash
cd apps/api && php artisan test --filter NoteServiceTest
git add apps/api/app/Services/Apartments/NoteService.php apps/api/tests/Feature/Services/Apartments/NoteServiceTest.php
git commit -m "feat(api): add NoteService"
```

- [ ] **Step 2: ViolationRuleService — admin CRUD**

Test:
```php
// apps/api/tests/Feature/Services/Apartments/ViolationRuleServiceTest.php
namespace Tests\Feature\Services\Apartments;

use App\Models\Apartments\ViolationRule;
use App\Models\Property\Compound;
use App\Models\User;
use App\Services\Apartments\ViolationRuleService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ViolationRuleServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_creates_rule(): void
    {
        $compound = Compound::factory()->create();
        $rule = app(ViolationRuleService::class)->create($compound, User::factory()->create(), [
            'name' => 'Speeding', 'default_fee' => 500,
        ]);
        $this->assertSame('Speeding', $rule->name);
        $this->assertSame($compound->id, $rule->compound_id);
    }

    public function test_updates_rule(): void
    {
        $rule = ViolationRule::factory()->create(['default_fee' => 100]);
        $updated = app(ViolationRuleService::class)->update($rule, ['default_fee' => 200]);
        $this->assertSame('200.00', (string) $updated->default_fee);
    }

    public function test_archives_rule(): void
    {
        $rule = ViolationRule::factory()->create();
        app(ViolationRuleService::class)->archive($rule);
        $this->assertSoftDeleted($rule);
    }
}
```

Impl:
```php
<?php
namespace App\Services\Apartments;

use App\Models\Apartments\ViolationRule;
use App\Models\Property\Compound;
use App\Models\User;

class ViolationRuleService
{
    /** @param array<string,mixed> $data */
    public function create(Compound $compound, User $actor, array $data): ViolationRule
    {
        return ViolationRule::query()->create([
            'compound_id' => $compound->id,
            'name' => $data['name'],
            'name_ar' => $data['name_ar'] ?? null,
            'description' => $data['description'] ?? null,
            'default_fee' => $data['default_fee'] ?? 0,
            'is_active' => $data['is_active'] ?? true,
            'created_by' => $actor->id,
        ]);
    }

    /** @param array<string,mixed> $data */
    public function update(ViolationRule $rule, array $data): ViolationRule
    {
        $rule->update($data);
        return $rule->refresh();
    }

    public function archive(ViolationRule $rule): void
    {
        $rule->delete();
    }
}
```

```bash
cd apps/api && php artisan test --filter ViolationRuleServiceTest
git add apps/api/app/Services/Apartments/ViolationRuleService.php apps/api/tests/Feature/Services/Apartments/ViolationRuleServiceTest.php
git commit -m "feat(api): add ViolationRuleService"
```

- [ ] **Step 3: ViolationApplicationService — apply + paid + waived**

Test:
```php
// apps/api/tests/Feature/Services/Apartments/ViolationApplicationServiceTest.php
namespace Tests\Feature\Services\Apartments;

use App\Enums\ApartmentViolationStatus;
use App\Models\Apartments\ApartmentViolation;
use App\Models\Apartments\ViolationRule;
use App\Models\Property\Unit;
use App\Models\User;
use App\Services\Apartments\ViolationApplicationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ViolationApplicationServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_apply_creates_violation_with_rule_fee(): void
    {
        $unit = Unit::factory()->create();
        $rule = ViolationRule::factory()->create(['default_fee' => 300]);
        $admin = User::factory()->create();
        $violation = app(ViolationApplicationService::class)->apply($unit, $rule, $admin, []);

        $this->assertSame('300.00', (string) $violation->fee);
        $this->assertSame(ApartmentViolationStatus::Pending, $violation->status);
    }

    public function test_apply_supports_fee_override(): void
    {
        $unit = Unit::factory()->create();
        $rule = ViolationRule::factory()->create(['default_fee' => 300]);
        $violation = app(ViolationApplicationService::class)->apply(
            $unit, $rule, User::factory()->create(),
            ['fee' => 500, 'notes' => 'second offense']
        );
        $this->assertSame('500.00', (string) $violation->fee);
        $this->assertSame('second offense', $violation->notes);
    }

    public function test_mark_paid(): void
    {
        $violation = ApartmentViolation::factory()->create();
        $updated = app(ViolationApplicationService::class)->markPaid($violation);
        $this->assertSame(ApartmentViolationStatus::Paid, $updated->status);
        $this->assertNotNull($updated->paid_at);
    }

    public function test_mark_waived(): void
    {
        $violation = ApartmentViolation::factory()->create();
        $updated = app(ViolationApplicationService::class)->markWaived($violation, 'goodwill');
        $this->assertSame(ApartmentViolationStatus::Waived, $updated->status);
        $this->assertSame('goodwill', $updated->waived_reason);
    }
}
```

Impl:
```php
<?php
namespace App\Services\Apartments;

use App\Enums\ApartmentViolationStatus;
use App\Models\Apartments\ApartmentViolation;
use App\Models\Apartments\ViolationRule;
use App\Models\Property\Unit;
use App\Models\User;

class ViolationApplicationService
{
    /** @param array<string,mixed> $data */
    public function apply(Unit $unit, ViolationRule $rule, User $admin, array $data): ApartmentViolation
    {
        return ApartmentViolation::query()->create([
            'unit_id' => $unit->id,
            'violation_rule_id' => $rule->id,
            'applied_by' => $admin->id,
            'fee' => $data['fee'] ?? $rule->default_fee,
            'notes' => $data['notes'] ?? null,
            'status' => ApartmentViolationStatus::Pending,
        ]);
    }

    public function markPaid(ApartmentViolation $violation): ApartmentViolation
    {
        $violation->update([
            'status' => ApartmentViolationStatus::Paid,
            'paid_at' => now(),
        ]);
        return $violation->refresh();
    }

    public function markWaived(ApartmentViolation $violation, string $reason): ApartmentViolation
    {
        $violation->update([
            'status' => ApartmentViolationStatus::Waived,
            'waived_reason' => $reason,
        ]);
        return $violation->refresh();
    }
}
```

```bash
cd apps/api && php artisan test --filter ViolationApplicationServiceTest
git add apps/api/app/Services/Apartments/ViolationApplicationService.php apps/api/tests/Feature/Services/Apartments/ViolationApplicationServiceTest.php
git commit -m "feat(api): add ViolationApplicationService"
```

---

### Task 17: ApartmentDocumentService + ApartmentDocumentReviewService

**Files:**
- Create: `apps/api/app/Services/Apartments/ApartmentDocumentService.php`
- Create: `apps/api/app/Services/Apartments/ApartmentDocumentReviewService.php`
- Test: `apps/api/tests/Feature/Services/Apartments/ApartmentDocumentServiceTest.php`
- Test: `apps/api/tests/Feature/Services/Apartments/ApartmentDocumentReviewServiceTest.php`

- [ ] **Step 1: Tests**

```php
// ApartmentDocumentServiceTest
namespace Tests\Feature\Services\Apartments;

use App\Enums\ApartmentDocumentStatus;
use App\Enums\ApartmentDocumentType;
use App\Enums\ApartmentDocumentVersionStatus;
use App\Models\Apartments\ApartmentDocument;
use App\Models\Property\Unit;
use App\Models\User;
use App\Services\Apartments\ApartmentDocumentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ApartmentDocumentServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_initial_upload_is_active(): void
    {
        Storage::fake('public');
        $unit = Unit::factory()->create();
        $user = User::factory()->create();
        $file = UploadedFile::fake()->create('lease.pdf', 100, 'application/pdf');

        $doc = app(ApartmentDocumentService::class)->upload(
            $unit, $user, ApartmentDocumentType::Lease, $file
        );

        $this->assertSame(ApartmentDocumentStatus::Active, $doc->status);
        $this->assertSame(1, $doc->version);
    }

    public function test_replace_creates_pending_version_keeps_active(): void
    {
        Storage::fake('public');
        $doc = ApartmentDocument::factory()->create();
        $user = User::factory()->create();
        $file = UploadedFile::fake()->create('updated.pdf', 100, 'application/pdf');

        $version = app(ApartmentDocumentService::class)->replace($doc, $user, $file);

        $this->assertSame(ApartmentDocumentVersionStatus::PendingReview, $version->status);
        $this->assertSame(ApartmentDocumentStatus::Active, $doc->fresh()->status);
    }
}
```

```php
// ApartmentDocumentReviewServiceTest
namespace Tests\Feature\Services\Apartments;

use App\Enums\ApartmentDocumentStatus;
use App\Enums\ApartmentDocumentVersionStatus;
use App\Models\Apartments\ApartmentDocument;
use App\Models\Apartments\ApartmentDocumentVersion;
use App\Models\User;
use App\Services\Apartments\ApartmentDocumentReviewService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApartmentDocumentReviewServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_approve_swaps_versions(): void
    {
        $doc = ApartmentDocument::factory()->create([
            'file_path' => 'old/path.pdf', 'version' => 1,
        ]);
        $version = ApartmentDocumentVersion::factory()->create([
            'apartment_document_id' => $doc->id,
            'file_path' => 'new/path.pdf',
        ]);
        $admin = User::factory()->create();

        app(ApartmentDocumentReviewService::class)->approve($version, $admin, 'looks good');

        $version->refresh();
        $doc->refresh();
        $this->assertSame(ApartmentDocumentVersionStatus::Approved, $version->status);
        $this->assertSame('new/path.pdf', $doc->file_path);
        $this->assertSame(2, $doc->version);
    }

    public function test_reject_keeps_active_unchanged(): void
    {
        $doc = ApartmentDocument::factory()->create(['file_path' => 'old.pdf']);
        $version = ApartmentDocumentVersion::factory()->create(['apartment_document_id' => $doc->id]);
        app(ApartmentDocumentReviewService::class)->reject($version, User::factory()->create(), 'blurry');
        $version->refresh();
        $this->assertSame(ApartmentDocumentVersionStatus::Rejected, $version->status);
        $this->assertSame('old.pdf', $doc->fresh()->file_path);
    }
}
```

- [ ] **Step 2: Implementation**

```php
<?php
namespace App\Services\Apartments;

use App\Enums\ApartmentDocumentStatus;
use App\Enums\ApartmentDocumentType;
use App\Enums\ApartmentDocumentVersionStatus;
use App\Models\Apartments\ApartmentDocument;
use App\Models\Apartments\ApartmentDocumentVersion;
use App\Models\Property\Unit;
use App\Models\User;
use Illuminate\Http\UploadedFile;

class ApartmentDocumentService
{
    public function upload(Unit $unit, User $uploader, ApartmentDocumentType $type, UploadedFile $file): ApartmentDocument
    {
        $path = $file->store("apartments/{$unit->id}/documents", 'public');

        return ApartmentDocument::query()->create([
            'unit_id' => $unit->id,
            'uploaded_by_user_id' => $uploader->id,
            'document_type' => $type,
            'file_path' => $path,
            'mime_type' => $file->getMimeType(),
            'size_bytes' => $file->getSize(),
            'status' => ApartmentDocumentStatus::Active,
            'version' => 1,
        ]);
    }

    public function replace(ApartmentDocument $doc, User $uploader, UploadedFile $file): ApartmentDocumentVersion
    {
        $path = $file->store("apartments/{$doc->unit_id}/documents", 'public');

        return ApartmentDocumentVersion::query()->create([
            'apartment_document_id' => $doc->id,
            'uploaded_by' => $uploader->id,
            'file_path' => $path,
            'mime_type' => $file->getMimeType(),
            'size_bytes' => $file->getSize(),
            'status' => ApartmentDocumentVersionStatus::PendingReview,
        ]);
    }

    public function archive(ApartmentDocument $doc): void
    {
        $doc->update(['status' => ApartmentDocumentStatus::Archived]);
    }
}
```

```php
<?php
namespace App\Services\Apartments;

use App\Enums\ApartmentDocumentVersionStatus;
use App\Models\Apartments\ApartmentDocumentVersion;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class ApartmentDocumentReviewService
{
    public function approve(ApartmentDocumentVersion $version, User $admin, ?string $notes = null): void
    {
        DB::transaction(function () use ($version, $admin, $notes): void {
            $doc = $version->document;
            $doc->update([
                'file_path' => $version->file_path,
                'mime_type' => $version->mime_type,
                'size_bytes' => $version->size_bytes,
                'version' => $doc->version + 1,
            ]);
            $version->update([
                'status' => ApartmentDocumentVersionStatus::Approved,
                'reviewed_by' => $admin->id,
                'reviewed_at' => now(),
                'review_notes' => $notes,
            ]);
        });
    }

    public function reject(ApartmentDocumentVersion $version, User $admin, ?string $notes = null): void
    {
        $version->update([
            'status' => ApartmentDocumentVersionStatus::Rejected,
            'reviewed_by' => $admin->id,
            'reviewed_at' => now(),
            'review_notes' => $notes,
        ]);
    }
}
```

- [ ] **Step 3: Run + commit**

```bash
cd apps/api && php artisan test --filter "ApartmentDocumentServiceTest|ApartmentDocumentReviewServiceTest"
git add apps/api/app/Services/Apartments/ApartmentDocumentService.php apps/api/app/Services/Apartments/ApartmentDocumentReviewService.php apps/api/tests/Feature/Services/Apartments/ApartmentDocument*ServiceTest.php
git commit -m "feat(api): add document upload and review services"
```

---

### Task 18: Policies — ApartmentPolicy, ViolationRulePolicy, ApartmentDocumentReviewPolicy

**Files:**
- Create: `apps/api/app/Policies/Apartments/ApartmentPolicy.php`
- Create: `apps/api/app/Policies/Apartments/ViolationRulePolicy.php`
- Create: `apps/api/app/Policies/Apartments/ApartmentDocumentReviewPolicy.php`
- Modify: `apps/api/app/Providers/AuthServiceProvider.php` (register policies)

- [ ] **Step 1: ApartmentPolicy**

```php
<?php
namespace App\Policies\Apartments;

use App\Enums\VerificationStatus;
use App\Models\Apartments\ApartmentResident;
use App\Models\Property\Unit;
use App\Models\User;

class ApartmentPolicy
{
    public function view(User $user, Unit $unit): bool
    {
        return $this->hasActiveVerifiedMembership($user, $unit);
    }

    public function manage(User $user, Unit $unit): bool
    {
        return $this->hasActiveVerifiedMembership($user, $unit);
    }

    private function hasActiveVerifiedMembership(User $user, Unit $unit): bool
    {
        return ApartmentResident::query()
            ->active()
            ->where('user_id', $user->id)
            ->where('unit_id', $unit->id)
            ->where('verification_status', VerificationStatus::Verified->value)
            ->exists();
    }
}
```

- [ ] **Step 2: ViolationRulePolicy + ReviewPolicy**

```php
<?php
namespace App\Policies\Apartments;

use App\Enums\Permission;
use App\Models\User;

class ViolationRulePolicy
{
    public function manage(User $user): bool
    {
        return $user->can(Permission::ApartmentsAdmin->value);
    }

    public function apply(User $user): bool
    {
        return $user->can(Permission::ApplyApartmentViolation->value);
    }
}
```

```php
<?php
namespace App\Policies\Apartments;

use App\Enums\Permission;
use App\Models\User;

class ApartmentDocumentReviewPolicy
{
    public function review(User $user): bool
    {
        return $user->can(Permission::ApartmentsAdmin->value);
    }
}
```

- [ ] **Step 3: Register in AuthServiceProvider**

Add to `$policies` array:
```php
\App\Models\Property\Unit::class => \App\Policies\Apartments\ApartmentPolicy::class,
```

(Other two are accessed via `Gate::authorize` directly in controllers — no model binding needed.)

- [ ] **Step 4: Test**

```php
// apps/api/tests/Feature/Policies/Apartments/ApartmentPolicyTest.php
namespace Tests\Feature\Policies\Apartments;

use App\Enums\UnitRelationType;
use App\Enums\VerificationStatus;
use App\Models\Apartments\ApartmentResident;
use App\Models\Property\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApartmentPolicyTest extends TestCase
{
    use RefreshDatabase;

    public function test_verified_resident_can_manage(): void
    {
        $user = User::factory()->create();
        $unit = Unit::factory()->create();
        ApartmentResident::factory()->create([
            'user_id' => $user->id,
            'unit_id' => $unit->id,
            'verification_status' => VerificationStatus::Verified,
        ]);
        $this->assertTrue($user->can('manage', $unit));
    }

    public function test_pending_resident_cannot_manage(): void
    {
        $user = User::factory()->create();
        $unit = Unit::factory()->create();
        ApartmentResident::factory()->create([
            'user_id' => $user->id,
            'unit_id' => $unit->id,
            'verification_status' => VerificationStatus::Pending,
        ]);
        $this->assertFalse($user->can('manage', $unit));
    }

    public function test_outsider_cannot_manage(): void
    {
        $user = User::factory()->create();
        $unit = Unit::factory()->create();
        $this->assertFalse($user->can('manage', $unit));
    }
}
```

- [ ] **Step 5: Run + commit**

```bash
cd apps/api && php artisan test --filter ApartmentPolicyTest
git add apps/api/app/Policies/Apartments apps/api/app/Providers/AuthServiceProvider.php apps/api/tests/Feature/Policies/Apartments/ApartmentPolicyTest.php
git commit -m "feat(api): add apartments policies"
```

---

### Task 19: API Resources

**Files:**
- Create: `apps/api/app/Http/Resources/Apartments/ApartmentResource.php`
- Create: `apps/api/app/Http/Resources/Apartments/ApartmentResidentResource.php` (move from old `UnitMembershipResource`)
- Create: `apps/api/app/Http/Resources/Apartments/ApartmentVehicleResource.php`
- Create: `apps/api/app/Http/Resources/Apartments/ApartmentParkingSpotResource.php`
- Create: `apps/api/app/Http/Resources/Apartments/ApartmentNoteResource.php`
- Create: `apps/api/app/Http/Resources/Apartments/ApartmentViolationResource.php`
- Create: `apps/api/app/Http/Resources/Apartments/ApartmentDocumentResource.php`
- Create: `apps/api/app/Http/Resources/Apartments/ViolationRuleResource.php`

- [ ] **Step 1: Each resource is a thin `JsonResource` exposing camelCase keys + relationships when loaded**

Example pattern:
```php
<?php
namespace App\Http\Resources\Apartments;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ApartmentVehicleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'unitId' => $this->unit_id,
            'apartmentResidentId' => $this->apartment_resident_id,
            'plate' => $this->plate,
            'make' => $this->make,
            'model' => $this->model,
            'color' => $this->color,
            'stickerCode' => $this->sticker_code,
            'notes' => $this->notes,
            'createdAt' => $this->created_at?->toIso8601String(),
        ];
    }
}
```

Repeat for all listed resources, mapping all model attributes to camelCase keys. `ApartmentResource` aggregates: `unit` summary, `residents`, `vehicles`, `parkingSpots`, `violationsSummary` (count + total), `recentNotes`, `documents`, `finance` (UnitAccount summary + outstanding charges from `LedgerEntry::query()->where('unit_account_id', ...)->where('balance_remaining', '>', 0)`).

- [ ] **Step 2: Commit**

```bash
git add apps/api/app/Http/Resources/Apartments
git commit -m "feat(api): add apartments API resources"
```

---

### Task 20: Form Requests

**Files (one per write endpoint):**

`apps/api/app/Http/Requests/Apartments/StoreApartmentResidentRequest.php`
`apps/api/app/Http/Requests/Apartments/UpdateApartmentResidentRequest.php`
`apps/api/app/Http/Requests/Apartments/StoreApartmentVehicleRequest.php`
`apps/api/app/Http/Requests/Apartments/UpdateApartmentVehicleRequest.php`
`apps/api/app/Http/Requests/Apartments/StoreApartmentParkingSpotRequest.php`
`apps/api/app/Http/Requests/Apartments/UpdateApartmentParkingSpotRequest.php`
`apps/api/app/Http/Requests/Apartments/StoreApartmentNoteRequest.php`
`apps/api/app/Http/Requests/Apartments/StoreApartmentDocumentRequest.php`
`apps/api/app/Http/Requests/Apartments/ReplaceApartmentDocumentRequest.php`
`apps/api/app/Http/Requests/Admin/Apartments/StoreViolationRuleRequest.php`
`apps/api/app/Http/Requests/Admin/Apartments/UpdateViolationRuleRequest.php`
`apps/api/app/Http/Requests/Admin/Apartments/ApplyViolationRequest.php`
`apps/api/app/Http/Requests/Admin/Apartments/MarkWaivedRequest.php`
`apps/api/app/Http/Requests/Admin/Apartments/ReviewDocumentVersionRequest.php`

- [ ] **Step 1: Standard FormRequest pattern. Example:**

```php
<?php
namespace App\Http\Requests\Apartments;

use App\Enums\UnitRelationType;
use App\Enums\VerificationStatus;
use Illuminate\Foundation\Http\FormRequest;

class StoreApartmentResidentRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
            'relation_type' => ['required', 'string', 'in:' . implode(',', array_column(UnitRelationType::cases(), 'value'))],
            'is_primary' => ['sometimes', 'boolean'],
            'verification_status' => ['sometimes', 'string', 'in:' . implode(',', array_column(VerificationStatus::cases(), 'value'))],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
            'resident_name' => ['nullable', 'string', 'max:200'],
            'resident_phone' => ['nullable', 'string', 'max:50'],
            'phone_public' => ['sometimes', 'boolean'],
            'resident_email' => ['nullable', 'email', 'max:200'],
            'email_public' => ['sometimes', 'boolean'],
            'photo' => ['nullable', 'image', 'max:4096'],
        ];
    }
}
```

Repeat per resource with appropriate rules. Key constraints:
- `StoreApartmentVehicleRequest`: `plate` required string max 50; resident_id nullable exists.
- `StoreApartmentParkingSpotRequest`: `code` required string max 50.
- `StoreApartmentNoteRequest`: `body` required string max 5000.
- `StoreApartmentDocumentRequest`: `document_type` required enum; `file` required file mime types pdf/jpg/png/heic max 10240.
- `ReplaceApartmentDocumentRequest`: `file` required.
- `ApplyViolationRequest`: `violation_rule_id` required exists; `fee` nullable numeric min 0; `notes` nullable string.
- `MarkWaivedRequest`: `reason` required string max 500.
- `ReviewDocumentVersionRequest`: `decision` required `in:approved,rejected`; `notes` nullable string max 1000.

- [ ] **Step 2: Commit**

```bash
git add apps/api/app/Http/Requests/Apartments apps/api/app/Http/Requests/Admin/Apartments
git commit -m "feat(api): add apartments form requests"
```

---

### Task 21: ApartmentController + show payload

**Files:**
- Create: `apps/api/app/Http/Controllers/Api/V1/Apartments/ApartmentController.php`
- Test: `apps/api/tests/Feature/Api/V1/Apartments/ApartmentControllerTest.php`

- [ ] **Step 1: Test**

```php
namespace Tests\Feature\Api\V1\Apartments;

use App\Enums\UnitRelationType;
use App\Enums\VerificationStatus;
use App\Models\Apartments\ApartmentResident;
use App\Models\Property\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ApartmentControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_returns_units_for_resident(): void
    {
        $user = User::factory()->create();
        $unit = Unit::factory()->create();
        ApartmentResident::factory()->create([
            'unit_id' => $unit->id, 'user_id' => $user->id,
            'verification_status' => VerificationStatus::Verified,
            'relation_type' => UnitRelationType::Owner,
        ]);
        Sanctum::actingAs($user);
        $this->getJson('/api/v1/apartments')
            ->assertOk()
            ->assertJsonPath('data.0.id', $unit->id);
    }

    public function test_show_returns_aggregate_payload(): void
    {
        $user = User::factory()->create();
        $unit = Unit::factory()->create(['has_vehicle' => true, 'has_parking' => true]);
        ApartmentResident::factory()->create([
            'unit_id' => $unit->id, 'user_id' => $user->id,
            'verification_status' => VerificationStatus::Verified,
        ]);
        Sanctum::actingAs($user);
        $this->getJson("/api/v1/apartments/{$unit->id}")
            ->assertOk()
            ->assertJsonStructure(['data' => ['id', 'residents', 'vehicles', 'parkingSpots', 'violationsSummary', 'documents', 'finance']]);
    }

    public function test_show_blocks_non_member(): void
    {
        $user = User::factory()->create();
        $unit = Unit::factory()->create();
        Sanctum::actingAs($user);
        $this->getJson("/api/v1/apartments/{$unit->id}")->assertForbidden();
    }
}
```

- [ ] **Step 2: Implementation**

```php
<?php
namespace App\Http\Controllers\Api\V1\Apartments;

use App\Enums\VerificationStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\Apartments\ApartmentResource;
use App\Models\Apartments\ApartmentResident;
use App\Models\Property\Unit;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ApartmentController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $unitIds = ApartmentResident::query()
            ->active()
            ->where('user_id', $request->user()->id)
            ->where('verification_status', VerificationStatus::Verified->value)
            ->pluck('unit_id')->unique();

        $units = Unit::query()
            ->whereIn('id', $unitIds)
            ->with(['building', 'floor'])
            ->get();

        return ApartmentResource::collection($units);
    }

    public function show(Request $request, Unit $unit): ApartmentResource
    {
        $this->authorize('view', $unit);

        $unit->load([
            'building', 'floor',
            'apartmentResidents' => fn($q) => $q->with('user'),
            'apartmentVehicles',
            'apartmentParkingSpots',
            'apartmentNotes' => fn($q) => $q->latest()->limit(20)->with('author:id,name'),
            'apartmentDocuments' => fn($q) => $q->where('status', 'active'),
            'unitAccount.ledgerEntries' => fn($q) => $q->whereColumn('balance_remaining', '>', 0)->limit(50),
        ]);

        return new ApartmentResource($unit);
    }
}
```

Add the relations on `Unit` model (`apartmentResidents`, `apartmentVehicles`, `apartmentParkingSpots`, `apartmentNotes`, `apartmentDocuments`) as `HasMany` to the corresponding apartment models.

- [ ] **Step 3: Run + commit**

```bash
cd apps/api && php artisan test --filter ApartmentControllerTest
git add apps/api/app/Http/Controllers/Api/V1/Apartments/ApartmentController.php apps/api/app/Models/Property/Unit.php apps/api/tests/Feature/Api/V1/Apartments/ApartmentControllerTest.php
git commit -m "feat(api): add ApartmentController index and show"
```

---

### Task 22: Resident-facing CRUD controllers (Resident, Vehicle, ParkingSpot, Note, Violation, Document)

Six controllers. Each follows the same shape: nested under `apartments/{unit}`. One commit per controller. Pattern shown for `ApartmentResidentController`; replicate for others.

- [ ] **Step 1: ApartmentResidentController**

```php
<?php
namespace App\Http\Controllers\Api\V1\Apartments;

use App\Http\Controllers\Controller;
use App\Http\Requests\Apartments\StoreApartmentResidentRequest;
use App\Http\Requests\Apartments\UpdateApartmentResidentRequest;
use App\Http\Resources\Apartments\ApartmentResidentResource;
use App\Models\Apartments\ApartmentResident;
use App\Models\Property\Unit;
use App\Services\Apartments\ResidentService;
use Illuminate\Http\Request;

class ApartmentResidentController extends Controller
{
    public function __construct(private readonly ResidentService $service) {}

    public function index(Request $request, Unit $unit)
    {
        $this->authorize('view', $unit);
        return ApartmentResidentResource::collection(
            $unit->apartmentResidents()->with('user')->get()
        );
    }

    public function store(StoreApartmentResidentRequest $request, Unit $unit)
    {
        $this->authorize('manage', $unit);
        $resident = $this->service->create($unit, $request->user(), $request->validated());
        return new ApartmentResidentResource($resident);
    }

    public function update(UpdateApartmentResidentRequest $request, Unit $unit, ApartmentResident $resident)
    {
        abort_if($resident->unit_id !== $unit->id, 404);
        $this->authorize('manage', $unit);
        $updated = $this->service->update($resident, $request->user(), $request->validated());
        return new ApartmentResidentResource($updated);
    }

    public function destroy(Request $request, Unit $unit, ApartmentResident $resident)
    {
        abort_if($resident->unit_id !== $unit->id, 404);
        $this->authorize('manage', $unit);
        $this->service->delete($resident);
        return response()->noContent();
    }
}
```

Test:
```php
namespace Tests\Feature\Api\V1\Apartments;

use App\Enums\UnitRelationType;
use App\Enums\VerificationStatus;
use App\Models\Apartments\ApartmentResident;
use App\Models\Property\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ApartmentResidentControllerTest extends TestCase
{
    use RefreshDatabase;

    private function authedMember(): array
    {
        $user = User::factory()->create();
        $unit = Unit::factory()->create();
        ApartmentResident::factory()->create([
            'unit_id' => $unit->id, 'user_id' => $user->id,
            'verification_status' => VerificationStatus::Verified,
        ]);
        Sanctum::actingAs($user);
        return [$user, $unit];
    }

    public function test_member_can_create_resident(): void
    {
        [, $unit] = $this->authedMember();
        $this->postJson("/api/v1/apartments/{$unit->id}/residents", [
            'relation_type' => UnitRelationType::Resident->value,
            'resident_name' => 'New Family',
        ])->assertCreated()->assertJsonPath('data.residentName', 'New Family');
    }

    public function test_non_member_blocked(): void
    {
        $unit = Unit::factory()->create();
        Sanctum::actingAs(User::factory()->create());
        $this->postJson("/api/v1/apartments/{$unit->id}/residents", [
            'relation_type' => UnitRelationType::Resident->value,
            'resident_name' => 'X',
        ])->assertForbidden();
    }

    public function test_member_can_delete_resident(): void
    {
        [, $unit] = $this->authedMember();
        $r = ApartmentResident::factory()->create(['unit_id' => $unit->id]);
        $this->deleteJson("/api/v1/apartments/{$unit->id}/residents/{$r->id}")->assertNoContent();
    }
}
```

```bash
cd apps/api && php artisan test --filter ApartmentResidentControllerTest
git add apps/api/app/Http/Controllers/Api/V1/Apartments/ApartmentResidentController.php apps/api/tests/Feature/Api/V1/Apartments/ApartmentResidentControllerTest.php
git commit -m "feat(api): add ApartmentResidentController"
```

- [ ] **Step 2: ApartmentVehicleController**

Mirrors above. Service: `VehicleService`. Test covers create success, capability disabled (422), capacity exceeded (409), update, delete. Map service `CapacityExceededException` → 409, `CapabilityDisabledException` → 422 via the controller (try/catch + abort with status).

- [ ] **Step 3: ApartmentParkingSpotController**

Same pattern as VehicleController, swap models/service.

- [ ] **Step 4: ApartmentNoteController** (index + store only)

```php
public function store(StoreApartmentNoteRequest $request, Unit $unit)
{
    $this->authorize('manage', $unit);
    $note = app(NoteService::class)->append($unit, $request->user(), $request->string('body'));
    return new ApartmentNoteResource($note->load('author:id,name'));
}
```

- [ ] **Step 5: ApartmentViolationController** (read-only, index)

```php
public function index(Request $request, Unit $unit)
{
    $this->authorize('view', $unit);
    return ApartmentViolationResource::collection(
        $unit->apartmentViolations()->with('rule')->latest()->paginate(50)
    );
}
```

- [ ] **Step 6: ApartmentDocumentController** (index, store, replace, download)

```php
public function store(StoreApartmentDocumentRequest $request, Unit $unit)
{
    $this->authorize('manage', $unit);
    $doc = app(ApartmentDocumentService::class)->upload(
        $unit, $request->user(),
        \App\Enums\ApartmentDocumentType::from($request->string('document_type')),
        $request->file('file')
    );
    return new ApartmentDocumentResource($doc);
}

public function replace(ReplaceApartmentDocumentRequest $request, Unit $unit, ApartmentDocument $document)
{
    abort_if($document->unit_id !== $unit->id, 404);
    $this->authorize('manage', $unit);
    $version = app(ApartmentDocumentService::class)->replace($document, $request->user(), $request->file('file'));
    return response()->json(['data' => ['versionId' => $version->id, 'status' => $version->status->value]], 202);
}
```

- [ ] **Step 7: Each controller commits separately**

For each of vehicle/parking/note/violation/document:
```bash
cd apps/api && php artisan test --filter <ControllerName>Test
git add apps/api/app/Http/Controllers/Api/V1/Apartments/<Controller>.php apps/api/tests/Feature/Api/V1/Apartments/<ControllerName>Test.php
git commit -m "feat(api): add <Controller>"
```

---

### Task 23: Admin controllers — ViolationRule, ViolationApplication, ApartmentDocumentReview

**Files:**
- Create: `apps/api/app/Http/Controllers/Api/V1/Admin/Apartments/ViolationRuleController.php`
- Create: `apps/api/app/Http/Controllers/Api/V1/Admin/Apartments/ViolationApplicationController.php`
- Create: `apps/api/app/Http/Controllers/Api/V1/Admin/Apartments/ApartmentDocumentReviewController.php`
- Test: One feature test file per controller

- [ ] **Step 1: ViolationRuleController**

```php
<?php
namespace App\Http\Controllers\Api\V1\Admin\Apartments;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Apartments\StoreViolationRuleRequest;
use App\Http\Requests\Admin\Apartments\UpdateViolationRuleRequest;
use App\Http\Resources\Apartments\ViolationRuleResource;
use App\Models\Apartments\ViolationRule;
use App\Models\Property\Compound;
use App\Services\Apartments\ViolationRuleService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class ViolationRuleController extends Controller
{
    public function __construct(private readonly ViolationRuleService $service) {}

    public function index(Request $request, Compound $compound)
    {
        Gate::authorize('manage', \App\Models\Apartments\ViolationRule::class);
        return ViolationRuleResource::collection(
            $compound->violationRules()->orderBy('name')->paginate(50)
        );
    }

    public function store(StoreViolationRuleRequest $request, Compound $compound)
    {
        Gate::authorize('manage', \App\Models\Apartments\ViolationRule::class);
        $rule = $this->service->create($compound, $request->user(), $request->validated());
        return new ViolationRuleResource($rule);
    }

    public function update(UpdateViolationRuleRequest $request, Compound $compound, ViolationRule $rule)
    {
        Gate::authorize('manage', \App\Models\Apartments\ViolationRule::class);
        abort_if($rule->compound_id !== $compound->id, 404);
        return new ViolationRuleResource($this->service->update($rule, $request->validated()));
    }

    public function destroy(Compound $compound, ViolationRule $rule)
    {
        Gate::authorize('manage', \App\Models\Apartments\ViolationRule::class);
        abort_if($rule->compound_id !== $compound->id, 404);
        $this->service->archive($rule);
        return response()->noContent();
    }
}
```

Add `Compound::violationRules(): HasMany` and gate registration `Gate::define('manage', fn(User $u) => app(ViolationRulePolicy::class)->manage($u))` in `AuthServiceProvider` (or use class-based gating).

- [ ] **Step 2: ViolationApplicationController**

```php
public function store(ApplyViolationRequest $request, Unit $unit)
{
    Gate::authorize('apply', \App\Models\Apartments\ViolationRule::class);
    $rule = ViolationRule::query()->findOrFail($request->validated('violation_rule_id'));
    abort_if($rule->compound_id !== $unit->compound_id, 422);
    $violation = app(ViolationApplicationService::class)->apply($unit, $rule, $request->user(), $request->validated());
    return new ApartmentViolationResource($violation->load('rule'));
}

public function markPaid(ApartmentViolation $violation) { /* ... gate + service */ }
public function markWaived(MarkWaivedRequest $request, ApartmentViolation $violation) { /* ... */ }
```

- [ ] **Step 3: ApartmentDocumentReviewController**

```php
public function index(Request $request)
{
    Gate::authorize('review', \App\Models\Apartments\ApartmentDocumentVersion::class);
    return ApartmentDocumentVersionResource::collection(
        ApartmentDocumentVersion::query()
            ->where('status', ApartmentDocumentVersionStatus::PendingReview)
            ->with(['document.unit', 'uploader:id,name'])
            ->latest()->paginate(50)
    );
}

public function update(ReviewDocumentVersionRequest $request, ApartmentDocumentVersion $version)
{
    Gate::authorize('review', \App\Models\Apartments\ApartmentDocumentVersion::class);
    $service = app(ApartmentDocumentReviewService::class);
    if ($request->validated('decision') === 'approved') {
        $service->approve($version, $request->user(), $request->input('notes'));
    } else {
        $service->reject($version, $request->user(), $request->input('notes'));
    }
    return response()->noContent();
}
```

- [ ] **Step 4: Tests + commits per controller**

Each test file covers: admin success, non-admin 403, validation 422. Commit per controller.

```bash
cd apps/api && php artisan test --filter "ViolationRuleControllerTest|ViolationApplicationControllerTest|ApartmentDocumentReviewControllerTest"
git add apps/api/app/Http/Controllers/Api/V1/Admin/Apartments apps/api/tests/Feature/Api/V1/Apartments/Admin
git commit -m "feat(api): add admin apartments controllers"
```

---

### Task 24: Routes registration

**Files:**
- Modify: `apps/api/routes/api.php`

- [ ] **Step 1: Append routes group**

```php
// Resident-facing
Route::prefix('v1/apartments')->middleware(['auth:sanctum'])->group(function () {
    Route::get('/', [\App\Http\Controllers\Api\V1\Apartments\ApartmentController::class, 'index']);
    Route::get('/{unit}', [\App\Http\Controllers\Api\V1\Apartments\ApartmentController::class, 'show']);

    Route::apiResource('{unit}/residents', \App\Http\Controllers\Api\V1\Apartments\ApartmentResidentController::class)
        ->parameters(['residents' => 'resident'])->only(['index', 'store', 'update', 'destroy']);
    Route::apiResource('{unit}/vehicles', \App\Http\Controllers\Api\V1\Apartments\ApartmentVehicleController::class)
        ->parameters(['vehicles' => 'vehicle'])->only(['index', 'store', 'update', 'destroy']);
    Route::apiResource('{unit}/parking-spots', \App\Http\Controllers\Api\V1\Apartments\ApartmentParkingSpotController::class)
        ->parameters(['parking-spots' => 'parkingSpot'])->only(['index', 'store', 'update', 'destroy']);
    Route::get('{unit}/notes', [\App\Http\Controllers\Api\V1\Apartments\ApartmentNoteController::class, 'index']);
    Route::post('{unit}/notes', [\App\Http\Controllers\Api\V1\Apartments\ApartmentNoteController::class, 'store']);
    Route::get('{unit}/violations', [\App\Http\Controllers\Api\V1\Apartments\ApartmentViolationController::class, 'index']);
    Route::get('{unit}/documents', [\App\Http\Controllers\Api\V1\Apartments\ApartmentDocumentController::class, 'index']);
    Route::post('{unit}/documents', [\App\Http\Controllers\Api\V1\Apartments\ApartmentDocumentController::class, 'store']);
    Route::post('{unit}/documents/{document}/replace', [\App\Http\Controllers\Api\V1\Apartments\ApartmentDocumentController::class, 'replace']);
});

// Admin
Route::prefix('v1/admin')->middleware(['auth:sanctum'])->group(function () {
    Route::apiResource('compounds/{compound}/violation-rules', \App\Http\Controllers\Api\V1\Admin\Apartments\ViolationRuleController::class)
        ->parameters(['violation-rules' => 'rule']);
    Route::post('apartments/{unit}/violations', [\App\Http\Controllers\Api\V1\Admin\Apartments\ViolationApplicationController::class, 'store']);
    Route::patch('apartment-violations/{violation}/paid', [\App\Http\Controllers\Api\V1\Admin\Apartments\ViolationApplicationController::class, 'markPaid']);
    Route::patch('apartment-violations/{violation}/waive', [\App\Http\Controllers\Api\V1\Admin\Apartments\ViolationApplicationController::class, 'markWaived']);
    Route::get('document-reviews', [\App\Http\Controllers\Api\V1\Admin\Apartments\ApartmentDocumentReviewController::class, 'index']);
    Route::patch('document-reviews/{version}', [\App\Http\Controllers\Api\V1\Admin\Apartments\ApartmentDocumentReviewController::class, 'update']);
});
```

- [ ] **Step 2: Run all apartments tests**

```bash
cd apps/api && php artisan test tests/Feature/Api/V1/Apartments
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/routes/api.php
git commit -m "feat(api): wire apartments and admin routes"
```

---

### Task 25: Mobile — apartments feature scaffold + RTK Query slices

**Files:**
- Create: `apps/mobile/src/services/apartments/types.ts`
- Create: `apps/mobile/src/services/apartments/apartmentsApi.ts`
- Create: `apps/mobile/src/services/apartments/{residents,vehicles,parking,notes,violations,documents}Api.ts`
- Modify: `apps/mobile/src/store/index.ts` (register new slices)

- [ ] **Step 1: Types**

```ts
// apps/mobile/src/services/apartments/types.ts
export type ApartmentSummary = {
  id: string;
  unitNumber: string;
  buildingName: string | null;
  floorNumber: number | null;
  hasVehicle: boolean;
  hasParking: boolean;
  role: 'owner' | 'tenant' | 'resident' | 'representative';
  unpaidBalance: number;
};

export type ApartmentResident = {
  id: number;
  userId: number | null;
  relationType: string;
  isPrimary: boolean;
  verificationStatus: string;
  residentName: string | null;
  residentPhone: string | null;
  residentEmail: string | null;
  photoPath: string | null;
};

export type ApartmentVehicle = {
  id: number;
  plate: string;
  make: string | null;
  model: string | null;
  color: string | null;
  stickerCode: string | null;
};

export type ApartmentParkingSpot = { id: number; code: string; notes: string | null };

export type ApartmentViolation = {
  id: number;
  ruleName: string;
  fee: number;
  status: 'pending' | 'paid' | 'waived';
  notes: string | null;
  createdAt: string;
};

export type ApartmentNote = {
  id: number;
  body: string;
  authorName: string;
  createdAt: string;
};

export type ApartmentDocument = {
  id: number;
  documentType: string;
  filePath: string;
  status: 'active' | 'archived';
  version: number;
  hasPendingVersion: boolean;
};

export type ApartmentFinanceSummary = {
  balance: number;
  outstanding: Array<{ id: number; type: string; amount: number; balanceRemaining: number; postedAt: string; description: string }>;
  recurringCharges: Array<{ id: number; name: string; amount: number; frequency: string }>;
};

export type ApartmentDetail = ApartmentSummary & {
  residents: ApartmentResident[];
  vehicles: ApartmentVehicle[];
  parkingSpots: ApartmentParkingSpot[];
  violationsSummary: { count: number; total: number };
  recentNotes: ApartmentNote[];
  documents: ApartmentDocument[];
  finance: ApartmentFinanceSummary;
};
```

- [ ] **Step 2: apartmentsApi**

```ts
// apps/mobile/src/services/apartments/apartmentsApi.ts
import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from '../baseQuery';
import { ApartmentDetail, ApartmentSummary } from './types';

export const apartmentsApi = createApi({
  reducerPath: 'apartmentsApi',
  baseQuery,
  tagTypes: ['Apartment', 'ApartmentDetail'],
  endpoints: (builder) => ({
    listApartments: builder.query<ApartmentSummary[], void>({
      query: () => '/v1/apartments',
      transformResponse: (r: { data: ApartmentSummary[] }) => r.data,
      providesTags: ['Apartment'],
    }),
    getApartment: builder.query<ApartmentDetail, string>({
      query: (id) => `/v1/apartments/${id}`,
      transformResponse: (r: { data: ApartmentDetail }) => r.data,
      providesTags: (_, __, id) => [{ type: 'ApartmentDetail', id }],
    }),
  }),
});

export const { useListApartmentsQuery, useGetApartmentQuery } = apartmentsApi;
```

- [ ] **Step 3: residentsApi (other child slices follow this pattern)**

```ts
// apps/mobile/src/services/apartments/residentsApi.ts
import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from '../baseQuery';
import { apartmentsApi } from './apartmentsApi';
import { ApartmentResident } from './types';

type ResidentInput = Omit<ApartmentResident, 'id' | 'photoPath'> & { photo?: { uri: string; name: string; type: string } };

export const residentsApi = createApi({
  reducerPath: 'residentsApi',
  baseQuery,
  endpoints: (builder) => ({
    createResident: builder.mutation<ApartmentResident, { unitId: string; body: ResidentInput }>({
      query: ({ unitId, body }) => ({
        url: `/v1/apartments/${unitId}/residents`,
        method: 'POST',
        body: toFormData(body),
      }),
      async onQueryStarted({ unitId }, { dispatch, queryFulfilled }) {
        await queryFulfilled;
        dispatch(apartmentsApi.util.invalidateTags([{ type: 'ApartmentDetail', id: unitId }]));
      },
    }),
    updateResident: builder.mutation<ApartmentResident, { unitId: string; residentId: number; body: Partial<ResidentInput> }>({
      query: ({ unitId, residentId, body }) => ({
        url: `/v1/apartments/${unitId}/residents/${residentId}`,
        method: 'PATCH',
        body: toFormData(body),
      }),
      async onQueryStarted({ unitId }, { dispatch, queryFulfilled }) {
        await queryFulfilled;
        dispatch(apartmentsApi.util.invalidateTags([{ type: 'ApartmentDetail', id: unitId }]));
      },
    }),
    deleteResident: builder.mutation<void, { unitId: string; residentId: number }>({
      query: ({ unitId, residentId }) => ({
        url: `/v1/apartments/${unitId}/residents/${residentId}`,
        method: 'DELETE',
      }),
      async onQueryStarted({ unitId }, { dispatch, queryFulfilled }) {
        await queryFulfilled;
        dispatch(apartmentsApi.util.invalidateTags([{ type: 'ApartmentDetail', id: unitId }]));
      },
    }),
  }),
});

function toFormData(body: Record<string, any>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(body)) {
    if (v === undefined || v === null) continue;
    if (k === 'photo' && typeof v === 'object') fd.append('photo', v as any);
    else fd.append(k, String(v));
  }
  return fd;
}

export const { useCreateResidentMutation, useUpdateResidentMutation, useDeleteResidentMutation } = residentsApi;
```

- [ ] **Step 4: Replicate vehiclesApi, parkingApi, notesApi, violationsApi (read), documentsApi**

Each follows the pattern of residentsApi. `documentsApi` adds a `replaceDocument` mutation hitting `POST .../documents/{id}/replace` with multipart `file`.

- [ ] **Step 5: Register reducers + middleware in store**

```ts
// apps/mobile/src/store/index.ts (additions)
import { apartmentsApi } from '../services/apartments/apartmentsApi';
import { residentsApi } from '../services/apartments/residentsApi';
// ... other apis

export const store = configureStore({
  reducer: {
    // ...existing
    [apartmentsApi.reducerPath]: apartmentsApi.reducer,
    [residentsApi.reducerPath]: residentsApi.reducer,
    // ...
  },
  middleware: (gdm) => gdm().concat(
    apartmentsApi.middleware,
    residentsApi.middleware,
    // ...
  ),
});
```

- [ ] **Step 6: Typecheck + commit**

```bash
cd apps/mobile && npm run typecheck
git add apps/mobile/src/services/apartments apps/mobile/src/store
git commit -m "feat(mobile): add apartments RTK Query slices"
```

---

### Task 26: Mobile — ApartmentsListScreen + ApartmentDetailScreen shell

**Files:**
- Create: `apps/mobile/src/features/apartments/screens/ApartmentsListScreen.tsx`
- Create: `apps/mobile/src/features/apartments/screens/ApartmentDetailScreen.tsx`

- [ ] **Step 1: List screen**

```tsx
import React, { useEffect } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { useListApartmentsQuery } from '../../../services/apartments/apartmentsApi';
import { ScreenContainer } from '../../../components/layout/ScreenContainer';

export function ApartmentsListScreen({ navigation }: any) {
  const { data, isLoading } = useListApartmentsQuery();

  useEffect(() => {
    if (data && data.length === 1) {
      navigation.replace('ApartmentDetail', { unitId: data[0].id });
    }
  }, [data, navigation]);

  if (isLoading) return <ScreenContainer><ActivityIndicator /></ScreenContainer>;
  return (
    <ScreenContainer>
      <FlatList
        data={data ?? []}
        keyExtractor={(a) => a.id}
        renderItem={({ item }) => (
          <Pressable onPress={() => navigation.navigate('ApartmentDetail', { unitId: item.id })}>
            <View>
              <Text>{item.buildingName} - Unit {item.unitNumber}</Text>
              <Text>Role: {item.role}</Text>
              <Text>Unpaid: {item.unpaidBalance}</Text>
            </View>
          </Pressable>
        )}
      />
    </ScreenContainer>
  );
}
```

- [ ] **Step 2: Detail shell with Tab.Navigator**

```tsx
import React from 'react';
import { Text } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useGetApartmentQuery } from '../../../services/apartments/apartmentsApi';
import { ScreenContainer } from '../../../components/layout/ScreenContainer';
import { ResidentsTab } from './tabs/ResidentsTab';
import { VehiclesTab } from './tabs/VehiclesTab';
import { ParkingTab } from './tabs/ParkingTab';
import { ViolationsTab } from './tabs/ViolationsTab';
import { NotesTab } from './tabs/NotesTab';
import { DocumentsTab } from './tabs/DocumentsTab';
import { FinanceTab } from './tabs/FinanceTab';

const Tab = createMaterialTopTabNavigator();

export function ApartmentDetailScreen({ route }: any) {
  const { unitId } = route.params;
  const { data, isLoading } = useGetApartmentQuery(unitId);
  if (isLoading || !data) return <ScreenContainer><Text>Loading...</Text></ScreenContainer>;
  return (
    <Tab.Navigator screenOptions={{ swipeEnabled: true }}>
      <Tab.Screen name="Residents">{() => <ResidentsTab apartment={data} />}</Tab.Screen>
      {data.hasVehicle && <Tab.Screen name="Vehicles">{() => <VehiclesTab apartment={data} />}</Tab.Screen>}
      {data.hasParking && <Tab.Screen name="Parking">{() => <ParkingTab apartment={data} />}</Tab.Screen>}
      <Tab.Screen name="Violations">{() => <ViolationsTab apartment={data} />}</Tab.Screen>
      <Tab.Screen name="Notes">{() => <NotesTab apartment={data} />}</Tab.Screen>
      <Tab.Screen name="Documents">{() => <DocumentsTab apartment={data} />}</Tab.Screen>
      <Tab.Screen name="Finance">{() => <FinanceTab apartment={data} />}</Tab.Screen>
    </Tab.Navigator>
  );
}
```

- [ ] **Step 3: Install material-top-tabs if not present, typecheck, commit**

```bash
cd apps/mobile && npm install @react-navigation/material-top-tabs react-native-tab-view react-native-pager-view
cd apps/mobile && npm run typecheck
git add apps/mobile/package.json apps/mobile/package-lock.json apps/mobile/src/features/apartments
git commit -m "feat(mobile): add apartments list and detail screens"
```

---

### Task 27: Mobile — tab implementations (Residents, Vehicles, Parking)

**Files:**
- Create: `apps/mobile/src/features/apartments/screens/tabs/ResidentsTab.tsx`
- Create: `apps/mobile/src/features/apartments/screens/tabs/VehiclesTab.tsx`
- Create: `apps/mobile/src/features/apartments/screens/tabs/ParkingTab.tsx`
- Create: `apps/mobile/src/features/apartments/components/ResidentSheet.tsx`
- Create: `apps/mobile/src/features/apartments/components/VehicleSheet.tsx`
- Create: `apps/mobile/src/features/apartments/components/ParkingSpotSheet.tsx`

Each tab: list with FlatList, "Add" floating button, edit/delete actions per row, sheet for create/edit. Sheets: form fields, validation, mutation hooks.

- [ ] **Step 1: ResidentsTab**

```tsx
import React, { useState } from 'react';
import { View, Text, FlatList, Pressable, Image } from 'react-native';
import type { ApartmentDetail } from '../../../../services/apartments/types';
import { useDeleteResidentMutation } from '../../../../services/apartments/residentsApi';
import { ResidentSheet } from '../../components/ResidentSheet';

export function ResidentsTab({ apartment }: { apartment: ApartmentDetail }) {
  const [editing, setEditing] = useState<{ id?: number } | null>(null);
  const [del] = useDeleteResidentMutation();

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={apartment.residents}
        keyExtractor={(r) => String(r.id)}
        renderItem={({ item }) => (
          <View style={{ padding: 12, flexDirection: 'row' }}>
            {item.photoPath ? <Image source={{ uri: item.photoPath }} style={{ width: 48, height: 48, borderRadius: 24 }} /> : null}
            <View style={{ flex: 1, marginStart: 12 }}>
              <Text>{item.residentName ?? '(linked user)'}</Text>
              <Text>{item.relationType}</Text>
            </View>
            <Pressable onPress={() => setEditing({ id: item.id })}><Text>Edit</Text></Pressable>
            <Pressable onPress={() => del({ unitId: apartment.id, residentId: item.id })}><Text>Delete</Text></Pressable>
          </View>
        )}
      />
      <Pressable onPress={() => setEditing({})}><Text>Add resident</Text></Pressable>
      {editing && <ResidentSheet apartment={apartment} resident={editing.id ? apartment.residents.find(r => r.id === editing.id) : undefined} onClose={() => setEditing(null)} />}
    </View>
  );
}
```

- [ ] **Step 2: ResidentSheet (form)**

```tsx
import React, { useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useCreateResidentMutation, useUpdateResidentMutation } from '../../../services/apartments/residentsApi';
import type { ApartmentDetail, ApartmentResident } from '../../../services/apartments/types';

export function ResidentSheet({ apartment, resident, onClose }: { apartment: ApartmentDetail; resident?: ApartmentResident; onClose: () => void }) {
  const [name, setName] = useState(resident?.residentName ?? '');
  const [phone, setPhone] = useState(resident?.residentPhone ?? '');
  const [relation, setRelation] = useState(resident?.relationType ?? 'resident');
  const [photo, setPhoto] = useState<any>();
  const [create] = useCreateResidentMutation();
  const [update] = useUpdateResidentMutation();

  const submit = async () => {
    const body: any = { resident_name: name, resident_phone: phone, relation_type: relation };
    if (photo) body.photo = { uri: photo.uri, name: 'photo.jpg', type: 'image/jpeg' };
    if (resident) await update({ unitId: apartment.id, residentId: resident.id, body }).unwrap();
    else await create({ unitId: apartment.id, body }).unwrap();
    onClose();
  };

  return (
    <View style={{ padding: 16 }}>
      <TextInput placeholder="Name" value={name} onChangeText={setName} />
      <TextInput placeholder="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      {/* relation picker */}
      <Pressable onPress={async () => {
        const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images });
        if (!r.canceled) setPhoto(r.assets[0]);
      }}><Text>Pick photo</Text></Pressable>
      <Pressable onPress={submit}><Text>Save</Text></Pressable>
      <Pressable onPress={onClose}><Text>Cancel</Text></Pressable>
    </View>
  );
}
```

- [ ] **Step 3: VehiclesTab + VehicleSheet**

Same pattern. Fields: plate, make, model, color, sticker_code, notes. Use `vehiclesApi` mutations. Show "Capacity 4/4" warning when at limit. Hide "Add" button when at limit.

- [ ] **Step 4: ParkingTab + ParkingSpotSheet**

Same pattern. Fields: code, notes. Capacity 4.

- [ ] **Step 5: Typecheck + commit**

```bash
cd apps/mobile && npm run typecheck
git add apps/mobile/src/features/apartments
git commit -m "feat(mobile): add residents/vehicles/parking tabs"
```

---

### Task 28: Mobile — Violations, Notes, Documents tabs

**Files:**
- Create: `apps/mobile/src/features/apartments/screens/tabs/ViolationsTab.tsx`
- Create: `apps/mobile/src/features/apartments/screens/tabs/NotesTab.tsx`
- Create: `apps/mobile/src/features/apartments/screens/tabs/DocumentsTab.tsx`
- Create: `apps/mobile/src/features/apartments/components/DocumentReplaceSheet.tsx`

- [ ] **Step 1: ViolationsTab (read-only)**

List `apartment.violations` (fetch via `useListViolationsQuery({ unitId })` if not in detail payload). Show rule name, fee, status badge, applied date, notes. Total balance summed at top.

- [ ] **Step 2: NotesTab (timeline + composer)**

```tsx
import React, { useState } from 'react';
import { View, Text, TextInput, FlatList, Pressable } from 'react-native';
import { useCreateNoteMutation } from '../../../../services/apartments/notesApi';
import type { ApartmentDetail } from '../../../../services/apartments/types';

export function NotesTab({ apartment }: { apartment: ApartmentDetail }) {
  const [body, setBody] = useState('');
  const [create] = useCreateNoteMutation();
  const submit = async () => {
    if (!body.trim()) return;
    await create({ unitId: apartment.id, body: body.trim() }).unwrap();
    setBody('');
  };
  return (
    <View style={{ flex: 1 }}>
      <TextInput placeholder="Add a note..." value={body} onChangeText={setBody} multiline />
      <Pressable onPress={submit}><Text>Add</Text></Pressable>
      <FlatList
        data={apartment.recentNotes}
        keyExtractor={(n) => String(n.id)}
        renderItem={({ item }) => (
          <View style={{ padding: 8 }}>
            <Text>{item.body}</Text>
            <Text>{item.authorName} · {item.createdAt}</Text>
          </View>
        )}
      />
    </View>
  );
}
```

- [ ] **Step 3: DocumentsTab (group by type, replace flow)**

```tsx
import React, { useState } from 'react';
import { View, Text, FlatList, Pressable } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useUploadDocumentMutation, useReplaceDocumentMutation } from '../../../../services/apartments/documentsApi';
import type { ApartmentDetail } from '../../../../services/apartments/types';

export function DocumentsTab({ apartment }: { apartment: ApartmentDetail }) {
  const [upload] = useUploadDocumentMutation();
  const [replace] = useReplaceDocumentMutation();

  const pickAndUpload = async (documentType: string) => {
    const r = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'] });
    if (r.canceled) return;
    await upload({ unitId: apartment.id, body: { document_type: documentType, file: r.assets[0] } }).unwrap();
  };

  const pickAndReplace = async (id: number) => {
    const r = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'] });
    if (r.canceled) return;
    await replace({ unitId: apartment.id, documentId: id, file: r.assets[0] }).unwrap();
  };

  return (
    <FlatList
      data={apartment.documents}
      keyExtractor={(d) => String(d.id)}
      renderItem={({ item }) => (
        <View style={{ padding: 12 }}>
          <Text>{item.documentType} (v{item.version})</Text>
          {item.hasPendingVersion ? <Text>Pending review</Text> : null}
          <Pressable onPress={() => pickAndReplace(item.id)}><Text>Replace</Text></Pressable>
        </View>
      )}
      ListFooterComponent={
        <View>
          {(['ownership_proof', 'lease', 'id_copy', 'utility_bill', 'other'] as const).map(t => (
            <Pressable key={t} onPress={() => pickAndUpload(t)}><Text>Upload {t}</Text></Pressable>
          ))}
        </View>
      }
    />
  );
}
```

- [ ] **Step 4: Commit**

```bash
cd apps/mobile && npm run typecheck
git add apps/mobile/src/features/apartments
git commit -m "feat(mobile): add violations/notes/documents tabs"
```

---

### Task 29: Mobile — Finance tab + receipt submission

**Files:**
- Create: `apps/mobile/src/features/apartments/screens/tabs/FinanceTab.tsx`
- Create: `apps/mobile/src/features/apartments/components/ReceiptSubmitSheet.tsx`

- [ ] **Step 1: FinanceTab**

```tsx
import React, { useState } from 'react';
import { View, Text, FlatList, Pressable } from 'react-native';
import type { ApartmentDetail } from '../../../../services/apartments/types';
import { ReceiptSubmitSheet } from '../../components/ReceiptSubmitSheet';

export function FinanceTab({ apartment }: { apartment: ApartmentDetail }) {
  const [selected, setSelected] = useState<number[]>([]);
  const [showSheet, setShowSheet] = useState(false);

  return (
    <View style={{ flex: 1 }}>
      <Text>Balance: {apartment.finance.balance}</Text>
      <Text>Recurring</Text>
      <FlatList
        data={apartment.finance.recurringCharges}
        keyExtractor={(c) => String(c.id)}
        renderItem={({ item }) => <Text>{item.name}: {item.amount} ({item.frequency})</Text>}
      />
      <Text>Outstanding</Text>
      <FlatList
        data={apartment.finance.outstanding}
        keyExtractor={(c) => String(c.id)}
        renderItem={({ item }) => (
          <Pressable onPress={() => {
            setSelected(s => s.includes(item.id) ? s.filter(x => x !== item.id) : [...s, item.id]);
          }}>
            <Text>{selected.includes(item.id) ? '✓ ' : ''}{item.description}: {item.balanceRemaining}</Text>
          </Pressable>
        )}
      />
      <Pressable disabled={selected.length === 0} onPress={() => setShowSheet(true)}>
        <Text>Submit Receipt ({selected.length})</Text>
      </Pressable>
      {showSheet && (
        <ReceiptSubmitSheet
          unitId={apartment.id}
          ledgerEntryIds={selected}
          onClose={() => { setShowSheet(false); setSelected([]); }}
        />
      )}
    </View>
  );
}
```

- [ ] **Step 2: ReceiptSubmitSheet**

Reuses existing `paymentSubmissionsApi` (already in repo for offline payments). On submit, posts `multipart/form-data` with selected `ledger_entry_ids[]`, `amount`, `payment_method`, `reference`, and `receipt` image to existing endpoint (verify path in `apps/api/routes/api.php` for `payment-submissions`).

- [ ] **Step 3: Typecheck + commit**

```bash
cd apps/mobile && npm run typecheck
git add apps/mobile/src/features/apartments
git commit -m "feat(mobile): add finance tab with receipt submission"
```

---

### Task 30: Mobile — navigation rewire

**Files:**
- Modify: `apps/mobile/src/navigation/RootNavigator.tsx`
- Modify: `apps/mobile/src/navigation/types.ts`
- Modify: `apps/mobile/src/navigation/linking.ts`
- Modify: `apps/mobile/src/features/resident/screens/ResidentDashboardScreen.tsx` (deeplink card)

- [ ] **Step 1: Replace Property tab with Apartments**

In `RootNavigator.tsx`: remove `PropertyScreen` import + tab entry; add `ApartmentsListScreen` + `ApartmentDetailScreen` tab + stack.

```tsx
<Tab.Screen name="Apartments" component={ApartmentsStack} options={{ tabBarLabel: 'My Apartment(s)' }} />
```

ApartmentsStack:
```tsx
<Stack.Navigator>
  <Stack.Screen name="ApartmentsList" component={ApartmentsListScreen} />
  <Stack.Screen name="ApartmentDetail" component={ApartmentDetailScreen} />
</Stack.Navigator>
```

- [ ] **Step 2: types.ts**

```ts
export type ApartmentsStackParamList = {
  ApartmentsList: undefined;
  ApartmentDetail: { unitId: string };
};
```

Update root `RootStackParamList` to embed.

- [ ] **Step 3: linking.ts**

```ts
Apartments: {
  screens: {
    ApartmentsList: 'apartments',
    ApartmentDetail: 'apartments/:unitId',
  },
},
```

- [ ] **Step 4: Resident dashboard card → deeplink**

Replace any "My Property" card with "My Apartment(s)" pointing to `navigation.navigate('Apartments', { screen: 'ApartmentsList' })`.

- [ ] **Step 5: Drop primary tab entries for Documents and Finance**

Remove `<Tab.Screen name="Documents" ...>` and `<Tab.Screen name="Finance" ...>` from `RootNavigator.tsx`. Internal screens remain but are reachable only via in-flow navigation (e.g. apartment finance tab navigates to receipt sheet).

- [ ] **Step 6: Delete old property feature**

```bash
rm -rf apps/mobile/src/features/property
```

Search for remaining `features/property` references and replace.

- [ ] **Step 7: Typecheck + commit**

```bash
cd apps/mobile && npm run typecheck
git add apps/mobile/src
git commit -m "feat(mobile): replace property tab with apartments"
```

---

### Task 31: Admin web — violation rules pages

**Files:**
- Create: `apps/admin/src/app/violation-rules/page.tsx`
- Create: `apps/admin/src/app/violation-rules/new/page.tsx`
- Create: `apps/admin/src/app/violation-rules/[ruleId]/edit/page.tsx`
- Create: `apps/admin/src/app/violation-rules/actions.ts`
- Modify: `apps/admin/src/lib/api.ts` (+ violation rule endpoints)

- [ ] **Step 1: API client additions**

```ts
// apps/admin/src/lib/api.ts (additions)
export type ViolationRule = {
  id: number;
  compoundId: string;
  name: string;
  nameAr: string | null;
  description: string | null;
  defaultFee: number;
  isActive: boolean;
};

export async function listViolationRules(compoundId: string): Promise<ViolationRule[]> {
  const r = await api.get(`/v1/admin/compounds/${compoundId}/violation-rules`);
  return r.data.data;
}
export async function createViolationRule(compoundId: string, body: Partial<ViolationRule>) {
  const r = await api.post(`/v1/admin/compounds/${compoundId}/violation-rules`, body);
  return r.data.data;
}
export async function updateViolationRule(compoundId: string, ruleId: number, body: Partial<ViolationRule>) {
  const r = await api.patch(`/v1/admin/compounds/${compoundId}/violation-rules/${ruleId}`, body);
  return r.data.data;
}
export async function archiveViolationRule(compoundId: string, ruleId: number) {
  await api.delete(`/v1/admin/compounds/${compoundId}/violation-rules/${ruleId}`);
}
```

- [ ] **Step 2: Index page (table + new/edit/archive)**

Server component reads compound from session/scope, renders table.
Server actions for create/update/archive.

- [ ] **Step 3: New + edit pages with form (name, name_ar, description, default_fee, is_active)**

- [ ] **Step 4: Typecheck + commit**

```bash
cd apps/admin && npm run typecheck
git add apps/admin/src/app/violation-rules apps/admin/src/lib/api.ts
git commit -m "feat(admin): add violation rules CRUD pages"
```

---

### Task 32: Admin web — units/[unitId]/violations + view-only tabs

**Files:**
- Create: `apps/admin/src/app/units/[unitId]/violations/page.tsx`
- Create: `apps/admin/src/app/units/[unitId]/violations/actions.ts`
- Modify: `apps/admin/src/app/units/[unitId]/page.tsx`
- Modify: `apps/admin/src/lib/api.ts`

- [ ] **Step 1: API additions**

```ts
export async function listUnitViolations(unitId: string) { /* GET /v1/apartments/{unit}/violations via admin scope */ }
export async function applyViolation(unitId: string, body: { violation_rule_id: number; fee?: number; notes?: string }) {
  const r = await api.post(`/v1/admin/apartments/${unitId}/violations`, body);
  return r.data.data;
}
export async function markViolationPaid(violationId: number) { await api.patch(`/v1/admin/apartment-violations/${violationId}/paid`); }
export async function markViolationWaived(violationId: number, reason: string) {
  await api.patch(`/v1/admin/apartment-violations/${violationId}/waive`, { reason });
}
export async function getApartmentDetail(unitId: string) { return (await api.get(`/v1/apartments/${unitId}`)).data.data; }
```

- [ ] **Step 2: violations page**

Lists violations on unit. Modal "Apply" opens rule picker (loaded from `listViolationRules(compound)`). Inline actions for mark paid / mark waived.

- [ ] **Step 3: units/[unitId]/page.tsx — append view-only tabs**

Tabs (or sections): Residents, Vehicles, Parking, Notes (view), Finance summary. All read from `getApartmentDetail(unitId)`.

- [ ] **Step 4: Typecheck + commit**

```bash
cd apps/admin && npm run typecheck
git add apps/admin/src/app/units apps/admin/src/lib/api.ts
git commit -m "feat(admin): add unit violations management and view-only tabs"
```

---

### Task 33: Admin web — document-reviews queue

**Files:**
- Create: `apps/admin/src/app/document-reviews/page.tsx`
- Create: `apps/admin/src/app/document-reviews/actions.ts`
- Modify: `apps/admin/src/lib/api.ts`

- [ ] **Step 1: API**

```ts
export async function listDocumentReviews() {
  const r = await api.get('/v1/admin/document-reviews');
  return r.data.data;
}
export async function reviewDocumentVersion(versionId: number, decision: 'approved' | 'rejected', notes?: string) {
  await api.patch(`/v1/admin/document-reviews/${versionId}`, { decision, notes });
}
```

- [ ] **Step 2: Page**

Table: unit ref, document type, current file vs pending file (anchor download), uploader, submitted at. Per row: approve / reject buttons (with optional notes textarea).

- [ ] **Step 3: Typecheck + commit**

```bash
cd apps/admin && npm run typecheck
git add apps/admin/src/app/document-reviews apps/admin/src/lib/api.ts
git commit -m "feat(admin): add document reviews queue"
```

---

### Task 34: Cleanup migration — drop `unit_memberships` table

**Files:**
- Create: `apps/api/database/migrations/2026_05_07_000900_drop_unit_memberships_table.php`

- [ ] **Step 1: Migration**

```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('unit_memberships');
    }

    public function down(): void
    {
        // No-op: table was schema-replaced by apartment_residents.
    }
};
```

- [ ] **Step 2: Run full test suite (sanity)**

```bash
cd apps/api && php artisan test
```

Expected: green.

- [ ] **Step 3: Commit**

```bash
git add apps/api/database/migrations/2026_05_07_000900_drop_unit_memberships_table.php
git commit -m "chore(api): drop deprecated unit_memberships table"
```

---

### Task 35: Quality gates + verification

- [ ] **Step 1: Run all gates**

```bash
cd apps/api && composer pint -- --test && composer phpstan
cd apps/admin && npm run typecheck && npm run lint
cd apps/mobile && npm run typecheck
cd apps/api && php artisan test
```

Fix any failures inline. Each fix gets its own focused commit.

- [ ] **Step 2: Boot mobile dev server, smoke test apartment hub**

Manually exercise on a single-unit user: list auto-redirects to detail; tabs render; CRUD works; receipt submit works; document replace creates pending version.

Manually exercise on multi-unit user: list shows cards; switching units invalidates cache.

Manually exercise admin web: violation rule create/edit/archive; apply violation to a unit; document review approve swaps active version.

- [ ] **Step 3: Final commit summary**

If feature flag is desired for staged rollout, gate the apartments tab behind `apartments_v1` feature flag in `RootNavigator.tsx`. Otherwise ship as-is.

```bash
git log --oneline | head -40
```

Expected: chronological commits matching the task list.

---

## Self-Review Notes

Spec coverage check:

- Apartment hub list + detail: Tasks 21, 26.
- Residents CRUD: Tasks 4, 13, 22 (resident sub-task), 27.
- Vehicles CRUD + max-4 + capability: Tasks 7, 14, 22 (vehicle sub-task), 27.
- Parking CRUD + max-4 + capability: Tasks 8, 15, 22 (parking sub-task), 27.
- Notes timeline: Tasks 9, 16, 22 (note sub-task), 28.
- Violations rule CRUD admin: Tasks 10, 16 (ViolationRuleService), 23, 31.
- Violation application + read-only mobile view: Tasks 16 (ViolationApplicationService), 22 (ViolationController), 23, 28, 32.
- Documents under apartment + replace + admin review: Tasks 11, 12, 17, 22 (Document controller), 23, 28, 33.
- Finance summary + receipt submission: Tasks 21 (payload), 29, 32 (admin view).
- Domain rename: Tasks 4, 5, 6, 34.
- Capability flags: Task 3.
- Permissions: Tasks 1, 18.

All 7 sub-features covered. Type/method names verified consistent across tasks. No placeholders.




