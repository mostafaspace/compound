<?php

namespace App\Http\Resources\Finance;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ExpenseResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'amount' => $this->amount,
            'currency' => $this->currency,
            'expenseDate' => $this->expense_date,
            'status' => $this->status,
            'statusLabel' => $this->status->label(),
            'receiptPath' => $this->receipt_path,
            'rejectionReason' => $this->rejection_reason,
            'budgetCategory' => $this->whenLoaded('budgetCategory', fn () => [
                'id' => $this->budgetCategory->id,
                'name' => $this->budgetCategory->name,
            ]),
            'vendor' => $this->whenLoaded('vendor', fn () => [
                'id' => $this->vendor->id,
                'name' => $this->vendor->name,
            ]),
            'submittedBy' => $this->whenLoaded('submitter', fn () => [
                'id' => $this->submitter->id,
                'name' => $this->submitter->name,
            ]),
            'approvedBy' => $this->whenLoaded('approver', fn () => $this->approver ? [
                'id' => $this->approver->id,
                'name' => $this->approver->name,
            ] : null),
            'approvedAt' => $this->approved_at,
            'approvals' => ExpenseApprovalResource::collection($this->whenLoaded('approvals')),
            'createdAt' => $this->created_at,
        ];
    }
}
