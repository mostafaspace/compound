<?php

namespace Database\Factories\Property;

use App\Enums\UnitRelationType;
use App\Enums\VerificationStatus;
use App\Models\Property\Unit;
use App\Models\Property\UnitMembership;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<UnitMembership>
 */
class UnitMembershipFactory extends Factory
{
    protected $model = UnitMembership::class;

    public function definition(): array
    {
        return [
            'unit_id'             => Unit::factory(),
            'user_id'             => User::factory(),
            'relation_type'       => UnitRelationType::Owner->value,
            'starts_at'           => now()->subYear()->toDateString(),
            'ends_at'             => null,
            'is_primary'          => true,
            'verification_status' => VerificationStatus::Verified->value,
            'created_by'          => User::factory(),
        ];
    }

    public function verified(): static
    {
        return $this->state(fn (array $attributes) => [
            'verification_status' => VerificationStatus::Verified->value,
        ]);
    }

    public function pending(): static
    {
        return $this->state(fn (array $attributes) => [
            'verification_status' => VerificationStatus::Pending->value,
        ]);
    }
}
