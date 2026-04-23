<?php

namespace App\Services;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Http\Request;

/**
 * Resolves the active compound ID for the current request.
 *
 * Resolution order:
 *  1. Compound-scoped staff users always use their own compound_id.
 *  2. Super-admin may pass `X-Compound-Id` header or `compoundId` query param to filter.
 *  3. If neither is provided for super-admin, null is returned (no filtering — all compounds).
 *  4. Resident roles derive their compound from unit memberships (handled per-controller).
 */
class CompoundContextService
{
    /**
     * Resolve the active compound ID for the given request.
     *
     * Returns null when the user is a super-admin without an explicit compound header/param,
     * meaning no compound filtering should be applied.
     *
     * @return string|null  ULID of the active compound, or null for "all compounds"
     */
    public function resolve(Request $request): ?string
    {
        /** @var User|null $user */
        $user = $request->user();

        if (! $user) {
            return null;
        }

        // Compound-scoped staff: hard-lock to their assigned compound.
        if ($user->compound_id !== null) {
            return $user->compound_id;
        }

        // Super-admin: honour an explicit compound header or query parameter.
        if ($user->role === UserRole::SuperAdmin) {
            $header = $request->header('X-Compound-Id');
            if (filled($header)) {
                return $header;
            }

            $param = $request->query('compoundId');
            if (filled($param)) {
                return $param;
            }
        }

        return null;
    }

    /**
     * Returns true when the user is restricted to a specific compound
     * (i.e., they are NOT a super-admin browsing all compounds).
     */
    public function isScoped(Request $request): bool
    {
        return $this->resolve($request) !== null;
    }
}
