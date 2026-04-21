<?php

namespace App\Http\Resources;

use App\Models\Property\UnitMembership;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin UnitMembership
 */
class UnitMembershipResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'unitId' => $this->unit_id,
            'unit' => UnitResource::make($this->whenLoaded('unit')),
            'userId' => $this->user_id,
            'user' => UserResource::make($this->whenLoaded('user')),
            'relationType' => $this->relation_type->value,
            'startsAt' => $this->starts_at?->toDateString(),
            'endsAt' => $this->ends_at?->toDateString(),
            'isPrimary' => $this->is_primary,
            'verificationStatus' => $this->verification_status->value,
            'createdAt' => $this->created_at?->toJSON(),
            'updatedAt' => $this->updated_at?->toJSON(),
        ];
    }
}
