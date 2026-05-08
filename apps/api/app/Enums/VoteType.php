<?php

namespace App\Enums;

enum VoteType: string
{
    case Poll = 'poll';
    case Election = 'election';
    case Decision = 'decision';
}
