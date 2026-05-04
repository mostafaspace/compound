<?php

namespace Database\Factories\Property;

use App\Enums\UnitStatus;
use App\Enums\UnitType;
use App\Models\Property\Building;
use App\Models\Property\Compound;
use App\Models\Property\Floor;
use App\Models\Property\Unit;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Unit>
 */
class UnitFactory extends Factory
{
    protected $model = Unit::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'compound_id' => Compound::factory(),
            'building_id' => Building::factory(),
            'floor_id' => null,
            'unit_number' => fake()->bothify('###'),
            'type' => fake()->randomElement([UnitType::Apartment->value, UnitType::Duplex->value, UnitType::Villa->value]),
            'area_sqm' => fake()->randomFloat(2, 80, 350),
            'bedrooms' => fake()->numberBetween(1, 5),
            'status' => UnitStatus::Active->value,
            'metadata' => [],
        ];
    }
}
