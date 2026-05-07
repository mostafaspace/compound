<?php

namespace App\Http\Resources\Apartments;

use App\Http\Resources\UserResource;
use App\Models\Apartments\ApartmentNote;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ApartmentNote
 */
class ApartmentNoteResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'unitId' => $this->unit_id,
            'authorId' => $this->author_id,
            'author' => UserResource::make($this->whenLoaded('author')),
            'body' => $this->body,
            'createdAt' => $this->created_at?->toJSON(),
            'updatedAt' => $this->updated_at?->toJSON(),
        ];
    }
}
