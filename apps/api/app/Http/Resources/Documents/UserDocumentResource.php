<?php

namespace App\Http\Resources\Documents;

use App\Http\Resources\UnitResource;
use App\Http\Resources\UserResource;
use App\Models\Documents\UserDocument;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin UserDocument
 */
class UserDocumentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'documentTypeId' => $this->document_type_id,
            'documentType' => DocumentTypeResource::make($this->whenLoaded('documentType')),
            'userId' => $this->user_id,
            'user' => UserResource::make($this->whenLoaded('user')),
            'unitId' => $this->unit_id,
            'unit' => UnitResource::make($this->whenLoaded('unit')),
            'status' => $this->status->value,
            'originalName' => $this->original_name,
            'mimeType' => $this->mime_type,
            'sizeBytes' => $this->size_bytes,
            'checksumSha256' => $this->checksum_sha256,
            'reviewNote' => $this->review_note,
            'reviewedBy' => $this->reviewed_by,
            'reviewedAt' => $this->reviewed_at?->toJSON(),
            'createdAt' => $this->created_at?->toJSON(),
            'updatedAt' => $this->updated_at?->toJSON(),
        ];
    }
}
