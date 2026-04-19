<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Property\ArchivePropertyRequest;
use App\Http\Requests\Property\StoreBuildingRequest;
use App\Http\Requests\Property\UpdateBuildingRequest;
use App\Http\Resources\BuildingResource;
use App\Models\Property\Building;
use App\Models\Property\Compound;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\Response;

class BuildingController extends Controller
{
    public function __construct(private readonly AuditLogger $auditLogger) {}

    public function index(Compound $compound): AnonymousResourceCollection
    {
        $buildings = $compound->buildings()
            ->withCount(['floors', 'units'])
            ->orderBy('sort_order')
            ->orderBy('name')
            ->paginate();

        return BuildingResource::collection($buildings);
    }

    public function store(StoreBuildingRequest $request, Compound $compound): JsonResponse
    {
        $validated = $request->validated();

        $building = $compound->buildings()->create([
            'name' => $validated['name'],
            'code' => strtoupper($validated['code']),
            'sort_order' => $validated['sortOrder'] ?? 0,
        ]);

        return BuildingResource::make($building->loadCount(['floors', 'units']))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(Building $building): BuildingResource
    {
        $building->load([
            'floors' => fn ($query) => $query->withCount('units')->orderBy('sort_order')->orderBy('level_number'),
            'units' => fn ($query) => $query->orderBy('unit_number'),
        ])->loadCount(['floors', 'units']);

        return BuildingResource::make($building);
    }

    public function update(UpdateBuildingRequest $request, Building $building): BuildingResource
    {
        $validated = $request->validated();

        $building->fill([
            'name' => $validated['name'] ?? $building->name,
            'code' => isset($validated['code']) ? strtoupper($validated['code']) : $building->code,
            'sort_order' => array_key_exists('sortOrder', $validated) ? $validated['sortOrder'] : $building->sort_order,
        ])->save();

        return BuildingResource::make($building->refresh()->loadCount(['floors', 'units']));
    }

    public function archive(ArchivePropertyRequest $request, Building $building): BuildingResource
    {
        $validated = $request->validated();

        $building->forceFill([
            'archived_at' => now(),
            'archived_by' => $request->user()?->id,
            'archive_reason' => $validated['reason'] ?? null,
        ])->save();

        $this->auditLogger->record('property.building_archived', actor: $request->user(), request: $request, metadata: [
            'building_id' => $building->id,
            'reason' => $validated['reason'] ?? null,
        ]);

        return BuildingResource::make($building->refresh()->loadCount(['floors', 'units']));
    }
}
