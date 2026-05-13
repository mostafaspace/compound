<?php

namespace Tests\Feature\Api\V1\Admin;

use App\Enums\Permission;
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
}
