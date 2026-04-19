<?php

namespace Database\Factories\Property;

use App\Models\Property\Building;
use App\Models\Property\Floor;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Floor>
 */
class FloorFactory extends Factory
{
    protected $model = Floor::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $level = fake()->numberBetween(0, 12);

        return [
            'building_id' => Building::factory(),
            'label' => $level === 0 ? 'Ground' : 'Floor '.$level,
            'level_number' => $level,
            'sort_order' => $level,
        ];
    }
}
