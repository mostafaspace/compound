<?php

namespace App\Enums;

enum BudgetPeriodType: string
{
    case Annual  = 'annual';
    case Monthly = 'monthly';

    public function label(): string
    {
        return match ($this) {
            self::Annual  => 'Annual',
            self::Monthly => 'Monthly',
        };
    }
}
