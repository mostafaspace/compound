<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AdminSessionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'ipAddress' => $this->ip_address,
            'userAgent' => $this->user_agent,
            'deviceLabel' => $this->device_label,
            'firstSeenAt' => $this->first_seen_at?->toIso8601String(),
            'lastSeenAt' => $this->last_seen_at?->toIso8601String(),
            'revokedAt' => $this->revoked_at?->toIso8601String(),
        ];
    }
}
