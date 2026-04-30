<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Security\ManualVisitorEntry;
use App\Models\User;
use App\Services\CompoundContextService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// CM-81 / CM-112: Manual visitor entry (no-phone / no-QR workflow)
class ManualVisitorEntryController extends Controller
{
    public function __construct(private readonly CompoundContextService $context) {}

    public function index(Request $request): JsonResponse
    {
        /** @var User $actor */
        $actor = $request->user();
        $requestedCompoundId = $request->header('X-Compound-Id');
        $compoundIds = $this->context->resolveRequestedAccessibleCompoundIds($actor, $requestedCompoundId);

        $query = ManualVisitorEntry::with(['gate', 'shift', 'processedBy', 'host', 'hostUnit'])
            ->when($compoundIds !== null, fn ($q) => $q->whereIn('compound_id', $compoundIds))
            ->latest('occurred_at');

        if ($request->has('status') && $request->input('status') !== 'all') {
            $query->where('status', $request->input('status'));
        }

        if ($request->has('shift_id')) {
            $query->where('shift_id', $request->input('shift_id'));
        }

        if ($request->has('gate_id')) {
            $query->where('gate_id', $request->input('gate_id'));
        }

        if ($request->has('from')) {
            $query->where('occurred_at', '>=', $request->input('from'));
        }

        if ($request->has('to')) {
            $query->where('occurred_at', '<=', $request->input('to').' 23:59:59');
        }

        return response()->json(['data' => $query->paginate(20)]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'compoundId'    => ['required', 'string', 'max:26'],
            'gateId'        => ['nullable', 'string', 'max:26', 'exists:security_gates,id'],
            'shiftId'       => ['nullable', 'string', 'max:26', 'exists:security_shifts,id'],
            'visitorName'   => ['required', 'string', 'max:120'],
            'visitorPhone'  => ['nullable', 'string', 'max:30'],
            'vehiclePlate'  => ['nullable', 'string', 'max:20'],
            'hostUserId'    => ['nullable', 'integer', 'exists:users,id'],
            'hostUnitId'    => ['nullable', 'string', 'max:26', 'exists:units,id'],
            'reason'        => ['required', 'string', 'max:500'],
            'notes'         => ['nullable', 'string', 'max:2000'],
            'status'        => ['required', 'string', 'in:allowed,denied'],
            'occurredAt'    => ['required', 'date'],
        ]);

        $this->context->ensureUserCanAccessCompound($request->user(), $validated['compoundId']);

        /** @var User $user */
        $user = $request->user();

        $entry = ManualVisitorEntry::create([
            'compound_id'  => $validated['compoundId'],
            'gate_id'      => $validated['gateId'] ?? null,
            'shift_id'     => $validated['shiftId'] ?? null,
            'processed_by' => $user->id,
            'visitor_name' => $validated['visitorName'],
            'visitor_phone'=> $validated['visitorPhone'] ?? null,
            'vehicle_plate'=> $validated['vehiclePlate'] ?? null,
            'host_user_id' => $validated['hostUserId'] ?? null,
            'host_unit_id' => $validated['hostUnitId'] ?? null,
            'reason'       => $validated['reason'],
            'notes'        => $validated['notes'] ?? null,
            'status'       => $validated['status'],
            'occurred_at'  => $validated['occurredAt'],
        ]);

        return response()->json([
            'data' => $entry->load(['gate', 'shift', 'processedBy', 'host', 'hostUnit']),
        ], 201);
    }

    public function show(Request $request, ManualVisitorEntry $manualVisitorEntry): JsonResponse
    {
        $this->context->ensureUserCanAccessCompound($request->user(), $manualVisitorEntry->compound_id);

        return response()->json([
            'data' => $manualVisitorEntry->load(['gate', 'shift', 'processedBy', 'host', 'hostUnit', 'compound']),
        ]);
    }
}
