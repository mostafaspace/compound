<?php

namespace App\Listeners;

use App\Events\NotificationCreatedEvent;
use App\Models\Notification;
use App\Support\AuditLogger;

class NotificationCreatedListener
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function handle(NotificationCreatedEvent $event): void
    {
        $this->auditLogger->record(
            action: 'notifications.created',
            auditableType: Notification::class,
            auditableId: $event->notificationId,
            metadata: [
                'id' => $event->notificationId,
                'user_id' => $event->userId,
                'category' => $event->category,
                'channel' => $event->channel,
                'priority' => $event->priority,
                'title' => $event->title,
            ]
        );
    }
}
