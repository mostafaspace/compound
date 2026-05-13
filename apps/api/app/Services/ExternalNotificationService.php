<?php

namespace App\Services;

use App\Contracts\NotificationChannelInterface;
use App\Enums\DeliveryStatus;
use App\Enums\NotificationChannel;
use App\Models\Notification;
use App\Models\NotificationDeliveryLog;
use App\Models\NotificationPreference;
use App\Models\NotificationTemplate;
use App\Models\User;
use App\Services\Channels\MockEmailChannel;
use App\Services\Channels\FcmPushChannel;
use App\Services\Channels\MockSmsChannel;
use RuntimeException;

class ExternalNotificationService
{
    /** @var array<string, class-string<NotificationChannelInterface>> */
    private array $channels;

    public function __construct(
        private readonly NotificationService $notificationService,
        private readonly CompoundContextService $compoundContext,
    ) {
        $this->channels = [
            NotificationChannel::Push->value => FcmPushChannel::class,
            NotificationChannel::Email->value => MockEmailChannel::class,
            NotificationChannel::Sms->value => MockSmsChannel::class,
        ];
    }

    /**
     * Dispatch external channel notifications for the given in-app notification.
     * Respects user preferences, quiet hours (for non-critical), and template availability.
     */
    public function dispatch(Notification $notification): void
    {
        $user = $notification->user()->with('notificationPreference')->first();

        if (! $user) {
            return;
        }

        $preference = $user->notificationPreference;
        $isCritical = $notification->priority === 'high';

        // Quiet-hours gate: skip non-critical external dispatch during quiet hours
        if (! $isCritical && $preference && $this->notificationService->isQuietHourActive($user)) {
            $this->logSkipped($notification, null, 'quiet_hours');

            return;
        }

        $compoundId = $this->compoundContext->resolveUserCompoundId($user);
        $locale = app()->getLocale() ?? 'en';

        foreach (NotificationChannel::cases() as $channel) {
            $this->dispatchChannel($notification, $user, $preference, $channel, $compoundId, $locale);
        }
    }

    private function dispatchChannel(
        Notification $notification,
        User $user,
        ?NotificationPreference $preference,
        NotificationChannel $channel,
        ?string $compoundId,
        string $locale,
    ): void {
        // Check user preference for this channel
        $enabled = match ($channel) {
            NotificationChannel::Push => $preference?->push_enabled ?? false,
            NotificationChannel::Email => $preference?->email_enabled ?? true,
            NotificationChannel::Sms => false, // SMS off by default; enabled per compound setting in future
        };

        if (! $enabled) {
            $this->logDelivery($notification, $channel, DeliveryStatus::Skipped, null, 'mock', null, 'channel_disabled');

            return;
        }

        // Find template (compound-specific first, then global)
        $template = NotificationTemplate::query()
            ->active()
            ->where('category', $notification->category->value)
            ->where('channel', $channel->value)
            ->where('locale', $locale)
            ->where(function ($q) use ($compoundId) {
                $q->where('compound_id', $compoundId)->orWhereNull('compound_id');
            })
            ->orderByRaw('compound_id IS NULL ASC') // compound-specific wins
            ->first();

        if (! $template) {
            $this->logDelivery($notification, $channel, DeliveryStatus::Skipped, null, 'mock', null, 'no_template');

            return;
        }

        // Render template — privacy-safe, no PII in payload
        $context = [
            'category' => $notification->category->value,
        ];

        $payload = [
            'title' => $template->render($template->title_template, $context),
            'body' => $template->render($template->body_template, $context),
            'subject' => $template->subject ? $template->render($template->subject, $context) : null,
        ];

        try {
            $adapter = $this->resolveChannelAdapter($channel);
            $result = $adapter->dispatch($user, $payload);
            $provider = $result['provider'] ?? 'mock';
            $response = $result['response'] ?? [];

            $recipient = $this->obfuscateRecipient($channel, $user);

            $this->logDelivery($notification, $channel, DeliveryStatus::Sent, $recipient, $provider, $response, null);
        } catch (\Throwable $e) {
            $this->logDelivery($notification, $channel, DeliveryStatus::Failed, null, 'mock', null, $e->getMessage());
        }
    }

    /**
     * Retry a failed delivery log entry.
     */
    public function retry(NotificationDeliveryLog $log): NotificationDeliveryLog
    {
        $notification = $log->notification()->with('user.notificationPreference')->first();

        if (! $notification) {
            throw new \RuntimeException('Notification not found');
        }

        $user = $notification->user;
        $channel = $log->channel;
        $compoundId = $this->compoundContext->resolveUserCompoundId($user);
        $locale = app()->getLocale() ?? 'en';

        $template = NotificationTemplate::query()
            ->active()
            ->where('category', $notification->category->value)
            ->where('channel', $channel->value)
            ->where('locale', $locale)
            ->where(function ($q) use ($compoundId) {
                $q->where('compound_id', $compoundId)->orWhereNull('compound_id');
            })
            ->orderByRaw('compound_id IS NULL ASC')
            ->first();

        $payload = $template ? [
            'title' => $template->render($template->title_template, ['category' => $notification->category->value]),
            'body' => $template->render($template->body_template, ['category' => $notification->category->value]),
            'subject' => $template->subject ? $template->render($template->subject, ['category' => $notification->category->value]) : null,
        ] : [
            'title' => $notification->title,
            'body' => $notification->body,
        ];

        $attemptNumber = $log->attempt_number + 1;

        try {
            $adapter = $this->resolveChannelAdapter($channel);
            $result = $adapter->dispatch($user, $payload);
            $newLog = $this->logDelivery($notification, $channel, DeliveryStatus::Sent, $this->obfuscateRecipient($channel, $user), $result['provider'] ?? 'mock', $result['response'] ?? [], null, $attemptNumber);
            $log->update(['status' => DeliveryStatus::Retried]);

            return $newLog;
        } catch (\Throwable $e) {
            return $this->logDelivery($notification, $channel, DeliveryStatus::Failed, null, 'mock', null, $e->getMessage(), $attemptNumber);
        }
    }

    private function resolveChannelAdapter(NotificationChannel $channel): NotificationChannelInterface
    {
        $adapterClass = $this->channels[$channel->value] ?? null;

        if (! $adapterClass) {
            throw new RuntimeException('No adapter for channel');
        }

        return app($adapterClass);
    }

    private function logSkipped(Notification $notification, ?string $recipient, string $reason): void
    {
        foreach (NotificationChannel::cases() as $channel) {
            $this->logDelivery($notification, $channel, DeliveryStatus::Skipped, $recipient, 'mock', null, $reason);
        }
    }

    private function logDelivery(
        Notification $notification,
        NotificationChannel $channel,
        DeliveryStatus $status,
        ?string $recipient,
        string $provider,
        ?array $providerResponse,
        ?string $errorMessage,
        int $attemptNumber = 1,
    ): NotificationDeliveryLog {
        return NotificationDeliveryLog::create([
            'notification_id' => $notification->id,
            'channel' => $channel->value,
            'status' => $status->value,
            'recipient' => $recipient,
            'provider' => $provider,
            'provider_response' => $providerResponse,
            'error_message' => $errorMessage,
            'attempt_number' => $attemptNumber,
        ]);
    }

    private function obfuscateRecipient(NotificationChannel $channel, User $user): ?string
    {
        return match ($channel) {
            NotificationChannel::Email => $user->email ? substr($user->email, 0, 3).'***' : null,
            NotificationChannel::Sms => $user->phone_number ? '***'.substr($user->phone_number ?? '', -4) : null,
            NotificationChannel::Push => 'push_device',
        };
    }
}
