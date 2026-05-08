<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Security\SecurityDevice;
use App\Models\User;
use App\Services\CompoundContextService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

// CM-81 / CM-112: Scanner device registration & management
class SecurityDeviceController extends Controller
{
    public function __construct(private readonly CompoundContextService $context) {}

    public function index(Request $request): JsonResponse
    {
        /** @var User $actor */
        $actor = $request->user();
        $requestedCompoundId = $request->header('X-Compound-Id');
        $compoundIds = $this->context->resolveRequestedAccessibleCompoundIds($actor, $requestedCompoundId);

        $query = SecurityDevice::with('registeredBy')
            ->when($compoundIds !== null, fn ($q) => $q->whereIn('compound_id', $compoundIds))
            ->latest();

        if ($request->has('status') && $request->input('status') !== 'all') {
            $query->where('status', $request->input('status'));
        }

        return response()->json(['data' => $query->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'compoundId' => ['required', 'string', 'max:26'],
            'name' => ['required', 'string', 'max:120'],
            'appVersion' => ['nullable', 'string', 'max:20'],
        ]);

        $this->context->ensureUserCanAccessCompound($request->user(), $validated['compoundId']);

        /** @var User $user */
        $user = $request->user();

        $device = SecurityDevice::create([
            'compound_id' => $validated['compoundId'],
            'name' => $validated['name'],
            'device_identifier' => Str::random(64),
            'app_version' => $validated['appVersion'] ?? null,
            'status' => 'active',
            'registered_by' => $user->id,
        ]);

        return response()->json(['data' => $device->load('registeredBy')], 201);
    }

    public function show(Request $request, SecurityDevice $securityDevice): JsonResponse
    {
        $this->context->ensureUserCanAccessCompound($request->user(), $securityDevice->compound_id);

        return response()->json(['data' => $securityDevice->load(['registeredBy', 'revokedBy'])]);
    }

    public function heartbeat(Request $request, SecurityDevice $securityDevice): JsonResponse
    {
        $this->context->ensureUserCanAccessCompound($request->user(), $securityDevice->compound_id);

        abort_if($securityDevice->status !== 'active', 403, 'Device is revoked.');

        $validated = $request->validate([
            'appVersion' => ['nullable', 'string', 'max:20'],
        ]);

        $securityDevice->update([
            'last_seen_at' => now(),
            'app_version' => $validated['appVersion'] ?? $securityDevice->app_version,
        ]);

        return response()->json(['data' => $securityDevice->fresh()]);
    }

    public function revoke(Request $request, SecurityDevice $securityDevice): JsonResponse
    {
        $this->context->ensureUserCanAccessCompound($request->user(), $securityDevice->compound_id);

        abort_if($securityDevice->status === 'revoked', 422, 'Device is already revoked.');

        /** @var User $user */
        $user = $request->user();

        $securityDevice->update([
            'status' => 'revoked',
            'revoked_by' => $user->id,
            'revoked_at' => now(),
        ]);

        return response()->json(['data' => $securityDevice->fresh()->load(['registeredBy', 'revokedBy'])]);
    }
}
