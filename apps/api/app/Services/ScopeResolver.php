<?php

namespace App\Services;

use App\Models\Property\Building;
use App\Models\Property\Floor;
use App\Models\Property\Unit;
use App\Models\User;
use App\Models\UserScopeAssignment;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Schema;

class ScopeResolver
{
    /**
     * Returns compound IDs the user can access.
     * Returns null if the user has global access (no restriction).
     *
     * @return array<string>|null
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
            $cids = Building::whereIn('id', $buildingIds->all())
                ->pluck('compound_id');
            $ids->push(...$cids->all());
        }

        // Floor assignments → get building→compound_id in one query
        $floorIds = $assignments->where('scope_type', 'floor')->pluck('scope_id');
        if ($floorIds->isNotEmpty()) {
            $cids = Floor::whereIn('floors.id', $floorIds->all())
                ->join('buildings', 'floors.building_id', '=', 'buildings.id')
                ->pluck('buildings.compound_id');
            $ids->push(...$cids->all());
        }

        // Unit assignments → get compound_id in one query
        $unitIds = $assignments->where('scope_type', 'unit')->pluck('scope_id');
        if ($unitIds->isNotEmpty()) {
            $cids = Unit::whereIn('id', $unitIds->all())
                ->pluck('compound_id');
            $ids->push(...$cids->all());
        }

        return $ids->filter()->unique()->values()->all();
    }

    /**
     * Returns building IDs the user can access within an optional compound filter.
     *
     * @return array<string>|null
     */
    public function resolveBuildingIds(User $user, ?string $compoundId = null): ?array
    {
        $assignments = $user->scopeAssignments()->get();

        if ($assignments->contains('scope_type', 'global')) {
            return null;
        }

        $ids = collect();

        foreach ($assignments as $assignment) {
            match ($assignment->scope_type) {
                'compound' => $ids->push(
                    ...Building::where('compound_id', $assignment->scope_id)
                        ->pluck('id')->all()
                ),
                'building' => $ids->push($assignment->scope_id),
                'floor' => $ids->push(
                    Floor::find($assignment->scope_id)?->building_id
                ),
                'unit' => $ids->push(
                    Unit::find($assignment->scope_id)?->building_id
                ),
                default => null,
            };
        }

        $ids = $ids->filter()->unique();

        if ($compoundId !== null) {
            $validIds = Building::whereIn('buildings.id', $ids->all())
                ->where('buildings.compound_id', $compoundId)
                ->pluck('id');
            $ids = collect($validIds);
        }

        return $ids->values()->all();
    }

    /**
     * Returns floor IDs the user can access within an optional building filter.
     *
     * @return array<string>|null
     */
    public function resolveFloorIds(User $user, ?string $buildingId = null): ?array
    {
        $assignments = $user->scopeAssignments()->get();

        if ($assignments->contains('scope_type', 'global')) {
            return null;
        }

        $ids = collect();

        foreach ($assignments as $assignment) {
            match ($assignment->scope_type) {
                'compound' => $ids->push(
                    ...Floor::whereHas('building', fn ($q) => $q->where('compound_id', $assignment->scope_id)
                    )->pluck('id')->all()
                ),
                'building' => $ids->push(
                    ...Floor::where('building_id', $assignment->scope_id)
                        ->pluck('id')->all()
                ),
                'floor' => $ids->push($assignment->scope_id),
                'unit' => $ids->push(
                    Unit::find($assignment->scope_id)?->floor_id
                ),
                default => null,
            };
        }

        $ids = $ids->filter()->unique();

        if ($buildingId !== null) {
            $validIds = Floor::whereIn('floors.id', $ids->all())
                ->where('floors.building_id', $buildingId)
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

    /**
     * Apply property-level scoping to a query based on user assignments.
     * This method is "Property-Aware": it detects if the model has direct
     * columns (building_id, floor_id) or must scope via a 'unit' relationship.
     */
    public function scopePropertyQuery(Builder $query, User $user): void
    {
        $assignments = $user->scopeAssignments()->get();

        if ($assignments->contains('scope_type', 'global')) {
            return;
        }

        // If no assignments, they shouldn't see anything.
        if ($assignments->isEmpty()) {
            $query->whereRaw('1 = 0');

            return;
        }

        $model = $query->getModel();
        $table = $model->getTable();

        // Detect available columns once for this query
        $columns = Schema::getColumnListing($table);
        $hasCompound = in_array('compound_id', $columns, true);
        $hasBuilding = in_array('building_id', $columns, true);
        $hasFloor = in_array('floor_id', $columns, true);
        $hasUnit = in_array('unit_id', $columns, true);
        $isUnit = in_array('id', $columns, true) && $table === 'units';

        $query->where(function ($q) use ($assignments, $table, $hasCompound, $hasBuilding, $hasFloor, $hasUnit, $isUnit): void {
            foreach ($assignments as $assignment) {
                $q->orWhere(function ($sub) use ($assignment, $table, $hasCompound, $hasBuilding, $hasFloor, $hasUnit, $isUnit): void {
                    match ($assignment->scope_type) {
                        'compound' => $hasCompound
                            ? $sub->where($table.'.compound_id', $assignment->scope_id)
                            : ($hasUnit ? $sub->whereHas('unit.building', fn ($bq) => $bq->where('compound_id', $assignment->scope_id)) : $sub->whereRaw('1=0')),

                        'building' => $hasBuilding
                            ? $sub->where($table.'.building_id', $assignment->scope_id)
                            : ($hasUnit ? $sub->whereHas('unit', fn ($uq) => $uq->where('building_id', $assignment->scope_id)) : $sub->whereRaw('1=0')),

                        'floor' => $hasFloor
                            ? $sub->where($table.'.floor_id', $assignment->scope_id)
                            : ($hasUnit ? $sub->whereHas('unit', fn ($uq) => $uq->where('floor_id', $assignment->scope_id)) : $sub->whereRaw('1=0')),

                        'unit' => $hasUnit
                            ? $sub->where($table.'.unit_id', $assignment->scope_id)
                            : ($isUnit ? $sub->where($table.'.id', $assignment->scope_id) : $sub->whereRaw('1=0')),

                        default => $sub->whereRaw('1=0'),
                    };
                });
            }
        });
    }

    private function assignmentCoversResource(
        UserScopeAssignment $assignment,
        string $targetType,
        string $targetId
    ): bool {
        return match ($assignment->scope_type) {
            'compound' => match ($targetType) {
                'compound' => $assignment->scope_id === $targetId,
                'building' => Building::where('id', $targetId)
                    ->where('compound_id', $assignment->scope_id)->exists(),
                'floor' => Floor::where('id', $targetId)
                    ->whereHas('building', fn ($q) => $q->where('compound_id', $assignment->scope_id))
                    ->exists(),
                default => false,
            },
            'building' => match ($targetType) {
                'building' => $assignment->scope_id === $targetId,
                'floor' => Floor::where('id', $targetId)
                    ->where('building_id', $assignment->scope_id)->exists(),
                default => false,
            },
            'floor' => $targetType === 'floor' && $assignment->scope_id === $targetId,
            'unit' => $targetType === 'unit' && $assignment->scope_id === $targetId,
            default => false,
        };
    }
}
