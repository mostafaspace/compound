<?php

namespace Tests\Feature\Api\V1\Apartments;

use App\Enums\VerificationStatus;
use App\Models\Apartments\ApartmentResident;
use App\Models\Apartments\ApartmentViolation;
use App\Models\Apartments\ViolationRule;
use App\Models\Property\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ApartmentViolationControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_member_can_list_unit_violations(): void
    {
        $user = User::factory()->create();
        $unit = Unit::factory()->create();
        $rule = ViolationRule::factory()->create(['name' => 'Balcony storage']);

        ApartmentResident::factory()->create([
            'unit_id' => $unit->id,
            'user_id' => $user->id,
            'verification_status' => VerificationStatus::Verified,
        ]);
        ApartmentViolation::factory()->create([
            'unit_id' => $unit->id,
            'violation_rule_id' => $rule->id,
            'fee' => 300,
        ]);

        Sanctum::actingAs($user);

        $this->getJson("/api/v1/apartments/{$unit->id}/violations")
            ->assertOk()
            ->assertJsonPath('data.0.rule.name', 'Balcony storage')
            ->assertJsonPath('data.0.fee', '300.00');
    }

    public function test_non_member_blocked(): void
    {
        $unit = Unit::factory()->create();
        Sanctum::actingAs(User::factory()->create());

        $this->getJson("/api/v1/apartments/{$unit->id}/violations")
            ->assertForbidden();
    }
}
