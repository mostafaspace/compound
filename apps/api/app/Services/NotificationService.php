<?php

namespace App\Services;

use App\Enums\NotificationCategory;
use App\Events\NotificationCreatedEvent;
use App\Models\Notification;
use App\Models\NotificationPreference;
use App\Models\User;
use Carbon\Carbon;

class NotificationService
{
    public function create(
        int $userId,
        NotificationCategory $category,
        string $title,
        string $body,
        array $metadata = []
    ): Notification {
        $notification = Notification::create([
            'user_id' => $userId,
            'category' => $category,
            'title' => $title,
            'body' => $body,
            'metadata' => $metadata,
        ]);

        event(new NotificationCreatedEvent($notification));

        return $notification;
    }

    public function markAsRead(string $notificationId): bool
    {
        $notification = Notification::find($notificationId);

        if (!$notification) {
            return false;
        }

        return $notification->update(['read_at' => now()]);
    }

    public function archive(string $notificationId): bool
    {
        $notification = Notification::find($notificationId);

        if (!$notification) {
            return false;
        }

        return $notification->update(['archived_at' => now()]);
    }

    public function isQuietHourActive(User $user): bool
    {
        $preference = $user->notificationPreference;

        if (!$preference || !$preference->quiet_hours_start || !$preference->quiet_hours_end) {
            return false;
        }

        $timezone = $preference->quiet_hours_timezone ?? config('app.timezone');
        $now = now($timezone);
        $currentTime = $now->format('H:i');

        $startTime = $preference->quiet_hours_start->format('H:i');
        $endTime = $preference->quiet_hours_end->format('H:i');

        if ($startTime < $endTime) {
            return $currentTime >= $startTime && $currentTime < $endTime;
        }

        return $currentTime >= $startTime || $currentTime < $endTime;
    }

    public function getUnreadCount(int $userId): int
    {
        return Notification::where('user_id', $userId)
            ->notArchived()
            ->unread()
            ->count();
    }

    public function markAllAsRead(int $userId): int
    {
        return Notification::where('user_id', $userId)
            ->notArchived()
            ->unread()
            ->update(['read_at' => now()]);
    }

    public function archiveAll(int $userId): int
    {
        return Notification::where('user_id', $userId)
            ->notArchived()
            ->update(['archived_at' => now()]);
    }
}
