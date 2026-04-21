<?php

namespace App\Http\Resources\Finance;

use App\Http\Resources\UserResource;
use App\Models\Finance\PaymentSubmission;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin PaymentSubmission
 */
class PaymentSubmissionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'unitAccountId' => $this->unit_account_id,
            'unitAccount' => UnitAccountResource::make($this->whenLoaded('unitAccount')),
            'submittedBy' => $this->submitted_by,
            'submitter' => UserResource::make($this->whenLoaded('submitter')),
            'amount' => $this->amount,
            'currency' => $this->currency,
            'method' => $this->method,
            'reference' => $this->reference,
            'hasProof' => filled($this->proof_path),
            'status' => $this->status->value,
            'notes' => $this->notes,
            'metadata' => $this->metadata ?? [],
            'reviewedBy' => $this->reviewed_by,
            'reviewer' => UserResource::make($this->whenLoaded('reviewer')),
            'reviewedAt' => $this->reviewed_at?->toJSON(),
            'rejectionReason' => $this->rejection_reason,
            'createdAt' => $this->created_at?->toJSON(),
            'updatedAt' => $this->updated_at?->toJSON(),
        ];
    }
}
