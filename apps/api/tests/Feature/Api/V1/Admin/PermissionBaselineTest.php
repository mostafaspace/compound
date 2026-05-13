<?php

namespace Tests\Feature\Api\V1\Admin;

use App\Enums\Permission;
use App\Enums\UserRole;
use App\Http\Middleware\EnsureUserHasRole;
use ReflectionMethod;
use Tests\TestCase;

class PermissionBaselineTest extends TestCase
{
    public function test_admin_operations_permissions_exist_in_enum(): void
    {
        $this->assertContains('lookup_vehicles', Permission::values());
        $this->assertContains('manage_apartment_penalty_points', Permission::values());
        $this->assertContains('view_admin_security', Permission::values());
        $this->assertContains('manage_admin_security', Permission::values());
    }

    public function test_legacy_role_fallback_includes_admin_operations_permissions(): void
    {
        $permissionsFor = function (UserRole $role): array {
            $method = new ReflectionMethod(EnsureUserHasRole::class, 'legacyRolePermissions');

            return $method->invoke(new EnsureUserHasRole, $role);
        };

        foreach (UserRole::cases() as $role) {
            $this->assertIsArray($permissionsFor($role));
        }

        $this->assertContains(Permission::LookupVehicles->value, $permissionsFor(UserRole::CompoundAdmin));
        $this->assertContains(Permission::ManageApartmentPenaltyPoints->value, $permissionsFor(UserRole::CompoundAdmin));
        $this->assertContains(Permission::ViewAdminSecurity->value, $permissionsFor(UserRole::CompoundAdmin));
        $this->assertContains(Permission::ManageAdminSecurity->value, $permissionsFor(UserRole::CompoundAdmin));

        $this->assertContains(Permission::ViewCompounds->value, $permissionsFor(UserRole::President));
        $this->assertContains(Permission::ViewOrgChart->value, $permissionsFor(UserRole::President));
        $this->assertContains(Permission::ViewIssues->value, $permissionsFor(UserRole::President));

        $this->assertContains(Permission::LookupVehicles->value, $permissionsFor(UserRole::SupportAgent));
        $this->assertContains(Permission::ViewAdminSecurity->value, $permissionsFor(UserRole::SupportAgent));

        $this->assertContains(Permission::LookupVehicles->value, $permissionsFor(UserRole::SecurityGuard));
    }
}
