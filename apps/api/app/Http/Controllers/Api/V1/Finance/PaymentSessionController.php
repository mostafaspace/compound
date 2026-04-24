<?php

namespace App\Http\Controllers\Api\V1\Finance;

use App\Http\Controllers\Controller;
use App\Http\Resources\Finance\GatewayTransactionResource;
use App\Http\Resources\Finance\PaymentSessionResource;
use App\Models\CompoundSetting;
use App\Models\Finance\GatewayTransaction;
use App\Models\Finance\PaymentSession;
use App\Models\Finance\UnitAccount;
use App\Services\CompoundContextService;
use App\Services\Gateways\MockPaymentGateway;
use App\Services\OnlinePaymentService;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\Response;

class PaymentSessionController extends Controller
{
    public function __construct(
        private readonly OnlinePaymentService $onlinePaymentService,
        private readonly CompoundContextService $compoundContext,
        private readonly AuditLogger $auditLogger,
    ) {}

    // ── Admin: list all sessions ──────────────────────────────────────────────

    public function index(Request $request): AnonymousResourceCollection
    {
        $compoundId = $this->compoundContext->resolve($request);

        $sessions = PaymentSession::query()
            ->with(['unitAccount.unit', 'initiatedBy'])
            ->when($compoundId, fn ($q) => $q->whereHas(
                'unitAccount.unit',
                fn ($u) => $u->where('compound_id', $compoundId),
            ))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->latest()
            ->paginate();

        return PaymentSessionResource::collection($sessions);
    }

    // ── Admin: list gateway transactions ────────────────────────────────────

    public function transactions(Request $request): AnonymousResourceCollection
    {
        $compoundId = $this->compoundContext->resolve($request);

        $txs = GatewayTransaction::query()
            ->with(['paymentSession.unitAccount.unit'])
            ->when($compoundId, fn ($q) => $q->whereHas(
                'paymentSession.unitAccount.unit',
                fn ($u) => $u->where('compound_id', $compoundId),
            ))
            ->latest()
            ->paginate();

        return GatewayTransactionResource::collection($txs);
    }

    // ── Resident: initiate a payment session ─────────────────────────────────

    public function store(Request $request): PaymentSessionResource
    {
        $validated = $request->validate([
            'unit_account_id' => ['required', 'string', 'exists:unit_accounts,id'],
            'amount'          => ['required', 'numeric', 'min:1'],
            'currency'        => ['sometimes', 'string', 'size:3'],
            'return_url'      => ['sometimes', 'nullable', 'url'],
        ]);

        $account = UnitAccount::query()->findOrFail($validated['unit_account_id']);

        // Ensure resident owns the account
        $this->ensureAccountAccess($request, $account);

        // Only mock gateway supported for now; real providers injected via config
        $gateway = new MockPaymentGateway;

        // Check compound has online payments enabled
        $this->ensureOnlinePaymentsEnabled($account);

        $session = $this->onlinePaymentService->createSession(
            account: $account,
            initiator: $request->user(),
            gateway: $gateway,
            amount: (float) $validated['amount'],
            currency: $validated['currency'] ?? $account->currency,
            returnUrl: $validated['return_url'] ?? null,
        );

        $this->auditLogger->record('finance.payment_session_created', actor: $request->user(), request: $request, metadata: [
            'payment_session_id' => $session->id,
            'unit_account_id'    => $account->id,
            'amount'             => $session->amount,
            'provider'           => $session->provider,
        ]);

        return PaymentSessionResource::make($session->load('unitAccount.unit'));
    }

    // ── Admin: issue refund ───────────────────────────────────────────────────

    public function refund(Request $request, GatewayTransaction $gatewayTransaction): JsonResponse
    {
        $this->ensureTransactionCompoundAccess($request, $gatewayTransaction);

        $validated = $request->validate([
            'amount' => ['sometimes', 'numeric', 'min:0.01'],
        ]);

        $amount = $validated['amount'] ?? (float) $gatewayTransaction->amount;

        if ($amount > (float) $gatewayTransaction->amount) {
            abort(422, 'Refund amount cannot exceed the original transaction amount.');
        }

        $gateway = new MockPaymentGateway;

        $refundTx = $this->onlinePaymentService->issueRefund($gatewayTransaction, $gateway, $amount);

        $this->auditLogger->record('finance.payment_refunded', actor: $request->user(), request: $request, metadata: [
            'original_transaction_id' => $gatewayTransaction->id,
            'refund_transaction_id'   => $refundTx->id,
            'amount'                  => $amount,
        ]);

        /** @var JsonResponse $resp */
        $resp = GatewayTransactionResource::make($refundTx)->response();
        $resp->setStatusCode(201);
        return $resp;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function ensureAccountAccess(Request $request, UnitAccount $account): void
    {
        $user = $request->user();
        $roles = ['super_admin', 'compound_admin', 'board_member', 'finance_reviewer', 'support_agent'];
        if (in_array($user->role?->value, $roles, true)) {
            return;
        }
        // Resident: must be an active (not ended) member of the unit
        $isMember = $account->unit?->memberships()
            ->where('user_id', $user->id)
            ->where(function ($q): void {
                $q->whereNull('ends_at')->orWhereDate('ends_at', '>=', now()->toDateString());
            })
            ->exists();

        if (! $isMember) {
            abort(Response::HTTP_FORBIDDEN, 'You do not have access to this account.');
        }
    }

    private function ensureTransactionCompoundAccess(Request $request, GatewayTransaction $tx): void
    {
        $compoundId = $this->compoundContext->resolve($request);
        if (! $compoundId) {
            return;
        }
        $txCompound = $tx->paymentSession?->unitAccount?->unit?->compound_id;
        if ($txCompound && $txCompound !== $compoundId) {
            abort(Response::HTTP_FORBIDDEN);
        }
    }

    private function ensureOnlinePaymentsEnabled(UnitAccount $account): void
    {
        // Check compound setting online_payments.enabled (defaults true if not set)
        $compoundId = $account->unit?->compound_id;
        if (! $compoundId) {
            return;
        }

        $setting = CompoundSetting::query()
            ->where('compound_id', $compoundId)
            ->where('namespace', 'online_payments')
            ->where('key', 'enabled')
            ->value('value');

        if ($setting !== null && ! ($setting['value'] ?? true)) {
            abort(422, 'Online payments are not enabled for this compound.');
        }
    }
}
