<?php

namespace Tests\Feature\Database;

use App\Enums\Permission;
use App\Enums\UserRole;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class PermissionsTest extends TestCase
{
    use RefreshDatabase;

    public function test_permission_values_include_apartments_permissions(): void
    {
        $this->assertContains('apartments_admin', Permission::values());
        $this->assertContains('apply_apartment_violation', Permission::values());
    }

    public function test_rbac_seeder_grants_apartments_admin_to_compound_admin(): void
    {
        $this->seed(RbacSeeder::class);

        $compoundAdmin = Role::findByName(UserRole::CompoundAdmin->value, 'sanctum');

        $this->assertTrue($compoundAdmin->hasPermissionTo('apartments_admin', 'sanctum'));
        $this->assertTrue($compoundAdmin->hasPermissionTo('apply_apartment_violation', 'sanctum'));
    }

    public function test_rbac_seeder_grants_apartments_admin_to_migrated_compound_head(): void
    {
        $this->seed(RbacSeeder::class);

        $compoundHead = Role::findByName('compound_head', 'sanctum');

        $this->assertTrue($compoundHead->hasPermissionTo('apartments_admin', 'sanctum'));
        $this->assertTrue($compoundHead->hasPermissionTo('apply_apartment_violation', 'sanctum'));
    }

    public function test_rbac_seeder_grants_apartments_permissions_to_finance_reviewer(): void
    {
        $this->seed(RbacSeeder::class);

        $financeReviewer = Role::findByName(UserRole::FinanceReviewer->value, 'sanctum');

        $this->assertTrue($financeReviewer->hasPermissionTo('apartments_admin', 'sanctum'));
        $this->assertTrue($financeReviewer->hasPermissionTo('apply_apartment_violation', 'sanctum'));
    }
}
