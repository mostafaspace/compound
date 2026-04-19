<?php

namespace App\Http\Resources;

use App\Models\ResidentInvitation;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ResidentInvitation
 */
class ResidentInvitationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'email' => $this->email,
            'role' => $this->role,
            'relationType' => $this->relation_type,
            'status' => $this->effectiveStatus()->value,
            'expiresAt' => $this->expires_at?->toJSON(),
            'acceptedAt' => $this->accepted_at?->toJSON(),
            'revokedAt' => $this->revoked_at?->toJSON(),
            'lastSentAt' => $this->last_sent_at?->toJSON(),
            'deliveryCount' => $this->delivery_count,
            'user' => UserResource::make($this->whenLoaded('user')),
            'unit' => UnitResource::make($this->whenLoaded('unit')),
            'createdAt' => $this->created_at?->toJSON(),
            'updatedAt' => $this->updated_at?->toJSON(),
        ];
    }
}
