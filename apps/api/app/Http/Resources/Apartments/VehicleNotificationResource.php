<?php

namespace App\Http\Resources\Apartments;

use App\Models\Apartments\VehicleNotificationRecipient;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin VehicleNotificationRecipient
 */
class VehicleNotificationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $n = $this->notification;
        $senderLabel = match ($n->sender_mode->value) {
            'identified' => optional($n->sender)->name.($n->senderUnit ? " · Unit {$n->senderUnit->unit_number}" : ''),
            'anonymous' => $n->sender_alias ?: 'Another resident',
            'admin' => $n->sender_alias ?: 'Compound Management',
            default => 'Another resident',
        };

        return [
            'id' => $this->id,
            'message' => $n->message,
            'plate' => $n->target_plate_query,
            'senderLabel' => $senderLabel,
            'senderMode' => $n->sender_mode->value,
            'readAt' => $this->read_at?->toIso8601String(),
            'createdAt' => $this->created_at?->toIso8601String(),
        ];
    }
}
