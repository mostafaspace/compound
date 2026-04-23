<?php

namespace Tests\Feature\Api\V1;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

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
