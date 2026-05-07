<?php

namespace App\Http\Resources\Apartments;

use App\Http\Resources\UserResource;
use App\Models\Apartments\ApartmentViolation;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ApartmentViolation
 */
class ApartmentViolationResource extends JsonResource
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
            'rule' => ViolationRuleResource::make($this->whenLoaded('rule')),
            'appliedBy' => $this->applied_by,
            'applier' => UserResource::make($this->whenLoaded('applier')),
            'fee' => $this->fee,
            'notes' => $this->notes,
            'status' => $this->status->value,
            'paidAt' => $this->paid_at?->toJSON(),
            'waivedReason' => $this->waived_reason,
            'createdAt' => $this->created_at?->toJSON(),
            'updatedAt' => $this->updated_at?->toJSON(),
        ];
    }
}
