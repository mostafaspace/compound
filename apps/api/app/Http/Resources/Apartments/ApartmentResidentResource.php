<?php

namespace App\Http\Resources\Apartments;

use App\Http\Resources\UnitResource;
use App\Http\Resources\UserResource;
use App\Models\Apartments\ApartmentResident;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ApartmentResident
 */
class ApartmentResidentResource extends JsonResource
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
            'photoPath' => $this->photo_path,
            'createdAt' => $this->created_at?->toJSON(),
            'updatedAt' => $this->updated_at?->toJSON(),
        ];
    }
}
