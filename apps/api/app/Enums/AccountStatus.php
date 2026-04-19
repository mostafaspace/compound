<?php

namespace App\Enums;

enum AccountStatus: string
{
    case Invited = 'invited';
    case PendingReview = 'pending_review';
    case Active = 'active';
    case Suspended = 'suspended';
    case Archived = 'archived';
}
