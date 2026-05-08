<?php

namespace App\Http\Controllers\Api\V1\Maintenance;

use App\Http\Controllers\Controller;
use App\Models\Maintenance\WorkOrder;
use App\Models\User;
use App\Services\CompoundContextService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// CM-83 / CM-118: Work order CRUD
class WorkOrderController extends Controller
{
    public function __construct(private readonly CompoundContextService $context) {}

    public function index(Request $request): JsonResponse
    {
        /** @var User $actor */
        $actor = $request->user();
        $requestedCompoundId = $request->header('X-Compound-Id') ?: $request->query('compoundId');
        $compoundIds = $this->context->resolveRequestedAccessibleCompoundIds($actor, $requestedCompoundId);

        $query = WorkOrder::with(['vendor', 'creator', 'assignee', 'building', 'issue'])
            ->latest()
            ->when($compoundIds !== null, fn ($q) => $q->whereIn('compound_id', $compoundIds))
            ->when($request->filled('status') && $request->input('status') !== 'all', fn ($q) => $q->where('status', $request->input('status')))
            ->when($request->filled('priority'), fn ($q) => $q->where('priority', $request->input('priority')))
            ->when($request->filled('category'), fn ($q) => $q->where('category', $request->input('category')))
            ->when($request->filled('vendor_id'), fn ($q) => $q->where('vendor_id', $request->input('vendor_id')));

        return response()->json(['data' => $query->paginate(20)]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'compoundId' => ['required', 'string', 'exists:compounds,id'],
            'title' => ['required', 'string', 'max:200'],
            'description' => ['nullable', 'string'],
            'category' => ['required', 'string', 'in:plumbing,electrical,hvac,painting,cleaning,landscaping,security,general,other'],
            'priority' => ['sometimes', 'string', 'in:low,medium,high,urgent'],
            'issueId' => ['nullable', 'string', 'exists:issues,id'],
            'vendorId' => ['nullable', 'string', 'exists:vendors,id'],
            'buildingId' => ['nullable', 'string', 'exists:buildings,id'],
            'unitId' => ['nullable', 'string', 'exists:units,id'],
            'estimatedCost' => ['nullable', 'numeric', 'min:0'],
            'targetCompletionAt' => ['nullable', 'date'],
        ]);

        /** @var User $user */
        $user = $request->user();
        $this->context->ensureUserCanAccessCompound($user, $validated['compoundId']);

        $workOrder = WorkOrder::create([
            'compound_id' => $validated['compoundId'],
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'category' => $validated['category'],
            'priority' => $validated['priority'] ?? 'medium',
            'status' => 'draft',
            'issue_id' => $validated['issueId'] ?? null,
            'vendor_id' => $validated['vendorId'] ?? null,
            'building_id' => $validated['buildingId'] ?? null,
            'unit_id' => $validated['unitId'] ?? null,
            'estimated_cost' => $validated['estimatedCost'] ?? null,
            'target_completion_at' => $validated['targetCompletionAt'] ?? null,
            'created_by' => $user->id,
        ]);

        return response()->json(['data' => $workOrder->load(['vendor', 'creator', 'building', 'issue'])], 201);
    }

    public function show(Request $request, WorkOrder $workOrder): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $this->context->ensureUserCanAccessCompound($user, $workOrder->compound_id);

        return response()->json([
            'data' => $workOrder->load(['vendor', 'creator', 'assignee', 'approver', 'building', 'unit', 'issue', 'estimates.vendor', 'estimates.submitter', 'expense']),
        ]);
    }

    public function update(Request $request, WorkOrder $workOrder): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $this->context->ensureUserCanAccessCompound($user, $workOrder->compound_id);

        abort_if(in_array($workOrder->status, ['completed', 'cancelled', 'rejected'], true), 422, 'Cannot update a closed work order.');

        $validated = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:200'],
            'description' => ['nullable', 'string'],
            'category' => ['sometimes', 'string', 'in:plumbing,electrical,hvac,painting,cleaning,landscaping,security,general,other'],
            'priority' => ['sometimes', 'string', 'in:low,medium,high,urgent'],
            'vendorId' => ['nullable', 'string', 'exists:vendors,id'],
            'buildingId' => ['nullable', 'string', 'exists:buildings,id'],
            'unitId' => ['nullable', 'string', 'exists:units,id'],
            'assignedTo' => ['nullable', 'integer', 'exists:users,id'],
            'estimatedCost' => ['nullable', 'numeric', 'min:0'],
            'targetCompletionAt' => ['nullable', 'date'],
            'scheduledAt' => ['nullable', 'date'],
        ]);

        $changes = [];
        $map = [
            'title' => 'title',
            'description' => 'description',
            'category' => 'category',
            'priority' => 'priority',
            'vendorId' => 'vendor_id',
            'buildingId' => 'building_id',
            'unitId' => 'unit_id',
            'assignedTo' => 'assigned_to',
            'estimatedCost' => 'estimated_cost',
            'targetCompletionAt' => 'target_completion_at',
            'scheduledAt' => 'scheduled_at',
        ];

        foreach ($map as $in => $db) {
            if (array_key_exists($in, $validated)) {
                $changes[$db] = $validated[$in];
            }
        }

        $workOrder->update($changes);

        return response()->json(['data' => $workOrder->fresh()->load(['vendor', 'creator', 'assignee', 'building', 'issue'])]);
    }
}
