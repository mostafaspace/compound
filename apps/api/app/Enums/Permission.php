<?php

namespace App\Enums;

enum Permission: string
{
    case ViewCompounds = 'view_compounds';
    case ManageCompounds = 'manage_compounds';
    case ViewUsers = 'view_users';
    case ManageUsers = 'manage_users';
    case ViewFinance = 'view_finance';
    case ManageFinance = 'manage_finance';
    case ViewAnnouncements = 'view_announcements';
    case ManageAnnouncements = 'manage_announcements';
    case ViewIssues = 'view_issues';
    case ManageIssues = 'manage_issues';
    case ViewGovernance = 'view_governance';
    case ManageGovernance = 'manage_governance';
    case ViewSecurity = 'view_security';
    case ManageSecurity = 'manage_security';
    case ViewAdminSecurity = 'view_admin_security';
    case ManageAdminSecurity = 'manage_admin_security';
    case ViewVisitors = 'view_visitors';
    case ManageVisitors = 'manage_visitors';
    case ViewOrgChart = 'view_org_chart';
    case ViewAnalytics = 'view_analytics';
    case ViewAuditLogs = 'view_audit_logs';
    case ViewMeetings = 'view_meetings';
    case ManageMeetings = 'manage_meetings';
    case ViewMaintenance = 'view_maintenance';
    case ManageMaintenance = 'manage_maintenance';
    case ApartmentsAdmin = 'apartments_admin';
    case ApplyApartmentViolation = 'apply_apartment_violation';
    case ManageApartmentPenaltyPoints = 'manage_apartment_penalty_points';
    case LookupVehicles = 'lookup_vehicles';
    case ManageSettings = 'manage_settings';
    case ManageRoles = 'manage_roles';

    /** @return array<string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
