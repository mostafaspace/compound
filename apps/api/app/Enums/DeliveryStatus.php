<?php

namespace App\Enums;

enum DeliveryStatus: string
{
    case Queued = 'queued';
    case Sent = 'sent';
    case Failed = 'failed';
    case Retried = 'retried';
    case Skipped = 'skipped';

    public function label(): string
    {
        return match ($this) {
            self::Queued => 'Queued',
            self::Sent => 'Sent',
            self::Failed => 'Failed',
            self::Retried => 'Retried',
            self::Skipped => 'Skipped',
        };
    }
}
