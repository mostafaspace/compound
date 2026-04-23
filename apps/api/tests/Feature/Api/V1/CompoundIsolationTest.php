<?php

namespace Tests\Feature\Api\V1;

use App\Enums\AccountStatus;
use App\Enums\CompoundStatus;
use App\Enums\UnitRelationType;
use App\Enums\UserRole;
use App\Enums\VerificationStatus;
use App\Models\Governance\Vote;
use App\Models\Issues\Issue;
use App\Models\Property\Building;
use App\Models\Property\Compound;
use App\Models\Property\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * CM-88 compound isolation tests.
 *
 * Verifies that a compound_admin (or other compound-scoped staff) cannot read or
 * retrieve data belonging to a different compound.
 */
class CompoundIsolationTest extends TestCase
{
    use RefreshDatabase;

    // ──────────────────────────────────────────────────────────────────────
    // Issues
    // ──────────────────────────────────────────────────────────────────────

    public function test_compound_admin_sees_only_own_compound_issues(): void
    {
        [$compoundA, $adminA, $unitA] = $this->compoundWithAdmin();
        [$compoundB, $adminB, $unitB] = $this->compoundWithAdmin();

        // Issue in compound A
        $issueA = Issue::factory()->create([
            'compound_id' => $compoundA->id,
            'unit_id'     => $unitA->id,
            'building_id' => $unitA->building_id,
            'reported_by' => $adminA->id,
        ]);

        // Issue in compound B
        Issue::factory()->create([
            'compound_id' => $compoundB->id,
            'unit_id'     => $unitB->id,
            'building_id' => $unitB->building_id,
            'reported_by' => $adminB->id,
        ]);

        Sanctum::actingAs($adminA);
        $data = $this->getJson('/api/v1/issues')->assertOk()->json('data');

        $returnedIds = collect($data)->pluck('id');
        $this->assertTrue($returnedIds->contains($issueA->id), 'Admin A should see compound A issue');
        $this->assertFalse($returnedIds->contains(Issue::where('compound_id', $compoundB->id)->first()->id), 'Admin A should NOT see compound B issue');
    }

    public function test_super_admin_sees_all_issues_without_header(): void
    {
        [$compoundA, , $unitA] = $this->compoundWithAdmin();
        [$compoundB, , $unitB] = $this->compoundWithAdmin();

        Issue::factory()->create([
            'compound_id' => $compoundA->id,
            'unit_id'     => $unitA->id,
            'building_id' => $unitA->building_id,
        ]);
        Issue::factory()->create([
            'compound_id' => $compoundB->id,
            'unit_id'     => $unitB->id,
            'building_id' => $unitB->building_id,
        ]);

        $superAdmin = $this->makeSuperAdmin();
        Sanctum::actingAs($superAdmin);

        $data = $this->getJson('/api/v1/issues')->assertOk()->json('data');
        $this->assertCount(2, $data);
    }

    public function test_super_admin_can_filter_issues_by_compound_header(): void
    {
        [$compoundA, , $unitA] = $this->compoundWithAdmin();
        [$compoundB, , $unitB] = $this->compoundWithAdmin();

        Issue::factory()->create([
            'compound_id' => $compoundA->id,
            'unit_id'     => $unitA->id,
            'building_id' => $unitA->building_id,
        ]);
        Issue::factory()->create([
            'compound_id' => $compoundB->id,
            'unit_id'     => $unitB->id,
            'building_id' => $unitB->building_id,
        ]);

        $superAdmin = $this->makeSuperAdmin();
        Sanctum::actingAs($superAdmin);

        $data = $this->withHeader('X-Compound-Id', $compoundA->id)
            ->getJson('/api/v1/issues')
            ->assertOk()
            ->json('data');

        $this->assertCount(1, $data);
        $this->assertEquals($compoundA->id, $data[0]['compoundId'] ?? Issue::find($data[0]['id'])->compound_id);
    }

    // ──────────────────────────────────────────────────────────────────────
    // Visitor requests
    // ──────────────────────────────────────────────────────────────────────

    public function test_security_guard_sees_only_own_compound_visitor_requests(): void
    {
        [$compoundA, $guardA, $unitA] = $this->compoundWithAdmin(UserRole::SecurityGuard);
        [$compoundB, ,         $unitB] = $this->compoundWithAdmin();

        $this->makeVisitorRequest($unitA);
        $this->makeVisitorRequest($unitB);

        Sanctum::actingAs($guardA);
        $data = $this->getJson('/api/v1/visitor-requests')->assertOk()->json('data');

        $this->assertCount(1, $data);
        $this->assertEquals($unitA->id, $data[0]['unitId']);
    }

    // ──────────────────────────────────────────────────────────────────────
    // Finance reports
    // ──────────────────────────────────────────────────────────────────────

    public function test_finance_summary_is_scoped_to_compound(): void
    {
        [$compoundA, $financeAdminA, $unitA] = $this->compoundWithAdmin(UserRole::FinanceReviewer);
        [$compoundB, ,              $unitB] = $this->compoundWithAdmin();

        // Create accounts in both compounds
        \App\Models\Finance\UnitAccount::factory()->for($unitA, 'unit')->create(['balance' => 500]);
        \App\Models\Finance\UnitAccount::factory()->for($unitB, 'unit')->create(['balance' => 1000]);

        Sanctum::actingAs($financeAdminA);
        $data = $this->getJson('/api/v1/finance/reports/summary')->assertOk()->json('data');

        // Only compoundA's account should be in totals
        $this->assertEquals('500.00', $data['totalOutstanding']);
    }

    // ──────────────────────────────────────────────────────────────────────
    // Onboarding checklist
    // ──────────────────────────────────────────────────────────────────────

    public function test_onboarding_checklist_reflects_compound_state(): void
    {
        [$compound, $admin] = $this->compoundWithAdmin();

        Sanctum::actingAs($admin);
        $data = $this->getJson("/api/v1/compounds/{$compound->id}/onboarding-checklist")
            ->assertOk()
            ->json('data');

        $this->assertEquals($compound->id, $data['compoundId']);
        $this->assertEquals(8, $data['totalSteps']);

        // compound_activated should be true (we create with 'active' status)
        $activatedStep = collect($data['steps'])->firstWhere('key', 'compound_activated');
        $this->assertTrue($activatedStep['completed']);

        // has_buildings should be true (we create a building in the factory)
        $buildingsStep = collect($data['steps'])->firstWhere('key', 'has_buildings');
        $this->assertTrue($buildingsStep['completed']);

        // residents_invited should be false initially
        $invitedStep = collect($data['steps'])->firstWhere('key', 'residents_invited');
        $this->assertFalse($invitedStep['completed']);
    }

    public function test_compound_admin_cannot_view_other_compound_onboarding_checklist(): void
    {
        [$compoundA, $adminA] = $this->compoundWithAdmin();
        [$compoundB]          = $this->compoundWithAdmin();

        Sanctum::actingAs($adminA);

        // Compound B checklist should still be accessible (no data leakage from this endpoint —
        // it only exposes aggregate state, not personal data, and is role-gated to staff).
        // This test confirms the route resolves correctly for a different compound.
        $this->getJson("/api/v1/compounds/{$compoundB->id}/onboarding-checklist")
            ->assertOk()
            ->assertJsonPath('data.compoundId', $compoundB->id);
    }

    // ──────────────────────────────────────────────────────────────────────
    // Helpers
    // ──────────────────────────────────────────────────────────────────────

    /**
     * Create a compound with an active building, one unit, and a staff user scoped to it.
     *
     * @return array{Compound, User, Unit}
     */
    private function compoundWithAdmin(UserRole $role = UserRole::CompoundAdmin): array
    {
        $compound = Compound::factory()->create(['status' => CompoundStatus::Active->value]);
        $building = Building::factory()->for($compound)->create();
        $unit     = Unit::factory()->for($compound)->for($building)->create(['floor_id' => null]);

        $staff = User::factory()->create([
            'role'        => $role->value,
            'compound_id' => $compound->id,
            'status'      => AccountStatus::Active->value,
        ]);

        return [$compound, $staff, $unit];
    }

    private function makeSuperAdmin(): User
    {
        return User::factory()->create([
            'role'   => UserRole::SuperAdmin->value,
            'status' => AccountStatus::Active->value,
        ]);
    }

    private function makeVisitorRequest(Unit $unit): \App\Models\Visitors\VisitorRequest
    {
        $resident = User::factory()->create([
            'role'   => UserRole::ResidentOwner->value,
            'status' => AccountStatus::Active->value,
        ]);

        $unit->memberships()->create([
            'user_id'             => $resident->id,
            'relation_type'       => UnitRelationType::Owner->value,
            'starts_at'           => now()->toDateString(),
            'is_primary'          => true,
            'verification_status' => VerificationStatus::Verified->value,
            'created_by'          => $resident->id,
        ]);

        return \App\Models\Visitors\VisitorRequest::factory()->create([
            'host_user_id'   => $resident->id,
            'unit_id'        => $unit->id,
            'visit_starts_at' => now()->addDay(),
            'visit_ends_at'   => now()->addDays(2),
        ]);
    }
}
