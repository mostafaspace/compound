<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\ContactVisibility;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Resources\RepresentativeAssignmentResource;
use App\Models\Property\Compound;
use App\Models\Property\Unit;
use App\Models\RepresentativeAssignment;
use App\Models\User;
use App\Services\CompoundContextService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrgChartController extends Controller
{
    public function __construct(private readonly CompoundContextService $compoundContext) {}

    public function show(Request $request, Compound $compound): JsonResponse
    {
        $this->ensureViewerCanAccessCompound($request, $compound->id);

        /** @var User $viewer */
        $viewer = $request->user();

        $isAdmin = in_array($viewer->role, [
            UserRole::SuperAdmin,
            UserRole::CompoundAdmin,
            UserRole::BoardMember,
            UserRole::FinanceReviewer,
            UserRole::SupportAgent,
        ], strict: true);

        $visibilityFilter = $isAdmin
            ? null
            : [ContactVisibility::AllResidents->value];

        $assignments = RepresentativeAssignment::query()
            ->with(['user', 'building', 'floor'])
            ->active()
            ->forCompound($compound->id)
            ->when($visibilityFilter !== null, fn ($q) => $q->whereIn('contact_visibility', $visibilityFilter))
            ->get();

        $compoundLevel = $assignments->filter(fn ($a) => $a->building_id === null && $a->floor_id === null);
        $buildingLevel = $assignments->filter(fn ($a) => $a->building_id !== null && $a->floor_id === null);
        $floorLevel = $assignments->filter(fn ($a) => $a->floor_id !== null);

        $buildings = $compound->buildings()
            ->with('floors')
            ->orderBy('sort_order')
            ->get()
            ->map(function ($building) use ($buildingLevel, $floorLevel, $isAdmin, $viewer): array {
                $buildingAssignments = $buildingLevel->filter(fn ($a) => $a->building_id === $building->id);

                if (! $isAdmin) {
                    $buildingAssignments = $buildingAssignments->filter(fn ($a) => $this->canViewContact($a, $viewer));
                }

                $floors = $building->floors
                    ->sortBy('sort_order')
                    ->map(function ($floor) use ($floorLevel, $isAdmin, $viewer): array {
                        $floorAssignments = $floorLevel->filter(fn ($a) => $a->floor_id === $floor->id);

                        if (! $isAdmin) {
                            $floorAssignments = $floorAssignments->filter(fn ($a) => $this->canViewContact($a, $viewer));
                        }

                        return [
                            'id' => $floor->id,
                            'label' => $floor->label,
                            'levelNumber' => $floor->level_number,
                            'representatives' => RepresentativeAssignmentResource::collection($floorAssignments->values()),
                        ];
                    })->values();

                return [
                    'id' => $building->id,
                    'name' => $building->name,
                    'code' => $building->code,
                    'representatives' => RepresentativeAssignmentResource::collection($buildingAssignments->values()),
                    'floors' => $floors,
                ];
            });

        $compoundRepresentatives = $isAdmin
            ? $compoundLevel
            : $compoundLevel->filter(fn ($a) => $this->canViewContact($a, $viewer));

        return response()->json([
            'data' => [
                'compound' => [
                    'id' => $compound->id,
                    'name' => $compound->name,
                    'representatives' => RepresentativeAssignmentResource::collection($compoundRepresentatives->values()),
                ],
                'buildings' => $buildings,
            ],
        ]);
    }

    public function responsibleParty(Request $request, Unit $unit): JsonResponse
    {
        $this->ensureViewerCanAccessUnit($request, $unit);

        /** @var User $viewer */
        $viewer = $request->user();

        $isAdmin = in_array($viewer->role, [
            UserRole::SuperAdmin,
            UserRole::CompoundAdmin,
            UserRole::BoardMember,
            UserRole::FinanceReviewer,
            UserRole::SupportAgent,
        ], strict: true);

        $baseQuery = fn () => RepresentativeAssignment::query()->with(['user'])->active();

        $floorRepresentative = $unit->floor_id
            ? $baseQuery()->forFloor($unit->floor_id)->where('role', 'floor_representative')->first()
            : null;

        $buildingRepresentative = $baseQuery()
            ->forBuilding($unit->building_id)
            ->where('role', 'building_representative')
            ->first();

        $associationContacts = $baseQuery()
            ->forCompound($unit->compound_id)
            ->whereIn('role', ['president', 'treasurer', 'admin_contact'])
            ->get();

        if (! $isAdmin) {
            $floorRepresentative = $floorRepresentative && $this->canViewContact($floorRepresentative, $viewer)
                ? $floorRepresentative
                : null;

            $buildingRepresentative = $buildingRepresentative && $this->canViewContact($buildingRepresentative, $viewer)
                ? $buildingRepresentative
                : null;

            $associationContacts = $associationContacts->filter(fn ($a) => $this->canViewContact($a, $viewer));
        }

        return response()->json([
            'data' => [
                'unit' => [
                    'id' => $unit->id,
                    'unitNumber' => $unit->unit_number,
                    'buildingId' => $unit->building_id,
                    'floorId' => $unit->floor_id,
                    'compoundId' => $unit->compound_id,
                ],
                'floorRepresentative' => $floorRepresentative
                    ? RepresentativeAssignmentResource::make($floorRepresentative)
                    : null,
                'buildingRepresentative' => $buildingRepresentative
                    ? RepresentativeAssignmentResource::make($buildingRepresentative)
                    : null,
                'associationContacts' => RepresentativeAssignmentResource::collection($associationContacts->values()),
            ],
        ]);
    }

    private function canViewContact(RepresentativeAssignment $assignment, User $viewer): bool
    {
        return match ($assignment->contact_visibility) {
            ContactVisibility::AllResidents => true,
            ContactVisibility::AdminsOnly => false,
            ContactVisibility::BuildingResidents => true,
            ContactVisibility::FloorResidents => true,
        };
    }

    private function ensureViewerCanAccessCompound(Request $request, string $compoundId): void
    {
        /** @var User $viewer */
        $viewer = $request->user();

        if (! in_array($viewer->role, [UserRole::ResidentOwner, UserRole::ResidentTenant], true)) {
            $this->compoundContext->ensureCompoundAccess($request, $compoundId);

            return;
        }

        $hasMembership = $viewer->unitMemberships()
            ->activeForAccess()
            ->whereHas('unit', fn ($query) => $query->where('compound_id', $compoundId))
            ->exists();

        abort_unless($hasMembership, 403);
    }

    private function ensureViewerCanAccessUnit(Request $request, Unit $unit): void
    {
        /** @var User $viewer */
        $viewer = $request->user();

        if (! in_array($viewer->role, [UserRole::ResidentOwner, UserRole::ResidentTenant], true)) {
            $this->compoundContext->ensureCompoundAccess($request, $unit->compound_id);

            return;
        }

        $hasMembership = $viewer->unitMemberships()
            ->activeForAccess()
            ->where('unit_id', $unit->id)
            ->exists();

        abort_unless($hasMembership, 403);
    }
}
