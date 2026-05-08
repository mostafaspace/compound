<?php

namespace App\Enums;

enum VoteEligibility: string
{
    case OwnersOnly = 'owners_only';
    case OwnersAndResidents = 'owners_and_residents';
    case AllVerified = 'all_verified';
}
