<?php

namespace App\Enums;

enum ContactVisibility: string
{
    case AllResidents = 'all_residents';
    case BuildingResidents = 'building_residents';
    case FloorResidents = 'floor_residents';
    case AdminsOnly = 'admins_only';
}
