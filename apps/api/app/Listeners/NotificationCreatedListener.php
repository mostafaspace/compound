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
            model: $event->notification,
            changes: [
                'id' => $event->notification->id,
                'category' => $event->notification->category->value,
                'title' => $event->notification->title,
            ]
        );
    }
}
