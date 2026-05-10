<?php

namespace App\Http\Controllers\Api\V1\Admin\Apartments;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Apartments\StorePenaltyPointRequest;
use App\Http\Requests\Admin\Apartments\VoidPenaltyPointRequest;
use App\Http\Resources\Apartments\ApartmentPenaltyEventResource;
use App\Models\Apartments\ApartmentPenaltyEvent;
use App\Models\Property\Unit;
use App\Services\Apartments\PenaltyPointService;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ApartmentPenaltyPointController extends Controller
{
    public function __construct(private readonly PenaltyPointService $service) {}

    public function index(Unit $unit): AnonymousResourceCollection
    {
        $this->authorize('manage_apartment_penalty_points');

        $events = $unit->apartmentPenaltyEvents()
            ->latest()
            ->paginate();

        return ApartmentPenaltyEventResource::collection($events);
    }

    public function store(StorePenaltyPointRequest $request, Unit $unit): ApartmentPenaltyEventResource
    {
        $this->authorize('manage_apartment_penalty_points');

        $event = $this->service->add($unit, $request->user(), $request->validated());

        return new ApartmentPenaltyEventResource($event);
    }

    public function void(VoidPenaltyPointRequest $request, ApartmentPenaltyEvent $event): ApartmentPenaltyEventResource
    {
        $this->authorize('manage_apartment_penalty_points');

        $event = $this->service->void($event, $request->user(), $request->input('reason'));

        return new ApartmentPenaltyEventResource($event);
    }
}
