<?php

namespace App\Http\Resources\Polls;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PollOptionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'         => $this->id,
            'label'      => $this->label,
            'sortOrder'  => $this->sort_order,
            'votesCount' => $this->votes_count,
        ];
    }
}
