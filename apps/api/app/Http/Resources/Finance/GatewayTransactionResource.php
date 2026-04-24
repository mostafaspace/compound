<?php

namespace App\Http\Resources\Finance;

use App\Models\Finance\GatewayTransaction;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin GatewayTransaction */
class GatewayTransactionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                    => $this->id,
            'provider'              => $this->provider,
            'providerTransactionId' => $this->provider_transaction_id,
            'eventType'             => $this->event_type,
            'status'                => $this->status->value,
            'statusLabel'           => ucfirst($this->status->value),
            'amount'                => $this->amount,
            'currency'              => $this->currency,
            'processed'             => $this->processed,
            'paymentSubmissionId'   => $this->payment_submission_id,
            'createdAt'             => $this->created_at->toIso8601String(),
        ];
    }
}
