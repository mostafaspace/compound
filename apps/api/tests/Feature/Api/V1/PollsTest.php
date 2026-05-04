<?php

namespace Tests\Feature\Api\V1;

use App\Enums\Permission;
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

    public function test_second_resident_from_same_apartment_is_blocked_on_poll_vote(): void
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
            'title' => 'Apartment vote test',
            'status' => PollStatus::Active->value,
            'scope' => 'compound',
            'eligibility' => 'all_verified',
            'created_by' => $owner->id,
        ]);
        $opt1 = PollOption::create(['poll_id' => $poll->id, 'label' => 'Option A', 'sort_order' => 0]);

        Sanctum::actingAs($owner);
        $this->postJson("/api/v1/polls/{$poll->id}/vote", ['optionIds' => [$opt1->id]])
            ->assertOk();

        Sanctum::actingAs($spouse);
        $this->postJson("/api/v1/polls/{$poll->id}/vote", ['optionIds' => [$opt1->id]])
            ->assertStatus(409)
            ->assertJsonPath('reason', 'apartment_already_voted');
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
        $this->assertSame($resident->name, $response->json('data.viewLogs.0.userName'));
        $this->assertSame(1, $response->json('data.viewLogs.0.viewCount'));
    }
}
