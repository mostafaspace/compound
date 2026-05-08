<?php

namespace App\Enums;

enum AccountMergeStatus: string
{
    case Pending = 'pending';
    case Completed = 'completed';
    case Cancelled = 'cancelled';
}
