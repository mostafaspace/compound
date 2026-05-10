<?php

namespace App\Services\Channels;

use App\Contracts\NotificationChannelInterface;
use App\Models\DeviceToken;
use App\Models\User;
use Kreait\Firebase\Contract\Messaging;
use Kreait\Firebase\Messaging\CloudMessage;
use Kreait\Firebase\Messaging\Notification;

class FcmPushChannel implements NotificationChannelInterface
{
    public function __construct(
        private readonly Messaging $messaging,
    ) {}

    public function channelName(): string
    {
        return 'push';
    }

    public function dispatch(User $user, array $payload): array
    {
        $tokens = DeviceToken::where('user_id', $user->id)->pluck('token')->all();

        if (empty($tokens)) {
            throw new \RuntimeException('No device tokens registered for user');
        }

        $notification = Notification::create($payload['title'] ?? '', $payload['body'] ?? '');

        $message = CloudMessage::new()
            ->withNotification($notification)
            ->withData([
                'category' => $payload['category'] ?? 'general',
            ]);

        $report = $this->messaging->sendMulticast($message, $tokens);

        $invalidTokens = [];
        foreach ($report->invalidTokens() as $token) {
            $invalidTokens[] = $token;
        }

        if (! empty($invalidTokens)) {
            DeviceToken::where('user_id', $user->id)
                ->whereIn('token', $invalidTokens)
                ->delete();
        }

        return [
            'provider' => 'fcm',
            'response' => [
                'successes' => $report->successes()->count(),
                'failures' => $report->failures()->count(),
                'token_count' => count($tokens),
                'invalid_tokens_removed' => count($invalidTokens),
            ],
        ];
    }
}
