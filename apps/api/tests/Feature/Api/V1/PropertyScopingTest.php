<?php

namespace Tests\Feature\Api\V1;

use App\Enums\UserRole;
use App\Models\Property\Building;
use App\Models\Property\Compound;
use App\Models\Property\Floor;
use App\Models\Property\Unit;
use App\Models\User;
use App\Models\UserScopeAssignment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PropertyScopingTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Prove that a user scoped to one building can currently see units
     * in another building within the same compound (The Vulnerability).
     */
    public function test_building_scoped_staff_can_leak_into_other_buildings_in_same_compound(): void
    {
        // 1. Setup Compound with two buildings
        $compound = Compound::factory()->create();
        $buildingA = Building::factory()->create(['compound_id' => $compound->id, 'name' => 'Building A']);
        $buildingB = Building::factory()->create(['compound_id' => $compound->id, 'name' => 'Building B']);

        $unitA = Unit::factory()->create(['compound_id' => $compound->id, 'building_id' => $buildingA->id]);
        $unitB = Unit::factory()->create(['compound_id' => $compound->id, 'building_id' => $buildingB->id]);

        // 2. Setup Staff User scoped ONLY to Building A
        $staff = User::factory()->create([
            'role' => UserRole::CompoundAdmin, // Role that has 'view_users'
            'compound_id' => null, // Stale/null direct compound
        ]);

        UserScopeAssignment::create([
            'user_id' => $staff->id,
            'role_name' => 'compound_admin',
            'scope_type' => 'building',
            'scope_id' => $buildingA->id,
        ]);

        $this->actingAs($staff);

        // 3. Verify they can see the compound (Correct behavior)
        $response = $this->getJson("/api/v1/compounds/{$compound->id}");
        $response->assertOk();

        // 4. Verify they can see units in Building A (Correct behavior)
        $response = $this->getJson("/api/v1/buildings/{$buildingA->id}/units");
        $response->assertOk();
        $response->assertJsonFragment(['id' => $unitA->id]);

        // 5. THE FIX: Verify they CANNOT see units in Building B (Hardened)
        $response = $this->getJson("/api/v1/buildings/{$buildingB->id}/units");
        $response->assertForbidden();

        // 6. THE FIX: Verify they CANNOT see Building B units in the general lookup
        $response = $this->getJson('/api/v1/units');
        $response->assertJsonFragment(['id' => $unitA->id]);
        $response->assertJsonMissing(['id' => $unitB->id]);
    }

    /**
     * Verify that a user scoped to one floor cannot see units on another floor.
     */
    public function test_floor_scoped_staff_cannot_leak_into_other_floors(): void
    {
        $compound = Compound::factory()->create();
        $building = Building::factory()->create(['compound_id' => $compound->id]);

        $floor1 = Floor::factory()->create(['building_id' => $building->id, 'label' => 'Floor 1', 'level_number' => 1]);
        $floor2 = Floor::factory()->create(['building_id' => $building->id, 'label' => 'Floor 2', 'level_number' => 2]);

        $unit1 = Unit::factory()->create(['compound_id' => $compound->id, 'building_id' => $building->id, 'floor_id' => $floor1->id]);
        $unit2 = Unit::factory()->create(['compound_id' => $compound->id, 'building_id' => $building->id, 'floor_id' => $floor2->id]);

        $staff = User::factory()->create(['role' => UserRole::CompoundAdmin]);

        UserScopeAssignment::create([
            'user_id' => $staff->id,
            'role_name' => 'compound_admin',
            'scope_type' => 'floor',
            'scope_id' => $floor1->id,
        ]);

        $this->actingAs($staff);

        // Verify they can see units on Floor 1
        $response = $this->getJson("/api/v1/units?floorId={$floor1->id}");
        $response->assertOk();
        $response->assertJsonFragment(['id' => $unit1->id]);

        // Verify they CANNOT see units on Floor 2
        $response = $this->getJson("/api/v1/units?floorId={$floor2->id}");
        $response->assertForbidden();

        // Verify general lookup only returns Floor 1
        $response = $this->getJson('/api/v1/units');
        $response->assertJsonFragment(['id' => $unit1->id]);
        $response->assertJsonMissing(['id' => $unit2->id]);
    }
}
