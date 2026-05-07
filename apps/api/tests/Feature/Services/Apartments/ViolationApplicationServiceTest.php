<?php

namespace Tests\Feature\Services\Apartments;

use App\Enums\ApartmentViolationStatus;
use App\Models\Apartments\ApartmentViolation;
use App\Models\Apartments\ViolationRule;
use App\Models\Property\Unit;
use App\Models\User;
use App\Services\Apartments\ViolationApplicationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ViolationApplicationServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_apply_creates_violation_with_rule_fee(): void
    {
        $unit = Unit::factory()->create();
        $rule = ViolationRule::factory()->create(['default_fee' => 300]);
        $admin = User::factory()->create();

        $violation = app(ViolationApplicationService::class)->apply($unit, $rule, $admin, []);

        $this->assertSame('300.00', (string) $violation->fee);
        $this->assertSame(ApartmentViolationStatus::Pending, $violation->status);
    }

    public function test_apply_supports_fee_override(): void
    {
        $unit = Unit::factory()->create();
        $rule = ViolationRule::factory()->create(['default_fee' => 300]);

        $violation = app(ViolationApplicationService::class)->apply(
            $unit,
            $rule,
            User::factory()->create(),
            ['fee' => 500, 'notes' => 'second offense'],
        );

        $this->assertSame('500.00', (string) $violation->fee);
        $this->assertSame('second offense', $violation->notes);
    }

    public function test_mark_paid(): void
    {
        $violation = ApartmentViolation::factory()->create();

        $updated = app(ViolationApplicationService::class)->markPaid($violation);

        $this->assertSame(ApartmentViolationStatus::Paid, $updated->status);
        $this->assertNotNull($updated->paid_at);
    }

    public function test_mark_waived(): void
    {
        $violation = ApartmentViolation::factory()->create();

        $updated = app(ViolationApplicationService::class)->markWaived($violation, 'goodwill');

        $this->assertSame(ApartmentViolationStatus::Waived, $updated->status);
        $this->assertSame('goodwill', $updated->waived_reason);
    }
}
