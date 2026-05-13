<?php

namespace App\Http\Controllers\Api\V1\Apartments;

use App\Http\Controllers\Controller;
use App\Http\Requests\Apartments\StoreApartmentVehicleRequest;
use App\Http\Requests\Apartments\UpdateApartmentVehicleRequest;
use App\Http\Resources\Apartments\ApartmentVehicleResource;
use App\Models\Apartments\ApartmentVehicle;
use App\Models\Property\Unit;
use App\Services\Apartments\Exceptions\CapacityExceededException;
use App\Services\Apartments\VehicleService;
use Illuminate\Http\Request;

class ApartmentVehicleController extends Controller
{
    public function __construct(private readonly VehicleService $service) {}

    public function index(Request $request, Unit $unit)
    {
        $this->authorize('view', $unit);

        return ApartmentVehicleResource::collection(
            $unit->apartmentVehicles()->get()
        );
    }

    public function store(StoreApartmentVehicleRequest $request, Unit $unit)
    {
        $this->authorize('manage', $unit);

        try {
            $vehicle = $this->service->create($unit, $request->user(), $request->validated());
        } catch (CapacityExceededException $exception) {
            abort(409, $exception->getMessage());
        }

        return (new ApartmentVehicleResource($vehicle))->response()->setStatusCode(201);
    }

    public function update(UpdateApartmentVehicleRequest $request, Unit $unit, ApartmentVehicle $vehicle)
    {
        abort_if($vehicle->unit_id !== $unit->id, 404);

        $this->authorize('manage', $unit);

        $updated = $this->service->update($vehicle, $request->validated());

        return new ApartmentVehicleResource($updated);
    }

    public function destroy(Request $request, Unit $unit, ApartmentVehicle $vehicle)
    {
        abort_if($vehicle->unit_id !== $unit->id, 404);

        $this->authorize('manage', $unit);

        $this->service->delete($vehicle);

        return response()->noContent();
    }
}
