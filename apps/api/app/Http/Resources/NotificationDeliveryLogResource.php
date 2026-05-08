<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class NotificationDeliveryLogResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'notificationId' => $this->notification_id,
            'channel' => $this->channel->value,
            'status' => $this->status->value,
            'statusLabel' => $this->status->label(),
            'recipient' => $this->recipient,
            'provider' => $this->provider,
            'providerResponse' => $this->provider_response,
            'errorMessage' => $this->error_message,
            'attemptNumber' => $this->attempt_number,
            'createdAt' => $this->created_at->toIso8601String(),
        ];
    }
}
