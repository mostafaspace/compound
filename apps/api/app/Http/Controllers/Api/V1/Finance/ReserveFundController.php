<?php

namespace App\Http\Controllers\Api\V1\Finance;

use App\Http\Controllers\Controller;
use App\Http\Resources\Finance\ReserveFundMovementResource;
use App\Http\Resources\Finance\ReserveFundResource;
use App\Models\Finance\ReserveFund;
use App\Models\User;
use App\Services\CompoundContextService;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

class ReserveFundController extends Controller
{
    public function __construct(
        private readonly CompoundContextService $compoundContextService,
        private readonly AuditLogger $auditLogger,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        /** @var User $actor */
        $actor = $request->user();
        $compoundIds = $this->compoundContextService->resolveAccessibleCompoundIds($actor);

        $query = ReserveFund::query()
            ->when($compoundIds !== null, fn ($q) => $q->whereIn('compound_id', $compoundIds))
            ->latest();

        return ReserveFundResource::collection($query->paginate(50));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'compound_id' => ['required', 'string', 'exists:compounds,id'],
            'name'        => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'currency'    => ['nullable', 'string', 'size:3'],
        ]);

        $this->compoundContextService->ensureUserCanAccessCompound($request->user(), $data['compound_id']);

        $fund = ReserveFund::create($data);

        $this->auditLogger->record('reserve_fund.created', $request->user(), $request, 201, $fund::class, $fund->id);

        return (new ReserveFundResource($fund))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(Request $request, ReserveFund $reserveFund): ReserveFundResource
    {
        $this->compoundContextService->ensureUserCanAccessCompound($request->user(), $reserveFund->compound_id);

        return new ReserveFundResource($reserveFund);
    }

    public function update(Request $request, ReserveFund $reserveFund): ReserveFundResource
    {
        $this->compoundContextService->ensureUserCanAccessCompound($request->user(), $reserveFund->compound_id);

        $data = $request->validate([
            'name'        => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'is_active'   => ['sometimes', 'boolean'],
        ]);

        $reserveFund->update($data);

        $this->auditLogger->record('reserve_fund.updated', $request->user(), $request, 200, $reserveFund::class, $reserveFund->id);

        return new ReserveFundResource($reserveFund);
    }

    public function storeMovement(Request $request, ReserveFund $reserveFund): JsonResponse
    {
        $this->compoundContextService->ensureUserCanAccessCompound($request->user(), $reserveFund->compound_id);

        $data = $request->validate([
            'type'        => ['required', Rule::in(['deposit', 'withdrawal', 'transfer'])],
            'amount'      => ['required', 'numeric', 'min:0.01'],
            'description' => ['nullable', 'string', 'max:500'],
            'reference'   => ['nullable', 'string', 'max:255'],
        ]);

        $data['created_by'] = $request->user()->id;

        $movement = $reserveFund->movements()->create($data);

        // Adjust balance
        if ($data['type'] === 'deposit') {
            $reserveFund->increment('balance', $data['amount']);
        } elseif ($data['type'] === 'withdrawal') {
            $reserveFund->decrement('balance', $data['amount']);
        }

        $movement->load('creator');

        $this->auditLogger->record('reserve_fund.movement', $request->user(), $request, 201, $movement::class, $movement->id);

        return (new ReserveFundMovementResource($movement))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function movements(Request $request, ReserveFund $reserveFund): AnonymousResourceCollection
    {
        $this->compoundContextService->ensureUserCanAccessCompound($request->user(), $reserveFund->compound_id);

        $movements = $reserveFund->movements()
            ->with('creator')
            ->latest()
            ->paginate(50);

        return ReserveFundMovementResource::collection($movements);
    }
}
