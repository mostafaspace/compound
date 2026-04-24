<?php

namespace App\Http\Resources\Finance;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ReserveFundMovementResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'            => $this->id,
            'type'          => $this->type,
            'typeLabel'     => $this->type->label(),
            'amount'        => $this->amount,
            'description'   => $this->description,
            'reference'     => $this->reference,
            'createdBy'     => $this->whenLoaded('creator', fn () => [
                'id'   => $this->creator->id,
                'name' => $this->creator->name,
            ]),
            'createdAt'     => $this->created_at,
        ];
    }
}
