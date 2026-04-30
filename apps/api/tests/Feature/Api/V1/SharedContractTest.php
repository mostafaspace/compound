<?php

namespace Tests\Feature\Api\V1;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class SharedContractTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_resource_prefers_spatie_role_over_legacy_column(): void
    {
        // 1. Setup user with Legacy Role = 'resident_owner'
        $user = User::factory()->create([
            'role' => UserRole::ResidentOwner,
        ]);

        // 2. Assign Spatie Role = 'super_admin'
        $spatieRole = Role::create(['name' => 'super_admin', 'guard_name' => 'sanctum']);
        $user->assignRole($spatieRole);

        // 3. Verify UserResource reflects 'super_admin'
        $resource = new \App\Http\Resources\UserResource($user->refresh());
        $data = $resource->toArray(request());

        $this->assertEquals('super_admin', $data['role']);
        $this->assertContains('super_admin', $data['roles']);
    }

    public function test_user_resource_falls_back_to_legacy_role_if_no_spatie_roles(): void
    {
        // 1. Setup user with Legacy Role = 'compound_admin' and NO Spatie roles
        $user = User::factory()->create([
            'role' => UserRole::CompoundAdmin,
        ]);

        // 2. Verify UserResource reflects 'compound_admin'
        $resource = new \App\Http\Resources\UserResource($user->refresh());
        $data = $resource->toArray(request());

        $this->assertEquals('compound_admin', $data['role']);
    }
}
