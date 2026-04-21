<?php

namespace App\Enums;

enum ChargeFrequency: string
{
    case Monthly = 'monthly';
    case Quarterly = 'quarterly';
    case Annual = 'annual';
    case OneTime = 'one_time';
}
