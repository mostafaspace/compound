<?php

namespace App\Http\Resources;

use App\Enums\UserRole;
use App\Services\AnnouncementService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AnnouncementResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $service = app(AnnouncementService::class);
        $user = $request->user();

        return [
            'id' => $this->id,
            'category' => $this->category->value,
            'priority' => $this->priority->value,
            'status' => $this->status->value,
            'targetType' => $this->target_type->value,
            'targetIds' => $this->target_ids ?? [],
            'targetRole' => $this->target_role,
            'requiresVerifiedMembership' => $this->requires_verified_membership,
            'requiresAcknowledgement' => $this->requires_acknowledgement,
            'title' => [
                'en' => $this->title_en,
                'ar' => $this->title_ar,
            ],
            'body' => [
                'en' => $this->body_en,
                'ar' => $this->body_ar,
            ],
            'attachments' => $this->attachments ?? [],
            'revision' => $this->revision,
            'scheduledAt' => $this->scheduled_at?->toIso8601String(),
            'publishedAt' => $this->published_at?->toIso8601String(),
            'expiresAt' => $this->expires_at?->toIso8601String(),
            'archivedAt' => $this->archived_at?->toIso8601String(),
            'acknowledgementSummary' => $this->when(
                $this->requires_acknowledgement && $this->canViewAcknowledgementSummary($request),
                fn (): array => $service->acknowledgementSummary($this->resource)
            ),
            'acknowledgedAt' => $this->when(
                $user !== null && $this->relationLoaded('acknowledgements'),
                fn (): ?string => $this->acknowledgements
                    ->firstWhere('user_id', $user->id)
                    ?->acknowledged_at
                    ?->toIso8601String()
            ),
            'author' => $this->whenLoaded('author', fn (): array => [
                'id' => $this->author->id,
                'name' => $this->author->name,
                'email' => $this->author->email,
            ]),
            'createdAt' => $this->created_at?->toIso8601String(),
            'updatedAt' => $this->updated_at?->toIso8601String(),
        ];
    }

    private function canViewAcknowledgementSummary(Request $request): bool
    {
        return in_array($request->user()?->role, [
            UserRole::SuperAdmin,
            UserRole::CompoundAdmin,
            UserRole::BoardMember,
            UserRole::FinanceReviewer,
            UserRole::SupportAgent,
        ], true);
    }
}
