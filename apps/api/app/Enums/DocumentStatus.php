<?php

namespace App\Enums;

enum DocumentStatus: string
{
    case Submitted = 'submitted';
    case UnderReview = 'under_review';
    case Approved = 'approved';
    case Rejected = 'rejected';
    case Missing = 'missing';
}
