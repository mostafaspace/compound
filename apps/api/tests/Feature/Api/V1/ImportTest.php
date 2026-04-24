<?php

namespace Tests\Feature\Api\V1;

use App\Enums\ImportBatchStatus;
use App\Enums\ImportBatchType;
use App\Enums\UserRole;
use App\Models\Finance\LedgerEntry;
use App\Models\Finance\UnitAccount;
use App\Models\Import\ImportBatch;
use App\Models\Property\Building;
use App\Models\Property\Compound;
use App\Models\Property\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ImportTest extends TestCase
{
    use RefreshDatabase;

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private function makeAdmin(Compound $compound): User
    {
        return User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => $compound->id,
        ]);
    }

    private function makeSuperAdmin(): User
    {
        return User::factory()->create(['role' => UserRole::SuperAdmin->value]);
    }

    private function csvFile(array $rows): UploadedFile
    {
        $csv = implode("\n", array_map(fn (array $r) => implode(',', $r), $rows));

        return UploadedFile::fake()->createWithContent('import.csv', $csv);
    }

    // -------------------------------------------------------------------------
    // Template download
    // -------------------------------------------------------------------------

    public function test_download_units_template_returns_csv(): void
    {
        $compound = Compound::factory()->create();
        $admin = $this->makeAdmin($compound);

        Sanctum::actingAs($admin);

        $response = $this->get('/api/v1/imports/templates/units');
        $response->assertOk();
        $response->assertHeader('Content-Type', 'text/csv; charset=UTF-8');
    }

    public function test_download_users_template_returns_csv(): void
    {
        $compound = Compound::factory()->create();
        $admin = $this->makeAdmin($compound);
        Sanctum::actingAs($admin);

        $this->get('/api/v1/imports/templates/users')->assertOk();
    }

    public function test_download_opening_balances_template_returns_csv(): void
    {
        $compound = Compound::factory()->create();
        $admin = $this->makeAdmin($compound);
        Sanctum::actingAs($admin);

        $this->get('/api/v1/imports/templates/opening_balances')->assertOk();
    }

    public function test_download_invalid_type_returns_422(): void
    {
        $compound = Compound::factory()->create();
        $admin = $this->makeAdmin($compound);
        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/imports/templates/invalid_type')->assertUnprocessable();
    }

    // -------------------------------------------------------------------------
    // Units dry-run: valid rows pass validation, no DB records created
    // -------------------------------------------------------------------------

    public function test_units_dry_run_validates_and_creates_no_units(): void
    {
        $compound = Compound::factory()->create();
        $building = Building::factory()->for($compound)->create(['code' => 'B01']);
        $admin = $this->makeAdmin($compound);
        Sanctum::actingAs($admin);

        $file = $this->csvFile([
            ['building_code', 'unit_number', 'type', 'area_sqm', 'bedrooms', 'floor_number'],
            ['B01', '101', 'apartment', '120.5', '3', ''],
        ]);

        $response = $this->postJson('/api/v1/imports', [
            'compound_id' => $compound->id,
            'type' => ImportBatchType::Units->value,
            'file' => $file,
            'dry_run' => true,
        ]);

        $response->assertOk()
            ->assertJsonPath('data.isDryRun', true)
            ->assertJsonPath('data.status', ImportBatchStatus::Completed->value)
            ->assertJsonPath('data.createdCount', 1)
            ->assertJsonPath('data.errorCount', 0);

        // No actual unit should be created
        $this->assertDatabaseCount('units', 0);
    }

    // -------------------------------------------------------------------------
    // Units real import: creates units in the DB
    // -------------------------------------------------------------------------

    public function test_units_real_import_creates_units(): void
    {
        $compound = Compound::factory()->create();
        $building = Building::factory()->for($compound)->create(['code' => 'B01']);
        $admin = $this->makeAdmin($compound);
        Sanctum::actingAs($admin);

        $file = $this->csvFile([
            ['building_code', 'unit_number', 'type', 'area_sqm', 'bedrooms', 'floor_number'],
            ['B01', '101', 'apartment', '120.5', '3', ''],
            ['B01', '102', 'studio', '60', '', ''],
        ]);

        $this->postJson('/api/v1/imports', [
            'compound_id' => $compound->id,
            'type' => ImportBatchType::Units->value,
            'file' => $file,
            'dry_run' => false,
        ])->assertOk()
            ->assertJsonPath('data.createdCount', 2)
            ->assertJsonPath('data.errorCount', 0);

        $this->assertDatabaseCount('units', 2);
        $this->assertDatabaseHas('units', ['unit_number' => '101', 'compound_id' => $compound->id]);
        $this->assertDatabaseHas('units', ['unit_number' => '102']);
    }

    // -------------------------------------------------------------------------
    // Invalid rows produce row-level errors
    // -------------------------------------------------------------------------

    public function test_invalid_building_code_produces_row_error(): void
    {
        $compound = Compound::factory()->create();
        $admin = $this->makeAdmin($compound);
        Sanctum::actingAs($admin);

        $file = $this->csvFile([
            ['building_code', 'unit_number', 'type', 'area_sqm', 'bedrooms', 'floor_number'],
            ['NONEXISTENT', '101', 'apartment', '', '', ''],
        ]);

        $response = $this->postJson('/api/v1/imports', [
            'compound_id' => $compound->id,
            'type' => ImportBatchType::Units->value,
            'file' => $file,
            'dry_run' => false,
        ]);

        $response->assertOk()
            ->assertJsonPath('data.errorCount', 1)
            ->assertJsonPath('data.errors.0.row', 2);
    }

    public function test_invalid_unit_type_produces_row_error(): void
    {
        $compound = Compound::factory()->create();
        $building = Building::factory()->for($compound)->create(['code' => 'B01']);
        $admin = $this->makeAdmin($compound);
        Sanctum::actingAs($admin);

        $file = $this->csvFile([
            ['building_code', 'unit_number', 'type', 'area_sqm', 'bedrooms', 'floor_number'],
            ['B01', '101', 'invalid_type', '', '', ''],
        ]);

        $this->postJson('/api/v1/imports', [
            'compound_id' => $compound->id,
            'type' => ImportBatchType::Units->value,
            'file' => $file,
            'dry_run' => false,
        ])->assertOk()->assertJsonPath('data.errorCount', 1);
    }

    // -------------------------------------------------------------------------
    // Opening balances import
    // -------------------------------------------------------------------------

    public function test_opening_balances_import_creates_ledger_entries(): void
    {
        $compound = Compound::factory()->create();
        $building = Building::factory()->for($compound)->create();
        $unit = Unit::factory()->create([
            'compound_id' => $compound->id,
            'building_id' => $building->id,
            'unit_number' => 'A-101',
        ]);
        $admin = $this->makeAdmin($compound);
        Sanctum::actingAs($admin);

        $file = $this->csvFile([
            ['unit_code', 'amount', 'currency', 'description', 'date'],
            ['A-101', '5000.00', 'EGP', 'Opening balance', '2026-01-01'],
        ]);

        $this->postJson('/api/v1/imports', [
            'compound_id' => $compound->id,
            'type' => ImportBatchType::OpeningBalances->value,
            'file' => $file,
            'dry_run' => false,
        ])->assertOk()
            ->assertJsonPath('data.createdCount', 1)
            ->assertJsonPath('data.errorCount', 0);

        $account = UnitAccount::query()->where('unit_id', $unit->id)->first();
        $this->assertNotNull($account);
        $this->assertDatabaseHas('ledger_entries', [
            'unit_account_id' => $account->id,
            'type' => 'opening_balance',
        ]);
        $this->assertEquals('5000.00', $account->fresh()->balance);
    }

    public function test_opening_balance_dry_run_creates_no_ledger_entries(): void
    {
        $compound = Compound::factory()->create();
        $building = Building::factory()->for($compound)->create();
        $unit = Unit::factory()->create([
            'compound_id' => $compound->id,
            'building_id' => $building->id,
            'unit_number' => 'A-101',
        ]);
        $admin = $this->makeAdmin($compound);
        Sanctum::actingAs($admin);

        $file = $this->csvFile([
            ['unit_code', 'amount', 'currency', 'description', 'date'],
            ['A-101', '5000.00', 'EGP', 'Opening balance', '2026-01-01'],
        ]);

        $this->postJson('/api/v1/imports', [
            'compound_id' => $compound->id,
            'type' => ImportBatchType::OpeningBalances->value,
            'file' => $file,
            'dry_run' => true,
        ])->assertOk()->assertJsonPath('data.isDryRun', true);

        $this->assertDatabaseCount('ledger_entries', 0);
    }

    public function test_opening_balance_unknown_unit_produces_error(): void
    {
        $compound = Compound::factory()->create();
        $admin = $this->makeAdmin($compound);
        Sanctum::actingAs($admin);

        $file = $this->csvFile([
            ['unit_code', 'amount', 'currency', 'description', 'date'],
            ['NONEXISTENT', '100', 'EGP', '', ''],
        ]);

        $this->postJson('/api/v1/imports', [
            'compound_id' => $compound->id,
            'type' => ImportBatchType::OpeningBalances->value,
            'file' => $file,
            'dry_run' => false,
        ])->assertOk()->assertJsonPath('data.errorCount', 1);

        $this->assertDatabaseCount('ledger_entries', 0);
    }

    // -------------------------------------------------------------------------
    // Batch listing and detail
    // -------------------------------------------------------------------------

    public function test_batch_index_lists_batches_for_scoped_admin(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();
        $adminA = $this->makeAdmin($compoundA);
        $superAdmin = $this->makeSuperAdmin();

        // Create one batch per compound
        ImportBatch::create([
            'compound_id' => $compoundA->id,
            'actor_id' => $adminA->id,
            'type' => ImportBatchType::Units,
            'status' => ImportBatchStatus::Completed,
            'original_filename' => 'a.csv',
            'is_dry_run' => false,
            'total_rows' => 1,
        ]);
        ImportBatch::create([
            'compound_id' => $compoundB->id,
            'actor_id' => $superAdmin->id,
            'type' => ImportBatchType::Units,
            'status' => ImportBatchStatus::Completed,
            'original_filename' => 'b.csv',
            'is_dry_run' => false,
            'total_rows' => 1,
        ]);

        // Scoped admin sees only own compound
        Sanctum::actingAs($adminA);
        $this->getJson('/api/v1/imports')
            ->assertOk()
            ->assertJsonCount(1, 'data');

        // Super admin sees all
        Sanctum::actingAs($superAdmin);
        $this->getJson('/api/v1/imports')
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_batch_show_returns_errors_array(): void
    {
        $compound = Compound::factory()->create();
        $admin = $this->makeAdmin($compound);

        $batch = ImportBatch::create([
            'compound_id' => $compound->id,
            'actor_id' => $admin->id,
            'type' => ImportBatchType::Units,
            'status' => ImportBatchStatus::Completed,
            'original_filename' => 'bad.csv',
            'is_dry_run' => false,
            'total_rows' => 1,
            'error_count' => 1,
            'errors' => [['row' => 2, 'field' => 'type', 'message' => 'Invalid type.']],
        ]);

        Sanctum::actingAs($admin);
        $this->getJson("/api/v1/imports/{$batch->id}")
            ->assertOk()
            ->assertJsonPath('data.errorCount', 1)
            ->assertJsonPath('data.errors.0.row', 2);
    }

    // -------------------------------------------------------------------------
    // Access control
    // -------------------------------------------------------------------------

    public function test_resident_cannot_access_imports(): void
    {
        $compound = Compound::factory()->create();
        $resident = User::factory()->create([
            'role' => UserRole::ResidentOwner->value,
            'compound_id' => $compound->id,
        ]);
        Sanctum::actingAs($resident);

        $this->getJson('/api/v1/imports')->assertForbidden();
    }

    public function test_compound_admin_cannot_import_into_foreign_compound(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();
        $adminA = $this->makeAdmin($compoundA);
        Sanctum::actingAs($adminA);

        $file = $this->csvFile([
            ['building_code', 'unit_number', 'type', 'area_sqm', 'bedrooms', 'floor_number'],
            ['B01', '101', 'apartment', '', '', ''],
        ]);

        $this->postJson('/api/v1/imports', [
            'compound_id' => $compoundB->id,
            'type' => ImportBatchType::Units->value,
            'file' => $file,
            'dry_run' => true,
        ])->assertForbidden();
    }

    // -------------------------------------------------------------------------
    // Baseline seeder
    // -------------------------------------------------------------------------

    public function test_baseline_seeder_creates_charge_types(): void
    {
        $this->seed(\Database\Seeders\BaselineSeeder::class);

        $this->assertDatabaseHas('charge_types', ['code' => 'monthly_service']);
        $this->assertDatabaseHas('charge_types', ['code' => 'late_payment_penalty']);
        $this->assertDatabaseHas('charge_types', ['code' => 'sinking_fund']);
    }
}
