<?php

namespace App\Http\Resources\Finance;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ExpenseApprovalResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'action' => $this->action,
            'reason' => $this->reason,
            'actor' => $this->whenLoaded('actor', fn () => [
                'id' => $this->actor->id,
                'name' => $this->actor->name,
            ]),
            'createdAt' => $this->created_at,
        ];
    }
}
