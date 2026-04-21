<?php

namespace App\Enums;

enum AnnouncementTargetType: string
{
    case All = 'all';
    case Compound = 'compound';
    case Building = 'building';
    case Floor = 'floor';
    case Unit = 'unit';
    case Role = 'role';
}
