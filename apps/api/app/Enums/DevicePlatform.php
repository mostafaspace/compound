<?php

namespace App\Enums;

enum DevicePlatform: string
{
    case Fcm  = 'fcm';
    case Apns = 'apns';

    public function label(): string
    {
        return match ($this) {
            self::Fcm  => 'Android (FCM)',
            self::Apns => 'iOS (APNs)',
        };
    }
}
