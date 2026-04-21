<?php

namespace Database\Factories\Finance;

use App\Models\Finance\ChargeType;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<ChargeType>
 */
class ChargeTypeFactory extends Factory
{
    protected $model = ChargeType::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = $this->faker->words(nb: 3, asText: true);

        return [
            'name' => ucwords($name),
            'code' => Str::snake(str_replace(' ', '_', $name)),
            'default_amount' => $this->faker->optional()->randomFloat(2, 50, 5000),
            'is_recurring' => $this->faker->boolean(),
        ];
    }
}
