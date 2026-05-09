<?php

namespace Database\Factories\Apartments;

use App\Enums\VehicleNotificationSenderMode;
use App\Models\Apartments\VehicleNotification;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<VehicleNotification>
 */
class VehicleNotificationFactory extends Factory
{
    protected $model = VehicleNotification::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'sender_user_id' => User::factory(),
            'sender_unit_id' => null,
            'sender_mode' => VehicleNotificationSenderMode::Identified,
            'sender_alias' => null,
            'target_vehicle_id' => null,
            'target_unit_id' => null,
            'target_plate_query' => 'أ ب ج 1234',
            'message' => fake()->sentence(),
        ];
    }
}
