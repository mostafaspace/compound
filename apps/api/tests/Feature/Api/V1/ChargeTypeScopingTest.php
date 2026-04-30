<?php

namespace Tests\Feature\Api\V1;

use App\Enums\Permission;
use App\Enums\UserRole;
use App\Models\Finance\ChargeType;
use App\Models\Property\Compound;
use App\Models\User;
use App\Models\UserScopeAssignment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission as SpatiePermission;
use Spatie\Permission\Models\Role as SpatieRole;
use Tests\TestCase;

class ChargeTypeScopingTest extends TestCase
{
    use RefreshDatabase;

    private function makeScopedFinanceAdmin(Compound $compound): User
    {
        $role = SpatieRole::findOrCreate('finance_admin', 'sanctum');
        $role->givePermissionTo(
            SpatiePermission::findOrCreate(Permission::ViewFinance->value, 'sanctum'),
            SpatiePermission::findOrCreate(Permission::ManageFinance->value, 'sanctum'),
        );

        $user = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => null,
        ]);
        $user->assignRole($role);

        UserScopeAssignment::create([
            'user_id' => $user->id,
            'role_name' => 'finance_admin',
            'scope_type' => 'compound',
            'scope_id' => $compound->id,
            'created_by' => $user->id,
        ]);

        return $user->refresh();
    }

    public function test_compound_admin_cannot_create_global_charge_type(): void
    {
        $compound = Compound::factory()->create();
        $admin = $this->makeScopedFinanceAdmin($compound);

        Sanctum::actingAs($admin);

        $response = $this->postJson('/api/v1/finance/charge-types', [
            'name' => 'Evil Global Charge Type',
            'code' => 'evil_code',
            'is_recurring' => true,
        ]);

        // Expected behavior: only super-admin can create global charge types.
        // Current behavior (Vulnerable): anyone with manage_finance can create them.
        $response->assertForbidden();
    }

    public function test_compound_admin_cannot_update_global_charge_type(): void
    {
        $compound = Compound::factory()->create();
        $admin = $this->makeScopedFinanceAdmin($compound);
        $chargeType = ChargeType::factory()->create(['name' => 'Original Name']);

        Sanctum::actingAs($admin);

        $response = $this->patchJson("/api/v1/finance/charge-types/{$chargeType->id}", [
            'name' => 'Hacked Name',
            'code' => $chargeType->code,
        ]);

        $response->assertForbidden();
        $this->assertEquals('Original Name', $chargeType->fresh()->name);
    }
}
