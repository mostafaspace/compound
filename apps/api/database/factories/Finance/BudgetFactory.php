<?php

namespace Database\Factories\Finance;

use App\Enums\BudgetPeriodType;
use App\Enums\BudgetStatus;
use App\Models\Finance\Budget;
use App\Models\Property\Compound;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Budget>
 */
class BudgetFactory extends Factory
{
    protected $model = Budget::class;

    public function definition(): array
    {
        return [
            'compound_id'  => Compound::factory(),
            'name'         => 'Budget ' . $this->faker->year(),
            'period_type'  => BudgetPeriodType::Annual->value,
            'period_year'  => (int) date('Y'),
            'period_month' => null,
            'status'       => BudgetStatus::Draft->value,
            'notes'        => null,
            'created_by'   => User::factory(),
            'closed_at'    => null,
        ];
    }

    public function active(): static
    {
        return $this->state(['status' => BudgetStatus::Active->value]);
    }

    public function closed(): static
    {
        return $this->state(['status' => BudgetStatus::Closed->value, 'closed_at' => now()]);
    }
}
