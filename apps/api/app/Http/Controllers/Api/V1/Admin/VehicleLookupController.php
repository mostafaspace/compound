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

        $compoundId = $this->contextService->getCompoundId();

        // 1. Search Resident Vehicles
        $terms = $this->normalizer->searchTerms($query);

        $residentVehicles = ApartmentVehicle::query()
            ->whereHas('unit', fn ($q) => $q->where('compound_id', $compoundId))
            ->where(function ($q) use ($query, $terms) {
                $q->where('plate', 'like', "%{$query}%")
                    ->orWhere('plate_normalized', 'like', "%{$terms['normalized']}%");
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
            ->whereHas('unit', fn ($q) => $q->where('compound_id', $compoundId))
            ->where('vehicle_plate', 'like', "%{$query}%")
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
