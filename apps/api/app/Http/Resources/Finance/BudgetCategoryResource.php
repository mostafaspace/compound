<?php

namespace App\Http\Resources\Finance;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BudgetCategoryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'plannedAmount' => $this->planned_amount,
            'actualAmount' => $this->actual_amount,
            'variance' => $this->variance(),
            'notes' => $this->notes,
            'createdAt' => $this->created_at,
        ];
    }
}
