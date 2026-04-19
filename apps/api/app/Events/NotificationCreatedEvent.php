<?php

namespace App\Events;

use App\Models\Notification;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
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
            new Channel('private-user-' . $this->notification->user_id),
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
            'title' => $this->notification->title,
            'body' => $this->notification->body,
            'metadata' => $this->notification->metadata,
            'createdAt' => $this->notification->created_at->toIso8601String(),
        ];
    }
}
