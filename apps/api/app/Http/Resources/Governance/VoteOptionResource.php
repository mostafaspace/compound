<?php

namespace App\Http\Resources\Governance;

use App\Models\Governance\VoteOption;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin VoteOption
 */
class VoteOptionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'label' => $this->label,
            'sortOrder' => $this->sort_order,
        ];
    }
}
