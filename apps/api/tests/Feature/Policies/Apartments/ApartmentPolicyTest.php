<?php

namespace Tests\Feature\Policies\Apartments;

use App\Enums\VerificationStatus;
use App\Models\Apartments\ApartmentResident;
use App\Models\Property\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApartmentPolicyTest extends TestCase
{
    use RefreshDatabase;

    public function test_verified_resident_can_manage(): void
    {
        $user = User::factory()->create();
        $unit = Unit::factory()->create();
        ApartmentResident::factory()->create([
            'user_id' => $user->id,
            'unit_id' => $unit->id,
            'verification_status' => VerificationStatus::Verified,
        ]);

        $this->assertTrue($user->can('manage', $unit));
    }

    public function test_pending_resident_cannot_manage(): void
    {
        $user = User::factory()->create();
        $unit = Unit::factory()->create();
        ApartmentResident::factory()->create([
            'user_id' => $user->id,
            'unit_id' => $unit->id,
            'verification_status' => VerificationStatus::Pending,
        ]);

        $this->assertFalse($user->can('manage', $unit));
    }

    public function test_outsider_cannot_manage(): void
    {
        $user = User::factory()->create();
        $unit = Unit::factory()->create();

        $this->assertFalse($user->can('manage', $unit));
    }
}
