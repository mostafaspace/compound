<?php

namespace Tests\Feature\Api\V1;

use App\Enums\AccountStatus;
use App\Enums\Permission;
use App\Enums\UserRole;
use App\Models\Apartments\ApartmentResident;
use App\Models\Property\Building;
use App\Models\Property\Compound;
use App\Models\Property\Unit;
use App\Models\User;
use App\Services\CompoundContextService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Spatie\Permission\Models\Permission as SpatiePermission;
use Spatie\Permission\Models\Role as SpatieRole;
use Tests\TestCase;

class CompoundContextServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_spatie_super_admin_role_is_treated_as_global_compound_manager(): void
    {
        $superAdminRole = SpatieRole::findOrCreate('super_admin', 'sanctum');

        $user = User::factory()->create([
            'role' => UserRole::ResidentOwner->value,
            'status' => AccountStatus::Active->value,
            'compound_id' => null,
        ]);

        $user->assignRole($superAdminRole);

        $request = Request::create('/api/v1/compounds', 'GET', ['compoundId' => 'cmp_123']);
        $request->headers->set('X-Compound-Id', 'cmp_456');
        $request->setUserResolver(fn () => $user);

        /** @var CompoundContextService $service */
        $service = $this->app->make(CompoundContextService::class);

        $this->assertSame('cmp_456', $service->resolve($request));
        $this->assertTrue($service->canAccessCompound($request, 'any-compound'));
        $this->assertTrue($service->canManageAllCompounds($request));
    }

    public function test_effective_compound_head_prefers_membership_scope_over_stale_direct_compound_id(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();
        $buildingA = Building::factory()->for($compoundA)->create();
        $unitA = Unit::factory()->for($compoundA)->for($buildingA)->create(['floor_id' => null]);
        $compoundHeadRole = SpatieRole::findOrCreate('compound_head', 'sanctum');
        $compoundHeadRole->givePermissionTo(
            SpatiePermission::findOrCreate(Permission::ViewGovernance->value, 'sanctum')
        );

        $user = User::factory()->create([
            'role' => UserRole::ResidentOwner->value,
            'status' => AccountStatus::Active->value,
            'compound_id' => $compoundB->id,
        ]);
        $user->assignRole($compoundHeadRole);

        ApartmentResident::factory()->create([
            'unit_id' => $unitA->id,
            'user_id' => $user->id,
            'verification_status' => 'verified',
            'starts_at' => now()->subYear(),
            'ends_at' => null,
        ]);

        $request = Request::create('/api/v1/polls', 'GET');
        $request->setUserResolver(fn () => $user);

        /** @var CompoundContextService $service */
        $service = $this->app->make(CompoundContextService::class);

        $this->assertSame($compoundA->id, $service->resolve($request));
        $this->assertSame($compoundA->id, $service->resolveManagedCompoundId($user));
        $this->assertTrue($service->canAccessCompound($request, $compoundA->id));
        $this->assertFalse($service->canAccessCompound($request, $compoundB->id));
    }
}
