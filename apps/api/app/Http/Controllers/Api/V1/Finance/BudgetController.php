<?php

namespace App\Http\Controllers\Api\V1\Finance;

use App\Enums\BudgetStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\Finance\BudgetResource;
use App\Models\Finance\Budget;
use App\Models\User;
use App\Services\CompoundContextService;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

class BudgetController extends Controller
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

        $query = Budget::query()->with('categories')
            ->when($compoundIds !== null, fn ($q) => $q->whereIn('compound_id', $compoundIds))
            ->latest();

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('period_year')) {
            $query->where('period_year', (int) $request->input('period_year'));
        }

        return BudgetResource::collection($query->paginate(30));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'compound_id'  => ['required', 'string', 'exists:compounds,id'],
            'name'         => ['required', 'string', 'max:255'],
            'period_type'  => ['required', Rule::in(['annual', 'monthly'])],
            'period_year'  => ['required', 'integer', 'min:2000', 'max:2100'],
            'period_month' => ['required_if:period_type,monthly', 'nullable', 'integer', 'min:1', 'max:12'],
            'notes'        => ['nullable', 'string'],
        ]);

        $this->compoundContextService->ensureUserCanAccessCompound($request->user(), $data['compound_id']);

        $data['created_by'] = $request->user()->id;

        $budget = Budget::create($data);

        $this->auditLogger->record('budget.created', $request->user(), $request, 201, $budget::class, $budget->id);

        return (new BudgetResource($budget->load('categories')))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(Request $request, Budget $budget): BudgetResource
    {
        $this->compoundContextService->ensureUserCanAccessCompound($request->user(), $budget->compound_id);

        return new BudgetResource($budget->load('categories'));
    }

    public function update(Request $request, Budget $budget): BudgetResource
    {
        $this->compoundContextService->ensureUserCanAccessCompound($request->user(), $budget->compound_id);

        abort_if($budget->status === BudgetStatus::Closed, Response::HTTP_UNPROCESSABLE_ENTITY, 'Cannot edit a closed budget.');

        $data = $request->validate([
            'name'  => ['sometimes', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
        ]);

        $budget->update($data);

        $this->auditLogger->record('budget.updated', $request->user(), $request, 200, $budget::class, $budget->id);

        return new BudgetResource($budget->load('categories'));
    }

    public function activate(Request $request, Budget $budget): BudgetResource
    {
        $this->compoundContextService->ensureUserCanAccessCompound($request->user(), $budget->compound_id);

        abort_if($budget->status !== BudgetStatus::Draft, Response::HTTP_UNPROCESSABLE_ENTITY, 'Only draft budgets can be activated.');

        $budget->update(['status' => BudgetStatus::Active]);

        $this->auditLogger->record('budget.activated', $request->user(), $request, 200, $budget::class, $budget->id);

        return new BudgetResource($budget->load('categories'));
    }

    public function close(Request $request, Budget $budget): BudgetResource
    {
        $this->compoundContextService->ensureUserCanAccessCompound($request->user(), $budget->compound_id);

        abort_if($budget->status === BudgetStatus::Closed, Response::HTTP_UNPROCESSABLE_ENTITY, 'Budget is already closed.');

        $budget->update([
            'status'    => BudgetStatus::Closed,
            'closed_at' => now(),
        ]);

        $this->auditLogger->record('budget.closed', $request->user(), $request, 200, $budget::class, $budget->id);

        return new BudgetResource($budget->load('categories'));
    }

    // ── Budget categories ──────────────────────────────────────────────────────

    public function storeCategory(Request $request, Budget $budget): JsonResponse
    {
        $this->compoundContextService->ensureUserCanAccessCompound($request->user(), $budget->compound_id);

        abort_if($budget->status === BudgetStatus::Closed, Response::HTTP_UNPROCESSABLE_ENTITY, 'Cannot add categories to a closed budget.');

        $data = $request->validate([
            'name'           => ['required', 'string', 'max:255'],
            'planned_amount' => ['required', 'numeric', 'min:0'],
            'notes'          => ['nullable', 'string'],
        ]);

        $category = $budget->categories()->create($data);

        return (new \App\Http\Resources\Finance\BudgetCategoryResource($category))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function updateCategory(Request $request, Budget $budget, \App\Models\Finance\BudgetCategory $category): \App\Http\Resources\Finance\BudgetCategoryResource
    {
        $this->compoundContextService->ensureUserCanAccessCompound($request->user(), $budget->compound_id);

        abort_if($budget->status === BudgetStatus::Closed, Response::HTTP_UNPROCESSABLE_ENTITY, 'Cannot edit categories on a closed budget.');
        abort_if($category->budget_id !== $budget->id, Response::HTTP_NOT_FOUND);

        $data = $request->validate([
            'name'           => ['sometimes', 'string', 'max:255'],
            'planned_amount' => ['sometimes', 'numeric', 'min:0'],
            'notes'          => ['nullable', 'string'],
        ]);

        $category->update($data);

        return new \App\Http\Resources\Finance\BudgetCategoryResource($category);
    }
}
