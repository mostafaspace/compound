<?php

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
