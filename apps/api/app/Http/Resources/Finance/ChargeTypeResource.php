<?php

namespace App\Http\Resources\Finance;

use App\Models\Finance\ChargeType;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ChargeType
 */
class ChargeTypeResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'code' => $this->code,
            'defaultAmount' => $this->default_amount,
            'isRecurring' => $this->is_recurring,
            'createdAt' => $this->created_at?->toJSON(),
        ];
    }
}
