<?php

namespace App\Events;

use App\Models\Notification;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;

class NotificationCreatedEvent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets;

    public readonly string $notificationId;

    public readonly int $userId;

    public readonly string $category;

    public readonly string $channel;

    public readonly string $priority;

    public readonly string $title;

    private array $payload;

    public function __construct(Notification $notification)
    {
        $this->notificationId = $notification->id;
        $this->userId = $notification->user_id;
        $this->category = $notification->category->value;
        $this->channel = $notification->channel;
        $this->priority = $notification->priority;
        $this->title = $notification->title;
        $this->payload = [
            'id' => $this->notificationId,
            'userId' => $this->userId,
            'category' => $this->category,
            'channel' => $this->channel,
            'priority' => $this->priority,
            'title' => $this->title,
            'body' => $notification->body,
            'metadata' => $notification->metadata ?? [],
            'readAt' => $notification->read_at?->toIso8601String(),
            'archivedAt' => $notification->archived_at?->toIso8601String(),
            'deliveredAt' => $notification->delivered_at?->toIso8601String(),
            'deliveryAttempts' => $notification->delivery_attempts,
            'lastDeliveryError' => $notification->last_delivery_error,
            'createdAt' => $notification->created_at->toIso8601String(),
        ];
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('user-'.$this->userId),
        ];
    }

    public function broadcastAs(): string
    {
        return 'notification.created';
    }

    public function broadcastWith(): array
    {
        return $this->payload;
    }
}
