<?php

namespace App\Enums;

enum NotificationCategory: string
{
    case Documents = 'documents';
    case Visitors = 'visitors';
    case Issues = 'issues';
    case Announcements = 'announcements';
    case Finance = 'finance';
    case System = 'system';
}
