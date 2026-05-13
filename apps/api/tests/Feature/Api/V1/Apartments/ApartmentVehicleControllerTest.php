<?php

namespace Tests\Feature\Api\V1\Apartments;

use App\Enums\VerificationStatus;
use App\Models\Apartments\ApartmentResident;
use App\Models\Apartments\ApartmentVehicle;
use App\Models\Property\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ApartmentVehicleControllerTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private Unit $unit;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->unit = Unit::factory()->create(['has_vehicle' => true]);

        ApartmentResident::factory()->create([
            'unit_id' => $this->unit->id,
            'user_id' => $this->user->id,
            'verification_status' => VerificationStatus::Verified,
        ]);

        Sanctum::actingAs($this->user);
    }

    public function test_member_can_create_vehicle(): void
    {
        $this->postJson("/api/v1/apartments/{$this->unit->id}/vehicles", [
            'plate_format' => 'letters_numbers',
            'plate_letters_input' => 'أ ب ج',
            'plate_digits_input' => '1234',
            'make' => 'Toyota',
        ])
            ->assertCreated()
            ->assertJsonPath('data.plate', 'أ ب ج 1234')
            ->assertJsonPath('data.plateFormat', 'letters_numbers')
            ->assertJsonPath('data.plateLettersAr', 'أ ب ج');
    }

    public function test_member_can_create_vehicle_even_when_unit_vehicle_capability_is_disabled(): void
    {
        $this->unit->update(['has_vehicle' => false]);

        $this->postJson("/api/v1/apartments/{$this->unit->id}/vehicles", [
            'plate_format' => 'letters_numbers',
            'plate_letters_input' => 'أ',
            'plate_digits_input' => '1',
        ])->assertCreated();
    }

    public function test_capacity_exceeded_returns_conflict(): void
    {
        ApartmentVehicle::factory()->count(4)->create(['unit_id' => $this->unit->id]);

        $this->postJson("/api/v1/apartments/{$this->unit->id}/vehicles", [
            'plate_format' => 'letters_numbers',
            'plate_letters_input' => 'أ',
            'plate_digits_input' => '1',
        ])->assertStatus(409);
    }

    public function test_member_can_update_vehicle(): void
    {
        $vehicle = ApartmentVehicle::factory()->create(['unit_id' => $this->unit->id]);

        $this->patchJson("/api/v1/apartments/{$this->unit->id}/vehicles/{$vehicle->id}", [
            'plate_format' => 'numbers_only',
            'plate_digits_input' => '9876',
            'color' => 'Blue',
        ])
            ->assertOk()
            ->assertJsonPath('data.plate', '9876')
            ->assertJsonPath('data.color', 'Blue');
    }

    public function test_member_can_delete_vehicle(): void
    {
        $vehicle = ApartmentVehicle::factory()->create(['unit_id' => $this->unit->id]);

        $this->deleteJson("/api/v1/apartments/{$this->unit->id}/vehicles/{$vehicle->id}")
            ->assertNoContent();

        $this->assertSoftDeleted('apartment_vehicles', ['id' => $vehicle->id]);
    }
}
