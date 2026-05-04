<?php

namespace Tests\Feature\Api\V1;

use App\Enums\UserRole;
use App\Enums\VoteEligibility;
use App\Enums\VoteScope;
use App\Enums\VoteStatus;
use App\Enums\VoteType;
use App\Enums\Permission;
use App\Models\Governance\Vote;
use App\Models\Governance\VoteOption;
use App\Models\Governance\VoteParticipation;
use App\Models\Property\Building;
use App\Models\Property\Compound;
use App\Models\Property\Unit;
use App\Models\Property\UnitMembership;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission as SpatiePermission;
use Spatie\Permission\Models\Role as SpatieRole;
use Tests\TestCase;

class VoteTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
    }

    // ─────────────────────────────────────────────────────────────────
    // Admin CRUD
    // ─────────────────────────────────────────────────────────────────

    public function test_admin_can_create_a_poll(): void
    {
        $compound = Compound::factory()->create();
        $admin = $this->makeScopedAdmin($compound);
        Sanctum::actingAs($admin);

        $response = $this->postJson('/api/v1/governance/votes', [
            'compoundId'  => $compound->id,
            'type'        => VoteType::Poll->value,
            'title'       => 'Preferred park opening time',
            'description' => 'Vote on best time to open the park.',
            'eligibility' => VoteEligibility::AllVerified->value,
            'options'     => [
                ['label' => '7am – 8am'],
                ['label' => '8am – 9am'],
                ['label' => '9am – 10am'],
            ],
        ])->assertCreated();

        $this->assertEquals('draft', $response->json('data.status'));
        $this->assertCount(3, $response->json('data.options'));
        $this->assertEquals('7am – 8am', $response->json('data.options.0.label'));
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'governance.votes.created',
            'actor_id' => $admin->id,
            'auditable_id' => $response->json('data.id'),
        ]);
    }

    public function test_admin_can_create_an_election(): void
    {
        $compound = Compound::factory()->create();
        $admin = $this->makeScopedAdmin($compound, UserRole::BoardMember);
        Sanctum::actingAs($admin);

        $response = $this->postJson('/api/v1/governance/votes', [
            'compoundId'  => $compound->id,
            'type'        => VoteType::Election->value,
            'title'       => 'Board president election',
            'eligibility' => VoteEligibility::OwnersOnly->value,
            'options'     => [
                ['label' => 'Ahmed Kamal'],
                ['label' => 'Sara Hassan'],
            ],
        ])->assertCreated();

        $this->assertEquals(VoteType::Election->value, $response->json('data.type'));
        $this->assertEquals(VoteEligibility::OwnersOnly->value, $response->json('data.eligibility'));
    }

    public function test_vote_creation_requires_at_least_two_options(): void
    {
        $compound = Compound::factory()->create();
        $admin = $this->makeScopedAdmin($compound);
        Sanctum::actingAs($admin);

        $this->postJson('/api/v1/governance/votes', [
            'compoundId'  => $compound->id,
            'type'        => VoteType::Poll->value,
            'title'       => 'Single option poll',
            'eligibility' => VoteEligibility::AllVerified->value,
            'options'     => [['label' => 'Only option']],
        ])->assertUnprocessable();
    }

    public function test_admin_can_update_a_draft_vote(): void
    {
        $compound = Compound::factory()->create();
        $admin = $this->makeScopedAdmin($compound);
        $vote = Vote::factory()->for($compound)->create(['created_by' => $admin->id, 'title' => 'Old title']);
        VoteOption::factory()->count(2)->create(['vote_id' => $vote->id, 'label' => 'opt']);

        Sanctum::actingAs($admin);

        $response = $this->patchJson("/api/v1/governance/votes/{$vote->id}", [
            'title' => 'Updated title',
        ])->assertOk();

        $this->assertEquals('Updated title', $response->json('data.title'));
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'governance.votes.updated',
            'actor_id' => $admin->id,
            'auditable_id' => (string) $vote->id,
        ]);
    }

    public function test_cannot_update_active_vote(): void
    {
        $compound = Compound::factory()->create();
        $admin = $this->makeScopedAdmin($compound);
        $vote = Vote::factory()->active()->create(['compound_id' => $compound->id, 'created_by' => $admin->id]);

        Sanctum::actingAs($admin);

        $this->patchJson("/api/v1/governance/votes/{$vote->id}", [
            'title' => 'Sneaky update',
        ])->assertUnprocessable();
    }

    // ─────────────────────────────────────────────────────────────────
    // Lifecycle transitions
    // ─────────────────────────────────────────────────────────────────

    public function test_admin_can_activate_draft_vote(): void
    {
        $compound = Compound::factory()->create();
        $admin = $this->makeScopedAdmin($compound);
        $vote = Vote::factory()->create(['compound_id' => $compound->id, 'created_by' => $admin->id]);
        VoteOption::factory()->count(2)->create(['vote_id' => $vote->id, 'label' => 'opt']);

        Sanctum::actingAs($admin);

        $this->postJson("/api/v1/governance/votes/{$vote->id}/activate")
            ->assertOk()
            ->assertJsonPath('data.status', VoteStatus::Active->value);
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'governance.votes.activated',
            'actor_id' => $admin->id,
            'auditable_id' => (string) $vote->id,
        ]);
    }

    public function test_cannot_activate_vote_with_fewer_than_two_options(): void
    {
        $compound = Compound::factory()->create();
        $admin = $this->makeScopedAdmin($compound);
        $vote = Vote::factory()->create(['compound_id' => $compound->id, 'created_by' => $admin->id]);
        VoteOption::factory()->create(['vote_id' => $vote->id, 'label' => 'Only one']);

        Sanctum::actingAs($admin);

        $this->postJson("/api/v1/governance/votes/{$vote->id}/activate")
            ->assertUnprocessable();
    }

    public function test_admin_can_close_active_vote(): void
    {
        $compound = Compound::factory()->create();
        $admin = $this->makeScopedAdmin($compound);
        $vote = Vote::factory()->active()->create(['compound_id' => $compound->id, 'created_by' => $admin->id]);

        Sanctum::actingAs($admin);

        $this->postJson("/api/v1/governance/votes/{$vote->id}/close")
            ->assertOk()
            ->assertJsonPath('data.status', VoteStatus::Closed->value);
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'governance.votes.closed',
            'actor_id' => $admin->id,
            'auditable_id' => (string) $vote->id,
        ]);
    }

    public function test_cannot_close_draft_vote(): void
    {
        $compound = Compound::factory()->create();
        $admin = $this->makeScopedAdmin($compound);
        $vote = Vote::factory()->create(['compound_id' => $compound->id, 'created_by' => $admin->id]);

        Sanctum::actingAs($admin);

        $this->postJson("/api/v1/governance/votes/{$vote->id}/close")
            ->assertUnprocessable();
    }

    public function test_admin_can_cancel_a_vote(): void
    {
        $compound = Compound::factory()->create();
        $admin = $this->makeScopedAdmin($compound);
        $vote = Vote::factory()->active()->create(['compound_id' => $compound->id, 'created_by' => $admin->id]);

        Sanctum::actingAs($admin);

        $this->postJson("/api/v1/governance/votes/{$vote->id}/cancel")
            ->assertOk()
            ->assertJsonPath('data.status', VoteStatus::Cancelled->value);
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'governance.votes.cancelled',
            'actor_id' => $admin->id,
            'auditable_id' => (string) $vote->id,
        ]);
    }

    // ─────────────────────────────────────────────────────────────────
    // Eligibility
    // ─────────────────────────────────────────────────────────────────

    public function test_owner_is_eligible_for_owners_only_vote(): void
    {
        [$owner, $vote] = $this->makeActiveVoteWithOwner(VoteEligibility::OwnersOnly);

        Sanctum::actingAs($owner);

        $this->getJson("/api/v1/governance/votes/{$vote->id}/eligibility")
            ->assertOk()
            ->assertJsonPath('data.eligible', true);
    }

    public function test_tenant_is_ineligible_for_owners_only_vote(): void
    {
        [, $vote] = $this->makeActiveVoteWithOwner(VoteEligibility::OwnersOnly);
        $tenant = User::factory()->create(['role' => UserRole::ResidentTenant->value]);
        $building = Building::factory()->create(['compound_id' => $vote->compound_id]);
        $unit = Unit::factory()->create([
            'compound_id' => $vote->compound_id,
            'building_id' => $building->id,
            'floor_id' => null,
        ]);
        UnitMembership::factory()->create([
            'unit_id' => $unit->id,
            'user_id' => $tenant->id,
            'verification_status' => 'verified',
            'starts_at' => now()->subYear(),
            'ends_at' => null,
        ]);

        Sanctum::actingAs($tenant);

        $data = $this->getJson("/api/v1/governance/votes/{$vote->id}/eligibility")
            ->assertOk()
            ->json('data');

        $this->assertFalse($data['eligible']);
        $this->assertEquals('owners_only', $data['reason']);
    }

    public function test_tenant_is_eligible_for_owners_and_residents_vote(): void
    {
        [, $vote] = $this->makeActiveVoteWithOwner(VoteEligibility::OwnersAndResidents);
        $tenant = User::factory()->create(['role' => UserRole::ResidentTenant->value]);
        $building = Building::factory()->create(['compound_id' => $vote->compound_id]);
        $unit = Unit::factory()->create([
            'compound_id' => $vote->compound_id,
            'building_id' => $building->id,
            'floor_id' => null,
        ]);
        UnitMembership::factory()->create([
            'unit_id' => $unit->id,
            'user_id' => $tenant->id,
            'verification_status' => 'verified',
            'starts_at' => now()->subYear(),
            'ends_at' => null,
        ]);

        Sanctum::actingAs($tenant);

        $this->getJson("/api/v1/governance/votes/{$vote->id}/eligibility")
            ->assertOk()
            ->assertJsonPath('data.eligible', true);
    }

    public function test_eligibility_returns_vote_not_active_for_draft(): void
    {
        $compound = Compound::factory()->create();
        $building = Building::factory()->for($compound)->create();
        $unit = Unit::factory()->for($compound)->for($building)->create(['floor_id' => null]);
        $vote = Vote::factory()->create(['compound_id' => $compound->id]);
        VoteOption::factory()->count(2)->create(['vote_id' => $vote->id, 'label' => 'opt']);
        $owner = User::factory()->create(['role' => UserRole::ResidentOwner->value]);
        UnitMembership::factory()->create([
            'unit_id' => $unit->id,
            'user_id' => $owner->id,
            'verification_status' => 'verified',
            'starts_at' => now()->subYear(),
            'ends_at' => null,
        ]);

        Sanctum::actingAs($owner);

        $data = $this->getJson("/api/v1/governance/votes/{$vote->id}/eligibility")
            ->assertOk()
            ->json('data');

        $this->assertFalse($data['eligible']);
        $this->assertEquals('vote_not_active', $data['reason']);
    }

    // ─────────────────────────────────────────────────────────────────
    // Casting votes
    // ─────────────────────────────────────────────────────────────────

    public function test_eligible_owner_can_cast_vote(): void
    {
        [$owner, $vote, $option] = $this->makeActiveVoteWithOwner(VoteEligibility::OwnersOnly);

        Sanctum::actingAs($owner);

        $this->postJson("/api/v1/governance/votes/{$vote->id}/cast", [
            'optionId' => $option->id,
        ])->assertOk();

        $this->assertDatabaseHas('vote_participations', [
            'vote_id' => $vote->id,
            'user_id' => $owner->id,
            'option_id' => $option->id,
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'governance.votes.cast',
            'actor_id' => $owner->id,
            'auditable_id' => (string) $vote->id,
        ]);
    }

    public function test_cannot_vote_twice(): void
    {
        [$owner, $vote, $option, $unit] = $this->makeActiveVoteWithOwner(VoteEligibility::OwnersOnly);

        VoteParticipation::create([
            'vote_id'              => $vote->id,
            'user_id'              => $owner->id,
            'unit_id'              => $unit->id,
            'option_id'            => $option->id,
            'eligibility_snapshot' => ['role' => 'resident_owner'],
        ]);

        Sanctum::actingAs($owner);

        $this->postJson("/api/v1/governance/votes/{$vote->id}/cast", [
            'optionId' => $option->id,
        ])->assertStatus(409)->assertJsonPath('reason', 'already_voted');
    }

    public function test_ineligible_user_cannot_cast_vote(): void
    {
        [, $vote, $option] = $this->makeActiveVoteWithOwner(VoteEligibility::OwnersOnly);
        $tenant = User::factory()->create(['role' => UserRole::ResidentTenant->value]);

        Sanctum::actingAs($tenant);

        $this->postJson("/api/v1/governance/votes/{$vote->id}/cast", [
            'optionId' => $option->id,
        ])->assertForbidden();
    }

    public function test_cannot_vote_in_closed_vote(): void
    {
        [$owner, $vote, $option] = $this->makeActiveVoteWithOwner(VoteEligibility::OwnersOnly);
        $vote->update(['status' => VoteStatus::Closed->value]);

        Sanctum::actingAs($owner);

        $this->postJson("/api/v1/governance/votes/{$vote->id}/cast", [
            'optionId' => $option->id,
        ])->assertForbidden();
    }

    public function test_cannot_cast_vote_for_wrong_option(): void
    {
        [$owner, $vote] = $this->makeActiveVoteWithOwner(VoteEligibility::OwnersOnly);
        $otherVote = Vote::factory()->active()->create(['created_by' => $owner->id]);
        $foreignOption = VoteOption::factory()->create(['vote_id' => $otherVote->id, 'label' => 'Foreign']);

        Sanctum::actingAs($owner);

        $this->postJson("/api/v1/governance/votes/{$vote->id}/cast", [
            'optionId' => $foreignOption->id,
        ])->assertUnprocessable();
    }

    // ─────────────────────────────────────────────────────────────────
    // Results tally
    // ─────────────────────────────────────────────────────────────────

    public function test_show_returns_tally_after_participations(): void
    {
        $compound = Compound::factory()->create();
        $admin = $this->makeScopedAdmin($compound);
        $vote = Vote::factory()->active()->create(['compound_id' => $compound->id, 'created_by' => $admin->id]);
        $opt1 = VoteOption::factory()->create(['vote_id' => $vote->id, 'label' => 'Yes']);
        $opt2 = VoteOption::factory()->create(['vote_id' => $vote->id, 'label' => 'No']);

        // 3 votes for opt1, 1 for opt2
        foreach (range(1, 3) as $i) {
            $voter = User::factory()->create(['role' => UserRole::ResidentOwner->value]);
            VoteParticipation::create([
                'vote_id'              => $vote->id,
                'user_id'              => $voter->id,
                'option_id'            => $opt1->id,
                'eligibility_snapshot' => ['role' => 'resident_owner'],
            ]);
        }
        $voter4 = User::factory()->create(['role' => UserRole::ResidentOwner->value]);
        VoteParticipation::create([
            'vote_id'              => $vote->id,
            'user_id'              => $voter4->id,
            'option_id'            => $opt2->id,
            'eligibility_snapshot' => ['role' => 'resident_owner'],
        ]);

        Sanctum::actingAs($admin);

        $data = $this->getJson("/api/v1/governance/votes/{$vote->id}")
            ->assertOk()
            ->json('data');

        $this->assertEquals(4, $data['participationsCount']);
        $yesRow = collect($data['tally'])->firstWhere('optionId', $opt1->id);
        $noRow  = collect($data['tally'])->firstWhere('optionId', $opt2->id);
        $this->assertEquals(3, $yesRow['count']);
        $this->assertEquals(1, $noRow['count']);
    }

    // ─────────────────────────────────────────────────────────────────
    // Authorization
    // ─────────────────────────────────────────────────────────────────

    public function test_resident_cannot_create_or_manage_votes(): void
    {
        $resident = User::factory()->create(['role' => UserRole::ResidentOwner->value]);
        $compound = Compound::factory()->create();
        Sanctum::actingAs($resident);

        $this->postJson('/api/v1/governance/votes', [
            'compoundId' => $compound->id,
            'type'       => VoteType::Poll->value,
            'title'      => 'Test',
            'options'    => [['label' => 'A'], ['label' => 'B']],
        ])->assertForbidden();
    }

    public function test_unauthenticated_cannot_access_governance_routes(): void
    {
        $vote = Vote::factory()->create();

        $this->getJson('/api/v1/governance/votes')->assertUnauthorized();
        $this->postJson('/api/v1/governance/votes', [])->assertUnauthorized();
        $this->getJson("/api/v1/governance/votes/{$vote->id}")->assertUnauthorized();
    }

    public function test_compound_scoped_admin_cannot_access_other_compounds_votes(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();
        $admin = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => $compoundA->id,
        ]);
        $voteA = Vote::factory()->create([
            'compound_id' => $compoundA->id,
            'created_by' => $admin->id,
        ]);
        $voteB = Vote::factory()->create([
            'compound_id' => $compoundB->id,
            'created_by' => $admin->id,
        ]);
        VoteOption::factory()->count(2)->create(['vote_id' => $voteA->id, 'label' => 'opt']);
        VoteOption::factory()->count(2)->create(['vote_id' => $voteB->id, 'label' => 'opt']);

        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/governance/votes')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $voteA->id);

        $this->getJson("/api/v1/governance/votes?compoundId={$compoundB->id}")
            ->assertForbidden();

        $this->postJson('/api/v1/governance/votes', [
            'compoundId' => $compoundB->id,
            'type' => VoteType::Poll->value,
            'title' => 'Cross compound vote',
            'options' => [['label' => 'A'], ['label' => 'B']],
        ])->assertForbidden();

        $this->getJson("/api/v1/governance/votes/{$voteB->id}")
            ->assertForbidden();

        $this->patchJson("/api/v1/governance/votes/{$voteB->id}", [
            'title' => 'Blocked update',
        ])->assertForbidden();

        $this->postJson("/api/v1/governance/votes/{$voteB->id}/activate")
            ->assertForbidden();

        $this->postJson("/api/v1/governance/votes/{$voteB->id}/cancel")
            ->assertForbidden();
    }

    public function test_effective_compound_head_is_treated_as_admin_for_vote_index_even_when_legacy_role_is_stale(): void
    {
        $compound = Compound::factory()->create();
        $permission = SpatiePermission::findOrCreate(Permission::ViewGovernance->value, 'sanctum');
        $compoundHeadRole = SpatieRole::findOrCreate('compound_head', 'sanctum');

        $admin = User::factory()->create([
            'role' => UserRole::ResidentOwner->value,
            'compound_id' => $compound->id,
        ]);
        $admin->assignRole($compoundHeadRole);
        $admin->givePermissionTo($permission);

        $vote = Vote::factory()->create([
            'compound_id' => $compound->id,
            'status' => VoteStatus::Draft->value,
            'created_by' => $admin->id,
        ]);
        VoteOption::factory()->count(2)->create(['vote_id' => $vote->id, 'label' => 'opt']);

        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/governance/votes')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $vote->id)
            ->assertJsonPath('data.0.status', VoteStatus::Draft->value);
    }

    public function test_effective_compound_head_is_not_treated_as_owner_for_owner_only_vote_when_legacy_role_is_stale(): void
    {
        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();

        $compound = Compound::factory()->create();
        $permission = SpatiePermission::findOrCreate(Permission::ViewGovernance->value, 'sanctum');
        $compoundHeadRole = SpatieRole::findOrCreate('compound_head', 'sanctum');

        $admin = User::factory()->create([
            'role' => UserRole::ResidentOwner->value,
            'compound_id' => $compound->id,
        ]);
        $admin->assignRole($compoundHeadRole);
        $admin->givePermissionTo($permission);

        $vote = Vote::factory()->active()->create([
            'compound_id' => $compound->id,
            'eligibility' => VoteEligibility::OwnersOnly->value,
            'scope' => VoteScope::Compound->value,
            'created_by' => $admin->id,
        ]);
        $option = VoteOption::factory()->create(['vote_id' => $vote->id, 'label' => 'Approve']);
        VoteOption::factory()->create(['vote_id' => $vote->id, 'label' => 'Reject']);

        Sanctum::actingAs($admin);

        $this->getJson("/api/v1/governance/votes/{$vote->id}/eligibility")
            ->assertOk()
            ->assertJsonPath('data.eligible', false)
            ->assertJsonPath('data.reason', 'owners_only');

        $this->postJson("/api/v1/governance/votes/{$vote->id}/cast", [
            'optionId' => $option->id,
        ])->assertForbidden();
    }

    public function test_effective_compound_head_with_membership_scope_cannot_access_other_compounds_votes_when_compound_id_is_null(): void
    {
        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();

        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();
        $buildingA = Building::factory()->for($compoundA)->create();
        $unitA = Unit::factory()->for($compoundA)->for($buildingA)->create(['floor_id' => null]);
        $permission = SpatiePermission::findOrCreate(Permission::ViewGovernance->value, 'sanctum');
        $compoundHeadRole = SpatieRole::findOrCreate('compound_head', 'sanctum');

        $admin = User::factory()->create([
            'role' => UserRole::ResidentOwner->value,
            'compound_id' => null,
        ]);
        $admin->assignRole($compoundHeadRole);
        $admin->givePermissionTo($permission);
        UnitMembership::factory()->create([
            'unit_id' => $unitA->id,
            'user_id' => $admin->id,
            'verification_status' => 'verified',
            'starts_at' => now()->subYear(),
            'ends_at' => null,
        ]);

        $voteA = Vote::factory()->create([
            'compound_id' => $compoundA->id,
            'status' => VoteStatus::Draft->value,
            'created_by' => $admin->id,
        ]);
        $voteB = Vote::factory()->create([
            'compound_id' => $compoundB->id,
            'status' => VoteStatus::Draft->value,
            'created_by' => $admin->id,
        ]);
        VoteOption::factory()->count(2)->create(['vote_id' => $voteA->id, 'label' => 'opt']);
        VoteOption::factory()->count(2)->create(['vote_id' => $voteB->id, 'label' => 'opt']);

        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/governance/votes')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $voteA->id);

        $this->getJson("/api/v1/governance/votes?compoundId={$compoundB->id}")
            ->assertForbidden();

        $this->getJson("/api/v1/governance/votes/{$voteB->id}")
            ->assertForbidden();
    }

    public function test_resident_cannot_access_vote_from_another_compound(): void
    {
        $compoundA = Compound::factory()->create();
        $buildingA = Building::factory()->for($compoundA)->create();
        $unitA = Unit::factory()->for($compoundA)->for($buildingA)->create(['floor_id' => null]);
        $resident = User::factory()->create(['role' => UserRole::ResidentOwner->value]);
        UnitMembership::factory()->create([
            'unit_id' => $unitA->id,
            'user_id' => $resident->id,
            'verification_status' => 'verified',
            'starts_at' => now()->subYear(),
            'ends_at' => null,
        ]);

        $compoundB = Compound::factory()->create();
        $vote = Vote::factory()->active()->create(['compound_id' => $compoundB->id]);
        $option = VoteOption::factory()->create(['vote_id' => $vote->id, 'label' => 'Foreign']);
        VoteOption::factory()->create(['vote_id' => $vote->id, 'label' => 'Other']);

        Sanctum::actingAs($resident);

        $this->getJson("/api/v1/governance/votes/{$vote->id}")
            ->assertForbidden();

        $this->getJson("/api/v1/governance/votes/{$vote->id}/eligibility")
            ->assertForbidden();

        $this->postJson("/api/v1/governance/votes/{$vote->id}/cast", [
            'optionId' => $option->id,
        ])->assertForbidden();
    }

    // ─────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────

    /**
     * Creates an active vote with one resident owner having a verified membership.
     *
     * @return array{0: User, 1: Vote, 2: VoteOption, 3: \App\Models\Property\Unit}
     */
    private function makeActiveVoteWithOwner(VoteEligibility $eligibility): array
    {
        $compound  = Compound::factory()->create();
        $building  = Building::factory()->for($compound)->create();
        $unit      = Unit::factory()->for($compound)->for($building)->create(['floor_id' => null]);
        $owner     = User::factory()->create(['role' => UserRole::ResidentOwner->value]);

        UnitMembership::factory()->create([
            'unit_id'             => $unit->id,
            'user_id'             => $owner->id,
            'verification_status' => 'verified',
            'starts_at'           => now()->subYear(),
            'ends_at'             => null,
        ]);

        $admin = $this->makeScopedAdmin($compound);
        $vote  = Vote::factory()->active()->create([
            'compound_id' => $compound->id,
            'eligibility' => $eligibility->value,
            'created_by'  => $admin->id,
        ]);
        $opt1  = VoteOption::factory()->create(['vote_id' => $vote->id, 'label' => 'Option A']);
        VoteOption::factory()->create(['vote_id' => $vote->id, 'label' => 'Option B']);

        return [$owner, $vote, $opt1, $unit];
    }

    // ─────────────────────────────────────────────────────────────────
    // WS5: One-vote-per-apartment enforcement
    // ─────────────────────────────────────────────────────────────────

    public function test_second_resident_from_same_apartment_cannot_cast_in_same_vote(): void
    {
        [$owner, $vote, $option, $unit] = $this->makeActiveVoteWithOwner(VoteEligibility::OwnersOnly);

        $tenant = User::factory()->create(['role' => UserRole::ResidentOwner->value]);
        UnitMembership::factory()->create([
            'unit_id'             => $unit->id,
            'user_id'             => $tenant->id,
            'verification_status' => 'verified',
            'starts_at'           => now()->subYear(),
            'ends_at'             => null,
        ]);

        // Owner votes first
        Sanctum::actingAs($owner);
        $this->postJson("/api/v1/governance/votes/{$vote->id}/cast", ['optionId' => $option->id])
            ->assertOk();

        // Second resident from same apartment is blocked
        Sanctum::actingAs($tenant);
        $this->postJson("/api/v1/governance/votes/{$vote->id}/cast", ['optionId' => $option->id])
            ->assertStatus(409)
            ->assertJsonPath('reason', 'apartment_already_voted');
    }

    public function test_unit_id_is_stored_on_vote_participation(): void
    {
        [$owner, $vote, $option, $unit] = $this->makeActiveVoteWithOwner(VoteEligibility::OwnersOnly);

        Sanctum::actingAs($owner);

        $this->postJson("/api/v1/governance/votes/{$vote->id}/cast", ['optionId' => $option->id])
            ->assertOk();

        $this->assertDatabaseHas('vote_participations', [
            'vote_id' => $vote->id,
            'user_id' => $owner->id,
            'unit_id' => $unit->id,
            'option_id' => $option->id,
        ]);
    }

    public function test_admin_can_view_voters_list_with_unit_info(): void
    {
        [$owner, $vote, $option, $unit] = $this->makeActiveVoteWithOwner(VoteEligibility::OwnersOnly);
        $admin = $this->makeScopedAdmin($vote->compound);

        VoteParticipation::create([
            'vote_id'              => $vote->id,
            'user_id'              => $owner->id,
            'unit_id'              => $unit->id,
            'option_id'            => $option->id,
            'eligibility_snapshot' => ['role' => 'resident_owner'],
        ]);

        Sanctum::actingAs($admin);

        $data = $this->getJson("/api/v1/governance/votes/{$vote->id}/voters")
            ->assertOk()
            ->json('data');

        $this->assertCount(1, $data);
        $this->assertEquals($owner->id, $data[0]['userId']);
        $this->assertEquals($unit->id, $data[0]['unitId']);
        $this->assertNotNull($data[0]['option']);
    }

    public function test_resident_cannot_view_voters_list(): void
    {
        [$owner, $vote] = $this->makeActiveVoteWithOwner(VoteEligibility::OwnersOnly);

        Sanctum::actingAs($owner);

        $this->getJson("/api/v1/governance/votes/{$vote->id}/voters")
            ->assertForbidden();
    }

    public function test_anonymous_vote_hides_individual_voter_list_even_from_admin(): void
    {
        [$owner, $vote, $option, $unit] = $this->makeActiveVoteWithOwner(VoteEligibility::OwnersOnly);
        $admin = $this->makeScopedAdmin($vote->compound);

        $vote->update(['is_anonymous' => true]);

        VoteParticipation::create([
            'vote_id'              => $vote->id,
            'user_id'              => $owner->id,
            'unit_id'              => $unit->id,
            'option_id'            => $option->id,
            'eligibility_snapshot' => ['role' => 'resident_owner'],
        ]);

        Sanctum::actingAs($admin);

        $this->getJson("/api/v1/governance/votes/{$vote->id}/voters")
            ->assertForbidden()
            ->assertJsonPath('message', 'Individual voters are hidden for anonymous votes.');
    }

    // ─────────────────────────────────────────────────────────────────

    private function makeScopedAdmin(Compound $compound, UserRole $role = UserRole::CompoundAdmin): User
    {
        return User::factory()->create([
            'role' => $role->value,
            'compound_id' => $compound->id,
        ]);
    }
}
