<?php

namespace Database\Factories;

use App\Enums\DeliveryStatus;
use App\Enums\NotificationChannel;
use App\Models\Notification;
use App\Models\NotificationDeliveryLog;
use Illuminate\Database\Eloquent\Factories\Factory;

class NotificationDeliveryLogFactory extends Factory
{
    protected $model = NotificationDeliveryLog::class;

    public function definition(): array
    {
        return [
            'notification_id' => Notification::factory(),
            'channel' => fake()->randomElement(NotificationChannel::cases())->value,
            'status' => DeliveryStatus::Sent->value,
            'recipient' => 'exa***',
            'provider' => 'mock',
            'provider_response' => ['message_id' => 'mock_'.fake()->md5()],
            'error_message' => null,
            'attempt_number' => 1,
        ];
    }

    public function failed(): static
    {
        return $this->state([
            'status' => DeliveryStatus::Failed->value,
            'provider_response' => null,
            'error_message' => 'No device tokens registered for user',
        ]);
    }
}
