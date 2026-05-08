<?php

namespace App\Enums;

enum ReserveFundMovementType: string
{
    case Deposit = 'deposit';
    case Withdrawal = 'withdrawal';
    case Transfer = 'transfer';

    public function label(): string
    {
        return match ($this) {
            self::Deposit => 'Deposit',
            self::Withdrawal => 'Withdrawal',
            self::Transfer => 'Transfer',
        };
    }
}
