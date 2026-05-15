<?php

namespace App\Http\Resources\Finance;

use App\Models\Finance\CollectionCampaign;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin CollectionCampaign
 */
class CollectionCampaignResource extends JsonResource
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
            'description' => $this->description,
            'status' => $this->status?->value,
            'targetAmount' => $this->target_amount,
            'targetType' => $this->target_type,
            'targetIds' => $this->target_ids ?? [],
            'currency' => $this->currency,
            'startedAt' => $this->started_at?->toJSON(),
            'closedAt' => $this->closed_at?->toJSON(),
            'createdAt' => $this->created_at?->toJSON(),
        ];
    }
}
