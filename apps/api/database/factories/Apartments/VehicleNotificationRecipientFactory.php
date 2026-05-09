<?php

namespace Database\Factories\Apartments;

use App\Models\Apartments\VehicleNotification;
use App\Models\Apartments\VehicleNotificationRecipient;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<VehicleNotificationRecipient>
 */
class VehicleNotificationRecipientFactory extends Factory
{
    protected $model = VehicleNotificationRecipient::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'vehicle_notification_id' => VehicleNotification::factory(),
            'user_id' => User::factory(),
            'read_at' => null,
        ];
    }
}
