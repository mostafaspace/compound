<?php

namespace App\Http\Controllers\Api\V1\Finance;

use App\Http\Controllers\Controller;
use App\Http\Requests\Finance\StoreChargeTypeRequest;
use App\Http\Requests\Finance\UpdateChargeTypeRequest;
use App\Http\Resources\Finance\ChargeTypeResource;
use App\Models\Finance\ChargeType;
use App\Models\User;
use App\Services\FinanceService;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\Response;

class ChargeTypeController extends Controller
{
    public function __construct(
        private readonly FinanceService $financeService,
        private readonly AuditLogger $auditLogger,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $chargeTypes = ChargeType::query()
            ->when(
                $request->filled('search'),
                fn ($query) => $query->where('name', 'like', '%'.$request->string('search').'%'),
            )
            ->latest()
            ->paginate();

        return ChargeTypeResource::collection($chargeTypes);
    }

    public function store(StoreChargeTypeRequest $request): JsonResponse
    {
        /** @var User $actor */
        $actor = $request->user();

        abort_unless($actor->isEffectiveSuperAdmin(), Response::HTTP_FORBIDDEN, 'Only super-admins can create global charge types.');

        $chargeType = $this->financeService->createChargeType(
            data: $request->validated(),
            actor: $actor,
        );

        return ChargeTypeResource::make($chargeType)
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(ChargeType $chargeType): ChargeTypeResource
    {
        return ChargeTypeResource::make($chargeType);
    }

    public function update(UpdateChargeTypeRequest $request, ChargeType $chargeType): ChargeTypeResource
    {
        /** @var User $actor */
        $actor = $request->user();

        abort_unless($actor->isEffectiveSuperAdmin(), Response::HTTP_FORBIDDEN, 'Only super-admins can update global charge types.');

        $chargeType = $this->financeService->updateChargeType(
            chargeType: $chargeType,
            data: $request->validated(),
            actor: $actor,
        );

        return ChargeTypeResource::make($chargeType);
    }
}
