<?php

namespace App\Enums;

enum UnitStatus: string
{
    case Active = 'active';
    case Vacant = 'vacant';
    case Blocked = 'blocked';
    case Archived = 'archived';
}
