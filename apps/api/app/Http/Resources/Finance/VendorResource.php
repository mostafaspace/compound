<?php

namespace App\Http\Resources\Finance;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class VendorResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'type' => $this->type,
            'typeLabel' => $this->type->label(),
            'contactName' => $this->contact_name,
            'phone' => $this->phone,
            'email' => $this->email,
            'notes' => $this->notes,
            'isActive' => $this->is_active,
            'createdAt' => $this->created_at,
        ];
    }
}
