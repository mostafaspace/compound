<?php

namespace App\Enums;

enum GatewayTransactionStatus: string
{
    case Confirmed = 'confirmed';
    case Failed = 'failed';
    case Refunded = 'refunded';
    case Disputed = 'disputed';
}
