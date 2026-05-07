<?php

namespace App\Http\Resources\Apartments;

use App\Models\Apartments\ApartmentParkingSpot;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ApartmentParkingSpot
 */
class ApartmentParkingSpotResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'unitId' => $this->unit_id,
            'code' => $this->code,
            'notes' => $this->notes,
            'createdBy' => $this->created_by,
            'createdAt' => $this->created_at?->toJSON(),
            'updatedAt' => $this->updated_at?->toJSON(),
        ];
    }
}
