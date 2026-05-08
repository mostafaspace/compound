<?php

namespace App\Services;

use App\Contracts\PaymentGatewayInterface;
use App\Enums\GatewayTransactionStatus;
use App\Enums\LedgerEntryType;
use App\Enums\PaymentSessionStatus;
use App\Enums\PaymentStatus;
use App\Models\Finance\GatewayTransaction;
use App\Models\Finance\PaymentSession;
use App\Models\Finance\PaymentSubmission;
use App\Models\Finance\UnitAccount;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class OnlinePaymentService
{
    public function __construct(
        private readonly FinanceService $financeService,
    ) {}

    // ── Session creation ──────────────────────────────────────────────────────

    public function createSession(
        UnitAccount $account,
        User $initiator,
        PaymentGatewayInterface $gateway,
        float $amount,
        string $currency,
        ?string $returnUrl = null,
    ): PaymentSession {
        return DB::transaction(function () use ($account, $initiator, $gateway, $amount, $currency, $returnUrl): PaymentSession {
            $session = PaymentSession::query()->create([
                'unit_account_id' => $account->id,
                'initiated_by' => $initiator->id,
                'provider' => $gateway->providerName(),
                'amount' => $amount,
                'currency' => strtoupper($currency),
                'status' => PaymentSessionStatus::Pending,
                'return_url' => $returnUrl,
                'expires_at' => now()->addHour(),
            ]);

            /** @var PaymentSession $session */
            $providerData = $gateway->createSession($session);

            $session->forceFill([
                'provider_session_id' => $providerData['provider_session_id'],
                'provider_metadata' => $providerData['metadata'] ?? [],
                'expires_at' => $providerData['expires_at'] ? now()->parse($providerData['expires_at']) : $session->expires_at,
            ])->save();

            return $session->refresh();
        });
    }

    // ── Webhook processing ────────────────────────────────────────────────────

    public function handleWebhook(Request $request, PaymentGatewayInterface $gateway): GatewayTransaction
    {
        $gateway->validateWebhookSignature($request);

        $event = $gateway->parseWebhookEvent($request);

        // Idempotency: find or create the gateway transaction record
        $existing = GatewayTransaction::query()
            ->where('provider', $gateway->providerName())
            ->where('provider_transaction_id', $event['provider_transaction_id'])
            ->first();

        if ($existing?->processed) {
            Log::info('Webhook already processed', ['transaction_id' => $event['provider_transaction_id']]);

            return $existing;
        }

        // Resolve session
        $session = $event['provider_session_id']
            ? PaymentSession::query()->where('provider_session_id', $event['provider_session_id'])->first()
            : null;

        $tx = $existing ?? GatewayTransaction::query()->create([
            'payment_session_id' => $session?->id,
            'provider' => $gateway->providerName(),
            'provider_transaction_id' => $event['provider_transaction_id'],
            'event_type' => $event['event_type'],
            'status' => $event['status'],
            'amount' => $event['amount'],
            'currency' => $event['currency'],
            'raw_payload' => $event['raw'],
            'processed' => false,
        ]);

        try {
            DB::transaction(function () use ($tx, $session, $event): void {
                match ($event['status']) {
                    'confirmed' => $this->reconcilePayment($tx, $session, $event),
                    'refunded' => $this->processRefund($tx, $session, $event),
                    default => $this->markSessionFailed($session),
                };

                $tx->forceFill(['processed' => true, 'processing_error' => null])->save();
            });
        } catch (\Throwable $e) {
            $tx->forceFill(['processing_error' => $e->getMessage()])->save();
            Log::error('Webhook processing failed', [
                'transaction_id' => $tx->id,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }

        return $tx->refresh();
    }

    private function reconcilePayment(GatewayTransaction $tx, ?PaymentSession $session, array $event): void
    {
        if (! $session) {
            return;
        }

        // Update session status
        $session->forceFill(['status' => PaymentSessionStatus::Confirmed])->save();

        // Create PaymentSubmission (auto-approved since gateway confirmed)
        $submission = PaymentSubmission::query()->create([
            'unit_account_id' => $session->unit_account_id,
            'submitted_by' => $session->initiated_by,
            'amount' => $tx->amount,
            'currency' => $tx->currency,
            'method' => 'online',
            'reference' => $tx->provider.'_'.$tx->provider_transaction_id,
            'payment_date' => now()->toDateString(),
            'status' => PaymentStatus::Approved,
            'notes' => 'Auto-reconciled from '.$tx->provider.' payment',
            'metadata' => ['gateway_transaction_id' => $tx->id],
            'reviewed_at' => now(),
        ]);

        // Post ledger entry
        $account = $session->unitAccount;
        $this->financeService->postLedgerEntry(
            account: $account,
            type: LedgerEntryType::Payment,
            amount: -1 * (float) $tx->amount,
            description: 'Online payment via '.$tx->provider,
            referenceType: $submission::class,
            referenceId: $submission->id,
        );

        // Link transaction to submission
        $tx->forceFill(['payment_submission_id' => $submission->id])->save();
    }

    private function processRefund(GatewayTransaction $tx, ?PaymentSession $session, array $event): void
    {
        if ($session) {
            $session->forceFill(['status' => PaymentSessionStatus::Refunded])->save();
        }

        // Find linked submission and reverse the ledger entry
        if ($tx->payment_submission_id) {
            $submission = PaymentSubmission::query()->find($tx->payment_submission_id);
            if ($submission) {
                $submission->forceFill(['status' => PaymentStatus::Refunded])->save();

                $account = PaymentSession::query()->find($tx->payment_session_id)?->unitAccount;
                if ($account) {
                    $this->financeService->postLedgerEntry(
                        account: $account,
                        type: LedgerEntryType::Refund,
                        amount: (float) $tx->amount,
                        description: 'Refund for online payment via '.$tx->provider,
                        referenceType: $submission::class,
                        referenceId: $submission->id,
                    );
                }
            }
        }
    }

    private function markSessionFailed(?PaymentSession $session): void
    {
        $session?->forceFill(['status' => PaymentSessionStatus::Failed])->save();
    }

    // ── Manual refund ─────────────────────────────────────────────────────────

    public function issueRefund(
        GatewayTransaction $tx,
        PaymentGatewayInterface $gateway,
        float $amount,
    ): GatewayTransaction {
        if ($tx->status !== GatewayTransactionStatus::Confirmed) {
            abort(422, 'Only confirmed transactions can be refunded.');
        }

        $refundData = $gateway->refund($tx->provider_transaction_id, $amount, $tx->currency);

        $refundTx = GatewayTransaction::query()->create([
            'payment_session_id' => $tx->payment_session_id,
            'provider' => $tx->provider,
            'provider_transaction_id' => $refundData['provider_refund_id'],
            'event_type' => 'refund.created',
            'status' => GatewayTransactionStatus::Refunded,
            'amount' => $amount,
            'currency' => $tx->currency,
            'raw_payload' => $refundData,
            'processed' => false,
        ]);

        DB::transaction(function () use ($refundTx): void {
            $session = $refundTx->paymentSession;
            $this->processRefund($refundTx, $session, []);
            $refundTx->forceFill(['processed' => true])->save();
        });

        return $refundTx->refresh();
    }
}
