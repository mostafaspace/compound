<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Security\SecurityShift;
use App\Models\Security\SecurityShiftAssignment;
use App\Services\CompoundContextService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// CM-81 / CM-112: Shift management + handover notes
class SecurityShiftController extends Controller
{
    public function __construct(private readonly CompoundContextService $context) {}

    public function index(Request $request): JsonResponse
    {
        $compoundId = $this->context->resolve($request);

        $query = SecurityShift::with(['creator', 'closer'])
            ->latest();

        if ($compoundId !== null) {
            $query->where('compound_id', $compoundId);
        }

        if ($request->has('status') && $request->input('status') !== 'all') {
            $query->where('status', $request->input('status'));
        }

        return response()->json(['data' => $query->paginate(20)]);
    }

    public function store(Request $request): JsonResponse
    {
        $compoundId = $this->context->resolve($request);

        $validated = $request->validate([
            'compoundId'     => ['nullable', 'string', 'max:26'],
            'name'           => ['required', 'string', 'max:120'],
            'handoverNotes'  => ['nullable', 'string', 'max:5000'],
        ]);

        /** @var \App\Models\User $user */
        $user = $request->user();

        $shift = SecurityShift::create([
            'compound_id'    => $compoundId ?? $validated['compoundId'],
            'name'           => $validated['name'],
            'handover_notes' => $validated['handoverNotes'] ?? null,
            'status'         => 'draft',
            'created_by'     => $user->id,
        ]);

        return response()->json(['data' => $shift->load('creator')], 201);
    }

    public function show(SecurityShift $securityShift): JsonResponse
    {
        return response()->json([
            'data' => $securityShift->load(['creator', 'closer', 'assignments.guardUser', 'assignments.gate']),
        ]);
    }

    public function update(Request $request, SecurityShift $securityShift): JsonResponse
    {
        $validated = $request->validate([
            'name'          => ['sometimes', 'required', 'string', 'max:120'],
            'handoverNotes' => ['nullable', 'string', 'max:5000'],
        ]);

        $changes = [];
        if (array_key_exists('name', $validated)) {
            $changes['name'] = $validated['name'];
        }
        if (array_key_exists('handoverNotes', $validated)) {
            $changes['handover_notes'] = $validated['handoverNotes'];
        }

        $securityShift->update($changes);

        return response()->json(['data' => $securityShift->fresh()->load('creator', 'closer')]);
    }

    public function activate(Request $request, SecurityShift $securityShift): JsonResponse
    {
        abort_if($securityShift->status !== 'draft', 422, 'Only draft shifts can be activated.');

        $securityShift->update([
            'status'     => 'active',
            'started_at' => now(),
        ]);

        return response()->json(['data' => $securityShift->fresh()->load('creator')]);
    }

    public function close(Request $request, SecurityShift $securityShift): JsonResponse
    {
        abort_if($securityShift->status !== 'active', 422, 'Only active shifts can be closed.');

        $request->validate([
            'handoverNotes' => ['nullable', 'string', 'max:5000'],
        ]);

        /** @var \App\Models\User $user */
        $user = $request->user();

        $securityShift->update([
            'status'         => 'closed',
            'ended_at'       => now(),
            'closed_by'      => $user->id,
            'handover_notes' => $request->input('handoverNotes') ?? $securityShift->handover_notes,
        ]);

        // Auto-checkout any active assignments
        SecurityShiftAssignment::where('shift_id', $securityShift->id)
            ->where('is_active', true)
            ->whereNull('checked_out_at')
            ->update([
                'checked_out_at' => now(),
                'is_active'      => false,
            ]);

        return response()->json(['data' => $securityShift->fresh()->load(['creator', 'closer'])]);
    }

    // POST /security/shifts/{shift}/assignments — assign a guard to the shift
    public function assign(Request $request, SecurityShift $securityShift): JsonResponse
    {
        abort_if($securityShift->status === 'closed', 422, 'Cannot assign guards to a closed shift.');

        $validated = $request->validate([
            'guardUserId' => ['required', 'integer', 'exists:users,id'],
            'gateId'      => ['nullable', 'string', 'max:26', 'exists:security_gates,id'],
        ]);

        $assignment = SecurityShiftAssignment::create([
            'shift_id'      => $securityShift->id,
            'gate_id'       => $validated['gateId'] ?? null,
            'guard_user_id' => $validated['guardUserId'],
            'is_active'     => true,
        ]);

        return response()->json(['data' => $assignment->load(['guardUser', 'gate'])], 201);
    }

    // POST /security/shifts/{shift}/assignments/{assignment}/checkin
    public function checkin(Request $request, SecurityShift $securityShift, SecurityShiftAssignment $assignment): JsonResponse
    {
        abort_if((string) $assignment->shift_id !== (string) $securityShift->id, 404);
        abort_if($assignment->checked_in_at !== null, 422, 'Already checked in.');

        $assignment->update([
            'checked_in_at' => now(),
            'is_active'     => true,
        ]);

        return response()->json(['data' => $assignment->fresh()->load(['guardUser', 'gate'])]);
    }

    // POST /security/shifts/{shift}/assignments/{assignment}/checkout
    public function checkout(Request $request, SecurityShift $securityShift, SecurityShiftAssignment $assignment): JsonResponse
    {
        abort_if((string) $assignment->shift_id !== (string) $securityShift->id, 404);
        abort_if($assignment->checked_out_at !== null, 422, 'Already checked out.');

        $assignment->update([
            'checked_out_at' => now(),
            'is_active'      => false,
        ]);

        return response()->json(['data' => $assignment->fresh()->load(['guardUser', 'gate'])]);
    }
}
