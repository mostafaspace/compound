<?php

namespace App\Enums;

enum AnnouncementCategory: string
{
    case General = 'general';
    case Building = 'building';
    case AssociationDecision = 'association_decision';
    case SecurityAlert = 'security_alert';
    case MaintenanceNotice = 'maintenance_notice';
    case MeetingReminder = 'meeting_reminder';
}
