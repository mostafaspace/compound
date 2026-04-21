<?php

namespace App\Http\Resources\Finance;

use App\Models\Finance\RecurringCharge;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin RecurringCharge
 */
class RecurringChargeResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'compoundId' => $this->compound_id,
            'chargeTypeId' => $this->charge_type_id,
            'chargeType' => ChargeTypeResource::make($this->whenLoaded('chargeType')),
            'name' => $this->name,
            'amount' => $this->amount,
            'currency' => $this->currency,
            'frequency' => $this->frequency?->value,
            'billingDay' => $this->billing_day,
            'targetType' => $this->target_type,
            'targetIds' => $this->target_ids,
            'startsAt' => $this->starts_at?->toDateString(),
            'endsAt' => $this->ends_at?->toDateString(),
            'isActive' => $this->is_active,
            'lastRunAt' => $this->last_run_at?->toJSON(),
            'createdBy' => $this->created_by,
            'createdAt' => $this->created_at?->toJSON(),
        ];
    }
}
