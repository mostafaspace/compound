<?php

namespace Tests\Feature\Api\V1;

use App\Enums\Permission;
use App\Enums\NotificationCategory;
use App\Enums\PollStatus;
use App\Enums\UserRole;
use App\Models\Polls\Poll;
use App\Models\Polls\PollOption;
use App\Models\Polls\PollType;
use App\Models\Polls\PollVote;
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

class PollsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function test_effective_compound_head_is_treated_as_admin_for_poll_index_even_when_legacy_role_is_stale(): void
    {
        $compound = Compound::factory()->create();
        $permission = SpatiePermission::findOrCreate(Permission::ViewGovernance->value, 'sanctum');
        $compoundHeadRole = SpatieRole::findOrCreate('compound_head', 'sanctum');
        $compoundHeadRole->givePermissionTo($permission);

        $admin = User::factory()->create([
            'role' => UserRole::ResidentOwner->value,
            'compound_id' => $compound->id,
        ]);
        $admin->assignRole($compoundHeadRole);

        $poll = Poll::create([
            'compound_id' => $compound->id,
            'title' => 'Draft budget priorities',
            'status' => PollStatus::Draft->value,
            'scope' => 'compound',
            'eligibility' => 'all_verified',
            'created_by' => $admin->id,
        ]);

        PollOption::create([
            'poll_id' => $poll->id,
            'label' => 'Security upgrades',
            'sort_order' => 0,
        ]);
        PollOption::create([
            'poll_id' => $poll->id,
            'label' => 'Landscape refresh',
            'sort_order' => 1,
        ]);

        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/polls')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $poll->id)
            ->assertJsonPath('data.0.status', PollStatus::Draft->value);
    }

    public function test_effective_compound_head_with_membership_scope_cannot_see_other_compound_polls_when_compound_id_is_null(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();
        $buildingA = Building::factory()->for($compoundA)->create();
        $unitA = Unit::factory()->for($compoundA)->for($buildingA)->create(['floor_id' => null]);
        $permission = SpatiePermission::findOrCreate(Permission::ViewGovernance->value, 'sanctum');
        $compoundHeadRole = SpatieRole::findOrCreate('compound_head', 'sanctum');
        $compoundHeadRole->givePermissionTo($permission);

        $admin = User::factory()->create([
            'role' => UserRole::ResidentOwner->value,
            'compound_id' => null,
        ]);
        $admin->assignRole($compoundHeadRole);
        UnitMembership::factory()->create([
            'unit_id' => $unitA->id,
            'user_id' => $admin->id,
            'verification_status' => 'verified',
            'starts_at' => now()->subYear(),
            'ends_at' => null,
        ]);

        $pollA = Poll::create([
            'compound_id' => $compoundA->id,
            'title' => 'Compound A draft poll',
            'status' => PollStatus::Draft->value,
            'scope' => 'compound',
            'eligibility' => 'all_verified',
            'created_by' => $admin->id,
        ]);
        $pollB = Poll::create([
            'compound_id' => $compoundB->id,
            'title' => 'Compound B draft poll',
            'status' => PollStatus::Draft->value,
            'scope' => 'compound',
            'eligibility' => 'all_verified',
            'created_by' => $admin->id,
        ]);

        foreach ([$pollA, $pollB] as $poll) {
            PollOption::create(['poll_id' => $poll->id, 'label' => 'Option 1', 'sort_order' => 0]);
            PollOption::create(['poll_id' => $poll->id, 'label' => 'Option 2', 'sort_order' => 1]);
        }

        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/polls')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $pollA->id);

        $this->getJson("/api/v1/polls?compoundId={$compoundB->id}")
            ->assertForbidden();

        $this->getJson("/api/v1/polls/{$pollB->id}")
            ->assertForbidden();
    }

    public function test_effective_compound_head_prefers_membership_scope_over_stale_direct_compound_id_for_poll_index(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();
        $buildingA = Building::factory()->for($compoundA)->create();
        $unitA = Unit::factory()->for($compoundA)->for($buildingA)->create(['floor_id' => null]);
        $permission = SpatiePermission::findOrCreate(Permission::ViewGovernance->value, 'sanctum');
        $compoundHeadRole = SpatieRole::findOrCreate('compound_head', 'sanctum');
        $compoundHeadRole->givePermissionTo($permission);

        $admin = User::factory()->create([
            'role' => UserRole::ResidentOwner->value,
            'compound_id' => $compoundB->id,
        ]);
        $admin->assignRole($compoundHeadRole);
        UnitMembership::factory()->create([
            'unit_id' => $unitA->id,
            'user_id' => $admin->id,
            'verification_status' => 'verified',
            'starts_at' => now()->subYear(),
            'ends_at' => null,
        ]);

        $pollA = Poll::create([
            'compound_id' => $compoundA->id,
            'title' => 'Compound A draft poll',
            'status' => PollStatus::Draft->value,
            'scope' => 'compound',
            'eligibility' => 'all_verified',
            'created_by' => $admin->id,
        ]);
        $pollB = Poll::create([
            'compound_id' => $compoundB->id,
            'title' => 'Compound B draft poll',
            'status' => PollStatus::Draft->value,
            'scope' => 'compound',
            'eligibility' => 'all_verified',
            'created_by' => $admin->id,
        ]);

        foreach ([$pollA, $pollB] as $poll) {
            PollOption::create(['poll_id' => $poll->id, 'label' => 'Option 1', 'sort_order' => 0]);
            PollOption::create(['poll_id' => $poll->id, 'label' => 'Option 2', 'sort_order' => 1]);
        }

        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/polls')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $pollA->id);
    }

    public function test_membership_scoped_resident_cannot_view_poll_from_other_compound(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();
        $buildingA = Building::factory()->for($compoundA)->create();
        $unitA = Unit::factory()->for($compoundA)->for($buildingA)->create(['floor_id' => null]);

        $resident = User::factory()->create([
            'role' => UserRole::ResidentOwner->value,
            'compound_id' => null,
        ]);
        UnitMembership::factory()->create([
            'unit_id' => $unitA->id,
            'user_id' => $resident->id,
            'verification_status' => 'verified',
            'starts_at' => now()->subYear(),
            'ends_at' => null,
        ]);

        $poll = Poll::create([
            'compound_id' => $compoundB->id,
            'title' => 'Foreign active poll',
            'status' => PollStatus::Active->value,
            'scope' => 'compound',
            'eligibility' => 'all_verified',
            'created_by' => $resident->id,
        ]);
        PollOption::create(['poll_id' => $poll->id, 'label' => 'Option 1', 'sort_order' => 0]);
        PollOption::create(['poll_id' => $poll->id, 'label' => 'Option 2', 'sort_order' => 1]);

        Sanctum::actingAs($resident);

        $this->getJson("/api/v1/polls/{$poll->id}")
            ->assertForbidden();
    }

    public function test_membership_scoped_compound_head_can_only_manage_own_poll_types_when_compound_id_is_null(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();
        $buildingA = Building::factory()->for($compoundA)->create();
        $unitA = Unit::factory()->for($compoundA)->for($buildingA)->create(['floor_id' => null]);
        $permission = SpatiePermission::findOrCreate(Permission::ViewGovernance->value, 'sanctum');
        $compoundHeadRole = SpatieRole::findOrCreate('compound_head', 'sanctum');
        $compoundHeadRole->givePermissionTo($permission);

        $admin = User::factory()->create([
            'role' => UserRole::ResidentOwner->value,
            'compound_id' => null,
        ]);
        $admin->assignRole($compoundHeadRole);
        UnitMembership::factory()->create([
            'unit_id' => $unitA->id,
            'user_id' => $admin->id,
            'verification_status' => 'verified',
            'starts_at' => now()->subYear(),
            'ends_at' => null,
        ]);

        $globalType = PollType::create([
            'compound_id' => null,
            'name' => 'Global Type',
            'description' => 'Global fallback type',
            'color' => '#111111',
            'is_active' => true,
            'sort_order' => 0,
            'created_by' => $admin->id,
        ]);
        $ownType = PollType::create([
            'compound_id' => $compoundA->id,
            'name' => 'Compound A Type',
            'description' => 'Compound A type',
            'color' => '#222222',
            'is_active' => true,
            'sort_order' => 1,
            'created_by' => $admin->id,
        ]);
        $foreignType = PollType::create([
            'compound_id' => $compoundB->id,
            'name' => 'Compound B Type',
            'description' => 'Compound B type',
            'color' => '#333333',
            'is_active' => true,
            'sort_order' => 2,
            'created_by' => $admin->id,
        ]);

        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/polls/types')
            ->assertOk()
            ->assertJsonCount(2, 'data');

        $this->postJson('/api/v1/polls/types', [
            'name' => 'Managed Scope Type',
            'description' => 'Created from managed compound scope',
            'color' => '#14b8a6',
            'isActive' => true,
            'sortOrder' => 3,
        ])
            ->assertCreated()
            ->assertJsonPath('data.compoundId', $compoundA->id);

        $this->patchJson("/api/v1/polls/types/{$ownType->id}", [
            'name' => 'Compound A Type Updated',
        ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Compound A Type Updated');

        $this->patchJson("/api/v1/polls/types/{$foreignType->id}", [
            'name' => 'Should Be Blocked',
        ])->assertForbidden();

        $this->deleteJson("/api/v1/polls/types/{$globalType->id}")
            ->assertForbidden();
    }

    public function test_resident_can_unvote_while_poll_is_active_and_revote(): void
    {
        $compound = Compound::factory()->create();
        $building = Building::factory()->for($compound)->create();
        $unit = Unit::factory()->for($compound)->for($building)->create(['floor_id' => null]);

        $resident = User::factory()->create(['role' => UserRole::ResidentOwner->value, 'compound_id' => null]);
        UnitMembership::factory()->create([
            'unit_id' => $unit->id,
            'user_id' => $resident->id,
            'verification_status' => 'verified',
            'starts_at' => now()->subYear(),
            'ends_at' => null,
        ]);

        $poll = Poll::create([
            'compound_id' => $compound->id,
            'title' => 'Unvote test poll',
            'status' => PollStatus::Active->value,
            'scope' => 'compound',
            'eligibility' => 'all_verified',
            'created_by' => $resident->id,
        ]);
        $opt1 = PollOption::create(['poll_id' => $poll->id, 'label' => 'Option A', 'sort_order' => 0]);
        $opt2 = PollOption::create(['poll_id' => $poll->id, 'label' => 'Option B', 'sort_order' => 1]);

        Sanctum::actingAs($resident);

        $this->postJson("/api/v1/polls/{$poll->id}/vote", ['optionIds' => [$opt1->id]])
            ->assertOk();

        $this->assertDatabaseHas('poll_votes', ['poll_id' => $poll->id, 'user_id' => $resident->id]);
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'polls.voted',
            'actor_id' => $resident->id,
            'auditable_id' => (string) $poll->id,
        ]);

        $this->deleteJson("/api/v1/polls/{$poll->id}/vote")
            ->assertOk()
            ->assertJsonPath('data.message', 'Vote removed successfully.');

        $this->assertDatabaseMissing('poll_votes', ['poll_id' => $poll->id, 'user_id' => $resident->id]);
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'polls.unvoted',
            'actor_id' => $resident->id,
            'auditable_id' => (string) $poll->id,
        ]);

        // Resident can vote again after unvoting
        $this->postJson("/api/v1/polls/{$poll->id}/vote", ['optionIds' => [$opt2->id]])
            ->assertOk();

        $this->assertDatabaseHas('poll_votes', ['poll_id' => $poll->id, 'user_id' => $resident->id]);
    }

    public function test_multi_apartment_resident_must_select_unit_before_voting_when_multiple_units_are_eligible(): void
    {
        $compound = Compound::factory()->create();
        $building = Building::factory()->for($compound)->create();
        $unitA = Unit::factory()->for($compound)->for($building)->create(['floor_id' => null, 'unit_number' => 'A1']);
        $unitB = Unit::factory()->for($compound)->for($building)->create(['floor_id' => null, 'unit_number' => 'B1']);

        $resident = User::factory()->create(['role' => UserRole::ResidentOwner->value, 'compound_id' => null]);

        UnitMembership::factory()->create([
            'unit_id' => $unitA->id,
            'user_id' => $resident->id,
            'verification_status' => 'verified',
            'starts_at' => now()->subYear(),
            'ends_at' => null,
            'is_primary' => true,
        ]);
        UnitMembership::factory()->create([
            'unit_id' => $unitB->id,
            'user_id' => $resident->id,
            'verification_status' => 'verified',
            'starts_at' => now()->subYear(),
            'ends_at' => null,
            'is_primary' => false,
        ]);

        $poll = Poll::create([
            'compound_id' => $compound->id,
            'title' => 'Multiple apartments',
            'status' => PollStatus::Active->value,
            'scope' => 'compound',
            'eligibility' => 'all_verified',
            'created_by' => $resident->id,
        ]);
        $option = PollOption::create(['poll_id' => $poll->id, 'label' => 'Option A', 'sort_order' => 0]);
        PollOption::create(['poll_id' => $poll->id, 'label' => 'Option B', 'sort_order' => 1]);

        Sanctum::actingAs($resident);

        $this->getJson("/api/v1/polls/{$poll->id}/eligibility")
            ->assertOk()
            ->assertJsonPath('data.requiresUnitSelection', true)
            ->assertJsonPath('data.selectedUnitId', $unitA->id)
            ->assertJsonCount(2, 'data.eligibleUnits');

        $this->postJson("/api/v1/polls/{$poll->id}/vote", ['optionIds' => [$option->id]])
            ->assertUnprocessable()
            ->assertJsonPath('reason', 'unit_selection_required');
    }

    public function test_multi_apartment_resident_can_cast_and_remove_ballots_per_selected_unit(): void
    {
        $compound = Compound::factory()->create();
        $building = Building::factory()->for($compound)->create();
        $unitA = Unit::factory()->for($compound)->for($building)->create(['floor_id' => null, 'unit_number' => 'A1']);
        $unitB = Unit::factory()->for($compound)->for($building)->create(['floor_id' => null, 'unit_number' => 'B1']);

        $resident = User::factory()->create(['role' => UserRole::ResidentOwner->value, 'compound_id' => null]);

        foreach ([$unitA, $unitB] as $index => $unit) {
            UnitMembership::factory()->create([
                'unit_id' => $unit->id,
                'user_id' => $resident->id,
                'verification_status' => 'verified',
                'starts_at' => now()->subYear(),
                'ends_at' => null,
                'is_primary' => $index === 0,
            ]);
        }

        $poll = Poll::create([
            'compound_id' => $compound->id,
            'title' => 'Per apartment ballots',
            'status' => PollStatus::Active->value,
            'scope' => 'compound',
            'eligibility' => 'all_verified',
            'created_by' => $resident->id,
        ]);
        $optA = PollOption::create(['poll_id' => $poll->id, 'label' => 'Option A', 'sort_order' => 0, 'votes_count' => 0]);
        $optB = PollOption::create(['poll_id' => $poll->id, 'label' => 'Option B', 'sort_order' => 1, 'votes_count' => 0]);

        Sanctum::actingAs($resident);
        $this->postJson("/api/v1/polls/{$poll->id}/vote", ['unitId' => $unitA->id, 'optionIds' => [$optA->id]])
            ->assertOk();
        $this->postJson("/api/v1/polls/{$poll->id}/vote", ['unitId' => $unitB->id, 'optionIds' => [$optB->id]])
            ->assertOk();

        $this->assertDatabaseHas('poll_votes', [
            'poll_id' => $poll->id,
            'user_id' => $resident->id,
            'unit_id' => $unitA->id,
        ]);
        $this->assertDatabaseHas('poll_votes', [
            'poll_id' => $poll->id,
            'user_id' => $resident->id,
            'unit_id' => $unitB->id,
        ]);

        $this->deleteJson("/api/v1/polls/{$poll->id}/vote?unitId={$unitA->id}")
            ->assertOk();

        $this->assertDatabaseMissing('poll_votes', [
            'poll_id' => $poll->id,
            'unit_id' => $unitA->id,
        ]);
        $this->assertDatabaseHas('poll_votes', [
            'poll_id' => $poll->id,
            'unit_id' => $unitB->id,
        ]);
    }

    public function test_poll_detail_uses_selected_unit_context_for_multi_apartment_resident(): void
    {
        $compound = Compound::factory()->create();
        $building = Building::factory()->for($compound)->create();
        $unitA = Unit::factory()->for($compound)->for($building)->create(['floor_id' => null, 'unit_number' => 'A1']);
        $unitB = Unit::factory()->for($compound)->for($building)->create(['floor_id' => null, 'unit_number' => 'B1']);

        $resident = User::factory()->create(['role' => UserRole::ResidentOwner->value, 'compound_id' => null]);

        foreach ([$unitA, $unitB] as $index => $unit) {
            UnitMembership::factory()->create([
                'unit_id' => $unit->id,
                'user_id' => $resident->id,
                'verification_status' => 'verified',
                'starts_at' => now()->subYear(),
                'ends_at' => null,
                'is_primary' => $index === 0,
            ]);
        }

        $poll = Poll::create([
            'compound_id' => $compound->id,
            'title' => 'Selected apartment context',
            'status' => PollStatus::Active->value,
            'scope' => 'compound',
            'eligibility' => 'all_verified',
            'created_by' => $resident->id,
        ]);
        $optA = PollOption::create(['poll_id' => $poll->id, 'label' => 'Option A', 'sort_order' => 0, 'votes_count' => 0]);
        $optB = PollOption::create(['poll_id' => $poll->id, 'label' => 'Option B', 'sort_order' => 1, 'votes_count' => 0]);

        Sanctum::actingAs($resident);
        $this->postJson("/api/v1/polls/{$poll->id}/vote", ['unitId' => $unitA->id, 'optionIds' => [$optA->id]])
            ->assertOk();
        $this->postJson("/api/v1/polls/{$poll->id}/vote", ['unitId' => $unitB->id, 'optionIds' => [$optB->id]])
            ->assertOk();

        $this->getJson("/api/v1/polls/{$poll->id}?unitId={$unitA->id}")
            ->assertOk()
            ->assertJsonPath('data.hasVoted', true)
            ->assertJsonPath('data.selectedUnitId', $unitA->id)
            ->assertJsonPath('data.userVoteOptionIds.0', $optA->id);

        $this->getJson("/api/v1/polls/{$poll->id}?unitId={$unitB->id}")
            ->assertOk()
            ->assertJsonPath('data.hasVoted', true)
            ->assertJsonPath('data.selectedUnitId', $unitB->id)
            ->assertJsonPath('data.userVoteOptionIds.0', $optB->id);
    }

    public function test_second_resident_from_same_apartment_can_replace_the_apartment_ballot_while_poll_is_active(): void
    {
        $compound = Compound::factory()->create();
        $building = Building::factory()->for($compound)->create();
        $unit = Unit::factory()->for($compound)->for($building)->create(['floor_id' => null]);

        $owner = User::factory()->create(['role' => UserRole::ResidentOwner->value, 'compound_id' => null]);
        $spouse = User::factory()->create(['role' => UserRole::ResidentOwner->value, 'compound_id' => null]);

        foreach ([$owner, $spouse] as $user) {
            UnitMembership::factory()->create([
                'unit_id' => $unit->id,
                'user_id' => $user->id,
                'verification_status' => 'verified',
                'starts_at' => now()->subYear(),
                'ends_at' => null,
            ]);
        }

        $poll = Poll::create([
            'compound_id' => $compound->id,
            'title' => 'Apartment ballot handoff',
            'status' => PollStatus::Active->value,
            'scope' => 'compound',
            'eligibility' => 'all_verified',
            'created_by' => $owner->id,
        ]);
        $optA = PollOption::create(['poll_id' => $poll->id, 'label' => 'Option A', 'sort_order' => 0, 'votes_count' => 0]);
        $optB = PollOption::create(['poll_id' => $poll->id, 'label' => 'Option B', 'sort_order' => 1, 'votes_count' => 0]);

        Sanctum::actingAs($owner);
        $this->postJson("/api/v1/polls/{$poll->id}/vote", ['optionIds' => [$optA->id]])
            ->assertOk();

        Sanctum::actingAs($spouse);
        $this->postJson("/api/v1/polls/{$poll->id}/vote", ['optionIds' => [$optB->id]])
            ->assertOk()
            ->assertJsonPath('data.message', 'Vote recorded successfully.');

        $this->assertDatabaseCount('poll_votes', 1);
        $this->assertDatabaseHas('poll_votes', [
            'poll_id' => $poll->id,
            'user_id' => $spouse->id,
            'unit_id' => $unit->id,
        ]);
        $this->assertDatabaseMissing('poll_vote_options', [
            'poll_option_id' => $optA->id,
        ]);
        $this->assertDatabaseHas('poll_vote_options', [
            'poll_option_id' => $optB->id,
        ]);
        $this->assertSame(0, $optA->fresh()->votes_count);
        $this->assertSame(1, $optB->fresh()->votes_count);
    }

    public function test_second_resident_from_same_apartment_can_remove_the_current_apartment_ballot_while_poll_is_active(): void
    {
        $compound = Compound::factory()->create();
        $building = Building::factory()->for($compound)->create();
        $unit = Unit::factory()->for($compound)->for($building)->create(['floor_id' => null]);

        $owner = User::factory()->create(['role' => UserRole::ResidentOwner->value, 'compound_id' => null]);
        $spouse = User::factory()->create(['role' => UserRole::ResidentOwner->value, 'compound_id' => null]);

        foreach ([$owner, $spouse] as $user) {
            UnitMembership::factory()->create([
                'unit_id' => $unit->id,
                'user_id' => $user->id,
                'verification_status' => 'verified',
                'starts_at' => now()->subYear(),
                'ends_at' => null,
            ]);
        }

        $poll = Poll::create([
            'compound_id' => $compound->id,
            'title' => 'Apartment ballot removal',
            'status' => PollStatus::Active->value,
            'scope' => 'compound',
            'eligibility' => 'all_verified',
            'created_by' => $owner->id,
        ]);
        $option = PollOption::create(['poll_id' => $poll->id, 'label' => 'Option A', 'sort_order' => 0, 'votes_count' => 0]);

        Sanctum::actingAs($owner);
        $this->postJson("/api/v1/polls/{$poll->id}/vote", ['optionIds' => [$option->id]])
            ->assertOk();

        Sanctum::actingAs($spouse);
        $this->deleteJson("/api/v1/polls/{$poll->id}/vote")
            ->assertOk()
            ->assertJsonPath('data.message', 'Vote removed successfully.');

        $this->assertDatabaseMissing('poll_votes', [
            'poll_id' => $poll->id,
            'unit_id' => $unit->id,
        ]);
        $this->assertSame(0, $option->fresh()->votes_count);
    }

    public function test_resident_cannot_unvote_after_poll_is_closed(): void
    {
        $compound = Compound::factory()->create();
        $building = Building::factory()->for($compound)->create();
        $unit = Unit::factory()->for($compound)->for($building)->create(['floor_id' => null]);

        $resident = User::factory()->create(['role' => UserRole::ResidentOwner->value, 'compound_id' => null]);
        UnitMembership::factory()->create([
            'unit_id' => $unit->id,
            'user_id' => $resident->id,
            'verification_status' => 'verified',
            'starts_at' => now()->subYear(),
            'ends_at' => null,
        ]);

        $poll = Poll::create([
            'compound_id' => $compound->id,
            'title' => 'Closed poll',
            'status' => PollStatus::Active->value,
            'scope' => 'compound',
            'eligibility' => 'all_verified',
            'created_by' => $resident->id,
        ]);
        $opt1 = PollOption::create(['poll_id' => $poll->id, 'label' => 'Option A', 'sort_order' => 0]);

        // Create vote directly so we can close the poll immediately after
        PollVote::create(['poll_id' => $poll->id, 'user_id' => $resident->id, 'unit_id' => $unit->id, 'voted_at' => now()]);

        $poll->update(['status' => PollStatus::Closed->value]);

        Sanctum::actingAs($resident);

        $this->deleteJson("/api/v1/polls/{$poll->id}/vote")
            ->assertUnprocessable();
    }

    public function test_vote_rejects_duplicate_option_ids(): void
    {
        $compound = Compound::factory()->create();
        $building = Building::factory()->for($compound)->create();
        $unit = Unit::factory()->for($compound)->for($building)->create(['floor_id' => null]);

        $resident = User::factory()->create(['role' => UserRole::ResidentOwner->value, 'compound_id' => null]);
        UnitMembership::factory()->create([
            'unit_id' => $unit->id,
            'user_id' => $resident->id,
            'verification_status' => 'verified',
            'starts_at' => now()->subYear(),
            'ends_at' => null,
        ]);

        $poll = Poll::create([
            'compound_id' => $compound->id,
            'title' => 'Duplicate option id test',
            'status' => PollStatus::Active->value,
            'scope' => 'compound',
            'eligibility' => 'all_verified',
            'created_by' => $resident->id,
        ]);
        $opt1 = PollOption::create(['poll_id' => $poll->id, 'label' => 'Option A', 'sort_order' => 0]);
        PollOption::create(['poll_id' => $poll->id, 'label' => 'Option B', 'sort_order' => 1]);

        Sanctum::actingAs($resident);
        $this->postJson("/api/v1/polls/{$poll->id}/vote", ['optionIds' => [$opt1->id, $opt1->id]])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['optionIds.1']);
    }

    public function test_cannot_vote_before_poll_start_time(): void
    {
        $compound = Compound::factory()->create();
        $building = Building::factory()->for($compound)->create();
        $unit = Unit::factory()->for($compound)->for($building)->create(['floor_id' => null]);
        $resident = User::factory()->create(['role' => UserRole::ResidentOwner->value, 'compound_id' => null]);

        UnitMembership::factory()->create([
            'unit_id' => $unit->id,
            'user_id' => $resident->id,
            'verification_status' => 'verified',
            'starts_at' => now()->subYear(),
            'ends_at' => null,
        ]);

        $poll = Poll::create([
            'compound_id' => $compound->id,
            'title' => 'Upcoming poll',
            'status' => PollStatus::Active->value,
            'scope' => 'compound',
            'eligibility' => 'all_verified',
            'starts_at' => now()->addHour(),
            'created_by' => $resident->id,
        ]);
        $option = PollOption::create(['poll_id' => $poll->id, 'label' => 'Option A', 'sort_order' => 0]);

        Sanctum::actingAs($resident);
        $this->postJson("/api/v1/polls/{$poll->id}/vote", ['optionIds' => [$option->id]])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Voting for this poll has not started yet.');
    }

    public function test_admin_can_view_poll_voters_list_with_unit_info(): void
    {
        $compound = Compound::factory()->create();
        $building = Building::factory()->for($compound)->create();
        $unit = Unit::factory()->for($compound)->for($building)->create(['floor_id' => null]);

        $admin = User::factory()->create(['role' => UserRole::CompoundAdmin->value, 'compound_id' => $compound->id]);
        $resident = User::factory()->create(['role' => UserRole::ResidentOwner->value, 'compound_id' => null]);
        UnitMembership::factory()->create([
            'unit_id' => $unit->id,
            'user_id' => $resident->id,
            'verification_status' => 'verified',
            'starts_at' => now()->subYear(),
            'ends_at' => null,
        ]);

        $poll = Poll::create([
            'compound_id' => $compound->id,
            'title' => 'Voters list test',
            'status' => PollStatus::Active->value,
            'scope' => 'compound',
            'eligibility' => 'all_verified',
            'created_by' => $admin->id,
        ]);
        $opt1 = PollOption::create(['poll_id' => $poll->id, 'label' => 'Option A', 'sort_order' => 0]);

        Sanctum::actingAs($resident);
        $this->postJson("/api/v1/polls/{$poll->id}/vote", ['optionIds' => [$opt1->id]])
            ->assertOk();

        Sanctum::actingAs($admin);
        $response = $this->getJson("/api/v1/polls/{$poll->id}/voters")
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->assertSame($resident->id, $response->json('data.0.userId'));
        $this->assertSame($unit->id, $response->json('data.0.unitId'));
        $this->assertContains('Option A', $response->json('data.0.options'));
    }

    public function test_show_includes_notification_and_current_view_logs_for_resident_transparency(): void
    {
        $compound = Compound::factory()->create();
        $building = Building::factory()->for($compound)->create();
        $unit = Unit::factory()->for($compound)->for($building)->create(['floor_id' => null]);

        $admin = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => $compound->id,
        ]);
        $resident = User::factory()->create([
            'role' => UserRole::ResidentOwner->value,
            'compound_id' => null,
            'name' => 'Resident Transparency',
        ]);

        UnitMembership::factory()->create([
            'unit_id' => $unit->id,
            'user_id' => $resident->id,
            'verification_status' => 'verified',
            'starts_at' => now()->subYear(),
            'ends_at' => null,
        ]);

        $poll = Poll::create([
            'compound_id' => $compound->id,
            'title' => 'Transparency poll',
            'status' => PollStatus::Draft->value,
            'scope' => 'compound',
            'eligibility' => 'all_verified',
            'created_by' => $admin->id,
        ]);
        PollOption::create(['poll_id' => $poll->id, 'label' => 'Option A', 'sort_order' => 0]);
        PollOption::create(['poll_id' => $poll->id, 'label' => 'Option B', 'sort_order' => 1]);

        Sanctum::actingAs($admin);
        $this->postJson("/api/v1/polls/{$poll->id}/publish")
            ->assertOk();
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'polls.published',
            'actor_id' => $admin->id,
            'auditable_id' => (string) $poll->id,
        ]);

        Sanctum::actingAs($resident);
        $response = $this->getJson("/api/v1/polls/{$poll->id}")
            ->assertOk();

        $this->assertSame($resident->name, $response->json('data.notificationLogs.0.userName'));
        $this->assertSame($unit->id, $response->json('data.notificationLogs.0.unitId'));
        $this->assertSame($unit->unit_number, $response->json('data.notificationLogs.0.unitNumber'));
        $this->assertSame($resident->name, $response->json('data.viewLogs.0.userName'));
        $this->assertSame($unit->id, $response->json('data.viewLogs.0.unitId'));
        $this->assertSame($unit->unit_number, $response->json('data.viewLogs.0.unitNumber'));
        $this->assertSame(1, $response->json('data.viewLogs.0.viewCount'));
    }

    public function test_admin_poll_detail_views_do_not_create_resident_transparency_receipts(): void
    {
        $compound = Compound::factory()->create();
        $admin = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => $compound->id,
        ]);

        $poll = Poll::create([
            'compound_id' => $compound->id,
            'title' => 'Admin read receipt isolation',
            'status' => PollStatus::Active->value,
            'scope' => 'compound',
            'eligibility' => 'all_verified',
            'created_by' => $admin->id,
        ]);
        PollOption::create(['poll_id' => $poll->id, 'label' => 'Option A', 'sort_order' => 0]);
        PollOption::create(['poll_id' => $poll->id, 'label' => 'Option B', 'sort_order' => 1]);

        Sanctum::actingAs($admin);
        $this->getJson("/api/v1/polls/{$poll->id}")
            ->assertOk();

        $this->assertDatabaseMissing('poll_view_logs', [
            'poll_id' => $poll->id,
            'user_id' => $admin->id,
        ]);
    }

    public function test_poll_transparency_logs_keep_original_unit_context_after_membership_changes(): void
    {
        $compound = Compound::factory()->create();
        $building = Building::factory()->for($compound)->create();
        $unit = Unit::factory()->for($compound)->for($building)->create(['floor_id' => null]);

        $admin = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => $compound->id,
        ]);
        $resident = User::factory()->create([
            'role' => UserRole::ResidentOwner->value,
            'compound_id' => null,
            'name' => 'Snapshot Resident',
        ]);

        $membership = UnitMembership::factory()->create([
            'unit_id' => $unit->id,
            'user_id' => $resident->id,
            'verification_status' => 'verified',
            'starts_at' => now()->subYear(),
            'ends_at' => null,
        ]);

        $poll = Poll::create([
            'compound_id' => $compound->id,
            'title' => 'Snapshot poll',
            'status' => PollStatus::Draft->value,
            'scope' => 'compound',
            'eligibility' => 'all_verified',
            'created_by' => $admin->id,
        ]);
        PollOption::create(['poll_id' => $poll->id, 'label' => 'Option A', 'sort_order' => 0]);
        PollOption::create(['poll_id' => $poll->id, 'label' => 'Option B', 'sort_order' => 1]);

        Sanctum::actingAs($admin);
        $this->postJson("/api/v1/polls/{$poll->id}/publish")->assertOk();

        Sanctum::actingAs($resident);
        $this->getJson("/api/v1/polls/{$poll->id}")->assertOk();

        $membership->update(['ends_at' => now()->subDay()]);

        Sanctum::actingAs($admin);
        $response = $this->getJson("/api/v1/polls/{$poll->id}")
            ->assertOk();

        $this->assertSame($unit->id, $response->json('data.notificationLogs.0.unitId'));
        $this->assertSame($unit->unit_number, $response->json('data.notificationLogs.0.unitNumber'));
        $this->assertSame($unit->id, $response->json('data.viewLogs.0.unitId'));
        $this->assertSame($unit->unit_number, $response->json('data.viewLogs.0.unitNumber'));
    }

    public function test_resident_cannot_access_draft_poll_directly(): void
    {
        $compound = Compound::factory()->create();
        $building = Building::factory()->for($compound)->create();
        $unit = Unit::factory()->for($compound)->for($building)->create(['floor_id' => null]);
        $resident = User::factory()->create([
            'role' => UserRole::ResidentOwner->value,
            'compound_id' => null,
        ]);

        UnitMembership::factory()->create([
            'unit_id' => $unit->id,
            'user_id' => $resident->id,
            'verification_status' => 'verified',
            'starts_at' => now()->subYear(),
            'ends_at' => null,
        ]);

        $poll = Poll::create([
            'compound_id' => $compound->id,
            'title' => 'Hidden draft poll',
            'status' => PollStatus::Draft->value,
            'scope' => 'compound',
            'eligibility' => 'all_verified',
            'created_by' => $resident->id,
        ]);
        PollOption::create(['poll_id' => $poll->id, 'label' => 'Option A', 'sort_order' => 0]);
        PollOption::create(['poll_id' => $poll->id, 'label' => 'Option B', 'sort_order' => 1]);

        Sanctum::actingAs($resident);

        $this->getJson("/api/v1/polls/{$poll->id}")
            ->assertForbidden();

        $this->getJson("/api/v1/polls/{$poll->id}/voters")
            ->assertForbidden();
    }

    public function test_resident_can_see_live_named_ballots_even_before_voting(): void
    {
        $compound = Compound::factory()->create();
        $building = Building::factory()->for($compound)->create();
        $unitA = Unit::factory()->for($compound)->for($building)->create(['floor_id' => null, 'unit_number' => 'A1']);
        $unitB = Unit::factory()->for($compound)->for($building)->create(['floor_id' => null, 'unit_number' => 'B1']);

        $voter = User::factory()->create([
            'role' => UserRole::ResidentOwner->value,
            'compound_id' => null,
            'name' => 'Early Voter',
        ]);
        $viewer = User::factory()->create([
            'role' => UserRole::ResidentOwner->value,
            'compound_id' => null,
            'name' => 'Viewer Resident',
        ]);

        UnitMembership::factory()->create([
            'unit_id' => $unitA->id,
            'user_id' => $voter->id,
            'verification_status' => 'verified',
            'starts_at' => now()->subYear(),
            'ends_at' => null,
        ]);
        UnitMembership::factory()->create([
            'unit_id' => $unitB->id,
            'user_id' => $viewer->id,
            'verification_status' => 'verified',
            'starts_at' => now()->subYear(),
            'ends_at' => null,
        ]);

        $poll = Poll::create([
            'compound_id' => $compound->id,
            'title' => 'Transparent live poll',
            'status' => PollStatus::Active->value,
            'scope' => 'compound',
            'eligibility' => 'all_verified',
            'created_by' => $voter->id,
        ]);
        $option = PollOption::create(['poll_id' => $poll->id, 'label' => 'Option A', 'sort_order' => 0, 'votes_count' => 0]);
        PollOption::create(['poll_id' => $poll->id, 'label' => 'Option B', 'sort_order' => 1, 'votes_count' => 0]);

        Sanctum::actingAs($voter);
        $this->postJson("/api/v1/polls/{$poll->id}/vote", ['optionIds' => [$option->id]])->assertOk();

        Sanctum::actingAs($viewer);
        $response = $this->getJson("/api/v1/polls/{$poll->id}")
            ->assertOk();

        $this->assertSame(1, $response->json('data.votesCount'));
        $this->assertSame('Early Voter', $response->json('data.voters.0.userName'));
        $this->assertSame('A1', $response->json('data.voters.0.unitNumber'));
        $this->assertContains('Option A', $response->json('data.voters.0.options'));
    }

    public function test_publish_creates_in_app_notifications_and_delivery_logs_for_every_eligible_resident(): void
    {
        $compound = Compound::factory()->create();
        $building = Building::factory()->for($compound)->create();
        $unit = Unit::factory()->for($compound)->for($building)->create(['floor_id' => null]);

        $admin = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => $compound->id,
        ]);
        $resident = User::factory()->create([
            'role' => UserRole::ResidentOwner->value,
            'compound_id' => null,
            'name' => 'Resident One',
        ]);
        $residentTwo = User::factory()->create([
            'role' => UserRole::ResidentTenant->value,
            'compound_id' => null,
            'name' => 'Resident Two',
        ]);

        foreach ([$resident, $residentTwo] as $user) {
            UnitMembership::factory()->create([
                'unit_id' => $unit->id,
                'user_id' => $user->id,
                'verification_status' => 'verified',
                'starts_at' => now()->subYear(),
                'ends_at' => null,
            ]);
        }

        $poll = Poll::create([
            'compound_id' => $compound->id,
            'title' => 'Publish receipts poll',
            'status' => PollStatus::Draft->value,
            'scope' => 'compound',
            'eligibility' => 'all_verified',
            'created_by' => $admin->id,
        ]);
        PollOption::create(['poll_id' => $poll->id, 'label' => 'Option A', 'sort_order' => 0]);
        PollOption::create(['poll_id' => $poll->id, 'label' => 'Option B', 'sort_order' => 1]);

        Sanctum::actingAs($admin);
        $this->postJson("/api/v1/polls/{$poll->id}/publish")->assertOk();

        foreach ([$resident, $residentTwo] as $user) {
            $this->assertDatabaseHas('poll_notification_logs', [
                'poll_id' => $poll->id,
                'user_id' => $user->id,
                'channel' => 'in_app',
                'delivered' => true,
            ]);
            $this->assertDatabaseHas('notifications', [
                'user_id' => $user->id,
                'channel' => 'in_app',
                'category' => NotificationCategory::Polls->value,
                'title' => 'New poll: Publish receipts poll',
            ]);
        }
    }
}
