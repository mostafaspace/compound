<?php

namespace Database\Seeders;

use App\Enums\Permission;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission as SpatiePermission;

class RbacSeeder extends Seeder
{
    public function run(): void
    {
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // Create all 25 permissions
        foreach (Permission::values() as $perm) {
            SpatiePermission::firstOrCreate(['name' => $perm, 'guard_name' => 'sanctum']);
        }

        $p = fn (Permission ...$cases) => array_map(fn ($c) => $c->value, $cases);

        $rolePermissions = [
            'super_admin' => [], // bypassed via Gate::before

            'compound_head' => $p(
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
                Permission::ManageMaintenance, Permission::ManageSettings,
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

            'board_member' => $p(
                Permission::ViewFinance,
                Permission::ViewGovernance, Permission::ManageGovernance,
                Permission::ViewAnnouncements, Permission::ManageAnnouncements,
                Permission::ViewOrgChart, Permission::ViewMeetings, Permission::ManageMeetings,
            ),

            'finance_reviewer' => $p(
                Permission::ViewFinance, Permission::ManageFinance,
                Permission::ViewUsers,
            ),

            'security_guard' => $p(
                Permission::ViewSecurity, Permission::ManageSecurity,
                Permission::ViewVisitors, Permission::ManageVisitors,
            ),

            'resident_owner' => $p(
                Permission::ViewVisitors, Permission::ManageVisitors,
                Permission::ViewIssues, Permission::ManageIssues,
                Permission::ViewAnnouncements,
                Permission::ViewFinance,
                Permission::ViewOrgChart,
            ),

            'resident_tenant' => $p(
                Permission::ViewVisitors, Permission::ManageVisitors,
                Permission::ViewIssues, Permission::ManageIssues,
                Permission::ViewAnnouncements,
            ),

            'support_agent' => $p(
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
