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

        foreach ($assignments as $assignment) {
            match ($assignment->scope_type) {
                'compound' => $ids->push((int) $assignment->scope_id),
                'building' => $ids->push(
                    (int) \App\Models\Property\Building::find($assignment->scope_id)?->compound_id
                ),
                'floor' => $ids->push(
                    (int) \App\Models\Property\Floor::find($assignment->scope_id)
                        ?->building?->compound_id
                ),
                default => null,
            };
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
                'building' => $ids->push((int) $assignment->scope_id),
                'floor' => $ids->push(
                    (int) \App\Models\Property\Floor::find($assignment->scope_id)?->building_id
                ),
                default => null,
            };
        }

        $ids = $ids->filter()->unique();

        if ($compoundId !== null) {
            $ids = $ids->filter(fn ($bid) =>
                \App\Models\Property\Building::where('id', $bid)
                    ->where('compound_id', $compoundId)
                    ->exists()
            );
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
                'floor' => $ids->push((int) $assignment->scope_id),
                default => null,
            };
        }

        $ids = $ids->filter()->unique();

        if ($buildingId !== null) {
            $ids = $ids->filter(fn ($fid) =>
                \App\Models\Property\Floor::where('id', $fid)
                    ->where('building_id', $buildingId)
                    ->exists()
            );
        }

        return $ids->values()->all();
    }

    /**
     * Returns true if user's scope covers the given resource.
     */
    public function userCanAccessResource(User $user, string $scopeType, int $scopeId): bool
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
        int $targetId
    ): bool {
        return match ($assignment->scope_type) {
            'compound' => match ($targetType) {
                'compound' => (int) $assignment->scope_id === $targetId,
                'building' => \App\Models\Property\Building::where('id', $targetId)
                    ->where('compound_id', $assignment->scope_id)->exists(),
                'floor' => \App\Models\Property\Floor::where('id', $targetId)
                    ->whereHas('building', fn ($q) => $q->where('compound_id', $assignment->scope_id))
                    ->exists(),
                default => false,
            },
            'building' => match ($targetType) {
                'building' => (int) $assignment->scope_id === $targetId,
                'floor' => \App\Models\Property\Floor::where('id', $targetId)
                    ->where('building_id', $assignment->scope_id)->exists(),
                default => false,
            },
            'floor' => $targetType === 'floor' && (int) $assignment->scope_id === $targetId,
            default => false,
        };
    }
}
