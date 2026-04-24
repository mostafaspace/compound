<?php

namespace App\Jobs;

use App\Models\Notification;
use App\Services\ExternalNotificationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class DispatchExternalNotificationsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $backoff = 60; // seconds between retries

    public function __construct(
        public readonly string $notificationId,
    ) {}

    public function handle(ExternalNotificationService $service): void
    {
        $notification = Notification::with('user')->find($this->notificationId);

        if (! $notification) {
            return;
        }

        $service->dispatch($notification);
    }
}
