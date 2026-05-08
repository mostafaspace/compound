<?php

namespace App\Http\Controllers\Api\V1\Admin\Apartments;

use App\Enums\LedgerEntryType;
use App\Http\Controllers\Controller;
use App\Http\Resources\Apartments\ApartmentResource;
use App\Models\Apartments\ViolationRule;
use App\Models\Property\Unit;
use Illuminate\Support\Facades\Gate;

class ApartmentController extends Controller
{
    public function show(Unit $unit): ApartmentResource
    {
        Gate::authorize('manage', ViolationRule::class);

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
