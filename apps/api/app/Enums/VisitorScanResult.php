<?php

namespace App\Enums;

enum VisitorScanResult: string
{
    case Valid = 'valid';
    case Expired = 'expired';
    case AlreadyUsed = 'already_used';
    case Denied = 'denied';
    case Cancelled = 'cancelled';
    case NotFound = 'not_found';
    case OutOfWindow = 'out_of_window';
}
