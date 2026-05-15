<?php

namespace App\Http\Resources;

use App\Http\Resources\Apartments\ApartmentResidentResource;
use App\Models\Property\Unit;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Unit
 */
class UnitResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $currentResidents = $this->relationLoaded('apartmentResidents')
            ? $this->apartmentResidents
                ->filter(fn ($membership): bool => $this->isCurrentMembership($membership))
                ->map(fn ($membership): ?string => $membership->resident_name ?: $membership->user?->name)
                ->filter()
                ->values()
            : collect();

        return [
            'id' => $this->id,
            'compoundId' => $this->compound_id,
            'compound' => CompoundResource::make($this->whenLoaded('compound')),
            'buildingId' => $this->building_id,
            'building' => BuildingResource::make($this->whenLoaded('building')),
            'floorId' => $this->floor_id,
            'floor' => FloorResource::make($this->whenLoaded('floor')),
            'unitNumber' => $this->unit_number,
            'type' => $this->type->value,
            'bedrooms' => $this->bedrooms,
            'status' => $this->status->value,
            'hasParking' => $this->has_parking,
            'residentName' => $currentResidents->isNotEmpty() ? $currentResidents->join(', ') : null,
            'residentsCount' => $currentResidents->count(),
            'apartmentResidents' => ApartmentResidentResource::collection($this->whenLoaded('apartmentResidents')),
            'memberships' => ApartmentResidentResource::collection($this->whenLoaded('apartmentResidents')),
            'archivedAt' => $this->archived_at?->toJSON(),
            'archiveReason' => $this->archive_reason,
            'createdAt' => $this->created_at?->toJSON(),
            'updatedAt' => $this->updated_at?->toJSON(),
        ];
    }

    private function isCurrentMembership(mixed $membership): bool
    {
        if ($membership->starts_at?->isFuture()) {
            return false;
        }

        if ($membership->ends_at?->isPast()) {
            return false;
        }

        return true;
    }
}
