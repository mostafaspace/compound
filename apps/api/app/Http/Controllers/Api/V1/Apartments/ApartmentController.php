<?php

namespace App\Http\Controllers\Api\V1\Apartments;

use App\Enums\LedgerEntryType;
use App\Enums\VerificationStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\Apartments\ApartmentResource;
use App\Models\Apartments\ApartmentResident;
use App\Models\Property\Unit;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ApartmentController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $unitIds = ApartmentResident::query()
            ->active()
            ->where('user_id', $request->user()->id)
            ->where('verification_status', VerificationStatus::Verified->value)
            ->pluck('unit_id')
            ->unique();

        $units = Unit::query()
            ->whereIn('id', $unitIds)
            ->with(['building', 'floor'])
            ->get();

        return ApartmentResource::collection($units);
    }

    public function show(Request $request, Unit $unit): ApartmentResource
    {
        $this->authorize('view', $unit);

        $unit->load([
            'building',
            'floor',
            'apartmentResidents' => fn ($query) => $query->with('user'),
            'apartmentVehicles',
            'apartmentParkingSpots',
            'apartmentNotes' => fn ($query) => $query->latest()->limit(20)->with('author:id,name'),
            'apartmentDocuments' => fn ($query) => $query->where('status', 'active'),
            'unitAccount.ledgerEntries' => fn ($query) => $query
                ->whereIn('type', [LedgerEntryType::Charge->value, LedgerEntryType::Penalty->value])
                ->where('amount', '>', 0)
                ->limit(50),
        ]);

        return new ApartmentResource($unit);
    }
}
