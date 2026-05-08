<?php

namespace Database\Factories\Security;

use App\Models\Security\ManualVisitorEntry;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ManualVisitorEntry>
 */
class ManualVisitorEntryFactory extends Factory
{
    protected $model = ManualVisitorEntry::class;

    public function definition(): array
    {
        return [
            'processed_by' => User::factory(),
            'visitor_name' => fake()->name(),
            'visitor_phone' => fake()->optional(0.7)->phoneNumber(),
            'vehicle_plate' => fake()->optional(0.4)->bothify('??-####'),
            'host_user_id' => null,
            'host_unit_id' => null,
            'reason' => fake()->sentence(),
            'notes' => null,
            'status' => 'allowed',
            'occurred_at' => now(),
        ];
    }

    public function denied(): static
    {
        return $this->state(['status' => 'denied']);
    }
}
