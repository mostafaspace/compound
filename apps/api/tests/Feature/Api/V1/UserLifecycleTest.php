<?php

namespace Tests\Feature\Api\V1;

use App\Enums\AccountMergeStatus;
use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Enums\VerificationStatus;
use App\Models\AccountMerge;
use App\Models\Documents\UserDocument;
use App\Models\Property\Compound;
use App\Models\Property\UnitMembership;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role as SpatieRole;
use Tests\TestCase;

// CM-106: User lifecycle, suspension, recovery, move-out, account merge
class UserLifecycleTest extends TestCase
{
    use RefreshDatabase;

    private function makeAdmin(array $attrs = []): User
    {
        return User::factory()->create(array_merge([
            'role'   => UserRole::SuperAdmin->value,
            'status' => AccountStatus::Active->value,
        ], $attrs));
    }

    private function makeUser(array $attrs = []): User
    {
        return User::factory()->create(array_merge([
            'role'   => UserRole::ResidentOwner->value,
            'status' => AccountStatus::Active->value,
        ], $attrs));
    }

    // --- Suspension ---

    public function test_admin_can_suspend_a_user(): void
    {
        $admin  = $this->makeAdmin();
        $target = $this->makeUser();

        Sanctum::actingAs($admin);

        $this->postJson("/api/v1/users/{$target->id}/suspend", ['reason' => 'Repeated violations.'])
            ->assertOk()
            ->assertJsonPath('user.status', 'suspended');

        $this->assertDatabaseHas('users', ['id' => $target->id, 'status' => 'suspended']);
        $this->assertDatabaseHas('audit_logs', [
            'action'         => 'users.suspended',
            'auditable_id'   => (string) $target->id,
            'severity'       => 'critical',
        ]);
    }

    public function test_compound_admin_can_suspend_membership_scoped_resident_when_compound_id_is_null(): void
    {
        $compound = Compound::factory()->create();
        $building = \App\Models\Property\Building::factory()->for($compound)->create();
        $unit = \App\Models\Property\Unit::factory()->for($compound)->for($building)->create(['floor_id' => null]);

        $admin = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'status' => AccountStatus::Active->value,
            'compound_id' => $compound->id,
        ]);
        $target = $this->makeUser(['compound_id' => null]);

        UnitMembership::factory()->create([
            'user_id' => $target->id,
            'unit_id' => $unit->id,
        ]);

        Sanctum::actingAs($admin);

        $this->postJson("/api/v1/users/{$target->id}/suspend", ['reason' => 'Membership-scoped user.'])
            ->assertOk()
            ->assertJsonPath('user.status', 'suspended');
    }

    public function test_cannot_suspend_super_admin(): void
    {
        $admin  = $this->makeAdmin();
        $target = $this->makeAdmin();

        Sanctum::actingAs($admin);

        $this->postJson("/api/v1/users/{$target->id}/suspend", ['reason' => 'Test.'])
            ->assertUnprocessable();
    }

    public function test_effective_spatie_super_admin_can_suspend_even_when_legacy_role_is_stale(): void
    {
        $superAdminRole = SpatieRole::findOrCreate('super_admin', 'sanctum');
        $actor = $this->makeUser();
        $target = $this->makeUser();
        $actor->assignRole($superAdminRole);

        Sanctum::actingAs($actor);

        $this->postJson("/api/v1/users/{$target->id}/suspend", ['reason' => 'Repeated violations.'])
            ->assertOk()
            ->assertJsonPath('user.status', 'suspended');
    }

    public function test_cannot_suspend_effective_spatie_super_admin_when_legacy_role_is_stale(): void
    {
        $admin = $this->makeAdmin();
        $superAdminRole = SpatieRole::findOrCreate('super_admin', 'sanctum');
        $target = $this->makeUser();
        $target->assignRole($superAdminRole);

        Sanctum::actingAs($admin);

        $this->postJson("/api/v1/users/{$target->id}/suspend", ['reason' => 'Test.'])
            ->assertUnprocessable();
    }

    public function test_suspension_requires_reason(): void
    {
        $admin  = $this->makeAdmin();
        $target = $this->makeUser();

        Sanctum::actingAs($admin);

        $this->postJson("/api/v1/users/{$target->id}/suspend", [])
            ->assertUnprocessable();
    }

    public function test_support_agent_cannot_suspend(): void
    {
        $agent  = User::factory()->create(['role' => UserRole::SupportAgent->value, 'status' => AccountStatus::Active->value]);
        $target = $this->makeUser();

        Sanctum::actingAs($agent);

        $this->postJson("/api/v1/users/{$target->id}/suspend", ['reason' => 'Test.'])
            ->assertForbidden();
    }

    // --- Reactivation ---

    public function test_admin_can_reactivate_suspended_user(): void
    {
        $admin  = $this->makeAdmin();
        $target = $this->makeUser(['status' => AccountStatus::Suspended->value]);

        Sanctum::actingAs($admin);

        $this->postJson("/api/v1/users/{$target->id}/reactivate", ['reason' => 'Issue resolved.'])
            ->assertOk()
            ->assertJsonPath('user.status', 'active');

        $this->assertDatabaseHas('audit_logs', ['action' => 'users.reactivated', 'auditable_id' => (string) $target->id]);
    }

    public function test_cannot_reactivate_already_active_user(): void
    {
        $admin  = $this->makeAdmin();
        $target = $this->makeUser(['status' => AccountStatus::Active->value]);

        Sanctum::actingAs($admin);

        $this->postJson("/api/v1/users/{$target->id}/reactivate", [])
            ->assertUnprocessable();
    }

    // --- Move-out ---

    public function test_admin_can_move_out_user_and_end_all_memberships(): void
    {
        $admin    = $this->makeAdmin();
        $target   = $this->makeUser();
        $compound = Compound::factory()->create();

        // Create 2 active memberships
        UnitMembership::factory()->count(2)->create(['user_id' => $target->id]);

        Sanctum::actingAs($admin);

        $this->postJson("/api/v1/users/{$target->id}/move-out", [
            'reason' => 'Sold property.',
        ])
            ->assertOk()
            ->assertJsonPath('memberships_ended', 2);

        // All memberships should now have ends_at set to today (effectively ended)
        $endedCount = UnitMembership::where('user_id', $target->id)
            ->whereDate('ends_at', today()->toDateString())
            ->count();

        $this->assertSame(2, $endedCount);
    }

    public function test_move_out_can_also_archive_account(): void
    {
        $admin  = $this->makeAdmin();
        $target = $this->makeUser();

        UnitMembership::factory()->create(['user_id' => $target->id]);

        Sanctum::actingAs($admin);

        $this->postJson("/api/v1/users/{$target->id}/move-out", [
            'reason'          => 'Moved out.',
            'archive_account' => true,
        ])->assertOk();

        $this->assertDatabaseHas('users', ['id' => $target->id, 'status' => 'archived']);
    }

    // --- Account recovery ---

    public function test_admin_can_recover_archived_account(): void
    {
        $admin  = $this->makeAdmin();
        $target = $this->makeUser(['status' => AccountStatus::Archived->value]);

        Sanctum::actingAs($admin);

        $this->postJson("/api/v1/users/{$target->id}/recover", [
            'reason' => 'Returned as tenant.',
            'name'   => 'Updated Name',
        ])
            ->assertOk()
            ->assertJsonPath('user.status', 'active');

        $this->assertDatabaseHas('users', ['id' => $target->id, 'status' => 'active', 'name' => 'Updated Name']);
        $this->assertDatabaseHas('audit_logs', ['action' => 'users.recovered', 'auditable_id' => (string) $target->id]);
    }

    // --- Support view ---

    public function test_support_agent_can_view_user_support_detail(): void
    {
        $agent  = User::factory()->create(['role' => UserRole::SupportAgent->value, 'status' => AccountStatus::Active->value]);
        $target = $this->makeUser();

        UnitMembership::factory()->create(['user_id' => $target->id]);

        Sanctum::actingAs($agent);

        $this->getJson("/api/v1/users/{$target->id}/support-view")
            ->assertOk()
            ->assertJsonStructure(['user', 'memberships', 'documentCounts', 'recentAuditEvents']);
    }

    public function test_support_view_user_payload_includes_effective_spatie_roles_when_legacy_role_is_stale(): void
    {
        $agent = User::factory()->create(['role' => UserRole::SupportAgent->value, 'status' => AccountStatus::Active->value]);
        $compoundHeadRole = SpatieRole::findOrCreate('compound_head', 'sanctum');
        $target = $this->makeUser([
            'role' => UserRole::ResidentOwner->value,
            'name' => 'Compound Head User',
        ]);
        $target->assignRole($compoundHeadRole);

        Sanctum::actingAs($agent);

        $this->getJson("/api/v1/users/{$target->id}/support-view")
            ->assertOk()
            ->assertJsonPath('user.role', 'compound_head')
            ->assertJsonPath('user.roles.0', 'compound_head');
    }

    public function test_users_index_is_searchable(): void
    {
        $admin = $this->makeAdmin();
        $this->makeUser(['name' => 'Ahmed Khalil', 'email' => 'ahmed@example.com']);
        $this->makeUser(['name' => 'Sara Mahmoud', 'email' => 'sara@example.com']);

        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/users?q=Ahmed')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_users_index_role_filter_matches_effective_spatie_role_when_legacy_role_is_stale(): void
    {
        $admin = $this->makeAdmin();
        $compoundHeadRole = SpatieRole::findOrCreate('compound_head', 'sanctum');
        $matchingUser = $this->makeUser([
            'role' => UserRole::ResidentOwner->value,
            'name' => 'Effective Compound Head',
            'email' => 'compound-head@example.com',
        ]);
        $matchingUser->assignRole($compoundHeadRole);
        $nonMatchingUser = $this->makeUser([
            'role' => UserRole::ResidentOwner->value,
            'name' => 'Resident Only',
            'email' => 'resident-only@example.com',
        ]);

        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/v1/users?role=compound_admin')
            ->assertOk();

        $ids = collect($response->json('data'))->pluck('id')->all();

        $this->assertContains($matchingUser->id, $ids);
        $this->assertNotContains($nonMatchingUser->id, $ids);
        $this->assertSame(['compound_head'], collect($response->json('data'))
            ->firstWhere('id', $matchingUser->id)['roles']);
    }

    public function test_compound_admin_only_sees_own_compound_users(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();

        $adminA = User::factory()->create([
            'role'        => UserRole::CompoundAdmin->value,
            'status'      => AccountStatus::Active->value,
            'compound_id' => $compoundA->id,
        ]);
        $userA  = $this->makeUser(['compound_id' => $compoundA->id]);
        $userB  = $this->makeUser(['compound_id' => $compoundB->id]);

        Sanctum::actingAs($adminA);

        $response = $this->getJson('/api/v1/users')->assertOk();
        $ids = collect($response->json('data'))->pluck('id')->all();

        $this->assertContains($userA->id, $ids);
        $this->assertNotContains($userB->id, $ids);
    }

    public function test_compound_admin_can_list_resident_users_scoped_by_unit_membership_when_compound_id_is_null(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();
        $buildingA = \App\Models\Property\Building::factory()->for($compoundA)->create();
        $buildingB = \App\Models\Property\Building::factory()->for($compoundB)->create();
        $unitA = \App\Models\Property\Unit::factory()->for($compoundA)->for($buildingA)->create(['floor_id' => null]);
        $unitB = \App\Models\Property\Unit::factory()->for($compoundB)->for($buildingB)->create(['floor_id' => null]);

        $adminA = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'status' => AccountStatus::Active->value,
            'compound_id' => $compoundA->id,
        ]);

        $residentA = $this->makeUser(['compound_id' => null, 'email' => 'resident-a@example.com']);
        $residentB = $this->makeUser(['compound_id' => null, 'email' => 'resident-b@example.com']);

        UnitMembership::factory()->create([
            'user_id' => $residentA->id,
            'unit_id' => $unitA->id,
        ]);
        UnitMembership::factory()->create([
            'user_id' => $residentB->id,
            'unit_id' => $unitB->id,
        ]);

        Sanctum::actingAs($adminA);

        $response = $this->getJson('/api/v1/users')->assertOk();
        $ids = collect($response->json('data'))->pluck('id')->all();

        $this->assertContains($residentA->id, $ids);
        $this->assertNotContains($residentB->id, $ids);
    }

    public function test_compound_admin_can_view_support_detail_for_resident_scoped_by_unit_membership_when_compound_id_is_null(): void
    {
        $compound = Compound::factory()->create();
        $otherCompound = Compound::factory()->create();
        $building = \App\Models\Property\Building::factory()->for($compound)->create();
        $otherBuilding = \App\Models\Property\Building::factory()->for($otherCompound)->create();
        $unit = \App\Models\Property\Unit::factory()->for($compound)->for($building)->create(['floor_id' => null]);
        $otherUnit = \App\Models\Property\Unit::factory()->for($otherCompound)->for($otherBuilding)->create(['floor_id' => null]);

        $admin = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'status' => AccountStatus::Active->value,
            'compound_id' => $compound->id,
        ]);

        $resident = $this->makeUser(['compound_id' => null]);
        UnitMembership::factory()->create([
            'user_id' => $resident->id,
            'unit_id' => $unit->id,
        ]);

        $foreignResident = $this->makeUser(['compound_id' => null, 'email' => 'foreign-resident@example.com']);
        UnitMembership::factory()->create([
            'user_id' => $foreignResident->id,
            'unit_id' => $otherUnit->id,
        ]);

        Sanctum::actingAs($admin);

        $this->getJson("/api/v1/users/{$resident->id}/support-view")
            ->assertOk()
            ->assertJsonPath('user.id', $resident->id);

        $this->getJson("/api/v1/users/{$foreignResident->id}/support-view")
            ->assertForbidden();
    }

    // --- Account merge ---

    public function test_admin_can_initiate_merge_and_see_analysis(): void
    {
        $admin  = $this->makeAdmin();
        $source = $this->makeUser();
        $target = $this->makeUser();

        UnitMembership::factory()->create(['user_id' => $source->id]);

        Sanctum::actingAs($admin);

        $this->postJson('/api/v1/account-merges', [
            'source_user_id' => $source->id,
            'target_user_id' => $target->id,
            'notes'          => 'Duplicate detected.',
        ])
            ->assertCreated()
            ->assertJsonPath('status', 'pending')
            ->assertJsonStructure(['id', 'mergeAnalysis', 'sourceUser', 'targetUser']);

        $this->assertDatabaseHas('account_merges', [
            'source_user_id' => $source->id,
            'target_user_id' => $target->id,
            'status'         => 'pending',
        ]);
    }

    public function test_compound_admin_can_initiate_merge_for_membership_scoped_residents_when_source_compound_id_is_null(): void
    {
        $compound = Compound::factory()->create();
        $building = \App\Models\Property\Building::factory()->for($compound)->create();
        $unit = \App\Models\Property\Unit::factory()->for($compound)->for($building)->create(['floor_id' => null]);

        $admin = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'status' => AccountStatus::Active->value,
            'compound_id' => $compound->id,
        ]);
        $source = $this->makeUser(['compound_id' => null, 'email' => 'merge-source@example.com']);
        $target = $this->makeUser(['compound_id' => null, 'email' => 'merge-target@example.com']);

        UnitMembership::factory()->create([
            'user_id' => $source->id,
            'unit_id' => $unit->id,
        ]);
        UnitMembership::factory()->create([
            'user_id' => $target->id,
            'unit_id' => $unit->id,
        ]);

        Sanctum::actingAs($admin);

        $this->postJson('/api/v1/account-merges', [
            'source_user_id' => $source->id,
            'target_user_id' => $target->id,
            'notes' => 'Membership-scoped merge.',
        ])->assertCreated()
            ->assertJsonPath('sourceUser.id', $source->id)
            ->assertJsonPath('targetUser.id', $target->id);
    }

    public function test_cannot_initiate_duplicate_pending_merge(): void
    {
        $admin  = $this->makeAdmin();
        $source = $this->makeUser();
        $target = $this->makeUser();

        AccountMerge::create([
            'source_user_id' => $source->id,
            'target_user_id' => $target->id,
            'initiated_by'   => $admin->id,
            'status'         => AccountMergeStatus::Pending->value,
        ]);

        Sanctum::actingAs($admin);

        $this->postJson('/api/v1/account-merges', [
            'source_user_id' => $source->id,
            'target_user_id' => $target->id,
        ])->assertUnprocessable();
    }

    public function test_confirm_merge_transfers_memberships_and_archives_source(): void
    {
        $admin    = $this->makeAdmin();
        $source   = $this->makeUser();
        $target   = $this->makeUser();
        $merge    = AccountMerge::create([
            'source_user_id' => $source->id,
            'target_user_id' => $target->id,
            'initiated_by'   => $admin->id,
            'status'         => AccountMergeStatus::Pending->value,
        ]);

        UnitMembership::factory()->create(['user_id' => $source->id]);

        Sanctum::actingAs($admin);

        $this->postJson("/api/v1/account-merges/{$merge->id}/confirm")
            ->assertOk()
            ->assertJsonPath('status', 'completed');

        // Source user should now be archived
        $this->assertDatabaseHas('users', ['id' => $source->id, 'status' => 'archived']);

        // Membership transferred to target
        $this->assertDatabaseHas('unit_memberships', ['user_id' => $target->id]);

        // Audit log created
        $this->assertDatabaseHas('audit_logs', ['action' => 'users.account_merge_completed', 'severity' => 'critical']);
    }

    public function test_compound_admin_can_confirm_membership_scoped_merge_when_source_compound_id_is_null(): void
    {
        $compound = Compound::factory()->create();
        $building = \App\Models\Property\Building::factory()->for($compound)->create();
        $unit = \App\Models\Property\Unit::factory()->for($compound)->for($building)->create(['floor_id' => null]);

        $admin = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'status' => AccountStatus::Active->value,
            'compound_id' => $compound->id,
        ]);
        $source = $this->makeUser(['compound_id' => null, 'email' => 'confirm-source@example.com']);
        $target = $this->makeUser(['compound_id' => null, 'email' => 'confirm-target@example.com']);

        UnitMembership::factory()->create([
            'user_id' => $source->id,
            'unit_id' => $unit->id,
        ]);
        UnitMembership::factory()->create([
            'user_id' => $target->id,
            'unit_id' => $unit->id,
        ]);

        $merge = AccountMerge::create([
            'source_user_id' => $source->id,
            'target_user_id' => $target->id,
            'initiated_by' => $admin->id,
            'status' => AccountMergeStatus::Pending->value,
        ]);

        Sanctum::actingAs($admin);

        $this->postJson("/api/v1/account-merges/{$merge->id}/confirm")
            ->assertOk()
            ->assertJsonPath('status', 'completed');
    }

    public function test_compound_admin_can_list_membership_scoped_merges_when_source_compound_id_is_null(): void
    {
        $compound = Compound::factory()->create();
        $otherCompound = Compound::factory()->create();
        $building = \App\Models\Property\Building::factory()->for($compound)->create();
        $otherBuilding = \App\Models\Property\Building::factory()->for($otherCompound)->create();
        $unit = \App\Models\Property\Unit::factory()->for($compound)->for($building)->create(['floor_id' => null]);
        $otherUnit = \App\Models\Property\Unit::factory()->for($otherCompound)->for($otherBuilding)->create(['floor_id' => null]);

        $admin = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'status' => AccountStatus::Active->value,
            'compound_id' => $compound->id,
        ]);
        $source = $this->makeUser(['compound_id' => null, 'email' => 'listed-source@example.com']);
        $target = $this->makeUser(['compound_id' => null, 'email' => 'listed-target@example.com']);
        $foreignSource = $this->makeUser(['compound_id' => null, 'email' => 'foreign-source@example.com']);
        $foreignTarget = $this->makeUser(['compound_id' => null, 'email' => 'foreign-target@example.com']);

        UnitMembership::factory()->create([
            'user_id' => $source->id,
            'unit_id' => $unit->id,
        ]);
        UnitMembership::factory()->create([
            'user_id' => $target->id,
            'unit_id' => $unit->id,
        ]);
        UnitMembership::factory()->create([
            'user_id' => $foreignSource->id,
            'unit_id' => $otherUnit->id,
        ]);
        UnitMembership::factory()->create([
            'user_id' => $foreignTarget->id,
            'unit_id' => $otherUnit->id,
        ]);

        $visibleMerge = AccountMerge::create([
            'source_user_id' => $source->id,
            'target_user_id' => $target->id,
            'initiated_by' => $admin->id,
            'status' => AccountMergeStatus::Pending->value,
        ]);
        AccountMerge::create([
            'source_user_id' => $foreignSource->id,
            'target_user_id' => $foreignTarget->id,
            'initiated_by' => $admin->id,
            'status' => AccountMergeStatus::Pending->value,
        ]);

        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/v1/account-merges')->assertOk();

        $ids = collect($response->json('data'))->pluck('id')->all();

        $this->assertContains($visibleMerge->id, $ids);
        $this->assertCount(1, $ids);
    }

    public function test_compound_admin_can_view_membership_scoped_merge_when_source_compound_id_is_null(): void
    {
        $compound = Compound::factory()->create();
        $building = \App\Models\Property\Building::factory()->for($compound)->create();
        $unit = \App\Models\Property\Unit::factory()->for($compound)->for($building)->create(['floor_id' => null]);

        $admin = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'status' => AccountStatus::Active->value,
            'compound_id' => $compound->id,
        ]);
        $source = $this->makeUser(['compound_id' => null, 'email' => 'show-source@example.com']);
        $target = $this->makeUser(['compound_id' => null, 'email' => 'show-target@example.com']);

        UnitMembership::factory()->create([
            'user_id' => $source->id,
            'unit_id' => $unit->id,
        ]);
        UnitMembership::factory()->create([
            'user_id' => $target->id,
            'unit_id' => $unit->id,
        ]);

        $merge = AccountMerge::create([
            'source_user_id' => $source->id,
            'target_user_id' => $target->id,
            'initiated_by' => $admin->id,
            'status' => AccountMergeStatus::Pending->value,
        ]);

        Sanctum::actingAs($admin);

        $this->getJson("/api/v1/account-merges/{$merge->id}")
            ->assertOk()
            ->assertJsonPath('id', $merge->id);
    }

    public function test_cancel_merge(): void
    {
        $admin  = $this->makeAdmin();
        $source = $this->makeUser();
        $target = $this->makeUser();
        $merge  = AccountMerge::create([
            'source_user_id' => $source->id,
            'target_user_id' => $target->id,
            'initiated_by'   => $admin->id,
            'status'         => AccountMergeStatus::Pending->value,
        ]);

        Sanctum::actingAs($admin);

        $this->postJson("/api/v1/account-merges/{$merge->id}/cancel")
            ->assertOk()
            ->assertJsonPath('status', 'cancelled');
    }

    public function test_compound_admin_can_cancel_membership_scoped_merge_when_source_compound_id_is_null(): void
    {
        $compound = Compound::factory()->create();
        $building = \App\Models\Property\Building::factory()->for($compound)->create();
        $unit = \App\Models\Property\Unit::factory()->for($compound)->for($building)->create(['floor_id' => null]);

        $admin = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'status' => AccountStatus::Active->value,
            'compound_id' => $compound->id,
        ]);
        $source = $this->makeUser(['compound_id' => null, 'email' => 'cancel-source@example.com']);
        $target = $this->makeUser(['compound_id' => null, 'email' => 'cancel-target@example.com']);

        UnitMembership::factory()->create([
            'user_id' => $source->id,
            'unit_id' => $unit->id,
        ]);
        UnitMembership::factory()->create([
            'user_id' => $target->id,
            'unit_id' => $unit->id,
        ]);

        $merge = AccountMerge::create([
            'source_user_id' => $source->id,
            'target_user_id' => $target->id,
            'initiated_by' => $admin->id,
            'status' => AccountMergeStatus::Pending->value,
        ]);

        Sanctum::actingAs($admin);

        $this->postJson("/api/v1/account-merges/{$merge->id}/cancel")
            ->assertOk()
            ->assertJsonPath('status', 'cancelled');
    }

    public function test_cannot_confirm_cancelled_merge(): void
    {
        $admin  = $this->makeAdmin();
        $source = $this->makeUser();
        $target = $this->makeUser();
        $merge  = AccountMerge::create([
            'source_user_id' => $source->id,
            'target_user_id' => $target->id,
            'initiated_by'   => $admin->id,
            'status'         => AccountMergeStatus::Cancelled->value,
        ]);

        Sanctum::actingAs($admin);

        $this->postJson("/api/v1/account-merges/{$merge->id}/confirm")
            ->assertUnprocessable();
    }
}
