<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DeviceTokenResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'          => $this->id,
            'platform'    => $this->platform->value,
            'deviceName'  => $this->device_name,
            'lastSeenAt'  => $this->last_seen_at?->toIso8601String(),
            'createdAt'   => $this->created_at->toIso8601String(),
        ];
    }
}
