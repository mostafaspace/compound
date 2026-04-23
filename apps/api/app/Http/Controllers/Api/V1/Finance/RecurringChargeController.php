<?php

namespace App\Http\Controllers\Api\V1\Finance;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Finance\StoreRecurringChargeRequest;
use App\Http\Resources\Finance\RecurringChargeResource;
use App\Models\Finance\RecurringCharge;
use App\Models\User;
use App\Services\FinanceService;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\Response;

class RecurringChargeController extends Controller
{
    public function __construct(
        private readonly FinanceService $financeService,
        private readonly AuditLogger $auditLogger,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        /** @var User $actor */
        $actor = $request->user();
        $requestedCompoundId = $request->filled('compound_id') ? $request->string('compound_id')->toString() : null;

        if (filled($actor->compound_id) && $requestedCompoundId !== null && $requestedCompoundId !== $actor->compound_id) {
            abort(Response::HTTP_FORBIDDEN);
        }

        $compoundId = filled($actor->compound_id) ? $actor->compound_id : $requestedCompoundId;

        $charges = RecurringCharge::query()
            ->with('chargeType')
            ->when($compoundId, fn ($query) => $query->where('compound_id', $compoundId))
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

        if (filled($actor->compound_id)) {
            abort_if($requestedCompoundId !== $actor->compound_id, Response::HTTP_FORBIDDEN);
            $validated['compound_id'] = $actor->compound_id;
        } else {
            abort_if(! filled($requestedCompoundId), Response::HTTP_UNPROCESSABLE_ENTITY);
        }

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
        if ($actor->role === UserRole::SuperAdmin || ! filled($actor->compound_id)) {
            return;
        }

        abort_if($actor->compound_id !== $compoundId, Response::HTTP_FORBIDDEN);
    }
}
