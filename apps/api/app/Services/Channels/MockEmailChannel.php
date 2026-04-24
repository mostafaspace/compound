<?php

namespace App\Services\Channels;

use App\Contracts\NotificationChannelInterface;
use App\Models\User;

class MockEmailChannel implements NotificationChannelInterface
{
    public function channelName(): string
    {
        return 'email';
    }

    public function dispatch(User $user, array $payload): array
    {
        if (empty($user->email)) {
            throw new \RuntimeException('User has no email address');
        }

        // In production this would call SES / Mailgun / etc.
        return [
            'provider' => 'mock',
            'response' => [
                'message_id' => 'mock_email_'.substr(md5($user->email.time()), 0, 12),
                'recipient'  => $user->email,
            ],
        ];
    }
}
