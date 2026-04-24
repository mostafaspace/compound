<?php

namespace App\Enums;

enum ExpenseStatus: string
{
    case Draft          = 'draft';
    case PendingApproval = 'pending_approval';
    case Approved       = 'approved';
    case Rejected       = 'rejected';

    public function label(): string
    {
        return match ($this) {
            self::Draft           => 'Draft',
            self::PendingApproval => 'Pending Approval',
            self::Approved        => 'Approved',
            self::Rejected        => 'Rejected',
        };
    }
}
