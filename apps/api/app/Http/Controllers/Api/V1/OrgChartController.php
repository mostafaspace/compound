<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Resources\RepresentativeAssignmentResource;
use App\Models\Property\Building;
use App\Models\Property\Compound;
use App\Models\Property\Floor;
use App\Models\Property\Unit;
use App\Models\RepresentativeAssignment;
use App\Models\User;
use App\Services\CompoundContextService;
use App\Services\OrgChartService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrgChartController extends Controller
{
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
     * @var list<UserRole>
     */
    private const RESIDENT_ROLES = [
        UserRole::ResidentOwner,
        UserRole::ResidentTenant,
    ];

    public function __construct(
        private readonly CompoundContextService $compoundContext,
        private readonly OrgChartService $orgChartService,
    ) {}

    public function show(Request $request, Compound $compound): JsonResponse
    {
        $this->ensureViewerCanAccessCompound($request, $compound->id);

        /** @var User $viewer */
        $viewer = $request->user();

        $tree = $this->orgChartService->getTree($compound, $viewer);

        return response()->json(['data' => $tree]);
    }

    public function personDetail(Request $request, User $user): JsonResponse
    {
        $this->compoundContext->ensureUserAccess($request, $user);

        $managedScopes = RepresentativeAssignment::query()
            ->active()
            ->where('user_id', $user->id)
            ->get()
            ->map(fn (RepresentativeAssignment $assignment) => [
                'role' => $assignment->role->value,
                'scope' => $assignment->role->scopeLevel(),
                'building_id' => $assignment->building_id,
                'floor_id' => $assignment->floor_id,
            ])
            ->values();

        return response()->json([
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'photo_url' => $user->photo_url,
                'roles' => $user->roles()->pluck('name'),
                'managed_scopes' => $managedScopes,
            ],
        ]);
    }

    public function assignBuildingHead(Request $request, Building $building): JsonResponse
    {
        /** @var User $actor */
        $actor = $request->user();
        $this->compoundContext->ensureCompoundAccess($request, $building->compound_id);

        $request->validate([
            'userId' => 'required|exists:users,id',
        ]);

        DB::transaction(function () use ($building, $request, $actor) {
            // Expire old building reps
            RepresentativeAssignment::query()
                ->active()
                ->forBuilding($building->id)
                ->where('role', 'building_representative')
                ->update(['is_active' => false, 'ends_at' => now()]);

            // Create new
            RepresentativeAssignment::create([
                'compound_id' => $building->compound_id,
                'building_id' => $building->id,
                'user_id' => $request->integer('userId'),
                'role' => 'building_representative',
                'starts_at' => now(),
                'is_active' => true,
                'appointed_by' => $actor->id,
            ]);

            $this->orgChartService->invalidateCache($building->compound_id);
        });

        return response()->json(['message' => 'Building head assigned successfully.']);
    }

    public function assignFloorRepresentative(Request $request, Floor $floor): JsonResponse
    {
        /** @var User $actor */
        $actor = $request->user();
        $this->compoundContext->ensureCompoundAccess($request, $floor->building->compound_id);

        $request->validate([
            'userId' => 'required|exists:users,id',
        ]);

        DB::transaction(function () use ($floor, $request, $actor) {
            // Expire old floor reps
            RepresentativeAssignment::query()
                ->active()
                ->forFloor($floor->id)
                ->where('role', 'floor_representative')
                ->update(['is_active' => false, 'ends_at' => now()]);

            // Create new
            RepresentativeAssignment::create([
                'compound_id' => $floor->building->compound_id,
                'building_id' => $floor->building_id,
                'floor_id' => $floor->id,
                'user_id' => $request->integer('userId'),
                'role' => 'floor_representative',
                'starts_at' => now(),
                'is_active' => true,
                'appointed_by' => $actor->id,
            ]);

            $this->orgChartService->invalidateCache($floor->building->compound_id);
        });

        return response()->json(['message' => 'Floor representative assigned successfully.']);
    }

    public function responsibleParty(Request $request, Unit $unit): JsonResponse
    {
        $this->ensureViewerCanAccessUnit($request, $unit);

        /** @var User $viewer */
        $viewer = $request->user();

        $isAdmin = $viewer->hasAnyEffectiveRole(self::ADMIN_ROLES);

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
        return $this->orgChartService->canViewerSeeAssignment($assignment, $viewer);
    }

    private function ensureViewerCanAccessCompound(Request $request, string $compoundId): void
    {
        /** @var User $viewer */
        $viewer = $request->user();

        if (! $this->isResidentViewer($viewer)) {
            $this->compoundContext->ensureCompoundAccess($request, $compoundId);

            return;
        }

        $hasMembership = $viewer->apartmentResidents()
            ->activeForAccess()
            ->whereHas('unit', fn ($query) => $query->where('compound_id', $compoundId))
            ->exists();

        abort_unless($hasMembership, 403);
    }

    private function ensureViewerCanAccessUnit(Request $request, Unit $unit): void
    {
        /** @var User $viewer */
        $viewer = $request->user();

        if (! $this->isResidentViewer($viewer)) {
            $this->compoundContext->ensureCompoundAccess($request, $unit->compound_id);

            return;
        }

        $hasMembership = $viewer->apartmentResidents()
            ->activeForAccess()
            ->where('unit_id', $unit->id)
            ->exists();

        abort_unless($hasMembership, 403);
    }

    private function isResidentViewer(User $viewer): bool
    {
        if ($viewer->hasAnyEffectiveRole(self::ADMIN_ROLES)) {
            return false;
        }

        return $viewer->hasAnyEffectiveRole(self::RESIDENT_ROLES);
    }
}
