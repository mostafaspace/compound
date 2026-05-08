<?php

namespace Database\Factories\Finance;

use App\Enums\GatewayTransactionStatus;
use App\Models\Finance\GatewayTransaction;
use App\Models\Finance\PaymentSession;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/** @extends Factory<GatewayTransaction> */
class GatewayTransactionFactory extends Factory
{
    protected $model = GatewayTransaction::class;

    public function definition(): array
    {
        return [
            'payment_session_id' => PaymentSession::factory(),
            'provider' => 'mock',
            'provider_transaction_id' => 'mock_tx_'.Str::ulid(),
            'event_type' => 'payment.succeeded',
            'status' => GatewayTransactionStatus::Confirmed,
            'amount' => $this->faker->randomFloat(2, 100, 5000),
            'currency' => 'EGP',
            'raw_payload' => ['note' => 'factory'],
            'processed' => true,
        ];
    }

    public function unprocessed(): static
    {
        return $this->state(['processed' => false]);
    }
}
