<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\RepresentativeRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\OrgChart\StoreRepresentativeAssignmentRequest;
use App\Http\Requests\OrgChart\UpdateRepresentativeAssignmentRequest;
use App\Http\Resources\RepresentativeAssignmentResource;
use App\Models\Property\Compound;
use App\Models\RepresentativeAssignment;
use App\Models\User;
use App\Services\CompoundContextService;
use App\Support\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class RepresentativeAssignmentController extends Controller
{
    public function __construct(
        private readonly AuditLogger $auditLogger,
        private readonly CompoundContextService $compoundContext,
    ) {}

    public function index(Request $request, Compound $compound): AnonymousResourceCollection
    {
        $this->compoundContext->ensureCompoundAccess($request, $compound->id);

        $role = $request->string('role')->toString();
        $active = $request->query('active');
        $buildingId = $request->string('buildingId')->toString();
        $floorId = $request->string('floorId')->toString();

        $assignments = RepresentativeAssignment::query()
            ->with(['user', 'building', 'floor', 'appointedByUser'])
            ->forCompound($compound->id)
            ->when($role !== '', fn ($q) => $q->where('role', $role))
            ->when($active === 'true', fn ($q) => $q->active())
            ->when($active === 'false', fn ($q) => $q->where('is_active', false))
            ->when($buildingId !== '', fn ($q) => $q->forBuilding($buildingId))
            ->when($floorId !== '', fn ($q) => $q->forFloor($floorId))
            ->latest()
            ->paginate();

        return RepresentativeAssignmentResource::collection($assignments);
    }

    public function store(StoreRepresentativeAssignmentRequest $request, Compound $compound): RepresentativeAssignmentResource
    {
        $this->compoundContext->ensureCompoundAccess($request, $compound->id);

        $validated = $request->validated();

        /** @var User $actor */
        $actor = $request->user();

        $role = RepresentativeRole::from($validated['role']);
        $buildingId = $validated['buildingId'] ?? null;
        $floorId = $validated['floorId'] ?? null;

        $this->validateScopeMatchesRole($role, $buildingId, $floorId);

        $assignment = DB::transaction(function () use ($actor, $compound, $validated, $role, $buildingId, $floorId): RepresentativeAssignment {
            if ($role->isSingleton()) {
                $this->expireConflictingActiveAssignment($compound->id, $role, $buildingId, $floorId, $actor->id);
            }

            return RepresentativeAssignment::create([
                'compound_id' => $compound->id,
                'building_id' => $buildingId,
                'floor_id' => $floorId,
                'user_id' => $validated['userId'],
                'role' => $role->value,
                'starts_at' => $validated['startsAt'],
                'ends_at' => $validated['endsAt'] ?? null,
                'is_active' => true,
                'contact_visibility' => $validated['contactVisibility'] ?? 'all_residents',
                'appointed_by' => $actor->id,
                'notes' => $validated['notes'] ?? null,
            ]);
        });

        $this->auditLogger->record('org_chart.representative_assigned', actor: $actor, request: $request, metadata: [
            'assignment_id' => $assignment->id,
            'compound_id' => $compound->id,
            'user_id' => $assignment->user_id,
            'role' => $role->value,
            'building_id' => $buildingId,
            'floor_id' => $floorId,
        ]);

        return RepresentativeAssignmentResource::make(
            $assignment->load(['user', 'building', 'floor', 'appointedByUser'])
        );
    }

    public function show(Request $request, RepresentativeAssignment $representativeAssignment): RepresentativeAssignmentResource
    {
        $this->compoundContext->ensureCompoundAccess($request, $representativeAssignment->compound_id);

        return RepresentativeAssignmentResource::make(
            $representativeAssignment->load(['user', 'building', 'floor', 'appointedByUser'])
        );
    }

    public function update(UpdateRepresentativeAssignmentRequest $request, RepresentativeAssignment $representativeAssignment): RepresentativeAssignmentResource
    {
        $this->compoundContext->ensureCompoundAccess($request, $representativeAssignment->compound_id);

        $validated = $request->validated();

        $representativeAssignment->forceFill(array_filter([
            'contact_visibility' => $validated['contactVisibility'] ?? null,
            'notes' => array_key_exists('notes', $validated) ? $validated['notes'] : null,
            'starts_at' => $validated['startsAt'] ?? null,
        ], fn ($v) => $v !== null))->save();

        /** @var User $actor */
        $actor = $request->user();

        $this->auditLogger->record('org_chart.representative_assignment_updated', actor: $actor, request: $request, metadata: [
            'assignment_id' => $representativeAssignment->id,
            'changes' => $validated,
        ]);

        return RepresentativeAssignmentResource::make(
            $representativeAssignment->refresh()->load(['user', 'building', 'floor', 'appointedByUser'])
        );
    }

    public function expire(Request $request, RepresentativeAssignment $representativeAssignment): RepresentativeAssignmentResource
    {
        $this->compoundContext->ensureCompoundAccess($request, $representativeAssignment->compound_id);

        abort_if(
            ! $representativeAssignment->is_active,
            Response::HTTP_UNPROCESSABLE_ENTITY,
            'Assignment is already expired.',
        );

        $representativeAssignment->forceFill([
            'is_active' => false,
            'ends_at' => now()->toDateString(),
        ])->save();

        /** @var User $actor */
        $actor = $request->user();

        $this->auditLogger->record('org_chart.representative_assignment_expired', actor: $actor, request: $request, metadata: [
            'assignment_id' => $representativeAssignment->id,
            'user_id' => $representativeAssignment->user_id,
            'role' => $representativeAssignment->role->value,
        ]);

        return RepresentativeAssignmentResource::make(
            $representativeAssignment->refresh()->load(['user', 'building', 'floor', 'appointedByUser'])
        );
    }

    private function validateScopeMatchesRole(RepresentativeRole $role, ?string $buildingId, ?string $floorId): void
    {
        $scopeLevel = $role->scopeLevel();

        if ($scopeLevel === 'floor') {
            abort_if(
                $floorId === null,
                Response::HTTP_UNPROCESSABLE_ENTITY,
                "Role {$role->value} requires a floorId.",
            );
        }

        if ($scopeLevel === 'building') {
            abort_if(
                $buildingId === null,
                Response::HTTP_UNPROCESSABLE_ENTITY,
                "Role {$role->value} requires a buildingId.",
            );
        }

        if ($scopeLevel === 'compound') {
            abort_if(
                $buildingId !== null || $floorId !== null,
                Response::HTTP_UNPROCESSABLE_ENTITY,
                "Role {$role->value} is compound-scoped and must not have buildingId or floorId.",
            );
        }
    }

    private function expireConflictingActiveAssignment(
        string $compoundId,
        RepresentativeRole $role,
        ?string $buildingId,
        ?string $floorId,
        int $expiredBy,
    ): void {
        $query = RepresentativeAssignment::query()
            ->active()
            ->forCompound($compoundId)
            ->where('role', $role->value);

        if ($buildingId !== null) {
            $query->forBuilding($buildingId);
        }

        if ($floorId !== null) {
            $query->forFloor($floorId);
        }

        $query->update([
            'is_active' => false,
            'ends_at' => now()->toDateString(),
        ]);
    }
}
