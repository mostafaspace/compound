<?php

namespace Database\Factories\Security;

use App\Models\Security\SecurityIncident;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SecurityIncident>
 */
class SecurityIncidentFactory extends Factory
{
    protected $model = SecurityIncident::class;

    public function definition(): array
    {
        return [
            'reported_by' => User::factory(),
            'type' => fake()->randomElement(['denied_entry', 'suspicious_activity', 'emergency', 'vehicle_issue', 'operational_handover', 'other']),
            'title' => fake()->sentence(5),
            'description' => fake()->paragraph(),
            'notes' => null,
            'metadata' => null,
            'occurred_at' => now(),
            'resolved_at' => null,
        ];
    }

    public function resolved(): static
    {
        return $this->state([
            'resolved_at' => now(),
        ]);
    }
}
