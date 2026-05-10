<?php

namespace Database\Factories\Apartments;

use App\Models\Apartments\ApartmentPenaltyEvent;
use App\Models\Property\Unit;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ApartmentPenaltyEvent>
 */
class ApartmentPenaltyEventFactory extends Factory
{
    protected $model = ApartmentPenaltyEvent::class;

    public function definition(): array
    {
        return [
            'unit_id'           => Unit::factory(),
            'violation_rule_id' => null,
            'points'            => $this->faker->numberBetween(1, 10),
            'reason'            => $this->faker->sentence(),
            'notes'             => null,
            'applied_by'        => User::factory(),
            'expires_at'        => null,
            'voided_at'         => null,
            'voided_by'         => null,
            'void_reason'       => null,
        ];
    }
}
