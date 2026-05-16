<?php

namespace Tests\Feature\Api\V1\Admin;

use App\Enums\UserRole;
use App\Models\Apartments\ApartmentResident;
use App\Models\Apartments\ApartmentVehicle;
use App\Models\Property\Building;
use App\Models\Property\Compound;
use App\Models\Property\Unit;
use App\Models\User;
use App\Models\Visitors\VisitorRequest;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class VehicleLookupControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_vehicle_lookup_matches_resident_and_unit_text(): void
    {
        $compound = Compound::factory()->create();
        $building = Building::factory()->create([
            'compound_id' => $compound->id,
            'name' => 'Cedar Tower',
        ]);
        $unit = Unit::factory()->create([
            'building_id' => $building->id,
            'compound_id' => $compound->id,
            'unit_number' => 'B-1402',
        ]);
        $vehicle = ApartmentVehicle::factory()->create([
            'unit_id' => $unit->id,
            'plate' => 'XYZ 987',
        ]);
        ApartmentResident::factory()->create([
            'resident_name' => 'Mona Kamal',
            'unit_id' => $unit->id,
        ]);
        VisitorRequest::factory()->create([
            'unit_id' => $unit->id,
            'vehicle_plate' => null,
        ]);

        $admin = User::factory()->create([
            'role' => UserRole::SuperAdmin->value,
        ]);
        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/admin/vehicle-lookup?q=Mona', [
            'X-Compound-Id' => $compound->id,
        ])
            ->assertOk()
            ->assertJsonPath('data.0.vehicleId', $vehicle->id);

        $this->getJson('/api/v1/admin/vehicle-lookup?q=B-1402', [
            'X-Compound-Id' => $compound->id,
        ])
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.vehicleId', $vehicle->id);
    }

    public function test_legacy_compound_admin_vehicle_lookup_matches_normalized_plate_digits(): void
    {
        $compound = Compound::factory()->create();
        $building = Building::factory()->create([
            'compound_id' => $compound->id,
            'name' => 'Building H',
        ]);
        $unit = Unit::factory()->create([
            'building_id' => $building->id,
            'compound_id' => $compound->id,
            'unit_number' => 'HR-F02-F02',
        ]);
        $vehicle = ApartmentVehicle::factory()->create([
            'unit_id' => $unit->id,
            'plate' => 'ع ع ع 1111',
            'plate_letters_ar' => 'ع ع ع',
            'plate_letters_en' => 'A A A',
            'plate_digits' => '1111',
            'plate_digits_normalized' => '1111',
            'plate_normalized' => 'aaa1111',
            'make' => 'Toyota',
            'model' => 'Corolla',
            'color' => 'White',
        ]);

        $admin = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => $compound->id,
        ]);
        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/admin/vehicle-lookup?q=1111', [
            'X-Compound-Id' => $compound->id,
        ])
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.vehicleId', $vehicle->id)
            ->assertJsonPath('data.0.plate', 'ع ع ع 1111')
            ->assertJsonPath('data.0.unit.unitNumber', 'HR-F02-F02');
    }
}
