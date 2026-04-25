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

    public function test_cannot_suspend_super_admin(): void
    {
        $admin  = $this->makeAdmin();
        $target = $this->makeAdmin();

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
