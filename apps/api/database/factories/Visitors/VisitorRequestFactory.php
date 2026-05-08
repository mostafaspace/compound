<?php

namespace Database\Factories\Visitors;

use App\Enums\VisitorRequestStatus;
use App\Models\Property\Unit;
use App\Models\User;
use App\Models\Visitors\VisitorRequest;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<VisitorRequest>
 */
class VisitorRequestFactory extends Factory
{
    protected $model = VisitorRequest::class;

    public function definition(): array
    {
        return [
            'host_user_id' => User::factory(),
            'unit_id' => Unit::factory(),
            'visitor_name' => fake()->name(),
            'visitor_phone' => fake()->e164PhoneNumber(),
            'vehicle_plate' => null,
            'visit_starts_at' => now()->addDay(),
            'visit_ends_at' => now()->addDays(2),
            'notes' => null,
            'status' => VisitorRequestStatus::Pending->value,
        ];
    }

    public function pending(): static
    {
        return $this->state(['status' => VisitorRequestStatus::Pending->value]);
    }

    public function completed(): static
    {
        return $this->state([
            'status' => VisitorRequestStatus::Completed->value,
            'completed_at' => now(),
        ]);
    }
}
