<?php

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

        $resident = ApartmentResident::factory()->create();
        $withResident = ApartmentVehicle::factory()->create([
            'unit_id' => $resident->unit_id,
            'apartment_resident_id' => $resident->id,
        ]);
        $this->assertNotNull($withResident->resident);
    }
}
