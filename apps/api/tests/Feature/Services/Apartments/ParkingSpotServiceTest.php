<?php

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
