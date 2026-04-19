<?php

namespace App\Http\Resources;

use App\Models\Property\Floor;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Floor
 */
class FloorResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'buildingId' => $this->building_id,
            'label' => $this->label,
            'levelNumber' => $this->level_number,
            'sortOrder' => $this->sort_order,
            'unitsCount' => $this->whenCounted('units'),
            'createdAt' => $this->created_at?->toJSON(),
            'updatedAt' => $this->updated_at?->toJSON(),
        ];
    }
}
