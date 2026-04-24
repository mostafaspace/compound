<?php

namespace App\Services\Channels;

use App\Contracts\NotificationChannelInterface;
use App\Models\DeviceToken;
use App\Models\User;

class MockPushChannel implements NotificationChannelInterface
{
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

        // In production this would call FCM / APNs.
        // For now we simulate success and return mock message IDs.
        $messageIds = array_map(
            fn (string $token) => 'mock_push_'.substr(md5($token.time()), 0, 12),
            $tokens
        );

        return [
            'provider' => 'mock',
            'response' => [
                'message_ids' => $messageIds,
                'token_count' => count($tokens),
            ],
        ];
    }
}
