<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class NotificationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $locale = $this->preferredLocale($request);

        return [
            'id' => $this->id,
            'userId' => $this->user_id,
            'category' => $this->category->value,
            'channel' => $this->channel,
            'priority' => $this->priority,
            'title' => $this->localizedText('title', $locale, $this->title),
            'body' => $this->localizedText('body', $locale, $this->body),
            'metadata' => $this->metadata ?? [],
            'readAt' => $this->read_at?->toIso8601String(),
            'archivedAt' => $this->archived_at?->toIso8601String(),
            'deliveredAt' => $this->delivered_at?->toIso8601String(),
            'deliveryAttempts' => $this->delivery_attempts,
            'lastDeliveryError' => $this->last_delivery_error,
            'createdAt' => $this->created_at->toIso8601String(),
        ];
    }

    private function preferredLocale(Request $request): string
    {
        $language = strtolower((string) $request->headers->get('Accept-Language', 'en'));

        return str_starts_with($language, 'ar') ? 'ar' : 'en';
    }

    private function localizedText(string $field, string $locale, ?string $fallback): string
    {
        $metadata = $this->metadata ?? [];
        $translationBag = $metadata[$field.'Translations'] ?? null;

        if (is_array($translationBag) && is_string($translationBag[$locale] ?? null)) {
            return $translationBag[$locale];
        }

        $legacyKey = $field.$this->localeSuffix($locale);
        if (is_string($metadata[$legacyKey] ?? null)) {
            return $metadata[$legacyKey];
        }

        return $fallback ?? '';
    }

    private function localeSuffix(string $locale): string
    {
        return $locale === 'ar' ? 'Ar' : 'En';
    }
}
