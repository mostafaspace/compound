<?php

namespace Tests\Feature\Api\V1\Apartments;

use App\Enums\VerificationStatus;
use App\Models\Apartments\ApartmentParkingSpot;
use App\Models\Apartments\ApartmentResident;
use App\Models\Property\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ApartmentParkingSpotControllerTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private Unit $unit;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->unit = Unit::factory()->create(['has_parking' => true]);

        ApartmentResident::factory()->create([
            'unit_id' => $this->unit->id,
            'user_id' => $this->user->id,
            'verification_status' => VerificationStatus::Verified,
        ]);

        Sanctum::actingAs($this->user);
    }

    public function test_member_can_create_parking_spot(): void
    {
        $this->postJson("/api/v1/apartments/{$this->unit->id}/parking-spots", [
            'code' => 'B2-17',
            'notes' => 'Near elevator',
        ])
            ->assertCreated()
            ->assertJsonPath('data.code', 'B2-17');
    }

    public function test_capability_disabled_returns_validation_status(): void
    {
        $this->unit->update(['has_parking' => false]);

        $this->postJson("/api/v1/apartments/{$this->unit->id}/parking-spots", [
            'code' => 'B2-17',
        ])->assertStatus(422);
    }

    public function test_capacity_exceeded_returns_conflict(): void
    {
        ApartmentParkingSpot::factory()->count(4)->create(['unit_id' => $this->unit->id]);

        $this->postJson("/api/v1/apartments/{$this->unit->id}/parking-spots", [
            'code' => 'B2-17',
        ])->assertStatus(409);
    }

    public function test_member_can_update_parking_spot(): void
    {
        $spot = ApartmentParkingSpot::factory()->create(['unit_id' => $this->unit->id]);

        $this->patchJson("/api/v1/apartments/{$this->unit->id}/parking-spots/{$spot->id}", [
            'code' => 'B2-18',
            'notes' => 'Updated notes',
        ])
            ->assertOk()
            ->assertJsonPath('data.code', 'B2-18')
            ->assertJsonPath('data.notes', 'Updated notes');
    }

    public function test_member_can_delete_parking_spot(): void
    {
        $spot = ApartmentParkingSpot::factory()->create(['unit_id' => $this->unit->id]);

        $this->deleteJson("/api/v1/apartments/{$this->unit->id}/parking-spots/{$spot->id}")
            ->assertNoContent();

        $this->assertSoftDeleted('apartment_parking_spots', ['id' => $spot->id]);
    }
}
