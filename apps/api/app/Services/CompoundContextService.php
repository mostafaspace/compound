<?php

namespace App\Services;

use App\Enums\UserRole;
use App\Models\Property\Building;
use App\Models\Property\Floor;
use App\Models\Property\Unit;
use App\Models\User;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Resolves the active compound ID for the current request.
 *
 * Resolution order:
 *  1. Super-admin may pass `X-Compound-Id` header or `compoundId` query param to filter.
 *  2. Effective compound admins resolve their managed compound from active memberships first,
 *     then fall back to the direct user row when no membership scope exists.
 *  3. Other compound-scoped staff users use their own compound_id.
 *  4. Resident roles derive their compound from unit memberships (handled per-controller).
 */
class CompoundContextService
{
    public function __construct(
        private readonly ScopeResolver $scopeResolver,
    ) {}

    private function isEffectiveSuperAdmin(User $user): bool
    {
        return $user->isEffectiveSuperAdmin();
    }

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

        return $this->resolveRequestedAccessibleCompoundId(
            $user,
            $request->header('X-Compound-Id') ?? $request->query('compoundId')
        );
    }

    /**
     * Returns true when the user is restricted to a specific compound
     * (i.e., they are NOT a super-admin browsing all compounds).
     */
    public function isScoped(Request $request): bool
    {
        return $this->resolve($request) !== null;
    }

    public function canAccessCompound(Request $request, string $compoundId): bool
    {
        /** @var User|null $user */
        $user = $request->user();

        if (! $user) {
            return false;
        }

        return $this->userCanAccessCompoundById($user, $compoundId);
    }

    public function ensureCompoundAccess(Request $request, string $compoundId): void
    {
        abort_unless($this->canAccessCompound($request, $compoundId), Response::HTTP_FORBIDDEN);
    }

    public function userBelongsToCompound(User $user, string $compoundId): bool
    {
        if ($user->compound_id === $compoundId) {
            return true;
        }

        return $user->unitMemberships()
            ->whereHas('unit', fn ($unitQuery) => $unitQuery->where('compound_id', $compoundId))
            ->exists();
    }

    public function canAccessUser(Request $request, User $user): bool
    {
        /** @var User|null $actor */
        $actor = $request->user();

        if (! $actor) {
            return false;
        }

        if ($this->isEffectiveSuperAdmin($actor)) {
            return true;
        }

        $compoundId = $this->resolve($request);

        return $compoundId !== null && $this->userBelongsToCompound($user, $compoundId);
    }

    public function ensureUserAccess(Request $request, User $user): void
    {
        abort_unless($this->canAccessUser($request, $user), Response::HTTP_FORBIDDEN);
    }

    public function scopeUsersToCompound($query, string $compoundId): void
    {
        $query->where(function ($scoped) use ($compoundId): void {
            $scoped
                ->where('compound_id', $compoundId)
                ->orWhereHas('unitMemberships.unit', fn ($unitQuery) => $unitQuery->where('compound_id', $compoundId));
        });
    }

    /**
     * @param  array<string>  $compoundIds
     */
    public function scopeUsersToCompounds($query, array $compoundIds): void
    {
        $query->where(function ($scoped) use ($compoundIds): void {
            $scoped
                ->whereIn('compound_id', $compoundIds)
                ->orWhereHas('unitMemberships.unit', fn ($unitQuery) => $unitQuery->whereIn('compound_id', $compoundIds));
        });
    }

    public function scopePropertyQuery(\Illuminate\Database\Eloquent\Builder $query, User $user): void
    {
        $this->scopeResolver->scopePropertyQuery($query, $user);
    }

    public function resolveUserCompoundId(User $user): ?string
    {
        $membershipCompoundId = $this->resolveMembershipCompoundId($user);

        if ($membershipCompoundId !== null) {
            return $membershipCompoundId;
        }

        if ($user->compound_id !== null) {
            return $user->compound_id;
        }

        return null;
    }

    private function resolveMembershipCompoundId(User $user): ?string
    {
        $membership = $user->unitMemberships()
            ->with('unit:id,compound_id')
            ->activeForAccess()
            ->orderByDesc('is_primary')
            ->latest('id')
            ->first()
            ?? $user->unitMemberships()
                ->with('unit:id,compound_id')
                ->active()
                ->orderByDesc('is_primary')
                ->latest('id')
                ->first()
            ?? $user->unitMemberships()
                ->with('unit:id,compound_id')
                ->orderByDesc('is_primary')
                ->latest('id')
                ->first();

        return $membership?->unit?->compound_id;
    }

    public function resolveManagedCompoundId(User $user): ?string
    {
        if ($this->isEffectiveSuperAdmin($user)) {
            return null;
        }

        if ($user->hasEffectiveRole(UserRole::CompoundAdmin)) {
            return $this->resolveMembershipCompoundId($user) ?? $user->compound_id;
        }

        return $this->resolveUserCompoundId($user);
    }

    public function ensureManagedCompoundAccess(User $user, string $compoundId): void
    {
        if ($this->isEffectiveSuperAdmin($user)) {
            return;
        }

        $managedCompoundId = $this->resolveManagedCompoundId($user);

        abort_unless($managedCompoundId !== null && $managedCompoundId === $compoundId, Response::HTTP_FORBIDDEN);
    }

    /**
     * Resolve all compound IDs the user can operate within.
     *
     * Returns null for global access.
     *
     * @return list<string>|null
     */
    public function resolveAccessibleCompoundIds(User $user): ?array
    {
        if ($this->isEffectiveSuperAdmin($user)) {
            return null;
        }

        $scopeAssignedCompoundIds = $this->scopeResolver->resolveCompoundIds($user);

        if ($scopeAssignedCompoundIds === null) {
            return null;
        }

        if ($scopeAssignedCompoundIds !== []) {
            return array_values(array_unique(array_map(static fn ($compoundId): string => (string) $compoundId, $scopeAssignedCompoundIds)));
        }

        if ($user->hasEffectiveRole(UserRole::CompoundAdmin)) {
            $managedCompoundId = $this->resolveManagedCompoundId($user);

            return $managedCompoundId === null ? [] : [$managedCompoundId];
        }

        $managedCompoundId = $this->resolveManagedCompoundId($user);

        if ($managedCompoundId !== null) {
            return [$managedCompoundId];
        }

        if ($user->hasAnyEffectiveRole([
            UserRole::BoardMember,
            UserRole::FinanceReviewer,
            UserRole::SupportAgent,
        ])) {
            return null;
        }

        return [];
    }

    /**
     * Returns null for global access or a narrowed list of compound IDs the user can access.
     *
     * @return list<string>|null
     */
    public function resolveRequestedAccessibleCompoundIds(User $user, ?string $requestedCompoundId = null): ?array
    {
        $accessibleCompoundIds = $this->resolveAccessibleCompoundIds($user);

        if ($accessibleCompoundIds === null) {
            return $requestedCompoundId === null ? null : [$requestedCompoundId];
        }

        if ($requestedCompoundId !== null) {
            abort_unless(in_array($requestedCompoundId, $accessibleCompoundIds, true), Response::HTTP_FORBIDDEN);

            return [$requestedCompoundId];
        }

        return $accessibleCompoundIds;
    }

    public function resolveRequestedAccessibleCompoundId(User $user, ?string $requestedCompoundId = null): ?string
    {
        $accessibleCompoundIds = $this->resolveRequestedAccessibleCompoundIds($user, $requestedCompoundId);

        if ($accessibleCompoundIds === null) {
            return null;
        }

        if (count($accessibleCompoundIds) === 1) {
            return $accessibleCompoundIds[0];
        }

        return null;
    }

    public function userCanAccessCompoundById(User $user, string $compoundId): bool
    {
        $accessibleCompoundIds = $this->resolveAccessibleCompoundIds($user);

        return $accessibleCompoundIds === null || in_array($compoundId, $accessibleCompoundIds, true);
    }

    public function ensureUserCanAccessCompound(User $user, string $compoundId): void
    {
        abort_unless($this->userCanAccessCompoundById($user, $compoundId), Response::HTTP_FORBIDDEN);
    }

    public function canManageAllCompounds(Request $request): bool
    {
        /** @var User|null $user */
        $user = $request->user();

        return $user instanceof User && $this->isEffectiveSuperAdmin($user);
    }

    public function ensureGlobalCompoundAccess(Request $request): void
    {
        abort_unless($this->canManageAllCompounds($request), Response::HTTP_FORBIDDEN);
    }

    /**
     * Resolve all building IDs the user can operate within.
     *
     * Returns null for global access (within the compound context).
     *
     * @return list<string>|null
     */
    public function resolveAccessibleBuildingIds(User $user, ?string $compoundId = null): ?array
    {
        if ($this->isEffectiveSuperAdmin($user)) {
            return null;
        }

        $buildingIds = $this->scopeResolver->resolveBuildingIds($user, $compoundId);

        if ($buildingIds !== []) {
            return $buildingIds;
        }

        $managedCompoundId = $this->resolveManagedCompoundId($user);

        if ($managedCompoundId === null) {
            return [];
        }

        if ($compoundId !== null && $compoundId !== $managedCompoundId) {
            return [];
        }

        return Building::query()
            ->where('compound_id', $managedCompoundId)
            ->pluck('id')
            ->all();
    }

    /**
     * Returns null for global access or a narrowed list of building IDs the user can access.
     *
     * @return list<string>|null
     */
    public function resolveRequestedAccessibleBuildingIds(User $user, ?string $requestedBuildingId = null, ?string $compoundId = null): ?array
    {
        $accessibleBuildingIds = $this->resolveAccessibleBuildingIds($user, $compoundId);

        if ($accessibleBuildingIds === null) {
            return $requestedBuildingId === null ? null : [$requestedBuildingId];
        }

        if ($requestedBuildingId !== null) {
            abort_unless(in_array($requestedBuildingId, $accessibleBuildingIds, true), Response::HTTP_FORBIDDEN);

            return [$requestedBuildingId];
        }

        return $accessibleBuildingIds;
    }

    public function userCanAccessBuildingById(User $user, string $buildingId): bool
    {
        $accessibleBuildingIds = $this->resolveAccessibleBuildingIds($user);

        return $accessibleBuildingIds === null || in_array($buildingId, $accessibleBuildingIds, true);
    }

    public function ensureUserCanAccessBuilding(User $user, string $buildingId): void
    {
        abort_unless($this->userCanAccessBuildingById($user, $buildingId), Response::HTTP_FORBIDDEN);
    }

    /**
     * Resolve all floor IDs the user can operate within.
     *
     * Returns null for global access.
     *
     * @return list<string>|null
     */
    public function resolveAccessibleFloorIds(User $user, ?string $buildingId = null): ?array
    {
        if ($this->isEffectiveSuperAdmin($user)) {
            return null;
        }

        $floorIds = $this->scopeResolver->resolveFloorIds($user, $buildingId);

        if ($floorIds !== []) {
            return $floorIds;
        }

        $managedCompoundId = $this->resolveManagedCompoundId($user);

        if ($managedCompoundId === null) {
            return [];
        }

        $query = Floor::query()
            ->whereHas('building', fn ($buildingQuery) => $buildingQuery->where('compound_id', $managedCompoundId));

        if ($buildingId !== null) {
            $query->where('building_id', $buildingId);
        }

        return $query->pluck('id')->all();
    }

    public function userCanAccessFloorById(User $user, string $floorId): bool
    {
        $accessibleFloorIds = $this->resolveAccessibleFloorIds($user);

        return $accessibleFloorIds === null || in_array($floorId, $accessibleFloorIds, true);
    }

    public function ensureUserCanAccessFloor(User $user, string $floorId): void
    {
        abort_unless($this->userCanAccessFloorById($user, $floorId), Response::HTTP_FORBIDDEN);
    }

    public function userCanAccessUnit(User $user, string $unitId): bool
    {
        if ($this->isEffectiveSuperAdmin($user)) {
            return true;
        }

        if ($this->scopeResolver->userCanAccessResource($user, 'unit', $unitId)) {
            return true;
        }

        $managedCompoundId = $this->resolveManagedCompoundId($user);

        if ($managedCompoundId === null) {
            return false;
        }

        return Unit::query()
            ->where('id', $unitId)
            ->where('compound_id', $managedCompoundId)
            ->exists();
    }

    public function resolveManagedCompound(
        Request $request,
        ?string $requestedCompoundId = null,
        bool $allowGlobalForSuperAdmin = true,
    ): ?string {
        /** @var User|null $user */
        $user = $request->user();

        abort_unless($user !== null, Response::HTTP_FORBIDDEN);

        $candidate = filled($requestedCompoundId) ? $requestedCompoundId : null;

        if ($candidate === null) {
            $header = $request->header('X-Compound-Id');
            if (filled($header)) {
                $candidate = $header;
            }
        }

        if ($candidate === null) {
            $queryParam = $request->query('compoundId');
            if (filled($queryParam)) {
                $candidate = $queryParam;
            }
        }

        if ($this->isEffectiveSuperAdmin($user)) {
            if ($candidate !== null) {
                return $candidate;
            }

            abort_unless($allowGlobalForSuperAdmin, Response::HTTP_FORBIDDEN);

            return null;
        }

        $managedCompoundId = $this->resolveManagedCompoundId($user);

        abort_unless($managedCompoundId !== null, Response::HTTP_FORBIDDEN);

        if ($candidate !== null && $candidate !== $managedCompoundId) {
            abort(Response::HTTP_FORBIDDEN);
        }

        return $managedCompoundId;
    }
}
