<?php

namespace App\Http\Controllers\Api\V1\Maintenance;

use App\Http\Controllers\Controller;
use App\Models\Maintenance\WorkOrder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// CM-83 / CM-118: Work order lifecycle transitions
class WorkOrderStatusController extends Controller
{
    /** Draft → Requested */
    public function submit(Request $request, WorkOrder $workOrder): JsonResponse
    {
        abort_if($workOrder->status !== 'draft', 422, 'Only draft work orders can be submitted.');

        $workOrder->update(['status' => 'requested']);

        return response()->json(['data' => $workOrder->fresh()->load(['vendor', 'creator'])]);
    }

    /** Requested/Quoted → Approved */
    public function approve(Request $request, WorkOrder $workOrder): JsonResponse
    {
        abort_if(! in_array($workOrder->status, ['requested', 'quoted'], true), 422, 'Work order must be in requested or quoted status to approve.');

        $validated = $request->validate([
            'approvedCost' => ['nullable', 'numeric', 'min:0'],
        ]);

        /** @var \App\Models\User $user */
        $user = $request->user();

        $workOrder->update([
            'status'       => 'approved',
            'approved_by'  => $user->id,
            'approved_at'  => now(),
            'approved_cost' => $validated['approvedCost'] ?? $workOrder->estimated_cost,
        ]);

        return response()->json(['data' => $workOrder->fresh()->load(['vendor', 'creator', 'approver'])]);
    }

    /** Requested/Quoted → Rejected */
    public function reject(Request $request, WorkOrder $workOrder): JsonResponse
    {
        abort_if(! in_array($workOrder->status, ['requested', 'quoted'], true), 422, 'Work order must be in requested or quoted status to reject.');

        $validated = $request->validate([
            'rejectionReason' => ['required', 'string', 'max:1000'],
        ]);

        $workOrder->update([
            'status'           => 'rejected',
            'rejection_reason' => $validated['rejectionReason'],
        ]);

        return response()->json(['data' => $workOrder->fresh()->load(['vendor', 'creator'])]);
    }

    /** Approved → In Progress */
    public function start(WorkOrder $workOrder): JsonResponse
    {
        abort_if($workOrder->status !== 'approved', 422, 'Work order must be approved before starting.');

        $workOrder->update([
            'status'     => 'in_progress',
            'started_at' => now(),
        ]);

        return response()->json(['data' => $workOrder->fresh()->load(['vendor', 'creator', 'assignee'])]);
    }

    /** In Progress → Completed */
    public function complete(Request $request, WorkOrder $workOrder): JsonResponse
    {
        abort_if($workOrder->status !== 'in_progress', 422, 'Work order must be in progress to complete.');

        $validated = $request->validate([
            'completionNotes' => ['nullable', 'string', 'max:3000'],
            'actualCost'      => ['nullable', 'numeric', 'min:0'],
        ]);

        $workOrder->update([
            'status'           => 'completed',
            'completed_at'     => now(),
            'completion_notes' => $validated['completionNotes'] ?? null,
            'actual_cost'      => $validated['actualCost'] ?? null,
        ]);

        return response()->json(['data' => $workOrder->fresh()->load(['vendor', 'creator', 'approver'])]);
    }

    /** Any non-terminal → Cancelled */
    public function cancel(Request $request, WorkOrder $workOrder): JsonResponse
    {
        abort_if(in_array($workOrder->status, ['completed', 'cancelled', 'rejected'], true), 422, 'Work order is already closed.');

        /** @var \App\Models\User $user */
        $user = $request->user();

        $workOrder->update([
            'status'       => 'cancelled',
            'cancelled_by' => $user->id,
            'cancelled_at' => now(),
        ]);

        return response()->json(['data' => $workOrder->fresh()->load(['vendor', 'creator'])]);
    }
}
