# Vehicle Plate & Notify Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add structured Egyptian plate fields, drop conditional vehicle tab hiding, merge Vehicles + Parking into one tab, ship resident-to-resident plate-notify flow without exposing owner identity.

**Architecture:** New normalized columns on `apartment_vehicles`. New `PlateNormalizer` service. New `vehicle_notifications` + `vehicle_notification_recipients` tables. Mobile gets format toggle + merged tab + notify screens. Admin lookup search expanded.

**Tech Stack:** Laravel 13, PHPUnit, Sanctum. React Native + RTK Query.

**Spec:** [`docs/superpowers/specs/2026-05-08-vehicle-plate-notify-design.md`](../specs/2026-05-08-vehicle-plate-notify-design.md)

---

## File Structure

### Backend

```
app/Enums/
  PlateFormat.php                     (new)  letters_numbers | numbers_only
  VehicleNotificationSenderMode.php   (new)  anonymous | identified

app/Services/Apartments/
  PlateNormalizer.php                 (new)
  VehicleService.php                  (mod)  use PlateNormalizer
  VehicleNotificationService.php      (new)

app/Models/Apartments/
  ApartmentVehicle.php                (mod)  +new fillable/casts
  VehicleNotification.php             (new)
  VehicleNotificationRecipient.php    (new)

app/Http/Controllers/Api/V1/Apartments/
  VehicleNotificationController.php   (new)

app/Http/Controllers/Api/V1/Admin/
  VehicleLookupController.php         (mod)  expand search

app/Http/Requests/Apartments/
  StoreApartmentVehicleRequest.php    (mod)  new plate fields
  UpdateApartmentVehicleRequest.php   (mod)
  SearchVehicleNotificationRequest.php (new)
  SendVehicleNotificationRequest.php  (new)

app/Http/Resources/Apartments/
  ApartmentVehicleResource.php        (mod)  +plate variants
  VehicleNotificationResource.php     (new)

database/migrations/
  2026_05_08_000100_add_plate_normalized_columns_to_apartment_vehicles.php  (new)
  2026_05_08_000200_create_vehicle_notification_tables.php                   (new)

database/factories/Apartments/
  VehicleNotificationFactory.php              (new)
  VehicleNotificationRecipientFactory.php     (new)

routes/api.php                        (mod)  +vehicle-notifications routes
```

### Mobile

```
src/features/apartments/screens/tabs/
  VehiclesParkingTab.tsx              (new, replaces VehiclesTab + ParkingTab)
  VehiclesTab.tsx                     (DELETE)
  ParkingTab.tsx                      (DELETE)

src/features/apartments/screens/notify/
  VehicleNotifySearchScreen.tsx       (new)
  VehicleNotifyComposeScreen.tsx      (new)
  VehicleNotifyInboxScreen.tsx        (new)

src/features/apartments/components/
  VehicleSheet.tsx                    (mod)  format toggle + structured inputs
  PlateInput.tsx                      (new)  reusable RTL plate input

src/features/apartments/screens/
  ApartmentDetailScreen.tsx           (mod)  drop hasVehicle conditional, single tab

src/services/apartments/
  vehiclesApi.ts                      (mod)  new fields in payload
  vehicleNotificationsApi.ts          (new)
  types.ts                            (mod)

src/navigation/
  RootNavigator.tsx                   (mod)  register notify screens
  types.ts                            (mod)
  linking.ts                          (mod)
```

---

## Conventions

- Tests: `Tests\TestCase` + `RefreshDatabase`, Sanctum auth.
- Test commands: `cd apps/api && php artisan test --filter <ClassName>`.
- Mobile typecheck: `cd apps/mobile && npm run typecheck`.

---

## Tasks

### Task 1: Enums

**Files:**
- Create: `apps/api/app/Enums/PlateFormat.php`
- Create: `apps/api/app/Enums/VehicleNotificationSenderMode.php`

- [ ] **Step 1: Add enums**

```php
<?php
namespace App\Enums;

enum PlateFormat: string
{
    case LettersNumbers = 'letters_numbers';
    case NumbersOnly = 'numbers_only';
}
```

```php
<?php
namespace App\Enums;

enum VehicleNotificationSenderMode: string
{
    case Anonymous = 'anonymous';
    case Identified = 'identified';
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/app/Enums/PlateFormat.php apps/api/app/Enums/VehicleNotificationSenderMode.php
git commit -m "feat(api): add plate format and notify sender mode enums"
```

---

### Task 2: PlateNormalizer service

**Files:**
- Create: `apps/api/app/Services/Apartments/PlateNormalizer.php`
- Create: `apps/api/app/Services/Apartments/Dto/NormalizedPlate.php`
- Test: `apps/api/tests/Feature/Services/Apartments/PlateNormalizerTest.php`

- [ ] **Step 1: Test (table driven)**

```php
<?php
namespace Tests\Feature\Services\Apartments;

use App\Enums\PlateFormat;
use App\Services\Apartments\PlateNormalizer;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class PlateNormalizerTest extends TestCase
{
    public static function letterCases(): array
    {
        return [
            'arabic letters and arabic digits' => [
                PlateFormat::LettersNumbers->value,
                'أ ب ج', '١٢٣٤',
                'A B G', '1234',
                'abg1234',
            ],
            'arabic letters and latin digits' => [
                PlateFormat::LettersNumbers->value,
                'م ن', '7788',
                'M N', '7788',
                'mn7788',
            ],
            'numbers only arabic' => [
                PlateFormat::NumbersOnly->value,
                null, '٩٨٧٦٥',
                null, '98765',
                '98765',
            ],
        ];
    }

    #[DataProvider('letterCases')]
    public function test_normalize(string $format, ?string $letters, string $digits, ?string $lettersEn, string $digitsLatin, string $normalized): void
    {
        $result = app(PlateNormalizer::class)->normalize($format, $letters, $digits);
        $this->assertSame($lettersEn, $result->lettersEn);
        $this->assertSame($digitsLatin, $result->digitsNormalized);
        $this->assertSame($normalized, $result->plateNormalized);
    }

    public function test_search_terms_handles_either_script(): void
    {
        $terms = app(PlateNormalizer::class)->searchTerms('أ ب ج ١٢٣٤');
        $this->assertSame('abg1234', $terms['normalized']);
        $this->assertSame('أ ب ج', trim($terms['lettersAr']));
        $this->assertSame('1234', $terms['digitsNormalized']);
    }
}
```

- [ ] **Step 2: DTO**

```php
<?php
namespace App\Services\Apartments\Dto;

final readonly class NormalizedPlate
{
    public function __construct(
        public string $plate,
        public ?string $lettersAr,
        public ?string $lettersEn,
        public string $digits,
        public string $digitsNormalized,
        public string $plateNormalized,
    ) {}
}
```

- [ ] **Step 3: Service**

```php
<?php
namespace App\Services\Apartments;

use App\Enums\PlateFormat;
use App\Services\Apartments\Dto\NormalizedPlate;

class PlateNormalizer
{
    /** @var array<string,string> */
    private const ARABIC_LETTER_MAP = [
        'ا' => 'A', 'أ' => 'A', 'إ' => 'A', 'آ' => 'A',
        'ب' => 'B', 'ت' => 'T', 'ث' => 'T',
        'ج' => 'G', 'ح' => 'H', 'خ' => 'KH',
        'د' => 'D', 'ذ' => 'Z',
        'ر' => 'R', 'ز' => 'Z',
        'س' => 'S', 'ش' => 'SH',
        'ص' => 'S', 'ض' => 'D',
        'ط' => 'T', 'ظ' => 'Z',
        'ع' => 'A', 'غ' => 'GH',
        'ف' => 'F', 'ق' => 'Q',
        'ك' => 'K', 'ل' => 'L', 'م' => 'M', 'ن' => 'N',
        'ه' => 'H', 'و' => 'W', 'ي' => 'Y', 'ى' => 'Y',
    ];

    /** @var array<string,string> */
    private const ARABIC_DIGIT_MAP = [
        '٠' => '0', '١' => '1', '٢' => '2', '٣' => '3', '٤' => '4',
        '٥' => '5', '٦' => '6', '٧' => '7', '٨' => '8', '٩' => '9',
    ];

    public function normalize(string $format, ?string $lettersInput, string $digitsInput): NormalizedPlate
    {
        $format = PlateFormat::from($format);

        $lettersAr = $lettersInput !== null ? $this->cleanLetters($lettersInput) : null;
        $lettersEn = $lettersAr !== null ? $this->transliterate($lettersAr) : null;

        $digits = $this->cleanDigits($digitsInput);
        $digitsNormalized = strtr($digits, self::ARABIC_DIGIT_MAP);

        $plateNormalized = strtolower(($lettersEn !== null ? str_replace(' ', '', $lettersEn) : '') . $digitsNormalized);

        $canonical = match ($format) {
            PlateFormat::LettersNumbers => trim(($lettersAr ?? '') . ' ' . $digits),
            PlateFormat::NumbersOnly => $digits,
        };

        return new NormalizedPlate(
            plate: $canonical,
            lettersAr: $lettersAr,
            lettersEn: $lettersEn,
            digits: $digits,
            digitsNormalized: $digitsNormalized,
            plateNormalized: $plateNormalized,
        );
    }

    /** @return array{normalized:string, lettersAr:string, digitsNormalized:string} */
    public function searchTerms(string $query): array
    {
        $query = trim($query);
        $lettersAr = '';
        $digits = '';
        foreach (preg_split('//u', $query, -1, PREG_SPLIT_NO_EMPTY) ?: [] as $ch) {
            if (isset(self::ARABIC_DIGIT_MAP[$ch]) || ctype_digit($ch)) {
                $digits .= $ch;
            } elseif (isset(self::ARABIC_LETTER_MAP[$ch])) {
                $lettersAr .= $ch . ' ';
            } elseif (ctype_alpha($ch)) {
                $lettersAr .= '';
            }
        }
        $lettersAr = rtrim($lettersAr);
        $lettersEn = $this->transliterate($lettersAr);
        $digitsNormalized = strtr($digits, self::ARABIC_DIGIT_MAP);
        $normalized = strtolower(str_replace(' ', '', $lettersEn) . $digitsNormalized);

        return [
            'normalized' => $normalized,
            'lettersAr' => $lettersAr,
            'digitsNormalized' => $digitsNormalized,
        ];
    }

    private function cleanLetters(string $input): string
    {
        $input = preg_replace('/\s+/u', ' ', trim($input)) ?? '';
        return $input;
    }

    private function cleanDigits(string $input): string
    {
        return preg_replace('/\s+/u', '', $input) ?? '';
    }

    private function transliterate(string $arabicLetters): string
    {
        $out = [];
        foreach (preg_split('//u', $arabicLetters, -1, PREG_SPLIT_NO_EMPTY) ?: [] as $ch) {
            if ($ch === ' ') continue;
            if (isset(self::ARABIC_LETTER_MAP[$ch])) {
                $out[] = self::ARABIC_LETTER_MAP[$ch];
            }
        }
        return implode(' ', $out);
    }
}
```

- [ ] **Step 4: Run + commit**

```bash
cd apps/api && php artisan test --filter PlateNormalizerTest
git add apps/api/app/Services/Apartments/PlateNormalizer.php apps/api/app/Services/Apartments/Dto/NormalizedPlate.php apps/api/tests/Feature/Services/Apartments/PlateNormalizerTest.php
git commit -m "feat(api): add PlateNormalizer for Egyptian plate variants"
```

---

### Task 3: Schema migration — plate columns

**Files:**
- Create: `apps/api/database/migrations/2026_05_08_000100_add_plate_normalized_columns_to_apartment_vehicles.php`

- [ ] **Step 1: Migration**

```php
<?php
use App\Enums\PlateFormat;
use App\Services\Apartments\PlateNormalizer;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('apartment_vehicles', function (Blueprint $table): void {
            $table->string('plate_format')->default(PlateFormat::LettersNumbers->value)->after('plate');
            $table->string('plate_letters_ar')->nullable()->after('plate_format');
            $table->string('plate_letters_en')->nullable()->after('plate_letters_ar');
            $table->string('plate_digits')->default('')->after('plate_letters_en');
            $table->string('plate_digits_normalized')->default('')->after('plate_digits');
            $table->string('plate_normalized')->default('')->after('plate_digits_normalized');
            $table->index('plate_normalized');
            $table->index('plate_letters_ar');
        });

        $normalizer = app(PlateNormalizer::class);
        DB::table('apartment_vehicles')->orderBy('id')->chunkById(200, function ($rows) use ($normalizer): void {
            foreach ($rows as $row) {
                $digits = preg_replace('/\D/u', '', (string) $row->plate) ?? '';
                $letters = trim(preg_replace('/[\d\s]/u', '', (string) $row->plate) ?? '');
                $format = $letters === '' ? PlateFormat::NumbersOnly->value : PlateFormat::LettersNumbers->value;
                $normalized = $normalizer->normalize($format, $letters !== '' ? $letters : null, $digits);
                DB::table('apartment_vehicles')->where('id', $row->id)->update([
                    'plate_format' => $format,
                    'plate_letters_ar' => $normalized->lettersAr,
                    'plate_letters_en' => $normalized->lettersEn,
                    'plate_digits' => $normalized->digits,
                    'plate_digits_normalized' => $normalized->digitsNormalized,
                    'plate_normalized' => $normalized->plateNormalized,
                ]);
            }
        });
    }

    public function down(): void
    {
        Schema::table('apartment_vehicles', function (Blueprint $table): void {
            $table->dropIndex(['plate_normalized']);
            $table->dropIndex(['plate_letters_ar']);
            $table->dropColumn([
                'plate_format', 'plate_letters_ar', 'plate_letters_en',
                'plate_digits', 'plate_digits_normalized', 'plate_normalized',
            ]);
        });
    }
};
```

- [ ] **Step 2: Run migration on testing DB**

```bash
cd apps/api && php artisan migrate --env=testing --no-interaction
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/database/migrations/2026_05_08_000100_add_plate_normalized_columns_to_apartment_vehicles.php
git commit -m "feat(api): add normalized plate columns to apartment_vehicles"
```

---

### Task 4: Update ApartmentVehicle model + VehicleService + form requests + resource

**Files:**
- Modify: `apps/api/app/Models/Apartments/ApartmentVehicle.php`
- Modify: `apps/api/app/Services/Apartments/VehicleService.php`
- Modify: `apps/api/app/Http/Requests/Apartments/StoreApartmentVehicleRequest.php`
- Modify: `apps/api/app/Http/Requests/Apartments/UpdateApartmentVehicleRequest.php`
- Modify: `apps/api/app/Http/Resources/Apartments/ApartmentVehicleResource.php`
- Modify: `apps/api/database/factories/Apartments/ApartmentVehicleFactory.php`

- [ ] **Step 1: Model fillable + casts**

```php
// add to $fillable
'plate_format', 'plate_letters_ar', 'plate_letters_en',
'plate_digits', 'plate_digits_normalized', 'plate_normalized',

// add to casts()
'plate_format' => \App\Enums\PlateFormat::class,
```

- [ ] **Step 2: VehicleService changes**

`create` and `update` accept `plate_format`, `plate_letters_input`, `plate_digits_input`. They call `PlateNormalizer::normalize` and set the assembled `plate` plus all variant columns. Existing capacity + capability guards unchanged.

```php
public function __construct(private readonly PlateNormalizer $normalizer) {}

/** @param array<string,mixed> $data */
public function create(Unit $unit, User $actor, array $data): ApartmentVehicle
{
    if (! $unit->has_vehicle) {
        throw new CapabilityDisabledException('Vehicles disabled for this unit');
    }
    if (ApartmentVehicle::query()->where('unit_id', $unit->id)->count() >= self::MAX_PER_UNIT) {
        throw new CapacityExceededException('Vehicle capacity exceeded');
    }
    $normalized = $this->normalizer->normalize(
        $data['plate_format'] ?? PlateFormat::LettersNumbers->value,
        $data['plate_letters_input'] ?? null,
        $data['plate_digits_input'] ?? '',
    );
    return ApartmentVehicle::query()->create([
        'unit_id' => $unit->id,
        'apartment_resident_id' => $data['apartment_resident_id'] ?? null,
        'plate' => $normalized->plate,
        'plate_format' => $data['plate_format'] ?? PlateFormat::LettersNumbers->value,
        'plate_letters_ar' => $normalized->lettersAr,
        'plate_letters_en' => $normalized->lettersEn,
        'plate_digits' => $normalized->digits,
        'plate_digits_normalized' => $normalized->digitsNormalized,
        'plate_normalized' => $normalized->plateNormalized,
        'make' => $data['make'] ?? null,
        'model' => $data['model'] ?? null,
        'color' => $data['color'] ?? null,
        'sticker_code' => $data['sticker_code'] ?? null,
        'notes' => $data['notes'] ?? null,
        'created_by' => $actor->id,
    ]);
}

public function update(ApartmentVehicle $vehicle, array $data): ApartmentVehicle
{
    if (isset($data['plate_format']) || isset($data['plate_letters_input']) || isset($data['plate_digits_input'])) {
        $normalized = $this->normalizer->normalize(
            $data['plate_format'] ?? $vehicle->plate_format->value,
            $data['plate_letters_input'] ?? $vehicle->plate_letters_ar,
            $data['plate_digits_input'] ?? $vehicle->plate_digits,
        );
        $data = array_merge($data, [
            'plate' => $normalized->plate,
            'plate_letters_ar' => $normalized->lettersAr,
            'plate_letters_en' => $normalized->lettersEn,
            'plate_digits' => $normalized->digits,
            'plate_digits_normalized' => $normalized->digitsNormalized,
            'plate_normalized' => $normalized->plateNormalized,
        ]);
        unset($data['plate_letters_input'], $data['plate_digits_input']);
    }
    $vehicle->update($data);
    return $vehicle->refresh();
}
```

- [ ] **Step 3: Form requests**

```php
// StoreApartmentVehicleRequest::rules()
return [
    'apartment_resident_id' => ['nullable', 'integer', 'exists:apartment_residents,id'],
    'plate_format' => ['required', 'string', 'in:letters_numbers,numbers_only'],
    'plate_letters_input' => ['nullable', 'string', 'max:50', 'required_if:plate_format,letters_numbers'],
    'plate_digits_input' => ['required', 'string', 'max:20'],
    'make' => ['nullable', 'string', 'max:80'],
    'model' => ['nullable', 'string', 'max:80'],
    'color' => ['nullable', 'string', 'max:40'],
    'sticker_code' => ['nullable', 'string', 'max:80'],
    'notes' => ['nullable', 'string', 'max:500'],
];
```

`UpdateApartmentVehicleRequest`: same rules but all `sometimes`.

- [ ] **Step 4: Resource — expose new fields**

```php
return [
    'id' => $this->id,
    'unitId' => $this->unit_id,
    'plate' => $this->plate,
    'plateFormat' => $this->plate_format?->value,
    'plateLettersAr' => $this->plate_letters_ar,
    'plateLettersEn' => $this->plate_letters_en,
    'plateDigits' => $this->plate_digits,
    'make' => $this->make,
    'model' => $this->model,
    'color' => $this->color,
    'stickerCode' => $this->sticker_code,
    'notes' => $this->notes,
];
```

- [ ] **Step 5: Factory updates**

```php
public function definition(): array
{
    $letters = 'أ ب ج';
    $digits = (string) fake()->numberBetween(1000, 9999);
    return [
        'unit_id' => Unit::factory(),
        'plate' => "{$letters} {$digits}",
        'plate_format' => 'letters_numbers',
        'plate_letters_ar' => $letters,
        'plate_letters_en' => 'A B G',
        'plate_digits' => $digits,
        'plate_digits_normalized' => $digits,
        'plate_normalized' => 'abg' . $digits,
        'make' => fake()->randomElement(['Toyota','Honda','BMW','Hyundai']),
        'model' => fake()->word(),
        'color' => fake()->safeColorName(),
    ];
}
```

- [ ] **Step 6: Run vehicle tests, fix breakage**

```bash
cd apps/api && php artisan test --filter Vehicle
```

- [ ] **Step 7: Commit**

```bash
git add apps/api/app apps/api/database/factories/Apartments/ApartmentVehicleFactory.php
git commit -m "feat(api): persist plate variants on apartment_vehicles"
```

---

### Task 5: Expand admin VehicleLookupController search

**Files:**
- Modify: `apps/api/app/Http/Controllers/Api/V1/Admin/VehicleLookupController.php`
- Test: `apps/api/tests/Feature/Api/V1/Admin/VehicleLookupTest.php` (extend existing or create)

- [ ] **Step 1: Test new search**

```php
public function test_finds_vehicle_by_arabic_input_against_normalized(): void
{
    $admin = $this->makeAdminWithLookupPermission();
    $unit = Unit::factory()->create(['compound_id' => $admin->compound_id]);
    ApartmentVehicle::factory()->create([
        'unit_id' => $unit->id,
        'plate' => 'أ ب ج 1234',
        'plate_letters_ar' => 'أ ب ج',
        'plate_letters_en' => 'A B G',
        'plate_digits' => '1234',
        'plate_digits_normalized' => '1234',
        'plate_normalized' => 'abg1234',
    ]);

    Sanctum::actingAs($admin);
    $this->getJson('/api/v1/admin/vehicle-lookup?q=' . urlencode('أ ب ج 1234'))
        ->assertOk()
        ->assertJsonPath('data.0.plate', 'أ ب ج 1234');

    $this->getJson('/api/v1/admin/vehicle-lookup?q=ABG1234')
        ->assertOk()
        ->assertJsonPath('data.0.plate', 'أ ب ج 1234');
}
```

- [ ] **Step 2: Update controller**

```php
$terms = app(\App\Services\Apartments\PlateNormalizer::class)->searchTerms($query);

$residentVehicles = ApartmentVehicle::query()
    ->whereHas('unit', fn($q) => $q->where('compound_id', $compoundId))
    ->where(function($q) use ($query, $terms) {
        $q->where('plate', 'like', "%{$query}%")
          ->orWhere('plate_normalized', 'like', "%{$terms['normalized']}%");
        if ($terms['lettersAr'] !== '') {
            $q->orWhere('plate_letters_ar', 'like', "%{$terms['lettersAr']}%");
        }
        if ($terms['digitsNormalized'] !== '') {
            $q->orWhere('plate_digits_normalized', 'like', "%{$terms['digitsNormalized']}%");
        }
        $q->orWhere('sticker_code', 'like', "%{$query}%");
    })
    ->with(['unit.building', 'unit.apartmentResidents.user'])
    ->limit(10)
    ->get()
    /* ...existing map... */;
```

- [ ] **Step 3: Run + commit**

```bash
cd apps/api && php artisan test --filter VehicleLookup
git add apps/api/app/Http/Controllers/Api/V1/Admin/VehicleLookupController.php apps/api/tests/Feature/Api/V1/Admin/VehicleLookupTest.php
git commit -m "feat(api): expand admin vehicle lookup to normalized plate columns"
```

---

### Task 6: VehicleNotification + Recipient migration + models + factories

**Files:**
- Create: `apps/api/database/migrations/2026_05_08_000200_create_vehicle_notification_tables.php`
- Create: `apps/api/app/Models/Apartments/VehicleNotification.php`
- Create: `apps/api/app/Models/Apartments/VehicleNotificationRecipient.php`
- Create: `apps/api/database/factories/Apartments/VehicleNotificationFactory.php`
- Create: `apps/api/database/factories/Apartments/VehicleNotificationRecipientFactory.php`
- Test: `apps/api/tests/Feature/Database/VehicleNotificationModelTest.php`

- [ ] **Step 1: Migration**

```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vehicle_notifications', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('sender_user_id')->constrained('users')->restrictOnDelete();
            $table->foreignUlid('sender_unit_id')->nullable()->constrained('units')->nullOnDelete();
            $table->string('sender_mode')->index();
            $table->string('sender_alias', 50)->nullable();
            $table->foreignId('target_vehicle_id')->nullable()->constrained('apartment_vehicles')->nullOnDelete();
            $table->foreignUlid('target_unit_id')->nullable()->constrained('units')->nullOnDelete();
            $table->string('target_plate_query');
            $table->text('message');
            $table->timestamps();

            $table->index('sender_user_id');
            $table->index('target_vehicle_id');
        });

        Schema::create('vehicle_notification_recipients', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('vehicle_notification_id')->constrained('vehicle_notifications')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'read_at']);
            $table->unique(['vehicle_notification_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vehicle_notification_recipients');
        Schema::dropIfExists('vehicle_notifications');
    }
};
```

- [ ] **Step 2: Models**

```php
<?php
// VehicleNotification.php
namespace App\Models\Apartments;

use App\Enums\VehicleNotificationSenderMode;
use App\Models\Property\Unit;
use App\Models\User;
use Database\Factories\Apartments\VehicleNotificationFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class VehicleNotification extends Model
{
    /** @use HasFactory<VehicleNotificationFactory> */
    use HasFactory;

    protected static function newFactory(): VehicleNotificationFactory
    {
        return VehicleNotificationFactory::new();
    }

    protected $fillable = [
        'sender_user_id', 'sender_unit_id', 'sender_mode', 'sender_alias',
        'target_vehicle_id', 'target_unit_id', 'target_plate_query', 'message',
    ];

    protected function casts(): array
    {
        return ['sender_mode' => VehicleNotificationSenderMode::class];
    }

    /** @return BelongsTo<User, $this> */
    public function sender(): BelongsTo { return $this->belongsTo(User::class, 'sender_user_id'); }

    /** @return BelongsTo<Unit, $this> */
    public function senderUnit(): BelongsTo { return $this->belongsTo(Unit::class, 'sender_unit_id'); }

    /** @return BelongsTo<ApartmentVehicle, $this> */
    public function targetVehicle(): BelongsTo { return $this->belongsTo(ApartmentVehicle::class, 'target_vehicle_id'); }

    /** @return BelongsTo<Unit, $this> */
    public function targetUnit(): BelongsTo { return $this->belongsTo(Unit::class, 'target_unit_id'); }

    /** @return HasMany<VehicleNotificationRecipient, $this> */
    public function recipients(): HasMany { return $this->hasMany(VehicleNotificationRecipient::class); }
}
```

```php
<?php
// VehicleNotificationRecipient.php
namespace App\Models\Apartments;

use App\Models\User;
use Database\Factories\Apartments\VehicleNotificationRecipientFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VehicleNotificationRecipient extends Model
{
    /** @use HasFactory<VehicleNotificationRecipientFactory> */
    use HasFactory;

    protected static function newFactory(): VehicleNotificationRecipientFactory
    {
        return VehicleNotificationRecipientFactory::new();
    }

    protected $fillable = ['vehicle_notification_id', 'user_id', 'read_at'];

    protected function casts(): array
    {
        return ['read_at' => 'datetime'];
    }

    /** @return BelongsTo<VehicleNotification, $this> */
    public function notification(): BelongsTo { return $this->belongsTo(VehicleNotification::class, 'vehicle_notification_id'); }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo { return $this->belongsTo(User::class); }
}
```

- [ ] **Step 3: Factories**

```php
<?php
// VehicleNotificationFactory.php
namespace Database\Factories\Apartments;

use App\Enums\VehicleNotificationSenderMode;
use App\Models\Apartments\VehicleNotification;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class VehicleNotificationFactory extends Factory
{
    protected $model = VehicleNotification::class;

    public function definition(): array
    {
        return [
            'sender_user_id' => User::factory(),
            'sender_unit_id' => null,
            'sender_mode' => VehicleNotificationSenderMode::Identified,
            'sender_alias' => null,
            'target_vehicle_id' => null,
            'target_unit_id' => null,
            'target_plate_query' => 'أ ب ج 1234',
            'message' => fake()->sentence(),
        ];
    }
}
```

```php
<?php
// VehicleNotificationRecipientFactory.php
namespace Database\Factories\Apartments;

use App\Models\Apartments\VehicleNotification;
use App\Models\Apartments\VehicleNotificationRecipient;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class VehicleNotificationRecipientFactory extends Factory
{
    protected $model = VehicleNotificationRecipient::class;

    public function definition(): array
    {
        return [
            'vehicle_notification_id' => VehicleNotification::factory(),
            'user_id' => User::factory(),
            'read_at' => null,
        ];
    }
}
```

- [ ] **Step 4: Model test**

```php
<?php
namespace Tests\Feature\Database;

use App\Enums\VehicleNotificationSenderMode;
use App\Models\Apartments\VehicleNotification;
use App\Models\Apartments\VehicleNotificationRecipient;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class VehicleNotificationModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_factories(): void
    {
        $n = VehicleNotification::factory()->create();
        $this->assertSame(VehicleNotificationSenderMode::Identified, $n->sender_mode);

        $r = VehicleNotificationRecipient::factory()->create(['vehicle_notification_id' => $n->id]);
        $this->assertNotNull($r->user_id);
        $this->assertNull($r->read_at);
    }
}
```

- [ ] **Step 5: Run + commit**

```bash
cd apps/api && php artisan test --filter VehicleNotificationModelTest
git add apps/api/database/migrations/2026_05_08_000200_create_vehicle_notification_tables.php apps/api/app/Models/Apartments/VehicleNotification.php apps/api/app/Models/Apartments/VehicleNotificationRecipient.php apps/api/database/factories/Apartments/VehicleNotificationFactory.php apps/api/database/factories/Apartments/VehicleNotificationRecipientFactory.php apps/api/tests/Feature/Database/VehicleNotificationModelTest.php
git commit -m "feat(api): add vehicle_notifications schema and models"
```

---

### Task 7: VehicleNotificationService

**Files:**
- Create: `apps/api/app/Services/Apartments/VehicleNotificationService.php`
- Test: `apps/api/tests/Feature/Services/Apartments/VehicleNotificationServiceTest.php`

- [ ] **Step 1: Test**

```php
<?php
namespace Tests\Feature\Services\Apartments;

use App\Enums\UnitRelationType;
use App\Enums\VehicleNotificationSenderMode;
use App\Enums\VerificationStatus;
use App\Models\Apartments\ApartmentResident;
use App\Models\Apartments\ApartmentVehicle;
use App\Models\Property\Compound;
use App\Models\Property\Unit;
use App\Models\User;
use App\Services\Apartments\VehicleNotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class VehicleNotificationServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_search_returns_recipient_count_and_label_without_owner_identity(): void
    {
        $compound = Compound::factory()->create();
        $unit = Unit::factory()->create(['compound_id' => $compound->id]);
        ApartmentVehicle::factory()->create([
            'unit_id' => $unit->id,
            'plate_normalized' => 'abg1234',
            'plate_letters_ar' => 'أ ب ج',
            'plate_digits_normalized' => '1234',
        ]);
        ApartmentResident::factory()->count(3)->create([
            'unit_id' => $unit->id, 'verification_status' => VerificationStatus::Verified,
        ]);

        $sender = User::factory()->create();
        ApartmentResident::factory()->create([
            'user_id' => $sender->id, 'unit_id' => Unit::factory()->create(['compound_id' => $compound->id])->id,
            'verification_status' => VerificationStatus::Verified,
        ]);

        $result = app(VehicleNotificationService::class)->search('ABG1234', $sender);
        $this->assertTrue($result->found);
        $this->assertSame(3, $result->recipientCount);
        $this->assertNotNull($result->anonymizedUnitLabel);
        // ensure no owner identity field
        $this->assertObjectNotHasProperty('owner', $result);
    }

    public function test_send_creates_notification_and_recipients(): void
    {
        $compound = Compound::factory()->create();
        $unit = Unit::factory()->create(['compound_id' => $compound->id]);
        $vehicle = ApartmentVehicle::factory()->create([
            'unit_id' => $unit->id,
            'plate_normalized' => 'abg1234',
        ]);
        $r1 = ApartmentResident::factory()->create([
            'unit_id' => $unit->id,
            'verification_status' => VerificationStatus::Verified,
        ]);
        $r2 = ApartmentResident::factory()->create([
            'unit_id' => $unit->id,
            'verification_status' => VerificationStatus::Verified,
        ]);

        $sender = User::factory()->create();
        ApartmentResident::factory()->create([
            'user_id' => $sender->id, 'unit_id' => Unit::factory()->create(['compound_id' => $compound->id])->id,
            'verification_status' => VerificationStatus::Verified,
        ]);

        $n = app(VehicleNotificationService::class)->send(
            'ABG1234', 'You parked in my spot',
            VehicleNotificationSenderMode::Anonymous, 'Neighbor', $sender,
        );

        $this->assertDatabaseCount('vehicle_notification_recipients', 2);
        $this->assertSame($vehicle->id, $n->target_vehicle_id);
        $this->assertSame('Neighbor', $n->sender_alias);
    }
}
```

- [ ] **Step 2: Implementation**

```php
<?php
namespace App\Services\Apartments;

use App\Enums\VehicleNotificationSenderMode;
use App\Enums\VerificationStatus;
use App\Models\Apartments\ApartmentResident;
use App\Models\Apartments\ApartmentVehicle;
use App\Models\Apartments\VehicleNotification;
use App\Models\Apartments\VehicleNotificationRecipient;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

final class VehicleNotificationSearchResult
{
    public function __construct(
        public bool $found,
        public int $recipientCount,
        public ?string $anonymizedUnitLabel,
    ) {}
}

class VehicleNotificationService
{
    public function __construct(private readonly PlateNormalizer $normalizer) {}

    public function search(string $plate, User $sender): VehicleNotificationSearchResult
    {
        $vehicle = $this->resolveVehicle($plate, $sender);
        if ($vehicle === null) {
            return new VehicleNotificationSearchResult(false, 0, null);
        }
        $recipientCount = $this->verifiedResidentsQuery($vehicle->unit_id)->count();
        $unit = $vehicle->unit()->with('building')->first();
        $label = $unit && $unit->building
            ? "An apartment in {$unit->building->name}"
            : 'An apartment in this compound';

        return new VehicleNotificationSearchResult(true, $recipientCount, $label);
    }

    public function send(
        string $plate,
        string $message,
        VehicleNotificationSenderMode $mode,
        ?string $alias,
        User $sender,
    ): VehicleNotification {
        $vehicle = $this->resolveVehicle($plate, $sender);
        abort_if($vehicle === null, 404, 'Vehicle not found');

        $senderUnitId = ApartmentResident::query()
            ->active()
            ->where('user_id', $sender->id)
            ->where('verification_status', VerificationStatus::Verified->value)
            ->value('unit_id');

        return DB::transaction(function () use ($vehicle, $message, $mode, $alias, $sender, $plate, $senderUnitId) {
            $notification = VehicleNotification::query()->create([
                'sender_user_id' => $sender->id,
                'sender_unit_id' => $senderUnitId,
                'sender_mode' => $mode,
                'sender_alias' => $mode === VehicleNotificationSenderMode::Anonymous ? $alias : null,
                'target_vehicle_id' => $vehicle->id,
                'target_unit_id' => $vehicle->unit_id,
                'target_plate_query' => $plate,
                'message' => $message,
            ]);

            $recipientUserIds = $this->verifiedResidentsQuery($vehicle->unit_id)
                ->whereNotNull('user_id')
                ->where('user_id', '!=', $sender->id)
                ->pluck('user_id')
                ->unique();

            foreach ($recipientUserIds as $userId) {
                VehicleNotificationRecipient::query()->create([
                    'vehicle_notification_id' => $notification->id,
                    'user_id' => $userId,
                ]);
            }

            return $notification;
        });
    }

    public function listForUser(User $user, int $perPage = 25): LengthAwarePaginator
    {
        return VehicleNotificationRecipient::query()
            ->where('user_id', $user->id)
            ->with('notification.targetVehicle:id,plate')
            ->latest('created_at')
            ->paginate($perPage);
    }

    public function markRead(VehicleNotificationRecipient $recipient, User $user): void
    {
        abort_if($recipient->user_id !== $user->id, 404);
        $recipient->update(['read_at' => now()]);
    }

    private function resolveVehicle(string $plate, User $sender): ?ApartmentVehicle
    {
        $compoundId = ApartmentResident::query()
            ->active()
            ->where('user_id', $sender->id)
            ->where('verification_status', VerificationStatus::Verified->value)
            ->join('units', 'units.id', '=', 'apartment_residents.unit_id')
            ->value('units.compound_id');
        if ($compoundId === null) return null;

        $terms = $this->normalizer->searchTerms($plate);

        return ApartmentVehicle::query()
            ->whereHas('unit', fn($q) => $q->where('compound_id', $compoundId))
            ->where(function($q) use ($plate, $terms) {
                $q->where('plate', 'like', "%{$plate}%")
                  ->orWhere('plate_normalized', $terms['normalized']);
                if ($terms['lettersAr'] !== '') {
                    $q->orWhere('plate_letters_ar', 'like', "%{$terms['lettersAr']}%");
                }
                if ($terms['digitsNormalized'] !== '') {
                    $q->orWhere('plate_digits_normalized', $terms['digitsNormalized']);
                }
            })
            ->with('unit.building')
            ->first();
    }

    private function verifiedResidentsQuery(string $unitId)
    {
        return ApartmentResident::query()
            ->active()
            ->where('unit_id', $unitId)
            ->where('verification_status', VerificationStatus::Verified->value);
    }
}
```

- [ ] **Step 3: Run + commit**

```bash
cd apps/api && php artisan test --filter VehicleNotificationServiceTest
git add apps/api/app/Services/Apartments/VehicleNotificationService.php apps/api/tests/Feature/Services/Apartments/VehicleNotificationServiceTest.php
git commit -m "feat(api): add VehicleNotificationService"
```

---

### Task 8: VehicleNotificationController + form requests + resource + routes

**Files:**
- Create: `apps/api/app/Http/Controllers/Api/V1/Apartments/VehicleNotificationController.php`
- Create: `apps/api/app/Http/Requests/Apartments/SearchVehicleNotificationRequest.php`
- Create: `apps/api/app/Http/Requests/Apartments/SendVehicleNotificationRequest.php`
- Create: `apps/api/app/Http/Resources/Apartments/VehicleNotificationResource.php`
- Modify: `apps/api/routes/api.php`
- Test: `apps/api/tests/Feature/Api/V1/Apartments/VehicleNotificationControllerTest.php`

- [ ] **Step 1: Form requests**

```php
// SearchVehicleNotificationRequest
public function rules(): array
{
    return ['plate' => ['required', 'string', 'min:2', 'max:30']];
}

// SendVehicleNotificationRequest
public function rules(): array
{
    return [
        'plate' => ['required', 'string', 'min:2', 'max:30'],
        'message' => ['required', 'string', 'max:1000'],
        'sender_mode' => ['required', 'string', 'in:anonymous,identified'],
        'sender_alias' => ['nullable', 'string', 'max:50'],
    ];
}
```

- [ ] **Step 2: Controller**

```php
<?php
namespace App\Http\Controllers\Api\V1\Apartments;

use App\Enums\VehicleNotificationSenderMode;
use App\Enums\VerificationStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Apartments\SearchVehicleNotificationRequest;
use App\Http\Requests\Apartments\SendVehicleNotificationRequest;
use App\Http\Resources\Apartments\VehicleNotificationResource;
use App\Models\Apartments\ApartmentResident;
use App\Models\Apartments\VehicleNotificationRecipient;
use App\Services\Apartments\VehicleNotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VehicleNotificationController extends Controller
{
    public function __construct(private readonly VehicleNotificationService $service) {}

    public function search(SearchVehicleNotificationRequest $request): JsonResponse
    {
        $this->ensureVerifiedResident($request);
        $r = $this->service->search($request->validated('plate'), $request->user());
        return response()->json([
            'data' => [
                'found' => $r->found,
                'recipientCount' => $r->recipientCount,
                'anonymizedUnitLabel' => $r->anonymizedUnitLabel,
            ],
        ]);
    }

    public function send(SendVehicleNotificationRequest $request): JsonResponse
    {
        $this->ensureVerifiedResident($request);
        $n = $this->service->send(
            $request->validated('plate'),
            $request->validated('message'),
            VehicleNotificationSenderMode::from($request->validated('sender_mode')),
            $request->validated('sender_alias'),
            $request->user(),
        );
        return response()->json(['data' => ['id' => $n->id, 'recipientCount' => $n->recipients()->count()]], 201);
    }

    public function index(Request $request)
    {
        return VehicleNotificationResource::collection($this->service->listForUser($request->user()));
    }

    public function markRead(Request $request, VehicleNotificationRecipient $recipient): JsonResponse
    {
        $this->service->markRead($recipient, $request->user());
        return response()->json(null, 204);
    }

    private function ensureVerifiedResident(Request $request): void
    {
        $exists = ApartmentResident::query()
            ->active()
            ->where('user_id', $request->user()->id)
            ->where('verification_status', VerificationStatus::Verified->value)
            ->exists();
        abort_unless($exists, 403, 'Verified resident required');
    }
}
```

- [ ] **Step 3: Resource**

```php
<?php
namespace App\Http\Resources\Apartments;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class VehicleNotificationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $n = $this->notification;
        $senderLabel = match ($n->sender_mode->value) {
            'identified' => optional($n->sender)->name . ($n->senderUnit ? " · Unit {$n->senderUnit->unit_number}" : ''),
            'anonymous' => $n->sender_alias ?: 'Another resident',
            default => 'Another resident',
        };

        return [
            'id' => $this->id,
            'message' => $n->message,
            'plate' => $n->target_plate_query,
            'senderLabel' => $senderLabel,
            'senderMode' => $n->sender_mode->value,
            'readAt' => $this->read_at?->toIso8601String(),
            'createdAt' => $this->created_at?->toIso8601String(),
        ];
    }
}
```

- [ ] **Step 4: Routes**

```php
// routes/api.php — under v1 auth group
Route::prefix('v1/vehicle-notifications')->middleware(['auth:sanctum'])->group(function () {
    Route::post('search', [\App\Http\Controllers\Api\V1\Apartments\VehicleNotificationController::class, 'search']);
    Route::post('/', [\App\Http\Controllers\Api\V1\Apartments\VehicleNotificationController::class, 'send']);
    Route::get('/', [\App\Http\Controllers\Api\V1\Apartments\VehicleNotificationController::class, 'index']);
    Route::patch('{recipient}/read', [\App\Http\Controllers\Api\V1\Apartments\VehicleNotificationController::class, 'markRead']);
});
```

Apply rate limit middleware: `->middleware('throttle:30,1')` on the `send` route to mitigate spam.

- [ ] **Step 5: Controller test**

```php
<?php
namespace Tests\Feature\Api\V1\Apartments;

use App\Enums\VerificationStatus;
use App\Models\Apartments\ApartmentResident;
use App\Models\Apartments\ApartmentVehicle;
use App\Models\Property\Compound;
use App\Models\Property\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class VehicleNotificationControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_unverified_user_blocked(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $this->postJson('/api/v1/vehicle-notifications/search', ['plate' => 'X1'])
            ->assertForbidden();
    }

    public function test_search_returns_count_only(): void
    {
        $compound = Compound::factory()->create();
        $unit = Unit::factory()->create(['compound_id' => $compound->id]);
        ApartmentVehicle::factory()->create([
            'unit_id' => $unit->id,
            'plate_normalized' => 'abg1234',
        ]);
        ApartmentResident::factory()->count(2)->create([
            'unit_id' => $unit->id, 'verification_status' => VerificationStatus::Verified,
        ]);

        $sender = User::factory()->create();
        ApartmentResident::factory()->create([
            'user_id' => $sender->id,
            'unit_id' => Unit::factory()->create(['compound_id' => $compound->id])->id,
            'verification_status' => VerificationStatus::Verified,
        ]);

        Sanctum::actingAs($sender);
        $this->postJson('/api/v1/vehicle-notifications/search', ['plate' => 'ABG1234'])
            ->assertOk()
            ->assertJsonPath('data.found', true)
            ->assertJsonPath('data.recipientCount', 2)
            ->assertJsonMissing(['name'])
            ->assertJsonMissing(['phone']);
    }

    public function test_send_creates_recipients(): void
    {
        // Same fixture as above
        $compound = Compound::factory()->create();
        $unit = Unit::factory()->create(['compound_id' => $compound->id]);
        ApartmentVehicle::factory()->create([
            'unit_id' => $unit->id,
            'plate_normalized' => 'abg1234',
        ]);
        ApartmentResident::factory()->create([
            'unit_id' => $unit->id, 'verification_status' => VerificationStatus::Verified,
        ]);
        $sender = User::factory()->create();
        ApartmentResident::factory()->create([
            'user_id' => $sender->id,
            'unit_id' => Unit::factory()->create(['compound_id' => $compound->id])->id,
            'verification_status' => VerificationStatus::Verified,
        ]);
        Sanctum::actingAs($sender);
        $this->postJson('/api/v1/vehicle-notifications', [
            'plate' => 'ABG1234',
            'message' => 'You parked in my spot',
            'sender_mode' => 'anonymous',
            'sender_alias' => 'Neighbor',
        ])->assertCreated()->assertJsonPath('data.recipientCount', 1);
    }
}
```

- [ ] **Step 6: Run + commit**

```bash
cd apps/api && php artisan test --filter VehicleNotificationControllerTest
git add apps/api/app/Http/Controllers/Api/V1/Apartments/VehicleNotificationController.php apps/api/app/Http/Requests/Apartments/SearchVehicleNotificationRequest.php apps/api/app/Http/Requests/Apartments/SendVehicleNotificationRequest.php apps/api/app/Http/Resources/Apartments/VehicleNotificationResource.php apps/api/routes/api.php apps/api/tests/Feature/Api/V1/Apartments/VehicleNotificationControllerTest.php
git commit -m "feat(api): add vehicle plate-notify endpoints"
```

---

### Task 9: Mobile — merge Vehicles + Parking tab, drop conditional hide

**Files:**
- Create: `apps/mobile/src/features/apartments/screens/tabs/VehiclesParkingTab.tsx`
- Delete: `apps/mobile/src/features/apartments/screens/tabs/VehiclesTab.tsx`
- Delete: `apps/mobile/src/features/apartments/screens/tabs/ParkingTab.tsx`
- Modify: `apps/mobile/src/features/apartments/screens/ApartmentDetailScreen.tsx`

- [ ] **Step 1: New merged tab**

```tsx
import React, { useState } from 'react';
import { View, Text, FlatList, Pressable, useColorScheme } from 'react-native';
import type { ApartmentDetail, ApartmentVehicle, ApartmentParkingSpot } from '../../../../services/apartments/types';
import { useDeleteVehicleMutation } from '../../../../services/apartments/vehiclesApi';
import { useDeleteParkingMutation } from '../../../../services/apartments/parkingApi';
import { VehicleSheet } from '../../components/VehicleSheet';
import { ParkingSpotSheet } from '../../components/ParkingSpotSheet';
import { Button } from '../../../../components/ui/Button';
import { colors, spacing, typography } from '../../../../theme';

const MAX = 4;

export function VehiclesParkingTab({ apartment }: { apartment: ApartmentDetail }) {
  const isDark = useColorScheme() === 'dark';
  const [vehicleSheet, setVehicleSheet] = useState<{ open: boolean; vehicle?: ApartmentVehicle }>({ open: false });
  const [parkingSheet, setParkingSheet] = useState<{ open: boolean; spot?: ApartmentParkingSpot }>({ open: false });
  const [deleteVehicle] = useDeleteVehicleMutation();
  const [deleteParking] = useDeleteParkingMutation();

  return (
    <View style={{ flex: 1 }}>
      {/* Vehicles section */}
      <Text style={[typography.h3, { color: colors.text.primary[isDark ? 'dark' : 'light'], padding: spacing.md }]}>
        Vehicles · {apartment.vehicles.length}/{MAX}
      </Text>
      <FlatList
        data={apartment.vehicles}
        keyExtractor={(v) => String(v.id)}
        renderItem={({ item }) => (
          <View style={{ padding: spacing.md, flexDirection: 'row', justifyContent: 'space-between' }}>
            <View>
              <Text>{item.plate}</Text>
              <Text>{item.make} {item.model} · {item.color ?? '-'}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Pressable onPress={() => setVehicleSheet({ open: true, vehicle: item })}><Text>Edit</Text></Pressable>
              <Pressable onPress={() => deleteVehicle({ unitId: apartment.id, vehicleId: item.id })}>
                <Text>Delete</Text>
              </Pressable>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={{ padding: spacing.md }}>No vehicles yet.</Text>}
      />
      <Button
        label={apartment.hasVehicle ? 'Add vehicle' : 'Vehicles disabled by admin'}
        disabled={!apartment.hasVehicle || apartment.vehicles.length >= MAX}
        onPress={() => setVehicleSheet({ open: true })}
      />

      {/* Parking section */}
      <Text style={[typography.h3, { color: colors.text.primary[isDark ? 'dark' : 'light'], padding: spacing.md, marginTop: spacing.lg }]}>
        Parking · {apartment.parkingSpots.length}/{MAX}
      </Text>
      <FlatList
        data={apartment.parkingSpots}
        keyExtractor={(s) => String(s.id)}
        renderItem={({ item }) => (
          <View style={{ padding: spacing.md, flexDirection: 'row', justifyContent: 'space-between' }}>
            <View>
              <Text>{item.code}</Text>
              <Text>{item.notes ?? ''}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Pressable onPress={() => setParkingSheet({ open: true, spot: item })}><Text>Edit</Text></Pressable>
              <Pressable onPress={() => deleteParking({ unitId: apartment.id, parkingSpotId: item.id })}>
                <Text>Delete</Text>
              </Pressable>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={{ padding: spacing.md }}>No parking spots yet.</Text>}
      />
      <Button
        label={apartment.hasParking ? 'Add parking spot' : 'Parking disabled by admin'}
        disabled={!apartment.hasParking || apartment.parkingSpots.length >= MAX}
        onPress={() => setParkingSheet({ open: true })}
      />

      {vehicleSheet.open && (
        <VehicleSheet
          apartment={apartment}
          vehicle={vehicleSheet.vehicle}
          onClose={() => setVehicleSheet({ open: false })}
        />
      )}
      {parkingSheet.open && (
        <ParkingSpotSheet
          apartment={apartment}
          spot={parkingSheet.spot}
          onClose={() => setParkingSheet({ open: false })}
        />
      )}
    </View>
  );
}
```

- [ ] **Step 2: ApartmentDetailScreen — single tab**

Replace the two `<Tab.Screen>` for Vehicles + Parking with a single `<Tab.Screen name="Vehicles & Parking" component={...VehiclesParkingTab}>`. Remove the `data.hasVehicle && ...` and `data.hasParking && ...` conditionals.

- [ ] **Step 3: Delete old tab files**

```bash
rm apps/mobile/src/features/apartments/screens/tabs/VehiclesTab.tsx
rm apps/mobile/src/features/apartments/screens/tabs/ParkingTab.tsx
```

- [ ] **Step 4: Typecheck + commit**

```bash
cd apps/mobile && npm run typecheck
git add apps/mobile/src/features/apartments
git commit -m "feat(mobile): merge vehicles and parking into single tab"
```

---

### Task 10: Mobile — VehicleSheet plate format toggle + structured inputs

**Files:**
- Create: `apps/mobile/src/features/apartments/components/PlateInput.tsx`
- Modify: `apps/mobile/src/features/apartments/components/VehicleSheet.tsx`
- Modify: `apps/mobile/src/services/apartments/types.ts`
- Modify: `apps/mobile/src/services/apartments/vehiclesApi.ts`

- [ ] **Step 1: types.ts**

```ts
export type PlateFormat = 'letters_numbers' | 'numbers_only';

export type ApartmentVehicle = {
  id: number;
  plate: string;
  plateFormat: PlateFormat;
  plateLettersAr: string | null;
  plateLettersEn: string | null;
  plateDigits: string;
  make: string | null;
  model: string | null;
  color: string | null;
  stickerCode: string | null;
  notes: string | null;
};
```

- [ ] **Step 2: PlateInput component**

```tsx
import React from 'react';
import { View, Text, TextInput, Pressable, useColorScheme } from 'react-native';
import { colors, spacing, radii, typography } from '../../../theme';
import type { PlateFormat } from '../../../services/apartments/types';

type Props = {
  format: PlateFormat;
  letters: string;
  digits: string;
  onChange: (next: { format: PlateFormat; letters: string; digits: string }) => void;
};

export function PlateInput({ format, letters, digits, onChange }: Props) {
  const isDark = useColorScheme() === 'dark';
  const tint = colors.text.primary[isDark ? 'dark' : 'light'];

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm }}>
        <Pressable
          onPress={() => onChange({ format: 'letters_numbers', letters, digits })}
          style={{ borderWidth: 1, borderRadius: radii.md, padding: spacing.sm, backgroundColor: format === 'letters_numbers' ? tint : 'transparent' }}>
          <Text style={{ color: format === 'letters_numbers' ? '#fff' : tint }}>حروف وأرقام</Text>
        </Pressable>
        <Pressable
          onPress={() => onChange({ format: 'numbers_only', letters: '', digits })}
          style={{ borderWidth: 1, borderRadius: radii.md, padding: spacing.sm, backgroundColor: format === 'numbers_only' ? tint : 'transparent' }}>
          <Text style={{ color: format === 'numbers_only' ? '#fff' : tint }}>أرقام فقط</Text>
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row-reverse', gap: spacing.sm }}>
        {format === 'letters_numbers' && (
          <TextInput
            style={{ flex: 1, borderWidth: 1, borderRadius: radii.sm, padding: spacing.sm, textAlign: 'right', color: tint }}
            placeholder="الحروف"
            value={letters}
            onChangeText={(t) => onChange({ format, letters: t, digits })}
            maxLength={20}
          />
        )}
        <TextInput
          style={{ flex: 1, borderWidth: 1, borderRadius: radii.sm, padding: spacing.sm, textAlign: 'right', color: tint }}
          placeholder="رقم الرخصة"
          value={digits}
          onChangeText={(t) => onChange({ format, letters, digits: t })}
          keyboardType="numeric"
          maxLength={10}
        />
      </View>
    </View>
  );
}
```

- [ ] **Step 3: VehicleSheet update**

Replace the previous `plate` single input with `PlateInput`. Submit body:

```ts
const body = {
  plate_format: format,
  plate_letters_input: letters || undefined,
  plate_digits_input: digits,
  make,
  model,
  color,
  sticker_code: stickerCode || undefined,
  notes: notes || undefined,
};
```

Mutation hooks remain `useCreateVehicleMutation` / `useUpdateVehicleMutation`.

- [ ] **Step 4: vehiclesApi.ts — pass through new fields**

No structural change; the body shape now uses `plate_format`/`plate_letters_input`/`plate_digits_input`.

- [ ] **Step 5: Typecheck + commit**

```bash
cd apps/mobile && npm run typecheck
git add apps/mobile/src/features/apartments apps/mobile/src/services/apartments
git commit -m "feat(mobile): add plate format toggle and structured plate inputs"
```

---

### Task 11: Mobile — vehicle notify slice + screens

**Files:**
- Create: `apps/mobile/src/services/apartments/vehicleNotificationsApi.ts`
- Create: `apps/mobile/src/features/apartments/screens/notify/VehicleNotifySearchScreen.tsx`
- Create: `apps/mobile/src/features/apartments/screens/notify/VehicleNotifyComposeScreen.tsx`
- Create: `apps/mobile/src/features/apartments/screens/notify/VehicleNotifyInboxScreen.tsx`
- Modify: `apps/mobile/src/store/index.ts`
- Modify: `apps/mobile/src/navigation/RootNavigator.tsx`
- Modify: `apps/mobile/src/navigation/types.ts`
- Modify: `apps/mobile/src/navigation/linking.ts`

- [ ] **Step 1: API slice**

```ts
import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from '../baseQuery';

export type VehicleNotifySearch = { found: boolean; recipientCount: number; anonymizedUnitLabel: string | null };
export type VehicleNotifyMessage = {
  id: number;
  message: string;
  plate: string;
  senderLabel: string;
  senderMode: 'anonymous' | 'identified';
  readAt: string | null;
  createdAt: string;
};

export const vehicleNotificationsApi = createApi({
  reducerPath: 'vehicleNotificationsApi',
  baseQuery,
  tagTypes: ['VehicleNotification'],
  endpoints: (builder) => ({
    searchVehicle: builder.mutation<VehicleNotifySearch, { plate: string }>({
      query: (body) => ({ url: '/v1/vehicle-notifications/search', method: 'POST', body }),
      transformResponse: (r: { data: VehicleNotifySearch }) => r.data,
    }),
    sendNotification: builder.mutation<{ id: number; recipientCount: number }, { plate: string; message: string; sender_mode: 'anonymous' | 'identified'; sender_alias?: string }>({
      query: (body) => ({ url: '/v1/vehicle-notifications', method: 'POST', body }),
      transformResponse: (r: { data: { id: number; recipientCount: number } }) => r.data,
      invalidatesTags: ['VehicleNotification'],
    }),
    listMyNotifications: builder.query<VehicleNotifyMessage[], void>({
      query: () => '/v1/vehicle-notifications',
      transformResponse: (r: { data: VehicleNotifyMessage[] }) => r.data,
      providesTags: ['VehicleNotification'],
    }),
    markRead: builder.mutation<void, number>({
      query: (recipientId) => ({ url: `/v1/vehicle-notifications/${recipientId}/read`, method: 'PATCH' }),
      invalidatesTags: ['VehicleNotification'],
    }),
  }),
});

export const {
  useSearchVehicleMutation,
  useSendNotificationMutation,
  useListMyNotificationsQuery,
  useMarkReadMutation,
} = vehicleNotificationsApi;
```

- [ ] **Step 2: Search + Compose screen (combined for fewer hops)**

```tsx
// VehicleNotifySearchScreen.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import { useSearchVehicleMutation, useSendNotificationMutation } from '../../../../services/apartments/vehicleNotificationsApi';

export function VehicleNotifySearchScreen({ navigation }: any) {
  const [plate, setPlate] = useState('');
  const [searchResult, setSearchResult] = useState<{ found: boolean; recipientCount: number; label: string | null } | null>(null);
  const [message, setMessage] = useState('');
  const [mode, setMode] = useState<'identified' | 'anonymous'>('identified');
  const [alias, setAlias] = useState('');
  const [search, { isLoading: searching }] = useSearchVehicleMutation();
  const [send, { isLoading: sending }] = useSendNotificationMutation();

  const onSearch = async () => {
    const r = await search({ plate }).unwrap();
    setSearchResult({ found: r.found, recipientCount: r.recipientCount, label: r.anonymizedUnitLabel });
  };

  const onSend = async () => {
    await send({
      plate,
      message,
      sender_mode: mode,
      sender_alias: mode === 'anonymous' ? (alias || undefined) : undefined,
    }).unwrap();
    navigation.goBack();
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text>Plate</Text>
      <TextInput value={plate} onChangeText={setPlate} placeholder="أ ب ج 1234" />
      <Pressable disabled={searching || plate.length < 2} onPress={onSearch}><Text>Search</Text></Pressable>

      {searchResult && (
        <View>
          {searchResult.found ? (
            <>
              <Text>Found · {searchResult.recipientCount} recipient(s) · {searchResult.label}</Text>
              <Text>Message</Text>
              <TextInput value={message} onChangeText={setMessage} placeholder="Hey, your car is..." multiline />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable onPress={() => setMode('identified')}><Text style={{ fontWeight: mode === 'identified' ? '700' : '400' }}>My identity</Text></Pressable>
                <Pressable onPress={() => setMode('anonymous')}><Text style={{ fontWeight: mode === 'anonymous' ? '700' : '400' }}>Anonymous</Text></Pressable>
              </View>
              {mode === 'anonymous' && (
                <TextInput value={alias} onChangeText={setAlias} placeholder="Your alias (optional)" maxLength={50} />
              )}
              <Pressable disabled={sending || !message.trim()} onPress={onSend}><Text>Send</Text></Pressable>
            </>
          ) : (
            <Text>No vehicle matches that plate in this compound.</Text>
          )}
        </View>
      )}
    </ScrollView>
  );
}
```

- [ ] **Step 3: Inbox screen**

```tsx
import React from 'react';
import { FlatList, View, Text, Pressable } from 'react-native';
import { useListMyNotificationsQuery, useMarkReadMutation } from '../../../../services/apartments/vehicleNotificationsApi';

export function VehicleNotifyInboxScreen() {
  const { data = [] } = useListMyNotificationsQuery();
  const [markRead] = useMarkReadMutation();
  return (
    <FlatList
      data={data}
      keyExtractor={(m) => String(m.id)}
      renderItem={({ item }) => (
        <Pressable
          onPress={() => { if (!item.readAt) markRead(item.id); }}
          style={{ padding: 12, opacity: item.readAt ? 0.5 : 1 }}>
          <Text style={{ fontWeight: '600' }}>{item.senderLabel}</Text>
          <Text>Plate: {item.plate}</Text>
          <Text>{item.message}</Text>
          <Text style={{ fontSize: 12 }}>{item.createdAt}</Text>
        </Pressable>
      )}
    />
  );
}
```

- [ ] **Step 4: Wire store + nav**

`store/index.ts`: register `vehicleNotificationsApi.reducer` and middleware.

`RootNavigator.tsx`: add stack screens `VehicleNotifySearch` (entry from apartment hub action button) and `VehicleNotifyInbox` (entry from notifications tab or dashboard quick link). Add an action button in `ApartmentDetailScreen` header: "Notify a vehicle" → `navigation.navigate('VehicleNotifySearch')`.

`types.ts` + `linking.ts`: register paths `apartments/notify-search`, `apartments/notify-inbox`.

- [ ] **Step 5: Typecheck + commit**

```bash
cd apps/mobile && npm run typecheck
git add apps/mobile/src
git commit -m "feat(mobile): add vehicle plate-notify search compose and inbox"
```

---

### Task 12: Quality gates + smoke

- [ ] **Step 1: Run all gates**

```bash
cd apps/api && composer pint -- --test && composer phpstan
cd apps/api && php artisan test
cd apps/mobile && npm run typecheck
cd apps/admin && npm run typecheck && npm run lint
```

Fix failures inline, focused commits.

- [ ] **Step 2: Manual smoke**

- Resident A on mobile adds a vehicle with Arabic letters + Arabic digits, then with numbers-only. Both persist.
- Admin web vehicle lookup finds the vehicle by typing Arabic, Latin transliteration, and digits-only.
- Resident B on mobile searches Resident A's plate, sees recipient count + unit label only. Sends anonymous message. Resident A receives it in inbox with sender label = alias or "Another resident".
- Resident A receives identified message with sender name + unit.

- [ ] **Step 3: Final summary commit only if any final fix needed.**

```bash
git log --oneline | head -20
```

---

## Self-Review Notes

Spec coverage:
- Plate variants persisted: Tasks 2, 3, 4.
- Plate normalizer mapping: Task 2.
- Tab merge + drop conditional: Task 9.
- Plate format toggle + structured inputs: Task 10.
- Notify search/send/inbox/read: Tasks 6, 7, 8, 11.
- Admin lookup expanded: Task 5.
- Tests: per-task TDD plus controller test.
- Rate limit on send: Task 8 step 4.
- Audit retention of sender identity even when anonymous: Task 7 implementation.

No placeholders. Type names consistent across tasks.
