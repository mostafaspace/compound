<?php

namespace App\Http\Resources\Visitors;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class VisitorPassResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'visitorRequestId' => $this->visitor_request_id,
            'status' => $this->status->value,
            'expiresAt' => $this->expires_at?->toIso8601String(),
            'maxUses' => $this->max_uses,
            'usesCount' => $this->uses_count,
            'lastUsedAt' => $this->last_used_at?->toIso8601String(),
            'revokedAt' => $this->revoked_at?->toIso8601String(),
            'createdAt' => $this->created_at?->toIso8601String(),
            'updatedAt' => $this->updated_at?->toIso8601String(),
        ];
    }
}
