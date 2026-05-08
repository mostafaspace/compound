<?php

namespace App\Enums;

enum VoteStatus: string
{
    case Draft = 'draft';
    case Active = 'active';
    case Closed = 'closed';
    case Cancelled = 'cancelled';
}
