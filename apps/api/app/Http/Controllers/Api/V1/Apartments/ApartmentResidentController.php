<?php

namespace App\Http\Controllers\Api\V1\Apartments;

use App\Http\Controllers\Controller;
use App\Http\Requests\Apartments\StoreApartmentResidentRequest;
use App\Http\Requests\Apartments\UpdateApartmentResidentRequest;
use App\Http\Resources\Apartments\ApartmentResidentResource;
use App\Models\Apartments\ApartmentResident;
use App\Models\Property\Unit;
use App\Services\Apartments\ResidentService;
use Illuminate\Http\Request;

class ApartmentResidentController extends Controller
{
    public function __construct(private readonly ResidentService $service) {}

    public function index(Request $request, Unit $unit)
    {
        $this->authorize('view', $unit);

        return ApartmentResidentResource::collection(
            $unit->apartmentResidents()->with('user')->get()
        );
    }

    public function store(StoreApartmentResidentRequest $request, Unit $unit)
    {
        $this->authorize('manage', $unit);

        $resident = $this->service->create($unit, $request->user(), $request->validated());

        return (new ApartmentResidentResource($resident->load('user')))->response()->setStatusCode(201);
    }

    public function update(UpdateApartmentResidentRequest $request, Unit $unit, ApartmentResident $resident)
    {
        abort_if($resident->unit_id !== $unit->id, 404);

        $this->authorize('manage', $unit);

        $updated = $this->service->update($resident, $request->user(), $request->validated());

        return new ApartmentResidentResource($updated->load('user'));
    }

    public function destroy(Request $request, Unit $unit, ApartmentResident $resident)
    {
        abort_if($resident->unit_id !== $unit->id, 404);

        $this->authorize('manage', $unit);

        $this->service->delete($resident);

        return response()->noContent();
    }
}
