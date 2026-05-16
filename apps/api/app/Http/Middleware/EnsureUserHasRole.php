<?php

namespace App\Http\Middleware;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Models\User;
use Closure;
use Illuminate\Http\Request;
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

        foreach ($permissions as $permission) {
            if ($user instanceof User && $user->hasEffectivePermission($permission)) {
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

}
