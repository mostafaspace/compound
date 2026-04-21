<?php

namespace App\Services;

use App\Enums\AccountStatus;
use App\Enums\AnnouncementStatus;
use App\Enums\AnnouncementTargetType;
use App\Enums\NotificationCategory;
use App\Models\Announcements\Announcement;
use App\Models\Announcements\AnnouncementAcknowledgement;
use App\Models\Announcements\AnnouncementRevision;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

class AnnouncementService
{
    public function __construct(private NotificationService $notificationService)
    {
    }

    /**
     * @return Collection<int, User>
     */
    public function recipients(Announcement $announcement): Collection
    {
        $query = User::query()
            ->where('status', AccountStatus::Active->value)
            ->orderBy('id');

        match ($announcement->target_type) {
            AnnouncementTargetType::Role => $query->where('role', $announcement->target_role),
            AnnouncementTargetType::Compound => $this->whereScopedToUnits($query, 'compound_id', $announcement->target_ids ?? []),
            AnnouncementTargetType::Building => $this->whereScopedToUnits($query, 'building_id', $announcement->target_ids ?? []),
            AnnouncementTargetType::Floor => $this->whereScopedToUnits($query, 'floor_id', $announcement->target_ids ?? []),
            AnnouncementTargetType::Unit => $this->whereScopedToUnits($query, 'id', $announcement->target_ids ?? []),
            AnnouncementTargetType::All => $announcement->requires_verified_membership
                ? $query->whereHas('unitMemberships', fn (Builder $membership): Builder => $membership->activeForAccess())
                : $query,
        };

        if ($announcement->requires_verified_membership && $announcement->target_type === AnnouncementTargetType::Role) {
            $query->whereHas('unitMemberships', fn (Builder $membership): Builder => $membership->activeForAccess());
        }

        return $query->get()->unique('id')->values();
    }

    public function applyVisibleToUser(Builder $query, User $user): Builder
    {
        $memberships = $user->unitMemberships()
            ->activeForAccess()
            ->with('unit')
            ->get();
        $unitIds = $memberships->pluck('unit.id')->filter()->unique()->values();
        $floorIds = $memberships->pluck('unit.floor_id')->filter()->unique()->values();
        $buildingIds = $memberships->pluck('unit.building_id')->filter()->unique()->values();
        $compoundIds = $memberships->pluck('unit.compound_id')->filter()->unique()->values();
        $hasVerifiedMembership = $memberships->isNotEmpty();

        return $query->where(function (Builder $query) use (
            $user,
            $hasVerifiedMembership,
            $compoundIds,
            $buildingIds,
            $floorIds,
            $unitIds
        ): void {
            $query->where(function (Builder $query) use ($hasVerifiedMembership): void {
                $query->where('target_type', AnnouncementTargetType::All->value)
                    ->where(function (Builder $query) use ($hasVerifiedMembership): void {
                        $query->where('requires_verified_membership', false);

                        if ($hasVerifiedMembership) {
                            $query->orWhere('requires_verified_membership', true);
                        }
                    });
            });

            $query->orWhere(function (Builder $query) use ($user, $hasVerifiedMembership): void {
                $query->where('target_type', AnnouncementTargetType::Role->value)
                    ->where('target_role', $user->role->value)
                    ->where(function (Builder $query) use ($hasVerifiedMembership): void {
                        $query->where('requires_verified_membership', false);

                        if ($hasVerifiedMembership) {
                            $query->orWhere('requires_verified_membership', true);
                        }
                    });
            });

            $this->orWhereJsonTarget($query, AnnouncementTargetType::Compound, $compoundIds->all());
            $this->orWhereJsonTarget($query, AnnouncementTargetType::Building, $buildingIds->all());
            $this->orWhereJsonTarget($query, AnnouncementTargetType::Floor, $floorIds->all());
            $this->orWhereJsonTarget($query, AnnouncementTargetType::Unit, $unitIds->all());
        });
    }

    public function canUserView(Announcement $announcement, User $user): bool
    {
        if (! $announcement->isPublishedForFeed()) {
            return false;
        }

        return $this->applyVisibleToUser(
            Announcement::query()->whereKey($announcement->id),
            $user
        )->exists();
    }

    public function publish(Announcement $announcement): Announcement
    {
        $scheduledAt = $announcement->scheduled_at;
        $isFutureSchedule = $scheduledAt !== null && $scheduledAt->isFuture();

        $announcement->forceFill([
            'status' => $isFutureSchedule ? AnnouncementStatus::Scheduled : AnnouncementStatus::Published,
            'published_at' => $isFutureSchedule ? null : now(),
            'last_published_snapshot' => $this->snapshot($announcement),
        ])->save();

        $this->recordRevision($announcement, null, ['action' => 'published']);

        if (! $isFutureSchedule) {
            $this->notifyRecipients($announcement);
        }

        return $announcement->refresh();
    }

    public function archive(Announcement $announcement): Announcement
    {
        $announcement->forceFill([
            'status' => AnnouncementStatus::Archived,
            'archived_at' => now(),
        ])->save();

        return $announcement->refresh();
    }

    public function acknowledge(Announcement $announcement, User $user): AnnouncementAcknowledgement
    {
        return AnnouncementAcknowledgement::query()->firstOrCreate(
            [
                'announcement_id' => $announcement->id,
                'user_id' => $user->id,
            ],
            ['acknowledged_at' => now()]
        );
    }

    public function publishDueScheduled(): int
    {
        $count = 0;

        Announcement::query()
            ->where('status', AnnouncementStatus::Scheduled->value)
            ->whereNotNull('scheduled_at')
            ->where('scheduled_at', '<=', now())
            ->each(function (Announcement $announcement) use (&$count): void {
                $announcement->forceFill([
                    'status' => AnnouncementStatus::Published,
                    'published_at' => now(),
                    'last_published_snapshot' => $this->snapshot($announcement),
                ])->save();

                $this->recordRevision($announcement, null, ['action' => 'scheduled_published']);
                $this->notifyRecipients($announcement);
                $count++;
            });

        return $count;
    }

    public function expireDueAnnouncements(): int
    {
        return Announcement::query()
            ->where('status', AnnouncementStatus::Published->value)
            ->whereNotNull('expires_at')
            ->where('expires_at', '<=', now())
            ->update(['status' => AnnouncementStatus::Expired]);
    }

    public function recordRevision(Announcement $announcement, ?User $changedBy, array $changeSummary = []): AnnouncementRevision
    {
        return AnnouncementRevision::query()->firstOrCreate(
            [
                'announcement_id' => $announcement->id,
                'revision' => $announcement->revision,
            ],
            [
                'changed_by' => $changedBy?->id,
                'snapshot' => $this->snapshot($announcement),
                'change_summary' => $changeSummary,
            ]
        );
    }

    public function acknowledgementSummary(Announcement $announcement): array
    {
        $targetedCount = $this->recipients($announcement)->count();
        $acknowledgedCount = $announcement->acknowledgements()->count();

        return [
            'required' => $announcement->requires_acknowledgement,
            'targetedCount' => $targetedCount,
            'acknowledgedCount' => $acknowledgedCount,
            'pendingCount' => max(0, $targetedCount - $acknowledgedCount),
        ];
    }

    public function snapshot(Announcement $announcement): array
    {
        return [
            'title' => [
                'en' => $announcement->title_en,
                'ar' => $announcement->title_ar,
            ],
            'body' => [
                'en' => $announcement->body_en,
                'ar' => $announcement->body_ar,
            ],
            'category' => $announcement->category->value,
            'priority' => $announcement->priority->value,
            'revision' => $announcement->revision,
        ];
    }

    private function notifyRecipients(Announcement $announcement): void
    {
        foreach ($this->recipients($announcement) as $recipient) {
            $this->notificationService->create(
                userId: $recipient->id,
                category: NotificationCategory::Announcements,
                title: $announcement->title_en,
                body: $announcement->body_en,
                metadata: [
                    'announcementId' => $announcement->id,
                    'titleAr' => $announcement->title_ar,
                    'bodyAr' => $announcement->body_ar,
                    'actionUrl' => '/announcements/'.$announcement->id,
                    'requiresAcknowledgement' => $announcement->requires_acknowledgement,
                ],
                priority: $announcement->priority->value,
            );
        }
    }

    /**
     * @param  Builder<Announcement>  $query
     * @param  list<string>  $ids
     */
    private function orWhereJsonTarget(Builder $query, AnnouncementTargetType $targetType, array $ids): void
    {
        if ($ids === []) {
            return;
        }

        $query->orWhere(function (Builder $query) use ($targetType, $ids): void {
            $query->where('target_type', $targetType->value)
                ->where(function (Builder $query) use ($ids): void {
                    foreach ($ids as $id) {
                        $query->orWhereJsonContains('target_ids', $id);
                    }
                });
        });
    }

    /**
     * @param  Builder<User>  $query
     * @param  list<string>  $ids
     */
    private function whereScopedToUnits(Builder $query, string $unitColumn, array $ids): void
    {
        $query->whereHas('unitMemberships', function (Builder $membership) use ($unitColumn, $ids): void {
            $membership
                ->activeForAccess()
                ->whereHas('unit', function (Builder $unitQuery) use ($unitColumn, $ids): void {
                    $unitQuery->whereIn($unitColumn, $ids);
                });
        });
    }
}
