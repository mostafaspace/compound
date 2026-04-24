<?php

namespace App\Http\Controllers\Api\V1\Finance;

use App\Enums\ExpenseApprovalAction;
use App\Enums\ExpenseStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\Finance\ExpenseResource;
use App\Models\Finance\BudgetCategory;
use App\Models\Finance\Expense;
use App\Services\CompoundContextService;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

class ExpenseController extends Controller
{
    public function __construct(
        private readonly CompoundContextService $compoundContextService,
        private readonly AuditLogger $auditLogger,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $compoundId = $this->compoundContextService->resolve($request);

        $query = Expense::query()
            ->with(['budgetCategory', 'vendor', 'submitter', 'approver'])
            ->latest('expense_date');

        if ($compoundId) {
            $query->where('compound_id', $compoundId);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('vendor_id')) {
            $query->where('vendor_id', $request->input('vendor_id'));
        }

        if ($request->filled('budget_category_id')) {
            $query->where('budget_category_id', $request->input('budget_category_id'));
        }

        return ExpenseResource::collection($query->paginate(30));
    }

    /**
     * Public summary of approved expenses — resident transparency dashboard.
     */
    public function publicSummary(Request $request): AnonymousResourceCollection
    {
        $compoundId = $this->compoundContextService->resolve($request);

        $query = Expense::query()
            ->with(['budgetCategory', 'vendor'])
            ->where('status', ExpenseStatus::Approved)
            ->latest('expense_date');

        if ($compoundId) {
            $query->where('compound_id', $compoundId);
        }

        if ($request->filled('period_year')) {
            $query->whereYear('expense_date', (int) $request->input('period_year'));
        }

        return ExpenseResource::collection($query->paginate(30));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'compound_id'        => ['required', 'string', 'exists:compounds,id'],
            'budget_category_id' => ['nullable', 'string', 'exists:budget_categories,id'],
            'vendor_id'          => ['nullable', 'string', 'exists:vendors,id'],
            'title'              => ['required', 'string', 'max:255'],
            'description'        => ['nullable', 'string'],
            'amount'             => ['required', 'numeric', 'min:0.01'],
            'currency'           => ['nullable', 'string', 'size:3'],
            'expense_date'       => ['required', 'date'],
        ]);

        $this->compoundContextService->ensureCompoundAccess($request, $data['compound_id']);

        // Ensure budget category belongs to this compound's budget
        if (! empty($data['budget_category_id'])) {
            $cat = BudgetCategory::find($data['budget_category_id']);
            if ($cat) {
                abort_unless($cat->budget->compound_id === $data['compound_id'], Response::HTTP_UNPROCESSABLE_ENTITY);
            }
        }

        $data['submitted_by'] = $request->user()->id;
        $data['status'] = ExpenseStatus::PendingApproval;

        $expense = Expense::create($data);
        $expense->load(['budgetCategory', 'vendor', 'submitter']);

        $this->auditLogger->record('expense.created', $request->user(), $request, 201, $expense::class, $expense->id);

        return (new ExpenseResource($expense))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(Request $request, Expense $expense): ExpenseResource
    {
        $this->compoundContextService->ensureCompoundAccess($request, $expense->compound_id);

        return new ExpenseResource($expense->load(['budgetCategory', 'vendor', 'submitter', 'approver', 'approvals.actor']));
    }

    public function approve(Request $request, Expense $expense): ExpenseResource
    {
        $this->compoundContextService->ensureCompoundAccess($request, $expense->compound_id);

        abort_if($expense->status !== ExpenseStatus::PendingApproval, Response::HTTP_UNPROCESSABLE_ENTITY, 'Expense is not pending approval.');

        $data = $request->validate([
            'reason' => ['nullable', 'string', 'max:1000'],
        ]);

        $expense->approvals()->create([
            'actor_id' => $request->user()->id,
            'action'   => ExpenseApprovalAction::Approve,
            'reason'   => $data['reason'] ?? null,
        ]);

        $expense->update([
            'status'      => ExpenseStatus::Approved,
            'approved_by' => $request->user()->id,
            'approved_at' => now(),
        ]);

        // Update budget category actual_amount if linked
        if ($expense->budget_category_id) {
            $expense->budgetCategory?->increment('actual_amount', $expense->amount);
        }

        $this->auditLogger->record('expense.approved', $request->user(), $request, 200, $expense::class, $expense->id);

        return new ExpenseResource($expense->load(['budgetCategory', 'vendor', 'submitter', 'approver', 'approvals.actor']));
    }

    public function reject(Request $request, Expense $expense): ExpenseResource
    {
        $this->compoundContextService->ensureCompoundAccess($request, $expense->compound_id);

        abort_if($expense->status !== ExpenseStatus::PendingApproval, Response::HTTP_UNPROCESSABLE_ENTITY, 'Expense is not pending approval.');

        $data = $request->validate([
            'reason' => ['required', 'string', 'max:1000'],
        ]);

        $expense->approvals()->create([
            'actor_id' => $request->user()->id,
            'action'   => ExpenseApprovalAction::Reject,
            'reason'   => $data['reason'],
        ]);

        $expense->update([
            'status'           => ExpenseStatus::Rejected,
            'rejection_reason' => $data['reason'],
        ]);

        $this->auditLogger->record('expense.rejected', $request->user(), $request, 200, $expense::class, $expense->id);

        return new ExpenseResource($expense->load(['budgetCategory', 'vendor', 'submitter', 'approver', 'approvals.actor']));
    }
}
