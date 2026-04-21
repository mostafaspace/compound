<?php

namespace Database\Factories\Finance;

use App\Enums\PaymentStatus;
use App\Models\Finance\PaymentSubmission;
use App\Models\Finance\UnitAccount;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PaymentSubmission>
 */
class PaymentSubmissionFactory extends Factory
{
    protected $model = PaymentSubmission::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'unit_account_id' => UnitAccount::factory(),
            'submitted_by' => User::factory(),
            'amount' => fake()->randomFloat(2, 100, 5000),
            'currency' => 'EGP',
            'method' => 'bank_transfer',
            'reference' => strtoupper(fake()->bothify('PAY-####')),
            'status' => PaymentStatus::Submitted->value,
            'notes' => null,
            'metadata' => [],
        ];
    }
}
