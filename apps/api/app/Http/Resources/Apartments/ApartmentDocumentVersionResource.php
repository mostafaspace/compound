<?php

namespace App\Http\Resources\Apartments;

use App\Models\Apartments\ApartmentDocumentVersion;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ApartmentDocumentVersion
 */
class ApartmentDocumentVersionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'apartmentDocumentId' => $this->apartment_document_id,
            'document' => ApartmentDocumentResource::make($this->whenLoaded('document')),
            'uploadedBy' => $this->uploaded_by,
            'uploader' => $this->whenLoaded('uploader', fn () => [
                'id' => $this->uploader->id,
                'name' => $this->uploader->name,
            ]),
            'filePath' => $this->file_path,
            'mimeType' => $this->mime_type,
            'sizeBytes' => $this->size_bytes,
            'status' => $this->status->value,
            'reviewedBy' => $this->reviewed_by,
            'reviewedAt' => $this->reviewed_at?->toJSON(),
            'reviewNotes' => $this->review_notes,
            'createdAt' => $this->created_at?->toJSON(),
            'updatedAt' => $this->updated_at?->toJSON(),
        ];
    }
}
