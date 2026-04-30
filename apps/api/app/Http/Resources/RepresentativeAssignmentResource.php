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
            'user' => $this->relationLoaded('user') && $this->user
                ? UserResource::make($this->user)->resolve($request)
                : null,
            'role' => $this->role->value,
            'roleKey' => $this->role->value,
            'scopeLevel' => $this->role->scopeLevel(),
            'building' => $this->relationLoaded('building') && $this->building
                ? BuildingResource::make($this->building)->resolve($request)
                : null,
            'floor' => $this->relationLoaded('floor') && $this->floor
                ? FloorResource::make($this->floor)->resolve($request)
                : null,
            'startsAt' => $this->starts_at?->toDateString(),
            'endsAt' => $this->ends_at?->toDateString(),
            'isActive' => $this->is_active,
            'contactVisibility' => $this->contact_visibility->value,
            'contactVisibilityKey' => $this->contact_visibility->value,
            'appointedBy' => $this->appointed_by,
            'appointedByUser' => $this->relationLoaded('appointedByUser') && $this->appointedByUser
                ? UserResource::make($this->appointedByUser)->resolve($request)
                : null,
            'notes' => $this->notes,
            'createdAt' => $this->created_at?->toJSON(),
            'updatedAt' => $this->updated_at?->toJSON(),
        ];
    }
}
