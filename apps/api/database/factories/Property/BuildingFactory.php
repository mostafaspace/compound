<?php

namespace Database\Factories\Property;

use App\Models\Property\Building;
use App\Models\Property\Compound;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Building>
 */
class BuildingFactory extends Factory
{
    protected $model = Building::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $code = fake()->unique()->bothify('B##');

        return [
            'compound_id' => Compound::factory(),
            'name' => 'Building '.$code,
            'code' => $code,
            'sort_order' => fake()->numberBetween(1, 20),
            'metadata' => [],
        ];
    }
}
