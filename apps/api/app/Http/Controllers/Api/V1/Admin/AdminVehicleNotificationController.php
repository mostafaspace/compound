<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Apartments\ApartmentVehicle;
use App\Services\Apartments\VehicleNotificationService;
use App\Services\CompoundContextService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminVehicleNotificationController extends Controller
{
    public function __construct(
        private readonly VehicleNotificationService $service,
        private readonly CompoundContextService $contextService,
    ) {}

    public function store(Request $request, ApartmentVehicle $vehicle): JsonResponse
    {
        $this->authorize('lookup_vehicles');

        $validated = $request->validate([
            'message' => ['required', 'string', 'max:1000'],
            'alias' => ['nullable', 'string', 'max:80'],
        ]);

        // Compound scope check
        $compoundId = $this->contextService->resolve($request);
        if ($compoundId !== null) {
            $vehicle->loadMissing('unit');
            abort_unless($vehicle->unit && $vehicle->unit->compound_id === $compoundId, 403);
        }

        $notification = $this->service->sendFromAdmin(
            $vehicle,
            $validated['message'],
            $request->user(),
            $validated['alias'] ?? null,
        );

        return response()->json([
            'data' => [
                'id' => $notification->id,
                'recipientCount' => $notification->recipients()->count(),
            ],
        ], 201);
    }
}
