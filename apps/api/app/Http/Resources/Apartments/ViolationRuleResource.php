<?php

namespace App\Http\Resources\Apartments;

use App\Http\Resources\UserResource;
use App\Models\Apartments\ViolationRule;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ViolationRule
 */
class ViolationRuleResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'compoundId' => $this->compound_id,
            'name' => $this->name,
            'nameAr' => $this->name_ar,
            'description' => $this->description,
            'defaultFee' => $this->default_fee,
            'isActive' => $this->is_active,
            'createdBy' => $this->created_by,
            'creator' => UserResource::make($this->whenLoaded('creator')),
            'createdAt' => $this->created_at?->toJSON(),
            'updatedAt' => $this->updated_at?->toJSON(),
        ];
    }
}
