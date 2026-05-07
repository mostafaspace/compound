<?php

namespace Database\Factories\Apartments;

use App\Enums\UnitRelationType;
use App\Enums\VerificationStatus;
use App\Models\Apartments\ApartmentResident;
use App\Models\Property\Unit;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ApartmentResident>
 */
class ApartmentResidentFactory extends Factory
{
    protected $model = ApartmentResident::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'unit_id' => Unit::factory(),
            'user_id' => User::factory(),
            'relation_type' => UnitRelationType::Owner->value,
            'starts_at' => now()->subYear()->toDateString(),
            'ends_at' => null,
            'is_primary' => true,
            'verification_status' => VerificationStatus::Verified->value,
            'created_by' => User::factory(),
            'resident_name' => null,
            'resident_phone' => null,
            'phone_public' => false,
            'resident_email' => null,
            'email_public' => false,
            'photo_path' => null,
        ];
    }

    public function withoutUser(): static
    {
        return $this->state(fn (array $attributes) => [
            'user_id' => null,
            'resident_name' => fake()->name(),
        ]);
    }

    public function primary(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_primary' => true,
        ]);
    }
}
