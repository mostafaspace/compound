<?php

namespace App\Enums;

enum AnnouncementPriority: string
{
    case Low = 'low';
    case Normal = 'normal';
    case High = 'high';
    case Critical = 'critical';
}
