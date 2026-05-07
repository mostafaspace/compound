<?php

namespace Database\Seeders;

use App\Enums\Permission;
use App\Enums\UserRole;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission as SpatiePermission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RbacSeeder extends Seeder
{
    public function run(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        // Create all defined permissions
        foreach (Permission::values() as $perm) {
            SpatiePermission::firstOrCreate(['name' => $perm, 'guard_name' => 'sanctum']);
        }

        $p = fn (Permission ...$cases) => array_map(fn ($c) => $c->value, $cases);

        $rolePermissions = [
            UserRole::SuperAdmin->value => [], // bypassed via Gate::before

            UserRole::CompoundAdmin->value => $p(
                Permission::ViewCompounds, Permission::ManageCompounds,
                Permission::ViewUsers, Permission::ManageUsers,
                Permission::ViewFinance, Permission::ManageFinance,
                Permission::ViewAnnouncements, Permission::ManageAnnouncements,
                Permission::ViewIssues, Permission::ManageIssues,
                Permission::ViewGovernance, Permission::ManageGovernance,
                Permission::ViewSecurity, Permission::ManageSecurity,
                Permission::ViewVisitors, Permission::ManageVisitors,
                Permission::ViewOrgChart, Permission::ViewAnalytics,
                Permission::ViewAuditLogs, Permission::ViewMeetings,
                Permission::ManageMeetings, Permission::ViewMaintenance,
                Permission::ManageMaintenance, Permission::ApartmentsAdmin,
                Permission::ManageSettings,
            ),

            'building_supervisor' => $p(
                Permission::ViewUsers,
                Permission::ViewAnnouncements, Permission::ManageAnnouncements,
                Permission::ViewIssues, Permission::ManageIssues,
                Permission::ViewSecurity, Permission::ViewVisitors,
                Permission::ViewOrgChart, Permission::ViewMeetings,
                Permission::ViewMaintenance, Permission::ManageMaintenance,
            ),

            'floor_supervisor' => $p(
                Permission::ViewUsers,
                Permission::ViewAnnouncements,
                Permission::ViewIssues, Permission::ManageIssues,
                Permission::ViewVisitors, Permission::ViewOrgChart,
            ),

            UserRole::BoardMember->value => $p(
                Permission::ViewFinance,
                Permission::ViewGovernance, Permission::ManageGovernance,
                Permission::ViewAnnouncements, Permission::ManageAnnouncements,
                Permission::ViewOrgChart, Permission::ViewMeetings, Permission::ManageMeetings,
            ),

            UserRole::FinanceReviewer->value => $p(
                Permission::ViewFinance, Permission::ManageFinance,
                Permission::ViewUsers,
                Permission::ApartmentsAdmin, Permission::ApplyApartmentViolation,
            ),

            UserRole::SecurityGuard->value => $p(
                Permission::ViewSecurity, Permission::ManageSecurity,
                Permission::ViewVisitors, Permission::ManageVisitors,
            ),

            UserRole::ResidentOwner->value => $p(
                Permission::ViewVisitors, Permission::ManageVisitors,
                Permission::ViewIssues, Permission::ManageIssues,
                Permission::ViewAnnouncements,
                Permission::ViewFinance,
                Permission::ViewGovernance,
                Permission::ViewOrgChart,
            ),

            UserRole::ResidentTenant->value => $p(
                Permission::ViewVisitors, Permission::ManageVisitors,
                Permission::ViewIssues, Permission::ManageIssues,
                Permission::ViewAnnouncements,
                Permission::ViewGovernance,
                Permission::ViewOrgChart,
            ),

            UserRole::Resident->value => $p(
                Permission::ViewVisitors, Permission::ManageVisitors,
                Permission::ViewIssues, Permission::ManageIssues,
                Permission::ViewAnnouncements,
                Permission::ViewGovernance,
                Permission::ViewOrgChart,
            ),

            UserRole::President->value => $p(
                Permission::ViewCompounds,
                Permission::ViewUsers,
                Permission::ViewFinance,
                Permission::ViewAnnouncements, Permission::ManageAnnouncements,
                Permission::ViewIssues, Permission::ManageIssues,
                Permission::ViewGovernance, Permission::ManageGovernance,
                Permission::ViewSecurity,
                Permission::ViewVisitors,
                Permission::ViewOrgChart, Permission::ViewAnalytics,
                Permission::ViewAuditLogs, Permission::ViewMeetings,
                Permission::ManageMeetings, Permission::ViewMaintenance,
            ),

            UserRole::SupportAgent->value => $p(
                Permission::ViewUsers, Permission::ViewCompounds,
                Permission::ViewIssues, Permission::ViewAnnouncements,
                Permission::ViewFinance, Permission::ViewAuditLogs,
            ),
        ];

        foreach ($rolePermissions as $roleName => $permissions) {
            $role = Role::firstOrCreate(
                ['name' => $roleName, 'guard_name' => 'sanctum'],
                ['is_system' => true],
            );
            // Ensure existing rows also get is_system = true
            if (! $role->is_system) {
                $role->update(['is_system' => true]);
            }
            $role->syncPermissions($permissions);
        }
    }
}
