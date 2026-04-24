<?php

namespace Database\Factories\Finance;

use App\Enums\PaymentSessionStatus;
use App\Models\Finance\PaymentSession;
use App\Models\Finance\UnitAccount;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/** @extends Factory<PaymentSession> */
class PaymentSessionFactory extends Factory
{
    protected $model = PaymentSession::class;

    public function definition(): array
    {
        return [
            'unit_account_id'    => UnitAccount::factory(),
            'initiated_by'       => User::factory(),
            'provider'           => 'mock',
            'provider_session_id' => 'mock_sess_' . Str::ulid(),
            'amount'             => $this->faker->randomFloat(2, 100, 5000),
            'currency'           => 'EGP',
            'status'             => PaymentSessionStatus::Pending,
            'provider_metadata'  => ['note' => 'factory'],
            'expires_at'         => now()->addHour(),
        ];
    }

    public function confirmed(): static
    {
        return $this->state(['status' => PaymentSessionStatus::Confirmed]);
    }

    public function failed(): static
    {
        return $this->state(['status' => PaymentSessionStatus::Failed]);
    }
}
