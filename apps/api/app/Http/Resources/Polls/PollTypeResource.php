<?php

namespace App\Http\Resources\Polls;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PollTypeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'compoundId' => $this->compound_id,
            'name' => $this->name,
            'description' => $this->description,
            'color' => $this->color,
            'isActive' => $this->is_active,
            'sortOrder' => $this->sort_order,
            'createdAt' => $this->created_at?->toJSON(),
        ];
    }
}
