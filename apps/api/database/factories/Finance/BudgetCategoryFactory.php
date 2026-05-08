<?php

namespace Database\Factories\Finance;

use App\Models\Finance\Budget;
use App\Models\Finance\BudgetCategory;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<BudgetCategory>
 */
class BudgetCategoryFactory extends Factory
{
    protected $model = BudgetCategory::class;

    public function definition(): array
    {
        return [
            'budget_id' => Budget::factory(),
            'name' => $this->faker->words(2, true),
            'planned_amount' => $this->faker->randomFloat(2, 1000, 50000),
            'actual_amount' => 0,
            'notes' => null,
        ];
    }
}
