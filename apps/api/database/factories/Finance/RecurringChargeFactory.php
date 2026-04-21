<?php

namespace Database\Factories\Finance;

use App\Enums\ChargeFrequency;
use App\Models\Finance\RecurringCharge;
use App\Models\Property\Compound;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<RecurringCharge>
 */
class RecurringChargeFactory extends Factory
{
    protected $model = RecurringCharge::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'compound_id' => Compound::factory(),
            'charge_type_id' => null,
            'name' => $this->faker->words(nb: 3, asText: true),
            'amount' => $this->faker->randomFloat(2, 50, 2000),
            'currency' => 'EGP',
            'frequency' => $this->faker->randomElement(ChargeFrequency::cases())->value,
            'billing_day' => $this->faker->optional()->numberBetween(1, 28),
            'target_type' => 'all',
            'target_ids' => null,
            'starts_at' => null,
            'ends_at' => null,
            'is_active' => true,
            'last_run_at' => null,
            'created_by' => null,
        ];
    }
}
