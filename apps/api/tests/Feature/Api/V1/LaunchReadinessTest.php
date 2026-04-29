<?php

namespace Tests\Feature\Api\V1;

use App\Enums\AccountStatus;
use App\Enums\Permission;
use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission as SpatiePermission;
use Spatie\Permission\Models\Role as SpatieRole;
use Tests\TestCase;

class LaunchReadinessTest extends TestCase
{
    use RefreshDatabase;

    public function test_launch_readiness_counts_effective_spatie_admin_roles_when_legacy_roles_are_stale(): void
    {
        $manageRoles = SpatiePermission::findOrCreate(Permission::ManageRoles->value, 'sanctum');

        $actor = User::factory()->create([
            'role' => UserRole::ResidentOwner->value,
            'status' => AccountStatus::Active->value,
        ]);
        $actor->givePermissionTo($manageRoles);

        $superAdminRole = SpatieRole::findOrCreate('super_admin', 'sanctum');
        $compoundHeadRole = SpatieRole::findOrCreate('compound_head', 'sanctum');

        $spatieSuperAdmin = User::factory()->create([
            'role' => UserRole::ResidentOwner->value,
            'status' => AccountStatus::Active->value,
        ]);
        $spatieSuperAdmin->assignRole($superAdminRole);

        $spatieCompoundHead = User::factory()->create([
            'role' => UserRole::ResidentOwner->value,
            'status' => AccountStatus::Active->value,
        ]);
        $spatieCompoundHead->assignRole($compoundHeadRole);

        Sanctum::actingAs($actor);

        $this->getJson('/api/v1/system/launch-readiness')
            ->assertOk()
            ->assertJsonPath('data.launch.seed_data.status', 'pass')
            ->assertJsonPath('data.launch.seed_data.superAdmins', 1)
            ->assertJsonPath('data.launch.seed_data.compoundAdmins', 1);
    }
}
