<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class NotificationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'userId' => $this->user_id,
            'category' => $this->category->value,
            'channel' => $this->channel,
            'priority' => $this->priority,
            'title' => $this->title,
            'body' => $this->body,
            'metadata' => $this->metadata ?? [],
            'readAt' => $this->read_at?->toIso8601String(),
            'archivedAt' => $this->archived_at?->toIso8601String(),
            'deliveredAt' => $this->delivered_at?->toIso8601String(),
            'deliveryAttempts' => $this->delivery_attempts,
            'lastDeliveryError' => $this->last_delivery_error,
            'createdAt' => $this->created_at->toIso8601String(),
        ];
    }
}
