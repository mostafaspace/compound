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
            'areaSqm' => $this->area_sqm,
            'bedrooms' => $this->bedrooms,
            'status' => $this->status->value,
            'hasVehicle' => $this->has_vehicle,
            'hasParking' => $this->has_parking,
            'apartmentResidents' => ApartmentResidentResource::collection($this->whenLoaded('apartmentResidents')),
            'archivedAt' => $this->archived_at?->toJSON(),
            'archiveReason' => $this->archive_reason,
            'createdAt' => $this->created_at?->toJSON(),
            'updatedAt' => $this->updated_at?->toJSON(),
        ];
    }
}
