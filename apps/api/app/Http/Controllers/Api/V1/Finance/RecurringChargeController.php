<?php

namespace App\Http\Controllers\Api\V1\Finance;

use App\Http\Controllers\Controller;
use App\Http\Requests\Finance\StoreRecurringChargeRequest;
use App\Http\Resources\Finance\RecurringChargeResource;
use App\Models\Finance\RecurringCharge;
use App\Models\User;
use App\Services\CompoundContextService;
use App\Services\FinanceService;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\Response;

class RecurringChargeController extends Controller
{
    public function __construct(
        private readonly CompoundContextService $compoundContext,
        private readonly FinanceService $financeService,
        private readonly AuditLogger $auditLogger,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        /** @var User $actor */
        $actor = $request->user();
        $requestedCompoundId = $request->filled('compound_id') ? $request->string('compound_id')->toString() : null;
        $compoundIds = $this->compoundContext->resolveRequestedAccessibleCompoundIds($actor, $requestedCompoundId);

        $charges = RecurringCharge::query()
            ->with('chargeType')
            ->when($compoundIds !== null, fn ($query) => $query->whereIn('compound_id', $compoundIds))
            ->when(
                $request->filled('is_active'),
                fn ($query) => $query->where('is_active', filter_var($request->input('is_active'), FILTER_VALIDATE_BOOLEAN)),
            )
            ->latest()
            ->paginate();

        return RecurringChargeResource::collection($charges);
    }

    public function store(StoreRecurringChargeRequest $request): JsonResponse
    {
        /** @var User $actor */
        $actor = $request->user();
        $validated = $request->validated();
        $requestedCompoundId = $validated['compound_id'] ?? null;
        $compoundId = $this->compoundContext->resolveRequestedAccessibleCompoundId($actor, $requestedCompoundId);
        abort_if(! filled($compoundId), Response::HTTP_UNPROCESSABLE_ENTITY);
        $validated['compound_id'] = $compoundId;

        $charge = $this->financeService->createRecurringCharge(
            data: $validated,
            actor: $actor,
        );

        return RecurringChargeResource::make($charge->load('chargeType'))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(Request $request, RecurringCharge $recurringCharge): RecurringChargeResource
    {
        $this->ensureFinanceCompoundAccess($request->user(), $recurringCharge->compound_id);

        return RecurringChargeResource::make($recurringCharge->load('chargeType'));
    }

    public function deactivate(Request $request, RecurringCharge $recurringCharge): RecurringChargeResource
    {
        /** @var User $actor */
        $actor = $request->user();
        $this->ensureFinanceCompoundAccess($actor, $recurringCharge->compound_id);

        $charge = $this->financeService->deactivateRecurringCharge(
            charge: $recurringCharge,
            actor: $actor,
        );

        return RecurringChargeResource::make($charge->load('chargeType'));
    }

    private function ensureFinanceCompoundAccess(User $actor, string $compoundId): void
    {
        $this->compoundContext->ensureUserCanAccessCompound($actor, $compoundId);
    }
}
