<?php

namespace App\Http\Resources\Issues;

use App\Http\Resources\UserResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class IssueResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'compoundId' => $this->compound_id,
            'buildingId' => $this->building_id,
            'unitId' => $this->unit_id,
            'reportedBy' => $this->reported_by,
            'reporter' => UserResource::make($this->whenLoaded('reporter')),
            'assignedTo' => $this->assigned_to,
            'assignee' => UserResource::make($this->whenLoaded('assignee')),
            'category' => $this->category,
            'title' => $this->title,
            'description' => $this->description,
            'priority' => $this->priority,
            'status' => $this->status,
            'resolvedAt' => $this->resolved_at?->toIso8601String(),
            'attachments' => IssueAttachmentResource::collection($this->whenLoaded('attachments')),
            'comments' => IssueCommentResource::collection($this->whenLoaded('comments')),
            'createdAt' => $this->created_at?->toIso8601String(),
            'updatedAt' => $this->updated_at?->toIso8601String(),
        ];
    }
}
