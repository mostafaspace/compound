<?php

namespace Database\Factories\Maintenance;

use App\Models\Maintenance\WorkOrder;
use App\Models\Property\Compound;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<WorkOrder>
 */
class WorkOrderFactory extends Factory
{
    protected $model = WorkOrder::class;

    public function definition(): array
    {
        return [
            'compound_id'  => Compound::factory(),
            'title'        => $this->faker->sentence(4),
            'description'  => $this->faker->paragraph(),
            'category'     => $this->faker->randomElement(['plumbing', 'electrical', 'hvac', 'painting', 'cleaning', 'general']),
            'priority'     => $this->faker->randomElement(['low', 'medium', 'high']),
            'status'       => 'draft',
            'created_by'   => User::factory(),
        ];
    }

    public function requested(): static
    {
        return $this->state(['status' => 'requested']);
    }

    public function quoted(): static
    {
        return $this->state([
            'status'         => 'quoted',
            'estimated_cost' => $this->faker->randomFloat(2, 100, 5000),
        ]);
    }

    public function approved(): static
    {
        return $this->state(function () {
            $cost = $this->faker->randomFloat(2, 100, 5000);
            return [
                'status'         => 'approved',
                'estimated_cost' => $cost,
                'approved_cost'  => $cost,
                'approved_by'    => User::factory(),
                'approved_at'    => now(),
            ];
        });
    }

    public function inProgress(): static
    {
        return $this->state(function () {
            $cost = $this->faker->randomFloat(2, 100, 5000);
            return [
                'status'         => 'in_progress',
                'estimated_cost' => $cost,
                'approved_cost'  => $cost,
                'approved_by'    => User::factory(),
                'approved_at'    => now()->subDays(2),
                'started_at'     => now()->subDay(),
            ];
        });
    }

    public function completed(): static
    {
        return $this->state(function () {
            $cost = $this->faker->randomFloat(2, 100, 5000);
            return [
                'status'           => 'completed',
                'estimated_cost'   => $cost,
                'approved_cost'    => $cost,
                'actual_cost'      => $cost * $this->faker->randomFloat(2, 0.9, 1.1),
                'approved_by'      => User::factory(),
                'approved_at'      => now()->subDays(5),
                'started_at'       => now()->subDays(3),
                'completed_at'     => now(),
                'completion_notes' => 'Work completed successfully.',
            ];
        });
    }

    public function cancelled(): static
    {
        return $this->state([
            'status'       => 'cancelled',
            'cancelled_by' => User::factory(),
            'cancelled_at' => now(),
        ]);
    }
}
