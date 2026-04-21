<?php

namespace App\Enums;

enum IssueStatus: string
{
    case New = 'new';
    case InProgress = 'in_progress';
    case Escalated = 'escalated';
    case Resolved = 'resolved';
    case Closed = 'closed';
}
