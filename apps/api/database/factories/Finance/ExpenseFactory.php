<?php

namespace Database\Factories\Finance;

use App\Enums\ExpenseStatus;
use App\Models\Finance\Expense;
use App\Models\Property\Compound;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Expense>
 */
class ExpenseFactory extends Factory
{
    protected $model = Expense::class;

    public function definition(): array
    {
        return [
            'compound_id'        => Compound::factory(),
            'budget_category_id' => null,
            'vendor_id'          => null,
            'title'              => $this->faker->sentence(4),
            'description'        => $this->faker->optional()->paragraph(),
            'amount'             => $this->faker->randomFloat(2, 100, 50000),
            'currency'           => 'EGP',
            'expense_date'       => $this->faker->dateTimeBetween('-1 year', 'now')->format('Y-m-d'),
            'status'             => ExpenseStatus::PendingApproval->value,
            'receipt_path'       => null,
            'submitted_by'       => User::factory(),
            'approved_by'        => null,
            'approved_at'        => null,
            'rejection_reason'   => null,
        ];
    }

    public function approved(): static
    {
        return $this->state(fn (array $attr) => [
            'status'      => ExpenseStatus::Approved->value,
            'approved_by' => User::factory(),
            'approved_at' => now(),
        ]);
    }

    public function rejected(): static
    {
        return $this->state(fn (array $attr) => [
            'status'           => ExpenseStatus::Rejected->value,
            'rejection_reason' => 'Budget exceeded',
        ]);
    }
}
