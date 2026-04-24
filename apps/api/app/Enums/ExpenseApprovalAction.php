<?php

namespace App\Enums;

enum ExpenseApprovalAction: string
{
    case Approve = 'approve';
    case Reject  = 'reject';

    public function label(): string
    {
        return match ($this) {
            self::Approve => 'Approved',
            self::Reject  => 'Rejected',
        };
    }
}
