<?php

namespace App\Enums;

enum ApartmentViolationStatus: string
{
    case Pending = 'pending';
    case Paid = 'paid';
    case Waived = 'waived';
}
