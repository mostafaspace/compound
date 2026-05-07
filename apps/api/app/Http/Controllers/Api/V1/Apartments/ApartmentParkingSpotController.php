<?php

namespace App\Http\Controllers\Api\V1\Apartments;

use App\Http\Controllers\Controller;
use App\Http\Requests\Apartments\StoreApartmentParkingSpotRequest;
use App\Http\Requests\Apartments\UpdateApartmentParkingSpotRequest;
use App\Http\Resources\Apartments\ApartmentParkingSpotResource;
use App\Models\Apartments\ApartmentParkingSpot;
use App\Models\Property\Unit;
use App\Services\Apartments\Exceptions\CapabilityDisabledException;
use App\Services\Apartments\Exceptions\CapacityExceededException;
use App\Services\Apartments\ParkingSpotService;
use Illuminate\Http\Request;

class ApartmentParkingSpotController extends Controller
{
    public function __construct(private readonly ParkingSpotService $service) {}

    public function index(Request $request, Unit $unit)
    {
        $this->authorize('view', $unit);

        return ApartmentParkingSpotResource::collection(
            $unit->apartmentParkingSpots()->get()
        );
    }

    public function store(StoreApartmentParkingSpotRequest $request, Unit $unit)
    {
        $this->authorize('manage', $unit);

        try {
            $spot = $this->service->create($unit, $request->user(), $request->validated());
        } catch (CapabilityDisabledException $exception) {
            abort(422, $exception->getMessage());
        } catch (CapacityExceededException $exception) {
            abort(409, $exception->getMessage());
        }

        return (new ApartmentParkingSpotResource($spot))->response()->setStatusCode(201);
    }

    public function update(UpdateApartmentParkingSpotRequest $request, Unit $unit, ApartmentParkingSpot $parkingSpot)
    {
        abort_if($parkingSpot->unit_id !== $unit->id, 404);

        $this->authorize('manage', $unit);

        $updated = $this->service->update($parkingSpot, $request->validated());

        return new ApartmentParkingSpotResource($updated);
    }

    public function destroy(Request $request, Unit $unit, ApartmentParkingSpot $parkingSpot)
    {
        abort_if($parkingSpot->unit_id !== $unit->id, 404);

        $this->authorize('manage', $unit);

        $this->service->delete($parkingSpot);

        return response()->noContent();
    }
}
