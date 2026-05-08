<?php

namespace Tests\Feature\Database;

use App\Enums\UnitRelationType;
use App\Enums\VerificationStatus;
use App\Models\Apartments\ApartmentResident;
use App\Models\Property\Unit;
use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class ApartmentResidentMigrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_apartment_residents_table_exists_after_migration(): void
    {
        $this->assertTrue(Schema::hasTable('apartment_residents'));
        $this->assertTrue(Schema::hasColumn('apartment_residents', 'photo_path'));
    }

    public function test_migration_copies_memberships_and_splits_vehicle_and_parking_data(): void
    {
        $this->createLegacyUnitMembershipsTable();

        $unit = Unit::factory()->create(['has_vehicle' => false]);
        $unitWithoutVehicle = Unit::factory()->create(['has_vehicle' => true]);
        $user = User::factory()->create();
        $creator = User::factory()->create();
        $now = now()->subDay();

        DB::table('unit_memberships')->insert([
            'id' => 1001,
            'unit_id' => $unit->id,
            'user_id' => $user->id,
            'relation_type' => UnitRelationType::Owner->value,
            'starts_at' => $now->toDateString(),
            'ends_at' => null,
            'is_primary' => true,
            'verification_status' => VerificationStatus::Verified->value,
            'created_by' => $creator->id,
            'resident_name' => 'Resident Sample',
            'resident_phone' => '+201000000000',
            'phone_public' => true,
            'resident_email' => 'resident@example.test',
            'email_public' => false,
            'has_vehicle' => true,
            'vehicle_plate' => 'ABC-123',
            'parking_spot_code' => 'P-42',
            'garage_sticker_code' => 'GS-77',
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        DB::table('unit_memberships')->insert([
            'id' => 1002,
            'unit_id' => $unitWithoutVehicle->id,
            'user_id' => User::factory()->create()->id,
            'relation_type' => UnitRelationType::Tenant->value,
            'starts_at' => $now->toDateString(),
            'ends_at' => null,
            'is_primary' => false,
            'verification_status' => VerificationStatus::Verified->value,
            'created_by' => $creator->id,
            'resident_name' => null,
            'resident_phone' => null,
            'phone_public' => false,
            'resident_email' => null,
            'email_public' => false,
            'has_vehicle' => false,
            'vehicle_plate' => null,
            'parking_spot_code' => null,
            'garage_sticker_code' => null,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $this->runApartmentResidentMigration();
        $this->runApartmentResidentMigration();

        $this->assertDatabaseHas('apartment_residents', [
            'id' => 1001,
            'unit_id' => $unit->id,
            'user_id' => $user->id,
            'resident_name' => 'Resident Sample',
            'resident_phone' => '+201000000000',
            'photo_path' => null,
        ]);
        $this->assertDatabaseHas('apartment_vehicles', [
            'unit_id' => $unit->id,
            'apartment_resident_id' => 1001,
            'plate' => 'ABC-123',
            'sticker_code' => 'GS-77',
        ]);
        $this->assertDatabaseHas('apartment_parking_spots', [
            'unit_id' => $unit->id,
            'code' => 'P-42',
            'notes' => 'Migrated from unit_memberships:1001',
        ]);
        $this->assertDatabaseHas('units', [
            'id' => $unit->id,
            'has_vehicle' => true,
        ]);
        $this->assertDatabaseHas('units', [
            'id' => $unitWithoutVehicle->id,
            'has_vehicle' => false,
        ]);
        $this->assertSame(1, DB::table('apartment_residents')->where('id', 1001)->count());
        $this->assertSame(1, DB::table('apartment_vehicles')->where('plate', 'ABC-123')->count());
        $this->assertSame(1, DB::table('apartment_parking_spots')->where('code', 'P-42')->count());
    }

    public function test_rollback_removes_only_rows_derived_from_unit_memberships(): void
    {
        $this->createLegacyUnitMembershipsTable();

        $unit = Unit::factory()->create();
        $unrelatedResident = ApartmentResident::factory()->create();
        $now = now()->subDay();

        DB::table('unit_memberships')->insert([
            'id' => 2001,
            'unit_id' => $unit->id,
            'user_id' => User::factory()->create()->id,
            'relation_type' => UnitRelationType::Owner->value,
            'starts_at' => $now->toDateString(),
            'ends_at' => null,
            'is_primary' => true,
            'verification_status' => VerificationStatus::Verified->value,
            'created_by' => null,
            'resident_name' => null,
            'resident_phone' => null,
            'phone_public' => false,
            'resident_email' => null,
            'email_public' => false,
            'has_vehicle' => true,
            'vehicle_plate' => 'ROLL-1',
            'parking_spot_code' => 'ROLL-P',
            'garage_sticker_code' => null,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        DB::table('apartment_vehicles')->insert([
            'unit_id' => $unrelatedResident->unit_id,
            'apartment_resident_id' => $unrelatedResident->id,
            'plate' => 'KEEP-1',
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        DB::table('apartment_parking_spots')->insert([
            'unit_id' => $unrelatedResident->unit_id,
            'code' => 'KEEP-P',
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        DB::table('apartment_parking_spots')->insert([
            'unit_id' => $unit->id,
            'code' => 'ROLL-P',
            'notes' => 'Existing spot',
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $migration = $this->runApartmentResidentMigration();
        $this->assertDatabaseHas('units', [
            'id' => $unit->id,
            'has_vehicle' => true,
        ]);

        $migration->down();

        $this->assertDatabaseMissing('apartment_residents', ['id' => 2001]);
        $this->assertDatabaseMissing('apartment_vehicles', ['plate' => 'ROLL-1']);
        $this->assertDatabaseMissing('apartment_parking_spots', [
            'code' => 'ROLL-P',
            'notes' => 'Migrated from unit_memberships:2001',
        ]);
        $this->assertDatabaseHas('apartment_residents', ['id' => $unrelatedResident->id]);
        $this->assertDatabaseHas('apartment_vehicles', ['plate' => 'KEEP-1']);
        $this->assertDatabaseHas('apartment_parking_spots', ['code' => 'KEEP-P']);
        $this->assertDatabaseHas('apartment_parking_spots', [
            'unit_id' => $unit->id,
            'code' => 'ROLL-P',
            'notes' => 'Existing spot',
        ]);
        $this->assertDatabaseHas('units', [
            'id' => $unit->id,
            'has_vehicle' => true,
        ]);
    }

    private function runApartmentResidentMigration(): object
    {
        $migration = require database_path('migrations/2026_05_07_000200_migrate_unit_memberships_to_apartment_residents.php');

        $migration->up();

        return $migration;
    }

    private function createLegacyUnitMembershipsTable(): void
    {
        if (Schema::hasTable('unit_memberships')) {
            return;
        }

        Schema::create('unit_memberships', function (Blueprint $table): void {
            $table->unsignedBigInteger('id')->primary();
            $table->ulid('unit_id');
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('relation_type');
            $table->date('starts_at')->nullable();
            $table->date('ends_at')->nullable();
            $table->boolean('is_primary')->default(false);
            $table->string('verification_status');
            $table->unsignedBigInteger('created_by')->nullable();
            $table->string('resident_name')->nullable();
            $table->string('resident_phone')->nullable();
            $table->boolean('phone_public')->default(false);
            $table->string('resident_email')->nullable();
            $table->boolean('email_public')->default(false);
            $table->boolean('has_vehicle')->default(false);
            $table->string('vehicle_plate')->nullable();
            $table->string('parking_spot_code')->nullable();
            $table->string('garage_sticker_code')->nullable();
            $table->timestamps();
        });
    }
}
