<?php

namespace App\Http\Resources\Documents;

use App\Models\Documents\DocumentType;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin DocumentType
 */
class DocumentTypeResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'key' => $this->key,
            'name' => $this->name,
            'description' => $this->description,
            'isRequiredDefault' => $this->is_required_default,
            'allowedMimeTypes' => $this->allowed_mime_types,
            'maxFileSizeKb' => $this->max_file_size_kb,
            'isActive' => $this->is_active,
            'createdAt' => $this->created_at?->toJSON(),
            'updatedAt' => $this->updated_at?->toJSON(),
        ];
    }
}
