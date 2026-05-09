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
        $letters = 'أ ب ج';
        $digits = (string) fake()->numberBetween(1000, 9999);

        return [
            'unit_id' => Unit::factory(),
            'apartment_resident_id' => null,
            'plate' => "{$letters} {$digits}",
            'plate_format' => 'letters_numbers',
            'plate_letters_ar' => $letters,
            'plate_letters_en' => 'A B G',
            'plate_digits' => $digits,
            'plate_digits_normalized' => $digits,
            'plate_normalized' => 'abg'.$digits,
            'make' => fake()->randomElement(['Toyota', 'Honda', 'BMW', 'Hyundai']),
            'model' => fake()->word(),
            'color' => fake()->safeColorName(),
            'sticker_code' => null,
            'notes' => null,
        ];
    }
}
