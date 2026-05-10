<?php

namespace App\Enums;

enum NotificationCategory: string
{
    case Documents = 'documents';
    case Visitors = 'visitors';
    case Issues = 'issues';
    case Announcements = 'announcements';
    case Polls = 'polls';
    case Finance = 'finance';
    case System = 'system';
    case Vehicles = 'vehicles';
    case Onboarding = 'onboarding';
}
