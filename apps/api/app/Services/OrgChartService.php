<?php

namespace App\Services;

use App\Enums\ContactVisibility;
use App\Enums\UserRole;
use App\Http\Resources\RepresentativeAssignmentResource;
use App\Models\Property\Compound;
use App\Models\RepresentativeAssignment;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

class OrgChartService
{
    private const CACHE_SCHEMA_VERSION = 2;

    /**
     * @var list<UserRole>
     */
    private const ADMIN_ROLES = [
        UserRole::SuperAdmin,
        UserRole::CompoundAdmin,
        UserRole::BoardMember,
        UserRole::FinanceReviewer,
        UserRole::SupportAgent,
    ];

    /**
     * Build the hierarchical tree for the organizational chart.
     */
    public function getTree(Compound $compound, User $viewer): array
    {
        $isAdmin = $viewer->hasAnyEffectiveRole(self::ADMIN_ROLES);
        $cacheVersion = (string) Cache::get($this->versionCacheKey($compound->id), 1);
        $scopeKey = $isAdmin ? 'admin' : "resident_{$viewer->id}";
        $cacheKey = "org_chart_{$compound->id}_schema_".self::CACHE_SCHEMA_VERSION."_v{$cacheVersion}_{$scopeKey}";

        return Cache::remember($cacheKey, 900, function () use ($compound, $viewer, $isAdmin) {
            $assignments = RepresentativeAssignment::query()
                ->with(['user', 'building', 'floor'])
                ->active()
                ->forCompound($compound->id)
                ->get();
            $viewerScope = $this->resolveViewerScope($viewer);

            $buildingLevel = $assignments->filter(fn ($a) => $a->building_id !== null && $a->floor_id === null);
            $floorLevel = $assignments->filter(fn ($a) => $a->floor_id !== null);
            $compoundLevel = $assignments->filter(fn ($a) => $a->building_id === null && $a->floor_id === null);

            $buildings = $compound->buildings()
                ->with(['floors.units.apartmentResidents.user'])
                ->orderBy('sort_order')
                ->get()
                ->map(function ($building) use ($buildingLevel, $floorLevel, $isAdmin, $viewer, $viewerScope) {
                    $bAssignments = $buildingLevel->filter(fn ($a) => $a->building_id === $building->id);
                    if (! $isAdmin) {
                        $bAssignments = $bAssignments->filter(
                            fn (RepresentativeAssignment $assignment) => $this->canViewerSeeAssignment($assignment, $viewer, $viewerScope)
                        );
                    }

                    $floors = $building->floors
                        ->sortBy('sort_order')
                        ->map(function ($floor) use ($floorLevel, $isAdmin, $viewer, $viewerScope) {
                            $fAssignments = $floorLevel->filter(fn ($a) => $a->floor_id === $floor->id);
                            if (! $isAdmin) {
                                $fAssignments = $fAssignments->filter(
                                    fn (RepresentativeAssignment $assignment) => $this->canViewerSeeAssignment($assignment, $viewer, $viewerScope)
                                );
                            }

                            return [
                                'id' => $floor->id,
                                'label' => $floor->label,
                                'representatives' => $this->serializeAssignments($fAssignments->values()),
                                'units' => $floor->units->map(fn ($u) => [
                                    'id' => $u->id,
                                    'unitNumber' => $u->unit_number,
                                    'residents' => $u->apartmentResidents->map(fn ($m) => [
                                        'id' => $m->user->id,
                                        'name' => $m->user->name,
                                        'photoUrl' => $m->user->photo_url,
                                    ])->values()->all(),
                                ])->values()->all(),
                            ];
                        })->values()->all();

                    return [
                        'id' => $building->id,
                        'name' => $building->name,
                        'code' => $building->code,
                        'representatives' => $this->serializeAssignments($bAssignments->values()),
                        'floors' => $floors,
                    ];
                })
                ->values()
                ->all();

            $compoundReps = $isAdmin
                ? $compoundLevel
                : $compoundLevel->filter(
                    fn (RepresentativeAssignment $assignment) => $this->canViewerSeeAssignment($assignment, $viewer, $viewerScope)
                );

            return [
                'compound' => [
                    'id' => $compound->id,
                    'name' => $compound->name,
                    'representatives' => $this->serializeAssignments($compoundReps->values()),
                ],
                'buildings' => $buildings,
            ];
        });
    }

    public function canViewerSeeAssignment(RepresentativeAssignment $assignment, User $viewer, ?array $viewerScope = null): bool
    {
        if ($viewer->hasAnyEffectiveRole(self::ADMIN_ROLES)) {
            return true;
        }

        $scope = $viewerScope ?? $this->resolveViewerScope($viewer);

        return match ($assignment->contact_visibility) {
            ContactVisibility::AllResidents => in_array((string) $assignment->compound_id, $scope['compoundIds'], true),
            ContactVisibility::AdminsOnly => false,
            ContactVisibility::BuildingResidents => $assignment->building_id !== null
                && in_array((string) $assignment->building_id, $scope['buildingIds'], true),
            ContactVisibility::FloorResidents => $assignment->floor_id !== null
                && in_array((string) $assignment->floor_id, $scope['floorIds'], true),
        };
    }

    public function invalidateCache(string $compoundId): void
    {
        $versionKey = $this->versionCacheKey($compoundId);
        Cache::add($versionKey, 1, now()->addDay());
        Cache::increment($versionKey);
    }

    /**
     * @return array{compoundIds: list<string>, buildingIds: list<string>, floorIds: list<string>}
     */
    private function resolveViewerScope(User $viewer): array
    {
        $memberships = $viewer->apartmentResidents()
            ->activeForAccess()
            ->with('unit:id,compound_id,building_id,floor_id')
            ->get();

        return [
            'compoundIds' => array_values(array_unique($memberships->pluck('unit.compound_id')->filter()->map(fn ($id) => (string) $id)->all())),
            'buildingIds' => array_values(array_unique($memberships->pluck('unit.building_id')->filter()->map(fn ($id) => (string) $id)->all())),
            'floorIds' => array_values(array_unique($memberships->pluck('unit.floor_id')->filter()->map(fn ($id) => (string) $id)->all())),
        ];
    }

    private function versionCacheKey(string $compoundId): string
    {
        return "org_chart_{$compoundId}_version";
    }

    /**
     * @param  Collection<int, RepresentativeAssignment>  $assignments
     * @return array<int, array<string, mixed>>
     */
    private function serializeAssignments($assignments): array
    {
        return RepresentativeAssignmentResource::collection($assignments)
            ->resolve();
    }
}
