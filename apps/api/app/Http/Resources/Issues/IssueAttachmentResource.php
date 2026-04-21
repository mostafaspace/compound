<?php

namespace App\Http\Resources\Issues;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class IssueAttachmentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'issueId' => $this->issue_id,
            'uploadedBy' => $this->uploaded_by,
            'originalName' => $this->original_name,
            'mimeType' => $this->mime_type,
            'size' => $this->size,
            'createdAt' => $this->created_at?->toIso8601String(),
        ];
    }
}
