<?php

namespace Database\Factories\Finance;

use App\Models\Finance\ReserveFund;
use App\Models\Property\Compound;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ReserveFund>
 */
class ReserveFundFactory extends Factory
{
    protected $model = ReserveFund::class;

    public function definition(): array
    {
        return [
            'compound_id' => Compound::factory(),
            'name'        => $this->faker->words(3, true) . ' Fund',
            'description' => $this->faker->optional()->sentence(),
            'balance'     => $this->faker->randomFloat(2, 0, 100000),
            'currency'    => 'EGP',
            'is_active'   => true,
        ];
    }
}
