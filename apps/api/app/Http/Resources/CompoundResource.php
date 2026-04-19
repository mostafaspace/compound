<?php

namespace App\Http\Resources;

use App\Models\Property\Compound;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Compound
 */
class CompoundResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'legalName' => $this->legal_name,
            'code' => $this->code,
            'timezone' => $this->timezone,
            'currency' => $this->currency,
            'status' => $this->status->value,
            'buildingsCount' => $this->whenCounted('buildings'),
            'unitsCount' => $this->whenCounted('units'),
            'buildings' => BuildingResource::collection($this->whenLoaded('buildings')),
            'createdAt' => $this->created_at?->toJSON(),
            'updatedAt' => $this->updated_at?->toJSON(),
        ];
    }
}
