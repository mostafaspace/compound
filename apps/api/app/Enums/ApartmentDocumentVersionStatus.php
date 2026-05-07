<?php

namespace App\Enums;

enum ApartmentDocumentVersionStatus: string
{
    case PendingReview = 'pending_review';
    case Approved = 'approved';
    case Rejected = 'rejected';
}
