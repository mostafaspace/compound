<?php

namespace App\Http\Resources;

use App\Models\Property\Building;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Building
 */
class BuildingResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'compoundId' => $this->compound_id,
            'name' => $this->name,
            'code' => $this->code,
            'sortOrder' => $this->sort_order,
            'floorsCount' => $this->whenCounted('floors'),
            'unitsCount' => $this->whenCounted('units'),
            'floors' => FloorResource::collection($this->whenLoaded('floors')),
            'units' => UnitResource::collection($this->whenLoaded('units')),
            'createdAt' => $this->created_at?->toJSON(),
            'updatedAt' => $this->updated_at?->toJSON(),
        ];
    }
}
