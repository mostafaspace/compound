<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Property\StoreUnitRequest;
use App\Http\Requests\Property\UpdateUnitRequest;
use App\Http\Resources\UnitResource;
use App\Models\Property\Building;
use App\Models\Property\Unit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\Response;

class UnitController extends Controller
{
    public function index(Building $building): AnonymousResourceCollection
    {
        $units = $building->units()
            ->orderBy('unit_number')
            ->paginate();

        return UnitResource::collection($units);
    }

    public function store(StoreUnitRequest $request, Building $building): JsonResponse
    {
        $validated = $request->validated();

        $unit = $building->units()->create([
            'compound_id' => $building->compound_id,
            'floor_id' => $validated['floorId'] ?? null,
            'unit_number' => $validated['unitNumber'],
            'type' => $validated['type'],
            'area_sqm' => $validated['areaSqm'] ?? null,
            'bedrooms' => $validated['bedrooms'] ?? null,
            'status' => $validated['status'] ?? 'active',
        ]);

        return UnitResource::make($unit)
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(Unit $unit): UnitResource
    {
        return UnitResource::make($unit);
    }

    public function update(UpdateUnitRequest $request, Unit $unit): UnitResource
    {
        $validated = $request->validated();

        $unit->fill([
            'floor_id' => array_key_exists('floorId', $validated) ? $validated['floorId'] : $unit->floor_id,
            'unit_number' => $validated['unitNumber'] ?? $unit->unit_number,
            'type' => $validated['type'] ?? $unit->type,
            'area_sqm' => array_key_exists('areaSqm', $validated) ? $validated['areaSqm'] : $unit->area_sqm,
            'bedrooms' => array_key_exists('bedrooms', $validated) ? $validated['bedrooms'] : $unit->bedrooms,
            'status' => $validated['status'] ?? $unit->status,
        ])->save();

        return UnitResource::make($unit->refresh());
    }
}
