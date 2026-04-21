<?php

namespace App\Http\Resources\Finance;

use App\Http\Resources\UnitResource;
use App\Models\Finance\UnitAccount;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin UnitAccount
 */
class UnitAccountResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'unitId' => $this->unit_id,
            'unit' => UnitResource::make($this->whenLoaded('unit')),
            'balance' => $this->balance,
            'currency' => $this->currency,
            'ledgerEntries' => LedgerEntryResource::collection($this->whenLoaded('ledgerEntries')),
            'paymentSubmissions' => PaymentSubmissionResource::collection($this->whenLoaded('paymentSubmissions')),
            'createdAt' => $this->created_at?->toJSON(),
            'updatedAt' => $this->updated_at?->toJSON(),
        ];
    }
}
