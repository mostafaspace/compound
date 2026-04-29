<?php

namespace Tests\Feature\Api\V1;

use App\Enums\Permission;
use App\Enums\PollStatus;
use App\Enums\UserRole;
use App\Models\Polls\Poll;
use App\Models\Polls\PollOption;
use App\Models\Polls\PollType;
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
}
