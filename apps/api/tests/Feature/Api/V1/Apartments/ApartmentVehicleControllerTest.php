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
            'plate' => 'ABC-1234',
            'make' => 'Toyota',
        ])
            ->assertCreated()
            ->assertJsonPath('data.plate', 'ABC-1234');
    }

    public function test_capability_disabled_returns_validation_status(): void
    {
        $this->unit->update(['has_vehicle' => false]);

        $this->postJson("/api/v1/apartments/{$this->unit->id}/vehicles", [
            'plate' => 'ABC-1234',
        ])->assertStatus(422);
    }

    public function test_capacity_exceeded_returns_conflict(): void
    {
        ApartmentVehicle::factory()->count(4)->create(['unit_id' => $this->unit->id]);

        $this->postJson("/api/v1/apartments/{$this->unit->id}/vehicles", [
            'plate' => 'ABC-1234',
        ])->assertStatus(409);
    }

    public function test_member_can_update_vehicle(): void
    {
        $vehicle = ApartmentVehicle::factory()->create(['unit_id' => $this->unit->id]);

        $this->patchJson("/api/v1/apartments/{$this->unit->id}/vehicles/{$vehicle->id}", [
            'plate' => 'XYZ-9876',
            'color' => 'Blue',
        ])
            ->assertOk()
            ->assertJsonPath('data.plate', 'XYZ-9876')
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
