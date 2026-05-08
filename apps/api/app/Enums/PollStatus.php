<?php

namespace App\Enums;

enum PollStatus: string
{
    case Draft = 'draft';
    case Active = 'active';
    case Closed = 'closed';
    case Archived = 'archived';
}
