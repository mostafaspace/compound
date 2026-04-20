<?php

namespace App\Enums;

enum VisitorRequestStatus: string
{
    case Pending = 'pending';
    case QrIssued = 'qr_issued';
    case Arrived = 'arrived';
    case Allowed = 'allowed';
    case Denied = 'denied';
    case Completed = 'completed';
    case Cancelled = 'cancelled';
}
