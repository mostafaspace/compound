<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class NotificationTemplateResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'compoundId' => $this->compound_id,
            'category' => $this->category->value,
            'channel' => $this->channel->value,
            'locale' => $this->locale,
            'subject' => $this->subject,
            'titleTemplate' => $this->title_template,
            'bodyTemplate' => $this->body_template,
            'isActive' => $this->is_active,
            'createdAt' => $this->created_at->toIso8601String(),
            'updatedAt' => $this->updated_at->toIso8601String(),
        ];
    }
}
