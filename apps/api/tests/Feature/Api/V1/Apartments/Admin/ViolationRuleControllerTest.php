<?php

namespace Tests\Feature\Api\V1\Apartments\Admin;

use App\Enums\Permission;
use App\Models\Apartments\ViolationRule;
use App\Models\Property\Compound;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission as SpatiePermission;
use Tests\TestCase;

class ViolationRuleControllerTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        $user = User::factory()->create();
        $user->givePermissionTo(
            SpatiePermission::findOrCreate(Permission::ApartmentsAdmin->value, 'sanctum')
        );

        return $user;
    }

    public function test_admin_can_create_violation_rule(): void
    {
        $compound = Compound::factory()->create();
        Sanctum::actingAs($this->admin());

        $this->postJson("/api/v1/admin/compounds/{$compound->id}/violation-rules", [
            'name' => 'Balcony storage',
            'default_fee' => 300,
        ])
            ->assertCreated()
            ->assertJsonPath('data.name', 'Balcony storage')
            ->assertJsonPath('data.defaultFee', '300.00');
    }

    public function test_admin_can_update_violation_rule(): void
    {
        $compound = Compound::factory()->create();
        $rule = ViolationRule::factory()->create(['compound_id' => $compound->id]);
        Sanctum::actingAs($this->admin());

        $this->patchJson("/api/v1/admin/compounds/{$compound->id}/violation-rules/{$rule->id}", [
            'name' => 'Updated rule',
            'is_active' => false,
        ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Updated rule')
            ->assertJsonPath('data.isActive', false);
    }

    public function test_admin_can_archive_violation_rule(): void
    {
        $compound = Compound::factory()->create();
        $rule = ViolationRule::factory()->create(['compound_id' => $compound->id]);
        Sanctum::actingAs($this->admin());

        $this->deleteJson("/api/v1/admin/compounds/{$compound->id}/violation-rules/{$rule->id}")
            ->assertNoContent();

        $this->assertSoftDeleted('violation_rules', ['id' => $rule->id]);
    }

    public function test_non_admin_blocked(): void
    {
        $compound = Compound::factory()->create();
        Sanctum::actingAs(User::factory()->create());

        $this->postJson("/api/v1/admin/compounds/{$compound->id}/violation-rules", [
            'name' => 'Nope',
        ])->assertForbidden();
    }

    public function test_validation_errors_return_unprocessable(): void
    {
        $compound = Compound::factory()->create();
        Sanctum::actingAs($this->admin());

        $this->postJson("/api/v1/admin/compounds/{$compound->id}/violation-rules", [
            'name' => '',
            'default_fee' => -1,
        ])->assertUnprocessable();
    }
}
