<?php

namespace App\Http\Controllers\Api\V1\Finance;

use App\Http\Controllers\Controller;
use App\Http\Requests\Finance\ReviewPaymentSubmissionRequest;
use App\Http\Resources\Finance\PaymentSubmissionResource;
use App\Models\Finance\PaymentSubmission;
use App\Models\User;
use App\Services\CompoundContextService;
use App\Services\FinanceService;
use App\Support\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\Response;

class PaymentSubmissionController extends Controller
{
    public function __construct(
        private readonly FinanceService $financeService,
        private readonly CompoundContextService $compoundContext,
        private readonly AuditLogger $auditLogger,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        /** @var User $actor */
        $actor = $request->user();
        $compoundIds = $this->compoundContext->resolveAccessibleCompoundIds($actor);

        $payments = PaymentSubmission::query()
            ->with(['unitAccount.unit.building', 'submitter', 'reviewer'])
            ->when($compoundIds !== null, fn ($query) => $query->whereHas(
                'unitAccount.unit',
                fn ($unitQuery) => $unitQuery->whereIn('compound_id', $compoundIds),
            ))
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->string('status')->toString()))
            ->latest()
            ->paginate();

        return PaymentSubmissionResource::collection($payments);
    }

    public function mine(Request $request): AnonymousResourceCollection
    {
        /** @var User $user */
        $user = $request->user();

        $payments = PaymentSubmission::query()
            ->with(['unitAccount.unit.building', 'reviewer'])
            ->where('submitted_by', $user->id)
            ->latest()
            ->paginate();

        return PaymentSubmissionResource::collection($payments);
    }

    public function approve(ReviewPaymentSubmissionRequest $request, PaymentSubmission $paymentSubmission): PaymentSubmissionResource
    {
        /** @var User $actor */
        $actor = $request->user();
        $validated = $request->validated();
        $this->ensurePaymentCompoundAccess($request, $paymentSubmission);

        $payment = $this->financeService->approvePayment(
            payment: $paymentSubmission,
            reviewer: $actor,
            description: $validated['description'] ?? null,
        );

        $this->auditLogger->record('finance.payment_approved', actor: $actor, request: $request, metadata: [
            'payment_submission_id' => $payment->id,
            'unit_account_id' => $payment->unit_account_id,
            'amount' => $payment->amount,
        ]);

        return PaymentSubmissionResource::make($payment);
    }

    public function reject(ReviewPaymentSubmissionRequest $request, PaymentSubmission $paymentSubmission): PaymentSubmissionResource
    {
        /** @var User $actor */
        $actor = $request->user();
        $validated = $request->validated();
        $this->ensurePaymentCompoundAccess($request, $paymentSubmission);

        abort_unless(filled($validated['reason'] ?? null), Response::HTTP_UNPROCESSABLE_ENTITY, 'A rejection reason is required.');

        $payment = $this->financeService->rejectPayment(
            payment: $paymentSubmission,
            reviewer: $actor,
            reason: $validated['reason'],
        );

        $this->auditLogger->record('finance.payment_rejected', actor: $actor, request: $request, metadata: [
            'payment_submission_id' => $payment->id,
            'unit_account_id' => $payment->unit_account_id,
            'reason' => $payment->rejection_reason,
        ]);

        return PaymentSubmissionResource::make($payment);
    }

    public function requestCorrection(Request $request, PaymentSubmission $paymentSubmission): PaymentSubmissionResource
    {
        /** @var User $actor */
        $actor = $request->user();
        $this->ensurePaymentCompoundAccess($request, $paymentSubmission);

        $validated = $request->validate([
            'note' => ['required', 'string', 'max:1000'],
        ]);

        $payment = $this->financeService->requestPaymentCorrection(
            payment: $paymentSubmission,
            reviewer: $actor,
            note: $validated['note'],
        );

        $this->auditLogger->record('finance.payment_correction_requested', actor: $actor, request: $request, metadata: [
            'payment_submission_id' => $payment->id,
            'unit_account_id' => $payment->unit_account_id,
        ]);

        return PaymentSubmissionResource::make($payment);
    }

    private function ensurePaymentCompoundAccess(Request $request, PaymentSubmission $payment): void
    {
        $payment->loadMissing('unitAccount.unit');

        if ($payment->unitAccount?->unit?->compound_id === null) {
            abort(Response::HTTP_FORBIDDEN);
        }

        /** @var User $actor */
        $actor = $request->user();
        $this->compoundContext->ensureUserCanAccessCompound($actor, $payment->unitAccount->unit->compound_id);
    }
}
