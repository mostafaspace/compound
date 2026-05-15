<?php

namespace App\Http\Resources\Apartments;

use App\Enums\ApartmentDocumentStatus;
use App\Enums\ApartmentViolationStatus;
use App\Enums\LedgerEntryType;
use App\Http\Resources\Finance\LedgerEntryResource;
use App\Http\Resources\Finance\UnitAccountResource;
use App\Models\Apartments\ApartmentDocument;
use App\Models\Apartments\ApartmentNote;
use App\Models\Apartments\ApartmentParkingSpot;
use App\Models\Apartments\ApartmentResident;
use App\Models\Apartments\ApartmentVehicle;
use App\Models\Apartments\ApartmentViolation;
use App\Models\Finance\LedgerEntry;
use App\Models\Finance\UnitAccount;
use App\Models\Property\Unit;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Unit
 */
class ApartmentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $account = $this->relationLoaded('unitAccount') ? $this->unitAccount : UnitAccount::query()->where('unit_id', $this->id)->first();
        $outstandingEntries = $account && $account->relationLoaded('ledgerEntries')
            ? $account->ledgerEntries
            : ($account ? LedgerEntry::query()
                ->where('unit_account_id', $account->id)
                ->whereIn('type', [LedgerEntryType::Charge->value, LedgerEntryType::Penalty->value])
                ->where('amount', '>', 0)
                ->whereDoesntHave('paymentAllocations', function ($q): void {
                    $q->whereHas('paymentSubmission', function ($sq): void {
                        $sq->whereIn('status', ['submitted', 'under_review', 'approved']);
                    });
                })
                ->latest()
                ->limit(50)
                ->get() : collect());

        return [
            'id' => $this->id,
            'unit' => [
                'id' => $this->id,
                'compoundId' => $this->compound_id,
                'buildingId' => $this->building_id,
                'floorId' => $this->floor_id,
                'unitNumber' => $this->unit_number,
                'type' => $this->type->value,
                'bedrooms' => $this->bedrooms,
                'status' => $this->status->value,
                'hasParking' => $this->has_parking,
            ],
            'residents' => ApartmentResidentResource::collection(
                ApartmentResident::query()->where('unit_id', $this->id)->latest()->get()
            ),
            'vehicles' => ApartmentVehicleResource::collection(
                ApartmentVehicle::query()->where('unit_id', $this->id)->latest()->get()
            ),
            'parkingSpots' => ApartmentParkingSpotResource::collection(
                ApartmentParkingSpot::query()->where('unit_id', $this->id)->latest()->get()
            ),
            'violationsSummary' => $this->violationsSummary(),
            'recentNotes' => ApartmentNoteResource::collection(
                ApartmentNote::query()->where('unit_id', $this->id)->latest()->limit(5)->get()
            ),
            'documents' => ApartmentDocumentResource::collection(
                ApartmentDocument::query()
                    ->where('unit_id', $this->id)
                    ->where('status', ApartmentDocumentStatus::Active->value)
                    ->latest()
                    ->get()
            ),
            'finance' => [
                'account' => UnitAccountResource::make($account),
                'outstandingEntries' => LedgerEntryResource::collection($outstandingEntries),
            ],
        ];
    }

    /**
     * @return array{count: int, total: string}
     */
    private function violationsSummary(): array
    {
        $query = ApartmentViolation::query()
            ->where('unit_id', $this->id)
            ->where('status', ApartmentViolationStatus::Pending->value);

        return [
            'count' => (clone $query)->count(),
            'total' => (string) (clone $query)->sum('fee'),
        ];
    }
}
