<?php

namespace Database\Factories;

use App\Enums\NotificationCategory;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Notification>
 */
class NotificationFactory extends Factory
{
    protected $model = Notification::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'category' => $this->faker->randomElement(NotificationCategory::cases())->value,
            'channel' => 'in_app',
            'priority' => $this->faker->randomElement(['low', 'normal', 'high']),
            'title' => $this->faker->sentence(4),
            'body' => $this->faker->sentence(12),
            'metadata' => [],
            'delivered_at' => now(),
            'delivery_attempts' => 1,
        ];
    }
}
