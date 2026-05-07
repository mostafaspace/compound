<?php

namespace Tests\Feature\Api\V1;

use App\Enums\UnitRelationType;
use App\Enums\UserRole;
use App\Enums\VerificationStatus;
use App\Models\Apartments\ApartmentResident;
use App\Models\Property\Building;
use App\Models\Property\Compound;
use App\Models\Property\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_does_not_count_staff_without_memberships_as_apartment_assignment_candidates(): void
    {
        $compound = Compound::factory()->create();

        $admin = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => $compound->id,
        ]);

        User::factory()->create([
            'role' => UserRole::BoardMember->value,
            'compound_id' => $compound->id,
        ]);

        User::factory()->create([
            'role' => UserRole::SecurityGuard->value,
            'compound_id' => $compound->id,
        ]);

        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/v1/dashboard')->assertOk();

        $this->assertEmpty(
            collect($response->json('data.attentionItems', []))
                ->where('type', 'unassigned')
                ->values()
                ->all()
        );
    }

    public function test_dashboard_counts_only_unassigned_resident_candidates(): void
    {
        $compound = Compound::factory()->create();
        $building = Building::factory()->for($compound)->create();
        $unit = Unit::factory()->for($compound)->for($building)->create(['floor_id' => null]);

        $admin = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => $compound->id,
        ]);

        $unassignedResident = User::factory()->create([
            'role' => UserRole::Resident->value,
            'compound_id' => $compound->id,
        ]);

        $assignedResident = User::factory()->create([
            'role' => UserRole::ResidentOwner->value,
            'compound_id' => $compound->id,
        ]);

        ApartmentResident::query()->create([
            'unit_id' => $unit->id,
            'user_id' => $assignedResident->id,
            'relation_type' => UnitRelationType::Owner->value,
            'starts_at' => now()->subDay()->toDateString(),
            'is_primary' => true,
            'verification_status' => VerificationStatus::Verified->value,
        ]);

        User::factory()->create([
            'role' => UserRole::FinanceReviewer->value,
            'compound_id' => $compound->id,
        ]);

        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/v1/dashboard')->assertOk();

        $unassignedItem = collect($response->json('data.attentionItems', []))
            ->firstWhere('type', 'unassigned');

        $this->assertNotNull($unassignedItem);
        $this->assertSame(1, $unassignedItem['count']);
        $this->assertSame('/units/assign', $unassignedItem['route']);
        $this->assertSame($unassignedResident->compound_id, $compound->id);
    }
}
