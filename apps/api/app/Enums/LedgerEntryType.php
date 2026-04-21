<?php

namespace App\Enums;

enum LedgerEntryType: string
{
    case OpeningBalance = 'opening_balance';
    case Charge = 'charge';
    case Penalty = 'penalty';
    case Payment = 'payment';
    case Allocation = 'allocation';
    case Adjustment = 'adjustment';
    case Refund = 'refund';
    case WriteOff = 'write_off';
}
