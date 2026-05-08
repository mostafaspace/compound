<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Security\SecurityGate;
use App\Models\User;
use App\Services\CompoundContextService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// CM-81 / CM-112: Gate / entry-point management
class SecurityGateController extends Controller
{
    public function __construct(private readonly CompoundContextService $context) {}

    public function index(Request $request): JsonResponse
    {
        /** @var User $actor */
        $actor = $request->user();
        $requestedCompoundId = $request->header('X-Compound-Id');
        $compoundIds = $this->context->resolveRequestedAccessibleCompoundIds($actor, $requestedCompoundId);

        $query = SecurityGate::with('building')
            ->when($compoundIds !== null, fn ($q) => $q->whereIn('compound_id', $compoundIds))
            ->latest();

        if ($request->has('is_active')) {
            $query->where('is_active', filter_var($request->input('is_active'), FILTER_VALIDATE_BOOLEAN));
        }

        return response()->json(['data' => $query->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'compoundId' => ['required', 'string', 'max:26'],
            'buildingId' => ['nullable', 'string', 'max:26', 'exists:buildings,id'],
            'name' => ['required', 'string', 'max:120'],
            'zone' => ['nullable', 'string', 'max:60'],
            'description' => ['nullable', 'string', 'max:1000'],
            'isActive' => ['boolean'],
        ]);

        $this->context->ensureUserCanAccessCompound($request->user(), $validated['compoundId']);

        $gate = SecurityGate::create([
            'compound_id' => $validated['compoundId'],
            'building_id' => $validated['buildingId'] ?? null,
            'name' => $validated['name'],
            'zone' => $validated['zone'] ?? null,
            'description' => $validated['description'] ?? null,
            'is_active' => $validated['isActive'] ?? true,
        ]);

        return response()->json(['data' => $gate->load('building')], 201);
    }

    public function show(Request $request, SecurityGate $securityGate): JsonResponse
    {
        $this->context->ensureUserCanAccessCompound($request->user(), $securityGate->compound_id);

        return response()->json(['data' => $securityGate->load('building', 'compound')]);
    }

    public function update(Request $request, SecurityGate $securityGate): JsonResponse
    {
        $this->context->ensureUserCanAccessCompound($request->user(), $securityGate->compound_id);

        $validated = $request->validate([
            'buildingId' => ['nullable', 'string', 'max:26', 'exists:buildings,id'],
            'name' => ['sometimes', 'required', 'string', 'max:120'],
            'zone' => ['nullable', 'string', 'max:60'],
            'description' => ['nullable', 'string', 'max:1000'],
            'isActive' => ['boolean'],
        ]);

        $changes = [];
        if (array_key_exists('buildingId', $validated)) {
            $changes['building_id'] = $validated['buildingId'];
        }
        if (array_key_exists('name', $validated)) {
            $changes['name'] = $validated['name'];
        }
        if (array_key_exists('zone', $validated)) {
            $changes['zone'] = $validated['zone'];
        }
        if (array_key_exists('description', $validated)) {
            $changes['description'] = $validated['description'];
        }
        if (array_key_exists('isActive', $validated)) {
            $changes['is_active'] = $validated['isActive'];
        }

        $securityGate->update($changes);

        return response()->json(['data' => $securityGate->fresh()->load('building')]);
    }
}
