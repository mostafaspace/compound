<?php

namespace Tests\Feature\Api\V1\Apartments\Admin;

use App\Enums\ApartmentViolationStatus;
use App\Enums\Permission;
use App\Models\Apartments\ApartmentViolation;
use App\Models\Apartments\ViolationRule;
use App\Models\Property\Compound;
use App\Models\Property\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission as SpatiePermission;
use Tests\TestCase;

class ViolationApplicationControllerTest extends TestCase
{
    use RefreshDatabase;

    private function violationAdmin(): User
    {
        $user = User::factory()->create();
        $user->givePermissionTo(
            SpatiePermission::findOrCreate(Permission::ApplyApartmentViolation->value, 'sanctum')
        );

        return $user;
    }

    public function test_admin_can_apply_violation_to_unit(): void
    {
        $compound = Compound::factory()->create();
        $unit = Unit::factory()->create(['compound_id' => $compound->id]);
        $rule = ViolationRule::factory()->create([
            'compound_id' => $compound->id,
            'default_fee' => 350,
        ]);

        Sanctum::actingAs($this->violationAdmin());

        $this->postJson("/api/v1/admin/apartments/{$unit->id}/violations", [
            'violation_rule_id' => $rule->id,
            'notes' => 'Repeated noise complaints.',
        ])
            ->assertCreated()
            ->assertJsonPath('data.rule.name', $rule->name)
            ->assertJsonPath('data.fee', '350.00')
            ->assertJsonPath('data.status', ApartmentViolationStatus::Pending->value);
    }

    public function test_rule_must_belong_to_unit_compound(): void
    {
        $unit = Unit::factory()->create();
        $rule = ViolationRule::factory()->create();

        Sanctum::actingAs($this->violationAdmin());

        $this->postJson("/api/v1/admin/apartments/{$unit->id}/violations", [
            'violation_rule_id' => $rule->id,
        ])->assertUnprocessable();
    }

    public function test_admin_can_mark_violation_paid(): void
    {
        $violation = ApartmentViolation::factory()->create();
        Sanctum::actingAs($this->violationAdmin());

        $this->patchJson("/api/v1/admin/apartment-violations/{$violation->id}/paid")
            ->assertOk()
            ->assertJsonPath('data.status', ApartmentViolationStatus::Paid->value);
    }

    public function test_admin_can_mark_violation_waived(): void
    {
        $violation = ApartmentViolation::factory()->create();
        Sanctum::actingAs($this->violationAdmin());

        $this->patchJson("/api/v1/admin/apartment-violations/{$violation->id}/waive", [
            'reason' => 'Approved by board.',
        ])
            ->assertOk()
            ->assertJsonPath('data.status', ApartmentViolationStatus::Waived->value)
            ->assertJsonPath('data.waivedReason', 'Approved by board.');
    }

    public function test_non_admin_blocked(): void
    {
        $unit = Unit::factory()->create();
        $rule = ViolationRule::factory()->create(['compound_id' => $unit->compound_id]);
        Sanctum::actingAs(User::factory()->create());

        $this->postJson("/api/v1/admin/apartments/{$unit->id}/violations", [
            'violation_rule_id' => $rule->id,
        ])->assertForbidden();
    }

    public function test_validation_errors_return_unprocessable(): void
    {
        $unit = Unit::factory()->create();
        Sanctum::actingAs($this->violationAdmin());

        $this->postJson("/api/v1/admin/apartments/{$unit->id}/violations", [
            'violation_rule_id' => null,
            'fee' => -1,
        ])->assertUnprocessable();
    }
}
