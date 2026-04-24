<?php

namespace App\Contracts;

use App\Models\Finance\PaymentSession;
use Illuminate\Http\Request;

/**
 * Adapter boundary for pluggable payment providers.
 *
 * Each concrete implementation handles one provider (Mock, Stripe, PayMob…).
 * Core finance logic must never depend on a concrete gateway class directly.
 */
interface PaymentGatewayInterface
{
    /**
     * Return the provider slug stored on the session (e.g. "mock", "stripe").
     */
    public function providerName(): string;

    /**
     * Create a payment session with the provider and return session metadata.
     *
     * @return array{provider_session_id: string, redirect_url: string|null, expires_at: string|null, metadata: array<string, mixed>}
     */
    public function createSession(PaymentSession $session): array;

    /**
     * Validate the incoming webhook request signature.
     * Throw an exception or abort(400) if invalid.
     */
    public function validateWebhookSignature(Request $request): void;

    /**
     * Parse a webhook payload into a normalised event.
     *
     * @return array{event_type: string, provider_transaction_id: string, status: string, amount: float, currency: string, provider_session_id: string|null, raw: array<string, mixed>}
     */
    public function parseWebhookEvent(Request $request): array;

    /**
     * Issue a refund for the given amount against a confirmed transaction.
     *
     * @return array{provider_refund_id: string, status: string}
     */
    public function refund(string $providerTransactionId, float $amount, string $currency): array;
}
