<?php

namespace App\Http\Controllers\Api\V1\Finance;

use App\Enums\LedgerEntryType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Finance\StoreLedgerEntryRequest;
use App\Http\Requests\Finance\StorePaymentSubmissionRequest;
use App\Http\Requests\Finance\StoreUnitAccountRequest;
use App\Http\Resources\Finance\LedgerEntryResource;
use App\Http\Resources\Finance\PaymentSubmissionResource;
use App\Http\Resources\Finance\UnitAccountResource;
use App\Models\Finance\UnitAccount;
use App\Models\Property\Unit;
use App\Models\User;
use App\Services\FinanceService;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\Response;

class UnitAccountController extends Controller
{
    public function __construct(
        private readonly FinanceService $financeService,
        private readonly AuditLogger $auditLogger,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $accounts = UnitAccount::query()
            ->with(['unit.building', 'unit.compound'])
            ->when($request->filled('unitId'), fn ($query) => $query->where('unit_id', $request->string('unitId')->toString()))
            ->latest()
            ->paginate();

        return UnitAccountResource::collection($accounts);
    }

    public function mine(Request $request): AnonymousResourceCollection
    {
        /** @var User $user */
        $user = $request->user();

        $accounts = UnitAccount::query()
            ->with(['unit.building', 'unit.compound'])
            ->whereHas('unit.memberships', function ($query) use ($user): void {
                $query->where('user_id', $user->id)
                    ->where('verification_status', 'verified')
                    ->where(function ($query): void {
                        $query->whereNull('ends_at')->orWhere('ends_at', '>=', now()->toDateString());
                    });
            })
            ->latest()
            ->paginate();

        return UnitAccountResource::collection($accounts);
    }

    public function store(StoreUnitAccountRequest $request): JsonResponse
    {
        /** @var User $actor */
        $actor = $request->user();
        $validated = $request->validated();
        $unit = Unit::query()->findOrFail($validated['unitId']);

        $account = $this->financeService->createAccount(
            unit: $unit,
            currency: $validated['currency'] ?? $unit->compound?->currency ?? 'EGP',
            openingBalance: isset($validated['openingBalance']) ? (float) $validated['openingBalance'] : null,
            actor: $actor,
            description: $validated['description'] ?? null,
        );

        $this->auditLogger->record('finance.unit_account_created', actor: $actor, request: $request, metadata: [
            'unit_account_id' => $account->id,
            'unit_id' => $account->unit_id,
            'opening_balance' => $validated['openingBalance'] ?? null,
        ]);

        return UnitAccountResource::make($account->load(['unit.building', 'unit.compound', 'ledgerEntries']))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(Request $request, UnitAccount $unitAccount): UnitAccountResource
    {
        /** @var User $user */
        $user = $request->user();

        if ($this->isResident($user)) {
            abort_unless($this->financeService->userCanAccessAccount($user, $unitAccount), Response::HTTP_FORBIDDEN);
        }

        return UnitAccountResource::make(
            $unitAccount->load(['unit.building', 'unit.compound', 'ledgerEntries.creator', 'paymentSubmissions.submitter', 'paymentSubmissions.reviewer'])
        );
    }

    public function storeLedgerEntry(StoreLedgerEntryRequest $request, UnitAccount $unitAccount): JsonResponse
    {
        /** @var User $actor */
        $actor = $request->user();
        $validated = $request->validated();

        abort_if($validated['type'] === LedgerEntryType::Payment->value, Response::HTTP_UNPROCESSABLE_ENTITY, 'Use payment approval to post payment entries.');

        $entry = $this->financeService->postLedgerEntry(
            account: $unitAccount,
            type: LedgerEntryType::from($validated['type']),
            amount: (float) $validated['amount'],
            description: $validated['description'],
            actor: $actor,
        );

        $this->auditLogger->record('finance.ledger_entry_created', actor: $actor, request: $request, metadata: [
            'unit_account_id' => $unitAccount->id,
            'ledger_entry_id' => $entry->id,
            'type' => $entry->type->value,
            'amount' => $entry->amount,
        ]);

        return LedgerEntryResource::make($entry->load('creator'))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function submitPayment(StorePaymentSubmissionRequest $request, UnitAccount $unitAccount): JsonResponse
    {
        /** @var User $actor */
        $actor = $request->user();

        if ($this->isResident($actor)) {
            abort_unless($this->financeService->userCanAccessAccount($actor, $unitAccount), Response::HTTP_FORBIDDEN);
        }

        $validated = $request->validated();
        $payment = $this->financeService->submitPayment(
            account: $unitAccount,
            submitter: $actor,
            amount: (float) $validated['amount'],
            currency: $validated['currency'] ?? $unitAccount->currency,
            method: $validated['method'],
            reference: $validated['reference'] ?? null,
            notes: $validated['notes'] ?? null,
            proof: $request->file('proof'),
        );

        $this->auditLogger->record('finance.payment_submitted', actor: $actor, request: $request, metadata: [
            'unit_account_id' => $unitAccount->id,
            'payment_submission_id' => $payment->id,
            'amount' => $payment->amount,
            'currency' => $payment->currency,
            'has_proof' => filled($payment->proof_path),
        ]);

        return PaymentSubmissionResource::make($payment->load(['unitAccount.unit', 'submitter']))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    private function isResident(User $user): bool
    {
        return str_starts_with($user->role->value, 'resident_');
    }
}
