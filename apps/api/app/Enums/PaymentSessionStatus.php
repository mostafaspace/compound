<?php

namespace App\Enums;

enum PaymentSessionStatus: string
{
    case Pending = 'pending';
    case Confirmed = 'confirmed';
    case Failed = 'failed';
    case Expired = 'expired';
    case Refunded = 'refunded';
}
