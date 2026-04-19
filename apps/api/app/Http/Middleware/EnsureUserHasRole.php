<?php

namespace App\Http\Middleware;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserHasRole
{
    /**
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user || (! $this->hasActiveAccess($user, $roles))) {
            abort(Response::HTTP_FORBIDDEN, 'Account is not active.');
        }

        $allowedRoles = collect($roles)->map(
            fn (string $role): string => UserRole::tryFrom($role)?->value ?? $role
        );

        if ($allowedRoles->isNotEmpty() && ! $allowedRoles->contains($user->role->value)) {
            abort(Response::HTTP_FORBIDDEN, 'User role is not allowed for this action.');
        }

        return $next($request);
    }

    /**
     * @param  array<int, string>  $roles
     */
    private function hasActiveAccess(mixed $user, array $roles): bool
    {
        if ($user->status === AccountStatus::Active) {
            return true;
        }

        $allowedRoles = collect($roles)->map(
            fn (string $role): string => UserRole::tryFrom($role)?->value ?? $role
        );

        return $user->status === AccountStatus::PendingReview
            && in_array($user->role, [UserRole::ResidentOwner, UserRole::ResidentTenant], strict: true)
            && $allowedRoles->contains($user->role->value);
    }
}
