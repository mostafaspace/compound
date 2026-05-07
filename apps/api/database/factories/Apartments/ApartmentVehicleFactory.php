<?php

namespace Database\Factories\Apartments;

use App\Models\Apartments\ApartmentVehicle;
use App\Models\Property\Unit;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ApartmentVehicle>
 */
class ApartmentVehicleFactory extends Factory
{
    protected $model = ApartmentVehicle::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'unit_id' => Unit::factory(),
            'apartment_resident_id' => null,
            'plate' => strtoupper(fake()->bothify('???-####')),
            'make' => fake()->randomElement(['Toyota', 'Honda', 'BMW', 'Hyundai']),
            'model' => fake()->word(),
            'color' => fake()->safeColorName(),
            'sticker_code' => null,
            'notes' => null,
        ];
    }
}
