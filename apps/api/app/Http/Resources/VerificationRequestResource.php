<?php

namespace App\Http\Resources;

use App\Models\VerificationRequest;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin VerificationRequest
 */
class VerificationRequestResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'userId' => $this->user_id,
            'user' => UserResource::make($this->whenLoaded('user')),
            'residentInvitationId' => $this->resident_invitation_id,
            'residentInvitation' => ResidentInvitationResource::make($this->whenLoaded('residentInvitation')),
            'unitId' => $this->unit_id,
            'unit' => UnitResource::make($this->whenLoaded('unit')),
            'requestedRole' => $this->requested_role,
            'relationType' => $this->relation_type,
            'status' => $this->status->value,
            'submittedAt' => $this->submitted_at?->toJSON(),
            'reviewedBy' => $this->reviewed_by,
            'reviewer' => UserResource::make($this->whenLoaded('reviewer')),
            'reviewedAt' => $this->reviewed_at?->toJSON(),
            'decisionNote' => $this->decision_note,
            'moreInfoNote' => $this->more_info_note,
            'createdAt' => $this->created_at?->toJSON(),
            'updatedAt' => $this->updated_at?->toJSON(),
        ];
    }
}
