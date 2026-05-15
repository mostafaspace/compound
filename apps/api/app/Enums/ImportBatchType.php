<?php

namespace App\Enums;

enum ImportBatchType: string
{
    case Units = 'units';
    case Users = 'users';
    case OpeningBalances = 'opening_balances';

    public function label(): string
    {
        return match ($this) {
            self::Units => 'Units',
            self::Users => 'Users',
            self::OpeningBalances => 'Opening Balances',
        };
    }

    /** Return the expected CSV column headers for this template. */
    public function templateHeaders(): array
    {
        return match ($this) {
            self::Units => [
                'building_code',
                'unit_number',
                'type',
                'bedrooms',
                'floor_number',
            ],
            self::Users => [
                'name',
                'email',
                'phone',
                'role',
                'unit_code',
                'membership_type',
            ],
            self::OpeningBalances => [
                'unit_code',
                'amount',
                'currency',
                'description',
                'date',
            ],
        };
    }
}
