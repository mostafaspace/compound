<?php

namespace App\Http\Resources\Apartments;

use App\Http\Resources\UserResource;
use App\Models\Apartments\ApartmentDocument;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ApartmentDocument
 */
class ApartmentDocumentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'unitId' => $this->unit_id,
            'unit' => $this->whenLoaded('unit', fn () => [
                'id' => $this->unit->id,
                'unitNumber' => $this->unit->unit_number,
            ]),
            'uploadedByUserId' => $this->uploaded_by_user_id,
            'uploader' => UserResource::make($this->whenLoaded('uploader')),
            'documentType' => $this->document_type->value,
            'filePath' => $this->file_path,
            'mimeType' => $this->mime_type,
            'sizeBytes' => $this->size_bytes,
            'status' => $this->status->value,
            'version' => $this->version,
            'replacedById' => $this->replaced_by_id,
            'createdAt' => $this->created_at?->toJSON(),
            'updatedAt' => $this->updated_at?->toJSON(),
        ];
    }
}
