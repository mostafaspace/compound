<?php

namespace App\Http\Resources\Apartments;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ApartmentPenaltyEventResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'unitId' => $this->unit_id,
            'violationRuleId' => $this->violation_rule_id,
            'points' => $this->points,
            'reason' => $this->reason,
            'notes' => $this->notes,
            'expiresAt' => $this->expires_at?->toIso8601String(),
            'voidedAt' => $this->voided_at?->toIso8601String(),
            'voidReason' => $this->void_reason,
            'createdAt' => $this->created_at?->toIso8601String(),
        ];
    }
}
