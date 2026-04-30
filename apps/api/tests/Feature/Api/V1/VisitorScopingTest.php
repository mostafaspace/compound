<?php

namespace Tests\Feature\Api\V1;

use App\Enums\UserRole;
use App\Enums\VisitorRequestStatus;
use App\Models\Property\Building;
use App\Models\Property\Compound;
use App\Models\Property\Unit;
use App\Models\User;
use App\Models\UserScopeAssignment;
use App\Models\Visitors\VisitorRequest;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class VisitorScopingTest extends TestCase
{
    use RefreshDatabase;

    public function test_building_scoped_guard_cannot_access_visitors_from_other_buildings(): void
    {
        $compound = Compound::factory()->create();
        $buildingA = Building::factory()->create(['compound_id' => $compound->id]);
        $buildingB = Building::factory()->create(['compound_id' => $compound->id]);

        $unitA = Unit::factory()->create(['compound_id' => $compound->id, 'building_id' => $buildingA->id]);
        $unitB = Unit::factory()->create(['compound_id' => $compound->id, 'building_id' => $buildingB->id]);

        $residentB = User::factory()->create();
        
        // Setup visitor request for Building B
        $visitorRequestB = VisitorRequest::query()->create([
            'host_user_id' => $residentB->id,
            'unit_id' => $unitB->id,
            'visitor_name' => 'Visitor B',
            'visit_starts_at' => now()->subHour(),
            'visit_ends_at' => now()->addHour(),
            'status' => VisitorRequestStatus::Pending->value,
        ]);

        // Setup Guard scoped ONLY to Building A
        $guard = User::factory()->create(['role' => UserRole::SecurityGuard]);
        UserScopeAssignment::create([
            'user_id' => $guard->id,
            'role_name' => 'security_guard',
            'scope_type' => 'building',
            'scope_id' => $buildingA->id,
        ]);

        $this->actingAs($guard);

        // 1. Verify index doesn't include Building B visitor
        $response = $this->getJson("/api/v1/visitor-requests");
        $response->assertOk();
        $response->assertJsonMissing(['id' => $visitorRequestB->id]);

        // 2. Verify arrive for Building B visitor is Forbidden
        $response = $this->postJson("/api/v1/visitor-requests/{$visitorRequestB->id}/arrive");
        $response->assertForbidden();
    }
}
