<?php

namespace App\Http\Controllers\Api\V1\Maintenance;

use App\Http\Controllers\Controller;
use App\Models\Maintenance\WorkOrder;
use App\Models\Maintenance\WorkOrderEstimate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

use App\Services\CompoundContextService;

// CM-83 / CM-118: Vendor estimates for work orders
class WorkOrderEstimateController extends Controller
{
    public function __construct(private readonly CompoundContextService $context) {}

    public function store(Request $request, WorkOrder $workOrder): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();
        $this->context->ensureUserCanAccessCompound($user, $workOrder->compound_id);

        abort_if(in_array($workOrder->status, ['completed', 'cancelled', 'rejected'], true), 422, 'Cannot add estimates to a closed work order.');

        $validated = $request->validate([
            'vendorId' => ['nullable', 'string', 'exists:vendors,id'],
            'amount'   => ['required', 'numeric', 'min:0'],
            'notes'    => ['nullable', 'string', 'max:2000'],
        ]);

        $estimate = WorkOrderEstimate::create([
            'work_order_id' => $workOrder->id,
            'vendor_id'     => $validated['vendorId'] ?? $workOrder->vendor_id,
            'amount'        => $validated['amount'],
            'notes'         => $validated['notes'] ?? null,
            'status'        => 'pending',
            'submitted_by'  => $user->id,
        ]);

        // Auto-advance work order to 'quoted' if still in draft/requested
        if (in_array($workOrder->status, ['draft', 'requested'], true)) {
            $workOrder->update([
                'status'         => 'quoted',
                'estimated_cost' => $validated['amount'],
            ]);
        }

        return response()->json(['data' => $estimate->load(['vendor', 'submitter'])], 201);
    }

    public function review(Request $request, WorkOrder $workOrder, WorkOrderEstimate $estimate): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();
        $this->context->ensureUserCanAccessCompound($user, $workOrder->compound_id);

        abort_if((string) $estimate->work_order_id !== (string) $workOrder->id, 404);
        abort_if($estimate->status !== 'pending', 422, 'Estimate has already been reviewed.');

        $validated = $request->validate([
            'status'      => ['required', 'string', 'in:approved,rejected'],
            'reviewNotes' => ['nullable', 'string', 'max:1000'],
        ]);

        $estimate->update([
            'status'       => $validated['status'],
            'reviewed_by'  => $user->id,
            'reviewed_at'  => now(),
            'review_notes' => $validated['reviewNotes'] ?? null,
        ]);

        // If approved, set the approved cost on the work order
        if ($validated['status'] === 'approved') {
            $workOrder->update([
                'approved_cost' => $estimate->amount,
                'vendor_id'     => $estimate->vendor_id ?? $workOrder->vendor_id,
            ]);
        }

        return response()->json(['data' => $estimate->fresh()->load(['vendor', 'submitter', 'reviewer'])]);
    }
}
