<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class NotificationPreferenceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'userId' => $this->user_id,
            'emailEnabled' => $this->email_enabled,
            'inAppEnabled' => $this->in_app_enabled,
            'pushEnabled' => $this->push_enabled,
            'quietHoursStart' => $this->quiet_hours_start?->format('H:i'),
            'quietHoursEnd' => $this->quiet_hours_end?->format('H:i'),
            'quietHoursTimezone' => $this->quiet_hours_timezone,
            'mutedCategories' => $this->muted_categories ?? [],
            'createdAt' => $this->created_at->toIso8601String(),
            'updatedAt' => $this->updated_at->toIso8601String(),
        ];
    }
}
