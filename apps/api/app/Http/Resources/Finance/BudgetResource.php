<?php

namespace App\Http\Resources\Finance;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BudgetResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'periodType' => $this->period_type,
            'periodYear' => $this->period_year,
            'periodMonth' => $this->period_month,
            'status' => $this->status,
            'statusLabel' => $this->status->label(),
            'notes' => $this->notes,
            'totalPlanned' => $this->totalPlanned(),
            'totalActual' => $this->totalActual(),
            'categories' => BudgetCategoryResource::collection($this->whenLoaded('categories')),
            'createdAt' => $this->created_at,
            'closedAt' => $this->closed_at,
        ];
    }
}
