<?php

namespace Tests\Feature\Api\V1\Apartments;

use App\Enums\UnitRelationType;
use App\Enums\VerificationStatus;
use App\Models\Apartments\ApartmentResident;
use App\Models\Property\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ApartmentResidentControllerTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array{User, Unit}
     */
    private function authedMember(): array
    {
        $user = User::factory()->create();
        $unit = Unit::factory()->create();

        ApartmentResident::factory()->create([
            'unit_id' => $unit->id,
            'user_id' => $user->id,
            'verification_status' => VerificationStatus::Verified,
        ]);

        Sanctum::actingAs($user);

        return [$user, $unit];
    }

    public function test_member_can_list_residents(): void
    {
        [, $unit] = $this->authedMember();

        ApartmentResident::factory()->withoutUser()->create([
            'unit_id' => $unit->id,
            'resident_name' => 'New Family',
        ]);

        $this->getJson("/api/v1/apartments/{$unit->id}/residents")
            ->assertOk()
            ->assertJsonPath('data.1.residentName', 'New Family');
    }

    public function test_member_can_create_resident(): void
    {
        [, $unit] = $this->authedMember();

        $this->postJson("/api/v1/apartments/{$unit->id}/residents", [
            'relation_type' => UnitRelationType::Resident->value,
            'resident_name' => 'New Family',
        ])
            ->assertCreated()
            ->assertJsonPath('data.residentName', 'New Family');
    }

    public function test_non_member_blocked(): void
    {
        $unit = Unit::factory()->create();
        Sanctum::actingAs(User::factory()->create());

        $this->postJson("/api/v1/apartments/{$unit->id}/residents", [
            'relation_type' => UnitRelationType::Resident->value,
            'resident_name' => 'X',
        ])->assertForbidden();
    }

    public function test_member_can_update_resident(): void
    {
        [, $unit] = $this->authedMember();
        $resident = ApartmentResident::factory()->withoutUser()->create(['unit_id' => $unit->id]);

        $this->patchJson("/api/v1/apartments/{$unit->id}/residents/{$resident->id}", [
            'resident_name' => 'Updated Family',
        ])
            ->assertOk()
            ->assertJsonPath('data.residentName', 'Updated Family');
    }

    public function test_member_can_delete_resident(): void
    {
        [, $unit] = $this->authedMember();
        $resident = ApartmentResident::factory()->withoutUser()->create(['unit_id' => $unit->id]);

        $this->deleteJson("/api/v1/apartments/{$unit->id}/residents/{$resident->id}")
            ->assertNoContent();

        $this->assertSoftDeleted('apartment_residents', ['id' => $resident->id]);
    }
}
