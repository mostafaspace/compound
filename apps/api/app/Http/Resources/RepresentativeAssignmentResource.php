<?php

namespace App\Http\Resources;

use App\Models\RepresentativeAssignment;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin RepresentativeAssignment
 */
class RepresentativeAssignmentResource extends JsonResource
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
            'userId' => $this->user_id,
            'user' => UserResource::make($this->whenLoaded('user')),
            'role' => $this->role->value,
            'roleKey' => $this->role->value,
            'scopeLevel' => $this->role->scopeLevel(),
            'building' => BuildingResource::make($this->whenLoaded('building')),
            'floor' => FloorResource::make($this->whenLoaded('floor')),
            'startsAt' => $this->starts_at?->toDateString(),
            'endsAt' => $this->ends_at?->toDateString(),
            'isActive' => $this->is_active,
            'contactVisibility' => $this->contact_visibility->value,
            'contactVisibilityKey' => $this->contact_visibility->value,
            'appointedBy' => $this->appointed_by,
            'appointedByUser' => UserResource::make($this->whenLoaded('appointedByUser')),
            'notes' => $this->notes,
            'createdAt' => $this->created_at?->toJSON(),
            'updatedAt' => $this->updated_at?->toJSON(),
        ];
    }
}
