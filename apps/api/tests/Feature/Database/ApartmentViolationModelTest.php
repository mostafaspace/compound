<?php

namespace Tests\Feature\Database;

use App\Enums\ApartmentViolationStatus;
use App\Models\Apartments\ApartmentViolation;
use App\Models\Apartments\ViolationRule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApartmentViolationModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_violation_factory(): void
    {
        $violation = ApartmentViolation::factory()->create();

        $this->assertInstanceOf(ViolationRule::class, $violation->rule);
        $this->assertSame(ApartmentViolationStatus::Pending, $violation->status);
        $this->assertNotNull($violation->fee);
    }
}
