<?php

namespace Database\Factories\Security;

use App\Models\Security\SecurityGate;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SecurityGate>
 */
class SecurityGateFactory extends Factory
{
    protected $model = SecurityGate::class;

    public function definition(): array
    {
        return [
            'name'        => fake()->randomElement(['Main Gate', 'Back Gate', 'Pedestrian Gate', 'Delivery Gate', 'Service Gate']),
            'zone'        => fake()->optional(0.5)->randomElement(['Zone A', 'Zone B', 'North', 'South']),
            'description' => fake()->optional(0.5)->sentence(),
            'is_active'   => true,
        ];
    }

    public function inactive(): static
    {
        return $this->state(['is_active' => false]);
    }
}
