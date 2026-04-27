<?php

namespace App\Services;

use App\Models\User;
use App\Models\UserScopeAssignment;
use Illuminate\Support\Collection;

class ScopeResolver
{
    /**
     * Returns compound IDs the user can access.
     * Returns null if the user has global access (no restriction).
     *
     * @return array<int>|null
     */
    public function resolveCompoundIds(User $user): ?array
    {
        $assignments = $user->scopeAssignments()->get();

        if ($assignments->contains('scope_type', 'global')) {
            return null; // no restriction
        }

        $ids = collect();

        // Direct compound assignments
        $compoundIds = $assignments->where('scope_type', 'compound')->pluck('scope_id');
        $ids->push(...$compoundIds->all());

        // Building assignments → get their compound_id in one query
        $buildingIds = $assignments->where('scope_type', 'building')->pluck('scope_id');
        if ($buildingIds->isNotEmpty()) {
            $cids = \App\Models\Property\Building::whereIn('id', $buildingIds->all())
                ->pluck('compound_id');
            $ids->push(...$cids->all());
        }

        // Floor assignments → get building→compound_id in one query
        $floorIds = $assignments->where('scope_type', 'floor')->pluck('scope_id');
        if ($floorIds->isNotEmpty()) {
            $cids = \App\Models\Property\Floor::whereIn('id', $floorIds->all())
                ->join('buildings', 'floors.building_id', '=', 'buildings.id')
                ->pluck('buildings.compound_id');
            $ids->push(...$cids->all());
        }

        // Unit assignments → get compound_id in one query
        $unitIds = $assignments->where('scope_type', 'unit')->pluck('scope_id');
        if ($unitIds->isNotEmpty()) {
            $cids = \App\Models\Property\Unit::whereIn('id', $unitIds->all())
                ->pluck('compound_id');
            $ids->push(...$cids->all());
        }

        return $ids->filter()->unique()->values()->all();
    }

    /**
     * Returns building IDs the user can access within an optional compound filter.
     *
     * @return array<int>|null
     */
    public function resolveBuildingIds(User $user, ?int $compoundId = null): ?array
    {
        $assignments = $user->scopeAssignments()->get();

        if ($assignments->contains('scope_type', 'global')) {
            return null;
        }

        $ids = collect();

        foreach ($assignments as $assignment) {
            match ($assignment->scope_type) {
                'compound' => $ids->push(
                    ...\App\Models\Property\Building::where('compound_id', $assignment->scope_id)
                        ->pluck('id')->all()
                ),
                'building' => $ids->push($assignment->scope_id),
                'floor' => $ids->push(
                    \App\Models\Property\Floor::find($assignment->scope_id)?->building_id
                ),
                'unit' => $ids->push(
                    \App\Models\Property\Unit::find($assignment->scope_id)?->building_id
                ),
                default => null,
            };
        }

        $ids = $ids->filter()->unique();

        if ($compoundId !== null) {
            $validIds = \App\Models\Property\Building::whereIn('id', $ids->all())
                ->where('compound_id', $compoundId)
                ->pluck('id');
            $ids = collect($validIds);
        }

        return $ids->values()->all();
    }

    /**
     * Returns floor IDs the user can access within an optional building filter.
     *
     * @return array<int>|null
     */
    public function resolveFloorIds(User $user, ?int $buildingId = null): ?array
    {
        $assignments = $user->scopeAssignments()->get();

        if ($assignments->contains('scope_type', 'global')) {
            return null;
        }

        $ids = collect();

        foreach ($assignments as $assignment) {
            match ($assignment->scope_type) {
                'compound' => $ids->push(
                    ...\App\Models\Property\Floor::whereHas('building', fn ($q) =>
                        $q->where('compound_id', $assignment->scope_id)
                    )->pluck('id')->all()
                ),
                'building' => $ids->push(
                    ...\App\Models\Property\Floor::where('building_id', $assignment->scope_id)
                        ->pluck('id')->all()
                ),
                'floor' => $ids->push($assignment->scope_id),
                'unit' => $ids->push(
                    \App\Models\Property\Unit::find($assignment->scope_id)?->floor_id
                ),
                default => null,
            };
        }

        $ids = $ids->filter()->unique();

        if ($buildingId !== null) {
            $validIds = \App\Models\Property\Floor::whereIn('id', $ids->all())
                ->where('building_id', $buildingId)
                ->pluck('id');
            $ids = collect($validIds);
        }

        return $ids->values()->all();
    }

    /**
     * Returns true if user's scope covers the given resource.
     */
    public function userCanAccessResource(User $user, string $scopeType, string $scopeId): bool
    {
        $assignments = $user->scopeAssignments()->get();

        if ($assignments->contains('scope_type', 'global')) {
            return true;
        }

        foreach ($assignments as $assignment) {
            if ($this->assignmentCoversResource($assignment, $scopeType, $scopeId)) {
                return true;
            }
        }

        return false;
    }

    private function assignmentCoversResource(
        \App\Models\UserScopeAssignment $assignment,
        string $targetType,
        string $targetId
    ): bool {
        return match ($assignment->scope_type) {
            'compound' => match ($targetType) {
                'compound' => $assignment->scope_id === $targetId,
                'building' => \App\Models\Property\Building::where('id', $targetId)
                    ->where('compound_id', $assignment->scope_id)->exists(),
                'floor' => \App\Models\Property\Floor::where('id', $targetId)
                    ->whereHas('building', fn ($q) => $q->where('compound_id', $assignment->scope_id))
                    ->exists(),
                default => false,
            },
            'building' => match ($targetType) {
                'building' => $assignment->scope_id === $targetId,
                'floor' => \App\Models\Property\Floor::where('id', $targetId)
                    ->where('building_id', $assignment->scope_id)->exists(),
                default => false,
            },
            'floor' => $targetType === 'floor' && $assignment->scope_id === $targetId,
            'unit' => $targetType === 'unit' && $assignment->scope_id === $targetId,
            default => false,
        };
    }
}
