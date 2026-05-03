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
            'residentName' => $this->resident_name,
            'residentPhone' => $this->resident_phone,
            'phonePublic' => $this->phone_public,
            'residentEmail' => $this->resident_email,
            'emailPublic' => $this->email_public,
            'hasVehicle' => $this->has_vehicle,
            'vehiclePlate' => $this->vehicle_plate,
            'parkingSpotCode' => $this->parking_spot_code,
            'garageStickerCode' => $this->garage_sticker_code,
            'createdAt' => $this->created_at?->toJSON(),
            'updatedAt' => $this->updated_at?->toJSON(),
        ];
    }
}
