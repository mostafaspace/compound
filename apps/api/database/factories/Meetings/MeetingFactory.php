<?php

namespace Database\Factories\Meetings;

use App\Models\Meetings\Meeting;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Meeting>
 */
class MeetingFactory extends Factory
{
    protected $model = Meeting::class;

    public function definition(): array
    {
        return [
            'title' => fake()->sentence(5),
            'description' => fake()->optional(0.6)->paragraph(),
            'scope' => fake()->randomElement(['association', 'building', 'committee']),
            'scope_ref_id' => null,
            'status' => 'draft',
            'scheduled_at' => now()->addDays(fake()->numberBetween(1, 30)),
            'duration_minutes' => fake()->randomElement([30, 60, 90, 120]),
            'location' => fake()->optional(0.7)->randomElement(['Conference Room A', 'Community Hall', 'Board Room', 'Online']),
            'location_url' => null,
            'created_by' => User::factory(),
            'cancelled_by' => null,
            'cancelled_at' => null,
            'published_at' => null,
        ];
    }

    public function scheduled(): static
    {
        return $this->state(['status' => 'scheduled']);
    }

    public function completed(): static
    {
        return $this->state([
            'status' => 'completed',
            'scheduled_at' => now()->subDays(2),
        ]);
    }

    public function cancelled(): static
    {
        return $this->state(fn (array $attrs) => [
            'status' => 'cancelled',
            'cancelled_at' => now(),
            'cancelled_by' => User::factory(),
        ]);
    }
}
