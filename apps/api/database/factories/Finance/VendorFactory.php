<?php

namespace Database\Factories\Finance;

use App\Enums\VendorType;
use App\Models\Finance\Vendor;
use App\Models\Property\Compound;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Vendor>
 */
class VendorFactory extends Factory
{
    protected $model = Vendor::class;

    public function definition(): array
    {
        return [
            'compound_id' => Compound::factory(),
            'name' => $this->faker->company(),
            'type' => VendorType::ServiceProvider->value,
            'contact_name' => $this->faker->optional()->name(),
            'phone' => $this->faker->optional()->phoneNumber(),
            'email' => $this->faker->optional()->safeEmail(),
            'notes' => null,
            'is_active' => true,
        ];
    }
}
