<?php

namespace App\Http\Resources\Finance;

use App\Models\Finance\PaymentSession;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin PaymentSession */
class PaymentSessionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                  => $this->id,
            'unitAccount'         => $this->whenLoaded('unitAccount', fn () => [
                'id'   => $this->unitAccount->id,
                'unit' => $this->unitAccount->unit?->only('id', 'unit_number'),
            ]),
            'provider'            => $this->provider,
            'providerSessionId'   => $this->provider_session_id,
            'amount'              => $this->amount,
            'currency'            => $this->currency,
            'status'              => $this->status->value,
            'statusLabel'         => $this->statusLabel(),
            'redirectUrl'         => $this->provider_metadata['redirect_url'] ?? null,
            'expiresAt'           => $this->expires_at?->toIso8601String(),
            'createdAt'           => $this->created_at->toIso8601String(),
        ];
    }

    private function statusLabel(): string
    {
        return match ($this->status->value) {
            'pending'   => 'Pending',
            'confirmed' => 'Confirmed',
            'failed'    => 'Failed',
            'expired'   => 'Expired',
            'refunded'  => 'Refunded',
            default     => ucfirst($this->status->value),
        };
    }
}
