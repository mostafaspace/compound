<?php

namespace Database\Factories;

use App\Enums\DevicePlatform;
use App\Models\DeviceToken;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class DeviceTokenFactory extends Factory
{
    protected $model = DeviceToken::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'token' => 'token_'.fake()->uuid(),
            'platform' => fake()->randomElement(DevicePlatform::cases())->value,
            'device_name' => fake()->optional()->word(),
            'last_seen_at' => now(),
        ];
    }

    public function fcm(): static
    {
        return $this->state(['platform' => DevicePlatform::Fcm->value]);
    }
}
