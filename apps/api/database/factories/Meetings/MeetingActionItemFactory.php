<?php

namespace Database\Factories\Meetings;

use App\Models\Meetings\MeetingActionItem;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<MeetingActionItem>
 */
class MeetingActionItemFactory extends Factory
{
    protected $model = MeetingActionItem::class;

    public function definition(): array
    {
        return [
            'title'       => fake()->sentence(6),
            'description' => fake()->optional(0.5)->sentence(),
            'assigned_to' => User::factory(),
            'due_date'    => fake()->optional(0.7)->dateTimeBetween('now', '+30 days')?->format('Y-m-d'),
            'status'      => 'open',
            'completed_at'=> null,
            'created_by'  => User::factory(),
        ];
    }

    public function done(): static
    {
        return $this->state([
            'status'       => 'done',
            'completed_at' => now(),
        ]);
    }
}
