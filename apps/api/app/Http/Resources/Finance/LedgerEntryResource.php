<?php

namespace App\Http\Resources\Finance;

use App\Http\Resources\UserResource;
use App\Models\Finance\LedgerEntry;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin LedgerEntry
 */
class LedgerEntryResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'unitAccountId' => $this->unit_account_id,
            'type' => $this->type->value,
            'amount' => $this->amount,
            'description' => $this->description,
            'referenceType' => $this->reference_type,
            'referenceId' => $this->reference_id,
            'createdBy' => $this->created_by,
            'creator' => UserResource::make($this->whenLoaded('creator')),
            'createdAt' => $this->created_at?->toJSON(),
            'updatedAt' => $this->updated_at?->toJSON(),
        ];
    }
}
