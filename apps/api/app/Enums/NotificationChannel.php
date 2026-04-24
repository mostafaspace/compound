<?php

namespace App\Enums;

enum NotificationChannel: string
{
    case Push  = 'push';
    case Email = 'email';
    case Sms   = 'sms';

    public function label(): string
    {
        return match ($this) {
            self::Push  => 'Push',
            self::Email => 'Email',
            self::Sms   => 'SMS',
        };
    }
}
