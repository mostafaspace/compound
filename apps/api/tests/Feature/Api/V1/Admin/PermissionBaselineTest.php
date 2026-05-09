<?php

namespace Tests\Feature\Api\V1\Admin;

use App\Enums\Permission;
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
}
