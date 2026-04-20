<?php

namespace App\Listeners;

use App\Events\NotificationCreatedEvent;
use App\Support\AuditLogger;

class NotificationCreatedListener
{
    public function __construct(private AuditLogger $auditLogger)
    {
    }

    public function handle(NotificationCreatedEvent $event): void
    {
        $this->auditLogger->record(
            action: 'notifications.created',
            auditableType: $event->notification::class,
            auditableId: $event->notification->id,
            metadata: [
                'id' => $event->notification->id,
                'user_id' => $event->notification->user_id,
                'category' => $event->notification->category->value,
                'channel' => $event->notification->channel,
                'priority' => $event->notification->priority,
                'title' => $event->notification->title,
            ]
        );
    }
}
