<?php

namespace App\Enums;

enum VerificationRequestStatus: string
{
    case PendingReview = 'pending_review';
    case MoreInfoRequested = 'more_info_requested';
    case Approved = 'approved';
    case Rejected = 'rejected';
}
