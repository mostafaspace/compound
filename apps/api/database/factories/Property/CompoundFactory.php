<?php

namespace Database\Factories\Property;

use App\Enums\CompoundStatus;
use App\Models\Property\Compound;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Compound>
 */
class CompoundFactory extends Factory
{
    protected $model = Compound::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->company().' Residence';

        return [
            'name' => $name,
            'legal_name' => $name.' Owners Association',
            'code' => Str::upper(fake()->unique()->bothify('CMP-###')),
            'timezone' => 'Africa/Cairo',
            'currency' => 'EGP',
            'status' => CompoundStatus::Active->value,
            'metadata' => [],
        ];
    }
}
