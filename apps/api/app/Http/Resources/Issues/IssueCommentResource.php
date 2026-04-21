<?php

namespace App\Http\Resources\Issues;

use App\Http\Resources\UserResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class IssueCommentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'issueId' => $this->issue_id,
            'userId' => $this->user_id,
            'user' => UserResource::make($this->whenLoaded('user')),
            'body' => $this->body,
            'isInternal' => $this->is_internal,
            'createdAt' => $this->created_at?->toIso8601String(),
        ];
    }
}
