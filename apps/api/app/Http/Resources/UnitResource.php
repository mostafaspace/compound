<?php

namespace App\Http\Resources;

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
            'buildingId' => $this->building_id,
            'floorId' => $this->floor_id,
            'unitNumber' => $this->unit_number,
            'type' => $this->type->value,
            'areaSqm' => $this->area_sqm,
            'bedrooms' => $this->bedrooms,
            'status' => $this->status->value,
            'createdAt' => $this->created_at?->toJSON(),
            'updatedAt' => $this->updated_at?->toJSON(),
        ];
    }
}
