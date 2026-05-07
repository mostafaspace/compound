<?php

namespace Database\Factories\Apartments;

use App\Models\Apartments\ApartmentNote;
use App\Models\Property\Unit;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ApartmentNote>
 */
class ApartmentNoteFactory extends Factory
{
    protected $model = ApartmentNote::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'unit_id' => Unit::factory(),
            'author_id' => User::factory(),
            'body' => fake()->sentence(),
        ];
    }
}
