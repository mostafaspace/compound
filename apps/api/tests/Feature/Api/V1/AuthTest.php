<?php

namespace Tests\Feature\Api\V1;

use App\Enums\AccountStatus;
use App\Enums\Permission;
use App\Enums\UserRole;
use App\Models\User;
use App\Models\UserScopeAssignment;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\PersonalAccessToken;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission as SpatiePermission;
use Spatie\Permission\Models\Role as SpatieRole;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_uat_persona_login_self_heals_missing_seed_users_in_non_production(): void
    {
        $this->seed(RbacSeeder::class);

        $this->assertDatabaseMissing('users', [
            'email' => 'security-guard@uat.compound.local',
        ]);

        $this->postJson('/api/v1/auth/login', [
            'email' => 'security-guard@uat.compound.local',
            'password' => 'uat-password-2026',
            'deviceName' => 'Feature test',
        ])
            ->assertOk()
            ->assertJsonPath('data.user.email', 'security-guard@uat.compound.local')
            ->assertJsonPath('data.user.status', AccountStatus::Active->value)
            ->assertJsonPath('data.user.role', UserRole::SecurityGuard->value);

        $this->assertDatabaseHas('users', [
            'email' => 'compound-admin@uat.compound.local',
            'status' => AccountStatus::Active->value,
        ]);
        $this->assertDatabaseHas('users', [
            'email' => 'resident-owner@uat.compound.local',
            'status' => AccountStatus::Active->value,
        ]);
        $this->assertDatabaseHas('users', [
            'email' => 'security-guard@uat.compound.local',
            'status' => AccountStatus::Active->value,
        ]);
        $this->assertDatabaseHas('users', [
            'email' => 'board-member@uat.compound.local',
            'status' => AccountStatus::Active->value,
        ]);
    }

    public function test_active_user_can_login_and_fetch_profile(): void
    {
        $user = User::factory()->create([
            'email' => 'admin@example.com',
            'password' => Hash::make('password'),
            'role' => UserRole::CompoundAdmin->value,
            'status' => AccountStatus::Active->value,
        ]);

        $token = $this->postJson('/api/v1/auth/login', [
            'email' => 'admin@example.com',
            'password' => 'password',
            'deviceName' => 'Feature test',
        ])
            ->assertOk()
            ->assertJsonPath('data.user.id', $user->id)
            ->assertJsonPath('data.tokenType', 'Bearer')
            ->json('data.token');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('data.email', 'admin@example.com');
    }

    public function test_broadcasting_auth_accepts_sanctum_bearer_tokens_for_private_user_channels(): void
    {
        $user = User::factory()->create([
            'email' => 'broadcast-admin@example.com',
            'password' => Hash::make('password'),
            'role' => UserRole::CompoundAdmin->value,
            'status' => AccountStatus::Active->value,
        ]);

        $token = $this->postJson('/api/v1/auth/login', [
            'email' => 'broadcast-admin@example.com',
            'password' => 'password',
            'deviceName' => 'Feature test',
        ])
            ->assertOk()
            ->json('data.token');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->post('/broadcasting/auth', [
                'socket_id' => '1234.5678',
                'channel_name' => 'private-user-'.$user->id,
            ])
            ->assertOk()
            ->assertJsonStructure(['auth']);
    }

    public function test_broadcasting_auth_rejects_private_channel_for_another_user(): void
    {
        $user = User::factory()->create([
            'email' => 'broadcast-owner@example.com',
            'password' => Hash::make('password'),
            'role' => UserRole::CompoundAdmin->value,
            'status' => AccountStatus::Active->value,
        ]);
        $otherUser = User::factory()->create();

        $token = $this->postJson('/api/v1/auth/login', [
            'email' => 'broadcast-owner@example.com',
            'password' => 'password',
            'deviceName' => 'Feature test',
        ])
            ->assertOk()
            ->json('data.token');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->post('/broadcasting/auth', [
                'socket_id' => '1234.5678',
                'channel_name' => 'private-user-'.$otherUser->id,
            ])
            ->assertForbidden();
    }

    public function test_broadcasting_auth_rejects_unauthenticated_requests(): void
    {
        $user = User::factory()->create();

        $this->post('/broadcasting/auth', [
            'socket_id' => '1234.5678',
            'channel_name' => 'private-user-'.$user->id,
        ])->assertForbidden();
    }

    public function test_suspended_user_cannot_login(): void
    {
        User::factory()->create([
            'email' => 'suspended@example.com',
            'password' => Hash::make('password'),
            'status' => AccountStatus::Suspended->value,
        ]);

        $this->postJson('/api/v1/auth/login', [
            'email' => 'suspended@example.com',
            'password' => 'password',
            'deviceName' => 'Feature test',
        ])->assertForbidden();
    }

    public function test_pending_review_resident_can_login_with_restricted_access(): void
    {
        User::factory()->create([
            'email' => 'pending@example.com',
            'password' => Hash::make('password'),
            'role' => UserRole::ResidentOwner->value,
            'status' => AccountStatus::PendingReview->value,
        ]);

        $token = $this->postJson('/api/v1/auth/login', [
            'email' => 'pending@example.com',
            'password' => 'password',
            'deviceName' => 'Feature test',
        ])
            ->assertOk()
            ->assertJsonPath('data.user.status', AccountStatus::PendingReview->value)
            ->json('data.token');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/document-types')
            ->assertOk();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/compounds')
            ->assertForbidden();
    }

    public function test_pending_review_effective_resident_role_can_access_resident_routes_even_when_legacy_role_is_stale(): void
    {
        $residentTenantRole = SpatieRole::findOrCreate('resident_tenant', 'sanctum');
        $residentTenantRole->givePermissionTo(
            SpatiePermission::findOrCreate(Permission::ViewVisitors->value, 'sanctum'),
        );

        $user = User::factory()->create([
            'email' => 'pending-effective-resident@example.com',
            'password' => Hash::make('password'),
            'role' => UserRole::FinanceReviewer->value,
            'status' => AccountStatus::PendingReview->value,
        ]);
        $user->assignRole($residentTenantRole);

        $token = $this->postJson('/api/v1/auth/login', [
            'email' => 'pending-effective-resident@example.com',
            'password' => 'password',
            'deviceName' => 'Feature test',
        ])
            ->assertOk()
            ->assertJsonPath('data.user.status', AccountStatus::PendingReview->value)
            ->json('data.token');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/my/verification-requests')
            ->assertOk();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/compounds')
            ->assertForbidden();
    }

    public function test_login_returns_roles_permissions_and_scopes_payload(): void
    {
        $permission = SpatiePermission::findOrCreate(Permission::ViewFinance->value, 'sanctum');
        $role = SpatieRole::findOrCreate('finance_reviewer', 'sanctum');
        $role->givePermissionTo($permission);

        $user = User::factory()->create([
            'email' => 'rbac-login@example.com',
            'password' => Hash::make('password'),
            'role' => UserRole::FinanceReviewer->value,
            'status' => AccountStatus::Active->value,
        ]);

        $user->assignRole($role);

        UserScopeAssignment::create([
            'user_id' => $user->id,
            'role_name' => 'finance_reviewer',
            'scope_type' => 'compound',
            'scope_id' => 'cmp_1',
            'created_by' => $user->id,
        ]);

        $this->postJson('/api/v1/auth/login', [
            'email' => 'rbac-login@example.com',
            'password' => 'password',
            'deviceName' => 'Feature test',
        ])
            ->assertOk()
            ->assertJsonPath('data.user.roles.0', 'finance_reviewer')
            ->assertJsonPath('data.user.permissions.0', Permission::ViewFinance->value)
            ->assertJsonPath('data.user.scopes.0.role', 'finance_reviewer')
            ->assertJsonPath('data.user.scopes.0.scope_type', 'compound')
            ->assertJsonPath('data.user.scopes.0.scope_id', 'cmp_1');
    }

    public function test_login_token_abilities_follow_effective_compound_head_role_even_when_legacy_role_is_stale(): void
    {
        $compoundHeadRole = SpatieRole::findOrCreate('compound_head', 'sanctum');
        $compoundHeadRole->givePermissionTo(
            SpatiePermission::findOrCreate(Permission::ManageCompounds->value, 'sanctum'),
            SpatiePermission::findOrCreate(Permission::ManageUsers->value, 'sanctum'),
        );

        $user = User::factory()->create([
            'email' => 'compound-head-login@example.com',
            'password' => Hash::make('password'),
            'role' => UserRole::ResidentOwner->value,
            'status' => AccountStatus::Active->value,
        ]);

        $user->assignRole($compoundHeadRole);

        $token = $this->postJson('/api/v1/auth/login', [
            'email' => 'compound-head-login@example.com',
            'password' => 'password',
            'deviceName' => 'Feature test',
        ])
            ->assertOk()
            ->assertJsonPath('data.user.roles.0', 'compound_head')
            ->json('data.token');

        [$tokenId] = explode('|', $token);
        $storedToken = PersonalAccessToken::query()->findOrFail($tokenId);

        $this->assertSame(
            ['admin:*', 'property:*', 'resident:*', 'finance:read'],
            $storedToken->abilities,
        );
    }

    public function test_president_login_token_abilities_include_issues_and_governance(): void
    {
        $user = User::factory()->create([
            'email' => 'president-login@example.com',
            'password' => Hash::make('password'),
            'role' => UserRole::President->value,
            'status' => AccountStatus::Active->value,
        ]);

        $token = $this->postJson('/api/v1/auth/login', [
            'email' => 'president-login@example.com',
            'password' => 'password',
            'deviceName' => 'Feature test',
        ])
            ->assertOk()
            ->assertJsonPath('data.user.role', UserRole::President->value)
            ->json('data.token');

        [$tokenId] = explode('|', $token);
        $storedToken = PersonalAccessToken::query()->findOrFail($tokenId);

        $this->assertSame(
            ['property:read', 'governance:*', 'finance:read', 'resident:read', 'issues:*'],
            $storedToken->abilities,
        );
    }

    public function test_user_can_logout_and_token_is_revoked(): void
    {
        $user = User::factory()->create([
            'email' => 'logout@example.com',
            'password' => Hash::make('password'),
            'role' => UserRole::CompoundAdmin->value,
            'status' => AccountStatus::Active->value,
        ]);

        $token = $this->postJson('/api/v1/auth/login', [
            'email' => 'logout@example.com',
            'password' => 'password',
            'deviceName' => 'Feature test',
        ])
            ->assertOk()
            ->json('data.token');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/auth/logout')
            ->assertOk();

        // Verify the token record was deleted from the database
        [$tokenId] = explode('|', $token);
        $this->assertDatabaseMissing('personal_access_tokens', ['id' => $tokenId]);

        // Clear Sanctum's cached guard so the next request does a fresh DB lookup
        Auth::forgetGuards();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/auth/me')
            ->assertUnauthorized();
    }

    public function test_unauthenticated_request_to_protected_endpoint_returns_401(): void
    {
        $this->getJson('/api/v1/compounds')
            ->assertUnauthorized();
    }

    public function test_unauthenticated_auth_me_returns_json_401(): void
    {
        $this->getJson('/api/v1/auth/me')
            ->assertUnauthorized()
            ->assertJsonPath('message', 'Unauthenticated.');
    }

    public function test_missing_permission_configuration_falls_back_to_legacy_role_access(): void
    {
        $resident = User::factory()->create([
            'role' => UserRole::ResidentOwner->value,
            'status' => AccountStatus::Active->value,
        ]);

        Sanctum::actingAs($resident);

        $this->getJson('/api/v1/visitor-requests')
            ->assertOk();
    }

    public function test_explicit_spatie_roles_take_precedence_over_legacy_role_fallback(): void
    {
        $residentTenantRole = SpatieRole::findOrCreate('resident_tenant', 'sanctum');

        $user = User::factory()->create([
            'role' => UserRole::FinanceReviewer->value,
            'status' => AccountStatus::Active->value,
        ]);

        $user->assignRole($residentTenantRole);

        Sanctum::actingAs($user);

        $this->getJson('/api/v1/finance/unit-accounts')
            ->assertForbidden();
    }

    public function test_wrong_credentials_return_validation_error(): void
    {
        User::factory()->create([
            'email' => 'real@example.com',
            'password' => Hash::make('correct-password'),
            'status' => AccountStatus::Active->value,
        ]);

        $this->postJson('/api/v1/auth/login', [
            'email' => 'real@example.com',
            'password' => 'wrong-password',
            'deviceName' => 'Feature test',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email']);
    }

    public function test_super_admin_can_access_admin_only_endpoint(): void
    {
        $superAdmin = User::factory()->create([
            'role' => UserRole::SuperAdmin->value,
            'status' => AccountStatus::Active->value,
        ]);

        Sanctum::actingAs($superAdmin);

        $this->getJson('/api/v1/audit-logs')
            ->assertOk();
    }

    public function test_spatie_super_admin_role_bypasses_admin_route_even_if_legacy_role_is_stale(): void
    {
        $superAdminRole = SpatieRole::findOrCreate('super_admin', 'sanctum');

        $user = User::factory()->create([
            'role' => UserRole::ResidentOwner->value,
            'status' => AccountStatus::Active->value,
        ]);

        $user->assignRole($superAdminRole);

        Sanctum::actingAs($user);

        $this->getJson('/api/v1/audit-logs')
            ->assertOk();
    }

    public function test_security_guard_cannot_access_finance_endpoints(): void
    {
        $guard = User::factory()->create([
            'role' => UserRole::SecurityGuard->value,
            'status' => AccountStatus::Active->value,
        ]);

        Sanctum::actingAs($guard);

        $this->getJson('/api/v1/finance/unit-accounts')
            ->assertForbidden();
    }

    public function test_security_guard_can_access_visitor_endpoints(): void
    {
        $guard = User::factory()->create([
            'role' => UserRole::SecurityGuard->value,
            'status' => AccountStatus::Active->value,
        ]);

        Sanctum::actingAs($guard);

        $this->getJson('/api/v1/visitor-requests')
            ->assertOk();
    }

    public function test_resident_cannot_access_admin_endpoints(): void
    {
        $resident = User::factory()->create([
            'role' => UserRole::ResidentOwner->value,
            'status' => AccountStatus::Active->value,
        ]);

        Sanctum::actingAs($resident);

        $this->getJson('/api/v1/audit-logs')
            ->assertForbidden();
    }

    public function test_finance_reviewer_can_access_finance_routes(): void
    {
        $reviewer = User::factory()->create([
            'role' => UserRole::FinanceReviewer->value,
            'status' => AccountStatus::Active->value,
        ]);

        Sanctum::actingAs($reviewer);

        $this->getJson('/api/v1/finance/unit-accounts')
            ->assertOk();
    }

    public function test_board_member_can_read_finance_routes(): void
    {
        $boardMember = User::factory()->create([
            'role' => UserRole::BoardMember->value,
            'status' => AccountStatus::Active->value,
        ]);

        Sanctum::actingAs($boardMember);

        $this->getJson('/api/v1/finance/unit-accounts')
            ->assertOk();
    }

    public function test_resident_cannot_access_other_resident_data(): void
    {
        $resident = User::factory()->create([
            'role' => UserRole::ResidentOwner->value,
            'status' => AccountStatus::Active->value,
        ]);

        Sanctum::actingAs($resident);

        // Compounds endpoint is restricted to admin roles — resident gets 403
        $this->getJson('/api/v1/compounds')
            ->assertForbidden();
    }

    public function test_inactive_user_account_cannot_be_used(): void
    {
        // AccountStatus::Archived represents a permanently deactivated account
        User::factory()->create([
            'email' => 'archived@example.com',
            'password' => Hash::make('password'),
            'role' => UserRole::ResidentOwner->value,
            'status' => AccountStatus::Archived->value,
        ]);

        $this->postJson('/api/v1/auth/login', [
            'email' => 'archived@example.com',
            'password' => 'password',
            'deviceName' => 'Feature test',
        ])->assertForbidden();
    }

    public function test_audit_log_is_created_on_login(): void
    {
        $admin = User::factory()->create([
            'email' => 'auditcheck@example.com',
            'password' => Hash::make('password'),
            'role' => UserRole::SuperAdmin->value,
            'status' => AccountStatus::Active->value,
        ]);

        $this->postJson('/api/v1/auth/login', [
            'email' => 'auditcheck@example.com',
            'password' => 'password',
            'deviceName' => 'Feature test',
        ])->assertOk();

        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/audit-logs?action=auth.login_succeeded')
            ->assertOk()
            ->assertJsonPath('data.0.action', 'auth.login_succeeded');
    }
}
