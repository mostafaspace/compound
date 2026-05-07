<?php

namespace Database\Factories\Apartments;

use App\Enums\ApartmentViolationStatus;
use App\Models\Apartments\ApartmentViolation;
use App\Models\Apartments\ViolationRule;
use App\Models\Property\Unit;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ApartmentViolation>
 */
class ApartmentViolationFactory extends Factory
{
    protected $model = ApartmentViolation::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'unit_id' => Unit::factory(),
            'violation_rule_id' => ViolationRule::factory(),
            'applied_by' => User::factory(),
            'fee' => 250,
            'notes' => null,
            'status' => ApartmentViolationStatus::Pending,
        ];
    }
}
