<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Security\SecurityIncident;
use App\Models\User;
use App\Services\CompoundContextService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// CM-81 / CM-112: Security incident log
class SecurityIncidentController extends Controller
{
    public const INCIDENT_TYPES = [
        'denied_entry',
        'suspicious_activity',
        'emergency',
        'vehicle_issue',
        'operational_handover',
        'other',
    ];

    public function __construct(private readonly CompoundContextService $context) {}

    public function index(Request $request): JsonResponse
    {
        /** @var User $actor */
        $actor = $request->user();
        $requestedCompoundId = $request->header('X-Compound-Id');
        $compoundIds = $this->context->resolveRequestedAccessibleCompoundIds($actor, $requestedCompoundId);

        $query = SecurityIncident::with(['gate', 'shift', 'reporter'])
            ->when($compoundIds !== null, fn ($q) => $q->whereIn('compound_id', $compoundIds))
            ->latest('occurred_at');

        if ($request->has('type') && $request->input('type') !== 'all') {
            $query->where('type', $request->input('type'));
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
            'compoundId'  => ['required', 'string', 'max:26'],
            'gateId'      => ['nullable', 'string', 'max:26', 'exists:security_gates,id'],
            'shiftId'     => ['nullable', 'string', 'max:26', 'exists:security_shifts,id'],
            'type'        => ['required', 'string', 'in:'.implode(',', self::INCIDENT_TYPES)],
            'title'       => ['required', 'string', 'max:200'],
            'description' => ['required', 'string', 'max:5000'],
            'notes'       => ['nullable', 'string', 'max:5000'],
            'metadata'    => ['nullable', 'array'],
            'occurredAt'  => ['required', 'date'],
        ]);

        $this->context->ensureUserCanAccessCompound($request->user(), $validated['compoundId']);

        /** @var User $user */
        $user = $request->user();

        $incident = SecurityIncident::create([
            'compound_id' => $validated['compoundId'],
            'gate_id'     => $validated['gateId'] ?? null,
            'shift_id'    => $validated['shiftId'] ?? null,
            'reported_by' => $user->id,
            'type'        => $validated['type'],
            'title'       => $validated['title'],
            'description' => $validated['description'],
            'notes'       => $validated['notes'] ?? null,
            'metadata'    => $validated['metadata'] ?? null,
            'occurred_at' => $validated['occurredAt'],
        ]);

        return response()->json(['data' => $incident->load(['gate', 'shift', 'reporter'])], 201);
    }

    public function show(Request $request, SecurityIncident $securityIncident): JsonResponse
    {
        $this->context->ensureUserCanAccessCompound($request->user(), $securityIncident->compound_id);

        return response()->json(['data' => $securityIncident->load(['gate', 'shift', 'reporter', 'compound'])]);
    }

    public function resolve(Request $request, SecurityIncident $securityIncident): JsonResponse
    {
        $this->context->ensureUserCanAccessCompound($request->user(), $securityIncident->compound_id);

        abort_if($securityIncident->resolved_at !== null, 422, 'Incident is already resolved.');

        $request->validate([
            'notes' => ['nullable', 'string', 'max:5000'],
        ]);

        $securityIncident->update([
            'resolved_at' => now(),
            'notes'       => $request->input('notes') ?? $securityIncident->notes,
        ]);

        return response()->json(['data' => $securityIncident->fresh()->load(['gate', 'shift', 'reporter'])]);
    }
}
