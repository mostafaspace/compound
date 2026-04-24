<?php

namespace App\Enums;

enum BudgetStatus: string
{
    case Draft  = 'draft';
    case Active = 'active';
    case Closed = 'closed';

    public function label(): string
    {
        return match ($this) {
            self::Draft  => 'Draft',
            self::Active => 'Active',
            self::Closed => 'Closed',
        };
    }
}
