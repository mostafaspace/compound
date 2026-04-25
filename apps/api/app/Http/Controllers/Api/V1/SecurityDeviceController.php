<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Security\SecurityDevice;
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
        $compoundId = $this->context->resolve($request);

        $query = SecurityDevice::with('registeredBy')->latest();

        if ($compoundId !== null) {
            $query->where('compound_id', $compoundId);
        }

        if ($request->has('status') && $request->input('status') !== 'all') {
            $query->where('status', $request->input('status'));
        }

        return response()->json(['data' => $query->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $compoundId = $this->context->resolve($request);

        $validated = $request->validate([
            'compoundId'  => ['nullable', 'string', 'max:26'],
            'name'        => ['required', 'string', 'max:120'],
            'appVersion'  => ['nullable', 'string', 'max:20'],
        ]);

        /** @var \App\Models\User $user */
        $user = $request->user();

        $device = SecurityDevice::create([
            'compound_id'       => $compoundId ?? $validated['compoundId'],
            'name'              => $validated['name'],
            'device_identifier' => Str::random(64),
            'app_version'       => $validated['appVersion'] ?? null,
            'status'            => 'active',
            'registered_by'     => $user->id,
        ]);

        return response()->json(['data' => $device->load('registeredBy')], 201);
    }

    public function show(SecurityDevice $securityDevice): JsonResponse
    {
        return response()->json(['data' => $securityDevice->load(['registeredBy', 'revokedBy'])]);
    }

    public function heartbeat(Request $request, SecurityDevice $securityDevice): JsonResponse
    {
        abort_if($securityDevice->status !== 'active', 403, 'Device is revoked.');

        $validated = $request->validate([
            'appVersion' => ['nullable', 'string', 'max:20'],
        ]);

        $securityDevice->update([
            'last_seen_at' => now(),
            'app_version'  => $validated['appVersion'] ?? $securityDevice->app_version,
        ]);

        return response()->json(['data' => $securityDevice->fresh()]);
    }

    public function revoke(Request $request, SecurityDevice $securityDevice): JsonResponse
    {
        abort_if($securityDevice->status === 'revoked', 422, 'Device is already revoked.');

        /** @var \App\Models\User $user */
        $user = $request->user();

        $securityDevice->update([
            'status'     => 'revoked',
            'revoked_by' => $user->id,
            'revoked_at' => now(),
        ]);

        return response()->json(['data' => $securityDevice->fresh()->load(['registeredBy', 'revokedBy'])]);
    }
}
