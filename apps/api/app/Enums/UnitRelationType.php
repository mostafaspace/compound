<?php

namespace App\Enums;

enum UnitRelationType: string
{
    case Owner = 'owner';
    case Tenant = 'tenant';
    case Resident = 'resident';
    case Representative = 'representative';
}
