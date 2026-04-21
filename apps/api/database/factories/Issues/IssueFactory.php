<?php

namespace Database\Factories\Issues;

use App\Models\Issues\Issue;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Issue>
 */
class IssueFactory extends Factory
{
    protected $model = Issue::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'reported_by' => User::factory(),
            'assigned_to' => null,
            'category' => fake()->randomElement(['maintenance', 'security', 'cleaning', 'noise', 'other']),
            'title' => fake()->sentence(6),
            'description' => fake()->paragraph(),
            'status' => 'new',
            'priority' => fake()->randomElement(['low', 'normal', 'high', 'urgent']),
            'resolved_at' => null,
            'metadata' => [],
        ];
    }

    public function resolved(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'resolved',
            'resolved_at' => now(),
        ]);
    }

    public function escalated(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'escalated',
        ]);
    }
}
