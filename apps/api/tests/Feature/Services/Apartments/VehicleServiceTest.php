<?php

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
            'plate_format' => 'letters_numbers',
            'plate_letters_input' => 'أ ب ج',
            'plate_digits_input' => '1234',
            'make' => 'Toyota',
        ]);

        $this->assertSame('أ ب ج 1234', $vehicle->plate);
        $this->assertSame('abg1234', $vehicle->plate_normalized);
    }

    public function test_rejects_when_capability_disabled(): void
    {
        $unit = Unit::factory()->create(['has_vehicle' => false]);

        $this->expectException(CapabilityDisabledException::class);

        app(VehicleService::class)->create($unit, User::factory()->create(), [
            'plate_format' => 'letters_numbers',
            'plate_letters_input' => 'أ',
            'plate_digits_input' => '1',
        ]);
    }

    public function test_rejects_over_capacity(): void
    {
        $unit = Unit::factory()->create(['has_vehicle' => true]);
        ApartmentVehicle::factory()->count(4)->create(['unit_id' => $unit->id]);

        $this->expectException(CapacityExceededException::class);

        app(VehicleService::class)->create($unit, User::factory()->create(), [
            'plate_format' => 'letters_numbers',
            'plate_letters_input' => 'ب',
            'plate_digits_input' => '1',
        ]);
    }
}
