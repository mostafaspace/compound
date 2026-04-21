<?php

namespace App\Enums;

enum UnitType: string
{
    case Apartment = 'apartment';
    case Studio = 'studio';
    case Villa = 'villa';
    case Duplex = 'duplex';
    case Retail = 'retail';
    case Office = 'office';
    case Other = 'other';
}
