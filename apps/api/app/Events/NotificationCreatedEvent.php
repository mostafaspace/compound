<?php

namespace App\Events;

use App\Models\Notification;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class NotificationCreatedEvent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Notification $notification)
    {
        $this->notification->load('user');
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('user-'.$this->notification->user_id),
        ];
    }

    public function broadcastAs(): string
    {
        return 'notification.created';
    }

    public function broadcastWith(): array
    {
        return [
            'id' => $this->notification->id,
            'userId' => $this->notification->user_id,
            'category' => $this->notification->category->value,
            'channel' => $this->notification->channel,
            'priority' => $this->notification->priority,
            'title' => $this->notification->title,
            'body' => $this->notification->body,
            'metadata' => $this->notification->metadata ?? [],
            'readAt' => $this->notification->read_at?->toIso8601String(),
            'archivedAt' => $this->notification->archived_at?->toIso8601String(),
            'deliveredAt' => $this->notification->delivered_at?->toIso8601String(),
            'deliveryAttempts' => $this->notification->delivery_attempts,
            'lastDeliveryError' => $this->notification->last_delivery_error,
            'createdAt' => $this->notification->created_at->toIso8601String(),
        ];
    }
}
