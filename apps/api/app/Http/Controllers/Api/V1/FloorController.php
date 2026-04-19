<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Property\StoreFloorRequest;
use App\Http\Requests\Property\UpdateFloorRequest;
use App\Http\Resources\FloorResource;
use App\Models\Property\Building;
use App\Models\Property\Floor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\Response;

class FloorController extends Controller
{
    public function index(Building $building): AnonymousResourceCollection
    {
        $floors = $building->floors()
            ->withCount('units')
            ->orderBy('sort_order')
            ->orderBy('level_number')
            ->paginate();

        return FloorResource::collection($floors);
    }

    public function store(StoreFloorRequest $request, Building $building): JsonResponse
    {
        $validated = $request->validated();

        $floor = $building->floors()->create([
            'label' => $validated['label'],
            'level_number' => $validated['levelNumber'],
            'sort_order' => $validated['sortOrder'] ?? 0,
        ]);

        return FloorResource::make($floor->loadCount('units'))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(Floor $floor): FloorResource
    {
        return FloorResource::make($floor->loadCount('units'));
    }

    public function update(UpdateFloorRequest $request, Floor $floor): FloorResource
    {
        $validated = $request->validated();

        $floor->fill([
            'label' => $validated['label'] ?? $floor->label,
            'level_number' => $validated['levelNumber'] ?? $floor->level_number,
            'sort_order' => array_key_exists('sortOrder', $validated) ? $validated['sortOrder'] : $floor->sort_order,
        ])->save();

        return FloorResource::make($floor->refresh()->loadCount('units'));
    }
}
