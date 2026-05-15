<?php

namespace Tests\Feature\Database;

use App\Models\Apartments\ApartmentResident;
use App\Models\Property\Unit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApartmentResidentCutoverTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_and_unit_expose_apartment_residents_relations(): void
    {
        $resident = ApartmentResident::factory()->create();

        $this->assertTrue($resident->user->apartmentResidents()->whereKey($resident->id)->exists());
        $this->assertTrue($resident->unit->apartmentResidents()->whereKey($resident->id)->exists());
    }

    public function test_unit_casts_apartment_parking_capability_flag(): void
    {
        $unit = Unit::factory()->create([
            'has_parking' => true,
        ]);

        $this->assertTrue($unit->has_parking);
    }

    public function test_legacy_unit_membership_model_is_removed(): void
    {
        $this->assertFalse(class_exists('App\\Models\\Property\\UnitMembership', false));
        $this->assertFileDoesNotExist(app_path('Models/Property/UnitMembership.php'));
    }
}
