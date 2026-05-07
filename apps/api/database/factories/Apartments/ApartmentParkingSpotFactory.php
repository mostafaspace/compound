<?php

namespace Database\Factories\Apartments;

use App\Models\Apartments\ApartmentParkingSpot;
use App\Models\Property\Unit;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ApartmentParkingSpot>
 */
class ApartmentParkingSpotFactory extends Factory
{
    protected $model = ApartmentParkingSpot::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'unit_id' => Unit::factory(),
            'code' => 'P-'.strtoupper(fake()->bothify('##??')),
            'notes' => null,
        ];
    }
}
