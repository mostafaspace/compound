<?php

namespace App\Http\Controllers\Api\V1\Finance;

use App\Enums\LedgerEntryType;
use App\Enums\PaymentStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\Finance\UnitAccountResource;
use App\Models\Finance\LedgerEntry;
use App\Models\Finance\PaymentSubmission;
use App\Models\Finance\UnitAccount;
use App\Models\User;
use App\Services\CompoundContextService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class FinanceReportController extends Controller
{
    public function __construct(private readonly CompoundContextService $compoundContext) {}

    /**
     * Collections summary: totals, rates, and pending payment counts.
     * Scoped to the resolved compound (or all compounds for super-admin without header).
     */
    public function summary(Request $request): JsonResponse
    {
        /** @var User $actor */
        $actor = $request->user();
        $compoundIds = $this->compoundContext->resolveAccessibleCompoundIds($actor);

        $accountScope = UnitAccount::query()
            ->when($compoundIds !== null, fn ($q) => $q->whereHas(
                'unit', fn ($uq) => $uq->whereIn('compound_id', $compoundIds)
            ));

        $accountIds = $accountScope->pluck('id');

        // Total billed = sum of all debit ledger entries (charges, penalties, positive opening balances)
        $totalBilled = (float) LedgerEntry::query()
            ->whereIn('unit_account_id', $accountIds)
            ->whereIn('type', [
                LedgerEntryType::Charge->value,
                LedgerEntryType::Penalty->value,
                LedgerEntryType::OpeningBalance->value,
            ])
            ->where('amount', '>', 0)
            ->sum('amount');

        // Total collected = absolute sum of payment ledger entries (stored as negatives)
        $totalCollected = abs((float) LedgerEntry::query()
            ->whereIn('unit_account_id', $accountIds)
            ->where('type', LedgerEntryType::Payment->value)
            ->sum('amount'));

        $totalOutstanding = (float) $accountScope->clone()->where('balance', '>', 0)->sum('balance');
        $totalCreditRaw = (float) $accountScope->clone()->where('balance', '<', 0)->sum('balance');

        $unpaidCount = $accountScope->clone()->where('balance', '>', 0)->count();
        $creditCount = $accountScope->clone()->where('balance', '<', 0)->count();
        $zeroCount = $accountScope->clone()->where('balance', '=', 0)->count();
        $totalCount = $accountScope->count();

        $collectionRate = $totalBilled > 0
            ? round($totalCollected / $totalBilled * 100, 1)
            : 0.0;

        $pendingRow = PaymentSubmission::query()
            ->whereIn('unit_account_id', $accountIds)
            ->whereIn('status', [PaymentStatus::Submitted->value, PaymentStatus::UnderReview->value])
            ->selectRaw('COUNT(*) as cnt, COALESCE(SUM(amount), 0) as total')
            ->first();

        return response()->json([
            'data' => [
                'totalBilled' => number_format($totalBilled, 2, '.', ''),
                'totalCollected' => number_format($totalCollected, 2, '.', ''),
                'totalOutstanding' => number_format($totalOutstanding, 2, '.', ''),
                'totalCredit' => number_format(abs($totalCreditRaw), 2, '.', ''),
                'collectionRate' => $collectionRate,
                'unpaidUnitsCount' => $unpaidCount,
                'creditUnitsCount' => $creditCount,
                'zeroBalanceUnitsCount' => $zeroCount,
                'totalAccountsCount' => $totalCount,
                'pendingPaymentsCount' => (int) ($pendingRow->cnt ?? 0),
                'pendingPaymentsAmount' => number_format((float) ($pendingRow->total ?? 0), 2, '.', ''),
            ],
        ]);
    }

    /**
     * Filterable unit accounts list for the collections report.
     */
    public function accounts(Request $request): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'balanceStatus' => ['nullable', 'string', 'in:all,positive,zero,credit'],
            'buildingId' => ['nullable', 'string'],
            'currency' => ['nullable', 'string', 'max:3'],
        ]);

        $status = $validated['balanceStatus'] ?? 'all';

        /** @var User $actor */
        $actor = $request->user();
        $compoundIds = $this->compoundContext->resolveAccessibleCompoundIds($actor);

        $accounts = UnitAccount::query()
            ->with(['unit.building', 'unit.compound'])
            ->when($compoundIds !== null, fn ($q) => $q->whereHas(
                'unit', fn ($uq) => $uq->whereIn('compound_id', $compoundIds)
            ))
            ->when($status === 'positive', fn ($q) => $q->where('balance', '>', 0))
            ->when($status === 'zero', fn ($q) => $q->where('balance', '=', 0))
            ->when($status === 'credit', fn ($q) => $q->where('balance', '<', 0))
            ->when(
                $validated['buildingId'] ?? null,
                fn ($q, $id) => $q->whereHas('unit.building', fn ($bq) => $bq->where('buildings.id', $id))
            )
            ->when(
                $validated['currency'] ?? null,
                fn ($q, $currency) => $q->where('currency', strtoupper($currency))
            )
            ->orderByDesc('balance')
            ->paginate(50);

        return UnitAccountResource::collection($accounts);
    }

    /**
     * Approved payments grouped by payment method.
     */
    public function paymentMethodBreakdown(Request $request): JsonResponse
    {
        /** @var User $actor */
        $actor = $request->user();
        $compoundIds = $this->compoundContext->resolveAccessibleCompoundIds($actor);

        $accountIds = UnitAccount::query()
            ->when($compoundIds !== null, fn ($q) => $q->whereHas(
                'unit', fn ($uq) => $uq->whereIn('compound_id', $compoundIds)
            ))
            ->pluck('id');

        $rows = PaymentSubmission::query()
            ->whereIn('unit_account_id', $accountIds)
            ->where('status', PaymentStatus::Approved->value)
            ->selectRaw('method, COUNT(*) as count, COALESCE(SUM(amount), 0) as total')
            ->groupBy('method')
            ->orderByDesc('total')
            ->get()
            ->map(fn ($row) => [
                'method' => $row->method,
                'count' => (int) $row->count,
                'total' => number_format((float) $row->total, 2, '.', ''),
            ]);

        return response()->json(['data' => $rows]);
    }
}
