<?php

namespace App\Enums;

enum PaymentStatus: string
{
    case Draft = 'draft';
    case Submitted = 'submitted';
    case UnderReview = 'under_review';
    case Approved = 'approved';
    case Rejected = 'rejected';
    case Allocated = 'allocated';
    case Refunded = 'refunded';
}
