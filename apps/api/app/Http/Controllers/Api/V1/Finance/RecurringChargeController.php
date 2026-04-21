<?php

namespace App\Http\Controllers\Api\V1\Finance;

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
        $charges = RecurringCharge::query()
            ->with('chargeType')
            ->when(
                $request->filled('compound_id'),
                fn ($query) => $query->where('compound_id', $request->string('compound_id')->toString()),
            )
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

        $charge = $this->financeService->createRecurringCharge(
            data: $request->validated(),
            actor: $actor,
        );

        return RecurringChargeResource::make($charge->load('chargeType'))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(RecurringCharge $recurringCharge): RecurringChargeResource
    {
        return RecurringChargeResource::make($recurringCharge->load('chargeType'));
    }

    public function deactivate(Request $request, RecurringCharge $recurringCharge): RecurringChargeResource
    {
        /** @var User $actor */
        $actor = $request->user();

        $charge = $this->financeService->deactivateRecurringCharge(
            charge: $recurringCharge,
            actor: $actor,
        );

        return RecurringChargeResource::make($charge->load('chargeType'));
    }
}
