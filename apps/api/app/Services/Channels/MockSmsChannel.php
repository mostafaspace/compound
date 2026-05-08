<?php

namespace App\Services\Channels;

use App\Contracts\NotificationChannelInterface;
use App\Models\User;

class MockSmsChannel implements NotificationChannelInterface
{
    public function channelName(): string
    {
        return 'sms';
    }

    public function dispatch(User $user, array $payload): array
    {
        $phone = $user->phone_number ?? null;

        if (empty($phone)) {
            throw new \RuntimeException('User has no phone number');
        }

        // In production this would call Twilio / Vonage / etc.
        return [
            'provider' => 'mock',
            'response' => [
                'message_id' => 'mock_sms_'.substr(md5($phone.time()), 0, 12),
                'recipient' => substr($phone, 0, -4).'****',
            ],
        ];
    }
}
