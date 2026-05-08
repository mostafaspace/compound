<?php

namespace Tests\Feature\Api\V1;

use App\Enums\AccountStatus;
use App\Enums\Permission;
use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AuthPrecedenceTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Verify that as soon as a user has ANY Spatie role, the legacy 'role' column
     * is ignored for permission checks. This confirms the 'Explicit RBAC Wins' rule.
     */
    public function test_explicit_spatie_role_overrides_legacy_role_fallback(): void
    {
        // 1. Setup a legacy Super Admin (no Spatie roles)
        $user = User::factory()->create([
            'role' => UserRole::SuperAdmin,
            'status' => AccountStatus::Active,
        ]);

        // Verify they have super admin access via legacy fallback
        $this->actingAs($user);
        $this->assertTrue($user->isEffectiveSuperAdmin(), 'Legacy SuperAdmin should be recognized as effective super admin');

        // Use a route that requires a specific permission (e.g., view_audit_logs)
        // From EnsureUserHasRole.php: SuperAdmin legacy fallback has Permission::values()
        $response = $this->getJson('/api/v1/audit-logs');
        $response->assertOk();

        // 2. Assign a "low-privilege" Spatie role (e.g., resident)
        $residentRole = Role::create(['name' => 'resident_owner', 'guard_name' => 'sanctum']);
        $user->assignRole($residentRole);

        // Clear permissions cache if necessary (User model uses trait which handles it, but just in case)
        $user->unsetRelation('roles');
        $user->unsetRelation('permissions');

        // 3. Verify they LOST Super Admin status because they now have an explicit role
        $this->assertFalse($user->isEffectiveSuperAdmin(), 'User with Spatie role should NOT fall back to legacy SuperAdmin');

        // Verify they lose access to audit logs
        $response = $this->getJson('/api/v1/audit-logs');
        $response->assertForbidden();
    }

    /**
     * Verify that a user with a low-privilege legacy role (resident) can be
     * elevated to Super Admin via explicit Spatie role assignment.
     */
    public function test_explicit_spatie_role_can_elevate_legacy_resident(): void
    {
        $user = User::factory()->create([
            'role' => UserRole::ResidentOwner,
            'status' => AccountStatus::Active,
        ]);

        $this->actingAs($user);

        // Verify they can't access audit logs initially
        $response = $this->getJson('/api/v1/audit-logs');
        $response->assertForbidden();

        // Assign Spatie Super Admin role
        // Note: Ensure the role name matches what is used in the app
        $superAdminRole = Role::create(['name' => 'super_admin', 'guard_name' => 'sanctum']);
        $user->assignRole($superAdminRole);

        $user->unsetRelation('roles');

        // Verify they ARE now a super admin
        $this->assertTrue($user->isEffectiveSuperAdmin(), 'User should be elevated to SuperAdmin via Spatie role');

        // Verify they can now access audit logs
        $response = $this->getJson('/api/v1/audit-logs');
        $response->assertOk();
    }

    /**
     * Verify that if a user has NO Spatie roles, they still fall back to legacy permissions.
     */
    public function test_legacy_fallback_works_when_no_spatie_roles_exist(): void
    {
        $user = User::factory()->create([
            'role' => UserRole::SecurityGuard,
            'status' => AccountStatus::Active,
        ]);

        $this->actingAs($user);

        // SecurityGuard legacy fallback has view_visitors
        // Let's find a route that uses view_visitors
        $response = $this->getJson('/api/v1/visitors');
        // If it's 200, then fallback worked.
        $this->assertNotEquals(403, $response->getStatusCode(), 'SecurityGuard should have visitor access via fallback');
    }
}
