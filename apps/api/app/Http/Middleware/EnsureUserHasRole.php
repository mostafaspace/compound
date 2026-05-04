<?php

namespace App\Http\Middleware;

use App\Enums\AccountStatus;
use App\Enums\Permission;
use App\Enums\UserRole;
use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Spatie\Permission\Exceptions\PermissionDoesNotExist;
use Symfony\Component\HttpFoundation\Response;

/**
 * Checks that the user's account is active AND has at least one of the
 * specified Spatie permissions (or is super_admin, which bypasses via Gate).
 *
 * Usage on routes: ->middleware('role:view_finance,manage_finance')
 * Usage with Spatie alias: ->middleware('permission:view_finance')
 */
class EnsureUserHasRole
{
    public function handle(Request $request, Closure $next, string ...$permissions): Response
    {
        $user = $request->user();

        if (! $user) {
            abort(Response::HTTP_UNAUTHORIZED, 'Unauthenticated.');
        }

        if (! $this->hasActiveAccess($user)) {
            abort(Response::HTTP_FORBIDDEN, 'Account is not active.');
        }

        // super_admin bypasses all checks (Gate::before handles this, but guard here too)
        if ($user->isEffectiveSuperAdmin()) {
            return $next($request);
        }

        // If no specific permissions required, just active account is enough
        if (empty($permissions)) {
            return $next($request);
        }

        // Check if user has any of the required permissions via Spatie
        foreach ($permissions as $permission) {
            try {
                if ($user->hasPermissionTo($permission, 'sanctum')) {
                    return $next($request);
                }
            } catch (PermissionDoesNotExist) {
                // permission doesn't exist in spatie, fallback to legacy check
            }

            if ($this->legacyRoleHasPermission($user, $permission)) {
                return $next($request);
            }
        }

        abort(Response::HTTP_FORBIDDEN, 'Insufficient permissions.');
    }

    private function hasActiveAccess(mixed $user): bool
    {
        if ($user->status === AccountStatus::Active) {
            return true;
        }

        // Pending-review residents can still access their own routes
        return $user->status === AccountStatus::PendingReview
            && $user instanceof User
            && $user->hasAnyEffectiveRole([UserRole::ResidentOwner, UserRole::ResidentTenant]);
    }

    private function legacyRoleHasPermission(mixed $user, string $permission): bool
    {
        if (! $user instanceof User || ! $user->role instanceof UserRole) {
            return false;
        }

        // Legacy fallback is transitional only. Once explicit Spatie roles exist,
        // they become the authoritative authorization source for the user.
        if ($user->roles()->exists()) {
            return false;
        }

        return in_array($permission, $this->legacyRolePermissions($user->role), strict: true);
    }

    /**
     * @return array<int, string>
     */
    private function legacyRolePermissions(UserRole $role): array
    {
        return match ($role) {
            UserRole::SuperAdmin => Permission::values(),
            UserRole::CompoundAdmin => [
                Permission::ViewCompounds->value,
                Permission::ManageCompounds->value,
                Permission::ViewUsers->value,
                Permission::ManageUsers->value,
                Permission::ViewFinance->value,
                Permission::ManageFinance->value,
                Permission::ViewAnnouncements->value,
                Permission::ManageAnnouncements->value,
                Permission::ViewIssues->value,
                Permission::ManageIssues->value,
                Permission::ViewGovernance->value,
                Permission::ManageGovernance->value,
                Permission::ViewSecurity->value,
                Permission::ManageSecurity->value,
                Permission::ViewVisitors->value,
                Permission::ManageVisitors->value,
                Permission::ViewOrgChart->value,
                Permission::ViewAnalytics->value,
                Permission::ViewAuditLogs->value,
                Permission::ViewMeetings->value,
                Permission::ManageMeetings->value,
                Permission::ViewMaintenance->value,
                Permission::ManageMaintenance->value,
                Permission::ManageSettings->value,
            ],
            UserRole::BoardMember => [
                Permission::ViewFinance->value,
                Permission::ViewGovernance->value,
                Permission::ManageGovernance->value,
                Permission::ViewAnnouncements->value,
                Permission::ManageAnnouncements->value,
                Permission::ViewOrgChart->value,
                Permission::ViewMeetings->value,
                Permission::ManageMeetings->value,
            ],
            UserRole::FinanceReviewer => [
                Permission::ViewFinance->value,
                Permission::ManageFinance->value,
                Permission::ViewUsers->value,
            ],
            UserRole::SecurityGuard => [
                Permission::ViewSecurity->value,
                Permission::ManageSecurity->value,
                Permission::ViewVisitors->value,
                Permission::ManageVisitors->value,
            ],
            UserRole::ResidentOwner => [
                Permission::ViewVisitors->value,
                Permission::ManageVisitors->value,
                Permission::ViewIssues->value,
                Permission::ManageIssues->value,
                Permission::ViewAnnouncements->value,
                Permission::ViewGovernance->value,
                Permission::ViewOrgChart->value,
            ],
            UserRole::ResidentTenant => [
                Permission::ViewVisitors->value,
                Permission::ManageVisitors->value,
                Permission::ViewIssues->value,
                Permission::ManageIssues->value,
                Permission::ViewAnnouncements->value,
                Permission::ViewGovernance->value,
            ],
            UserRole::SupportAgent => [
                Permission::ViewUsers->value,
                Permission::ViewCompounds->value,
                Permission::ViewIssues->value,
                Permission::ViewAnnouncements->value,
                Permission::ViewFinance->value,
                Permission::ViewAuditLogs->value,
                Permission::ViewAnalytics->value,
            ],
        };
    }
}
