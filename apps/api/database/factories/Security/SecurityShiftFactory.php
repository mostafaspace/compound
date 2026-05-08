<?php

namespace Database\Factories\Security;

use App\Models\Security\SecurityShift;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SecurityShift>
 */
class SecurityShiftFactory extends Factory
{
    protected $model = SecurityShift::class;

    public function definition(): array
    {
        return [
            'name' => fake()->randomElement(['Morning Shift', 'Evening Shift', 'Night Shift', 'Weekend Shift']),
            'status' => 'draft',
            'handover_notes' => null,
            'started_at' => null,
            'ended_at' => null,
            'created_by' => User::factory(),
            'closed_by' => null,
        ];
    }

    public function active(): static
    {
        return $this->state([
            'status' => 'active',
            'started_at' => now()->subHours(2),
        ]);
    }

    public function closed(): static
    {
        return $this->state(fn (array $attrs) => [
            'status' => 'closed',
            'started_at' => now()->subHours(10),
            'ended_at' => now()->subHours(2),
            'closed_by' => User::factory(),
        ]);
    }
}
