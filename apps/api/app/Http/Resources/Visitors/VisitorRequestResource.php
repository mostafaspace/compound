<?php

namespace App\Http\Resources\Visitors;

use App\Http\Resources\UserResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class VisitorRequestResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'hostUserId' => $this->host_user_id,
            'host' => UserResource::make($this->whenLoaded('host')),
            'unitId' => $this->unit_id,
            'unit' => $this->whenLoaded('unit', fn () => [
                'id' => $this->unit->id,
                'compoundId' => $this->unit->compound_id,
                'buildingId' => $this->unit->building_id,
                'floorId' => $this->unit->floor_id,
                'unitNumber' => $this->unit->unit_number,
                'buildingName' => $this->unit->building?->name,
                'compoundName' => $this->unit->building?->compound?->name,
            ]),
            'visitorName' => $this->visitor_name,
            'visitorPhone' => $this->visitor_phone,
            'vehiclePlate' => $this->vehicle_plate,
            'visitStartsAt' => $this->visit_starts_at?->toIso8601String(),
            'visitEndsAt' => $this->visit_ends_at?->toIso8601String(),
            'notes' => $this->notes,
            'status' => $this->status->value,
            'pass' => VisitorPassResource::make($this->whenLoaded('pass')),
            'qrToken' => $this->when(isset($this->qr_token), $this->qr_token),
            'arrivedAt' => $this->arrived_at?->toIso8601String(),
            'allowedAt' => $this->allowed_at?->toIso8601String(),
            'deniedAt' => $this->denied_at?->toIso8601String(),
            'completedAt' => $this->completed_at?->toIso8601String(),
            'cancelledAt' => $this->cancelled_at?->toIso8601String(),
            'decisionReason' => $this->decision_reason,
            'createdAt' => $this->created_at?->toIso8601String(),
            'updatedAt' => $this->updated_at?->toIso8601String(),
        ];
    }
}
