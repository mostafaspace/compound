<?php

namespace Tests\Feature\Api\V1;

use App\Enums\PollStatus;
use App\Enums\UserRole;
use App\Models\Polls\Poll;
use App\Models\Property\Building;
use App\Models\Property\Compound;
use App\Models\Property\Unit;
use App\Models\Property\UnitMembership;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GovernanceScopingTest extends TestCase
{
    use RefreshDatabase;

    public function test_resident_cannot_see_polls_from_other_buildings_in_index(): void
    {
        $compound = Compound::factory()->create();
        $buildingA = Building::factory()->create(['compound_id' => $compound->id]);
        $buildingB = Building::factory()->create(['compound_id' => $compound->id]);

        $unitA = Unit::factory()->create(['compound_id' => $compound->id, 'building_id' => $buildingA->id]);
        $unitB = Unit::factory()->create(['compound_id' => $compound->id, 'building_id' => $buildingB->id]);

        // Resident in Building A
        $residentA = User::factory()->create(['role' => UserRole::ResidentOwner]);
        UnitMembership::factory()->create([
            'user_id' => $residentA->id,
            'unit_id' => $unitA->id,
            'verification_status' => 'verified',
        ]);

        // Poll for Building B
        $pollB = Poll::create([
            'compound_id' => $compound->id,
            'building_id' => $buildingB->id,
            'scope' => 'building',
            'status' => PollStatus::Active->value,
            'title' => 'Building B Poll',
            'description' => 'Test Poll',
            'created_by' => $residentA->id,
        ]);

        $this->actingAs($residentA);

        // 1. Verify index doesn't include Building B poll
        $response = $this->getJson("/api/v1/polls");
        $response->assertOk();
        $response->assertJsonMissing(['id' => $pollB->id]);

        // 2. Verify show for Building B poll is Forbidden
        $response = $this->getJson("/api/v1/polls/{$pollB->id}");
        $response->assertForbidden();
    }
}
