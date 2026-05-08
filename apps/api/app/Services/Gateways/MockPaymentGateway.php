<?php

namespace App\Services\Gateways;

use App\Contracts\PaymentGatewayInterface;
use App\Models\Finance\PaymentSession;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * Mock gateway for development and automated testing.
 *
 * Creating a session returns a fake session ID.
 * The test helper endpoint POST /api/v1/test/payments/confirm
 * triggers a "payment.succeeded" webhook back to the app.
 */
class MockPaymentGateway implements PaymentGatewayInterface
{
    public function providerName(): string
    {
        return 'mock';
    }

    public function createSession(PaymentSession $session): array
    {
        $fakeSessionId = 'mock_sess_'.Str::ulid();

        return [
            'provider_session_id' => $fakeSessionId,
            'redirect_url' => null,
            'expires_at' => now()->addHour()->toIso8601String(),
            'metadata' => ['note' => 'mock_gateway'],
        ];
    }

    public function validateWebhookSignature(Request $request): void
    {
        // Mock gateway: accept any request from localhost / test environment.
        // In real gateways this would verify an HMAC header.
    }

    public function parseWebhookEvent(Request $request): array
    {
        $payload = $request->json()->all();

        return [
            'event_type' => $payload['event_type'] ?? 'payment.succeeded',
            'provider_transaction_id' => $payload['transaction_id'] ?? 'mock_tx_'.Str::ulid(),
            'status' => $payload['status'] ?? 'confirmed',
            'amount' => (float) ($payload['amount'] ?? 0),
            'currency' => $payload['currency'] ?? 'EGP',
            'provider_session_id' => $payload['session_id'] ?? null,
            'raw' => $payload,
        ];
    }

    public function refund(string $providerTransactionId, float $amount, string $currency): array
    {
        return [
            'provider_refund_id' => 'mock_refund_'.Str::ulid(),
            'status' => 'refunded',
        ];
    }
}
