<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Apartments\ApartmentVehicle;
use App\Models\Visitors\VisitorRequest;
use App\Services\Apartments\PlateNormalizer;
use App\Services\CompoundContextService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VehicleLookupController extends Controller
{
    public function __construct(
        private readonly CompoundContextService $contextService,
        private readonly PlateNormalizer $normalizer,
    ) {}

    public function __invoke(Request $request): JsonResponse
    {
        $this->authorize('lookup_vehicles');

        $query = $request->query('q');

        if (! $query || strlen($query) < 2) {
            return response()->json(['data' => []]);
        }

        $compoundId = $this->contextService->resolve($request);

        // 1. Search Resident Vehicles
        $terms = $this->normalizer->searchTerms($query);

        $residentVehicles = ApartmentVehicle::query()
            ->when($compoundId, fn ($q) => $q->whereHas('unit', fn ($u) => $u->where('compound_id', $compoundId)))
            ->where(function ($q) use ($query, $terms) {
                $q->where('plate', 'like', "%{$query}%")
                    ->orWhere('plate_normalized', 'like', "%{$terms['normalized']}%")
                    ->orWhere('make', 'like', "%{$query}%")
                    ->orWhere('model', 'like', "%{$query}%")
                    ->orWhere('color', 'like', "%{$query}%")
                    ->orWhereHas('unit', function ($unitQuery) use ($query) {
                        $unitQuery->where('unit_number', 'like', "%{$query}%")
                            ->orWhereHas('building', fn ($buildingQuery) => $buildingQuery->where('name', 'like', "%{$query}%"))
                            ->orWhereHas('apartmentResidents', function ($residentQuery) use ($query) {
                                $residentQuery->where('resident_name', 'like', "%{$query}%")
                                    ->orWhere('resident_email', 'like', "%{$query}%")
                                    ->orWhere('resident_phone', 'like', "%{$query}%")
                                    ->orWhereHas('user', function ($userQuery) use ($query) {
                                        $userQuery->where('name', 'like', "%{$query}%")
                                            ->orWhere('email', 'like', "%{$query}%")
                                            ->orWhere('phone', 'like', "%{$query}%");
                                    });
                            });
                    });
                if ($terms['lettersAr'] !== '') {
                    $q->orWhere('plate_letters_ar', 'like', "%{$terms['lettersAr']}%");
                }
                if ($terms['digitsNormalized'] !== '') {
                    $q->orWhere('plate_digits_normalized', 'like', "%{$terms['digitsNormalized']}%");
                }
                $q->orWhere('sticker_code', 'like', "%{$query}%");
            })
            ->with(['unit.building', 'unit.apartmentResidents.user'])
            ->limit(10)
            ->get()
            ->map(fn ($v) => [
                'source' => 'apartment_vehicle',
                'vehicleId' => $v->id,
                'plate' => $v->plate,
                'stickerCode' => $v->sticker_code,
                'make' => $v->make,
                'model' => $v->model,
                'color' => $v->color,
                'unit' => [
                    'id' => $v->unit->id,
                    'unitNumber' => $v->unit->unit_number,
                    'buildingName' => $v->unit->building?->name,
                ],
                'residents' => $v->unit->apartmentResidents->map(fn ($r) => [
                    'id' => $r->user_id,
                    'name' => $r->resident_name ?? $r->user?->name,
                    'phone' => $r->resident_phone ?? $r->user?->phone,
                    'email' => $r->resident_email ?? $r->user?->email,
                ]),
            ]);

        // 2. Search Recent Visitor Vehicles (last 30 days)
        $visitorVehicles = VisitorRequest::query()
            ->when($compoundId, fn ($q) => $q->whereHas('unit', fn ($u) => $u->where('compound_id', $compoundId)))
            ->whereNotNull('vehicle_plate')
            ->where(function ($q) use ($query) {
                $q->where('vehicle_plate', 'like', "%{$query}%")
                    ->orWhereHas('unit', function ($unitQuery) use ($query) {
                        $unitQuery->where('unit_number', 'like', "%{$query}%")
                            ->orWhereHas('building', fn ($buildingQuery) => $buildingQuery->where('name', 'like', "%{$query}%"));
                    })
                    ->orWhereHas('host', function ($hostQuery) use ($query) {
                        $hostQuery->where('name', 'like', "%{$query}%")
                            ->orWhere('email', 'like', "%{$query}%")
                            ->orWhere('phone', 'like', "%{$query}%");
                    });
            })
            ->where('created_at', '>', now()->subDays(30))
            ->with(['unit.building', 'host'])
            ->limit(10)
            ->get()
            ->map(fn ($v) => [
                'source' => 'visitor_request',
                'vehicleId' => $v->id,
                'plate' => $v->vehicle_plate,
                'stickerCode' => null,
                'make' => null,
                'model' => null,
                'color' => null,
                'unit' => [
                    'id' => $v->unit->id,
                    'unitNumber' => $v->unit->unit_number,
                    'buildingName' => $v->unit->building?->name,
                ],
                'residents' => [
                    [
                        'id' => $v->host_user_id,
                        'name' => $v->host?->name,
                        'phone' => $v->host?->phone,
                        'email' => $v->host?->email,
                    ],
                ],
            ]);

        $combined = $residentVehicles->concat($visitorVehicles)
            ->unique(fn ($v) => $v['source'].'-'.$v['vehicleId'])
            ->values();

        return response()->json(['data' => $combined]);
    }
}
