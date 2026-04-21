<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\UnitStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Property\ArchivePropertyRequest;
use App\Http\Requests\Property\IndexUnitsRequest;
use App\Http\Requests\Property\StoreUnitRequest;
use App\Http\Requests\Property\UpdateUnitRequest;
use App\Http\Resources\UnitMembershipResource;
use App\Http\Resources\UnitResource;
use App\Models\Property\Building;
use App\Models\Property\Unit;
use App\Support\AuditLogger;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\Response;

class UnitController extends Controller
{
    public function __construct(private readonly AuditLogger $auditLogger) {}

    public function lookup(IndexUnitsRequest $request): AnonymousResourceCollection
    {
        $validated = $request->validated();

        $units = Unit::query()
            ->with(['compound', 'building', 'floor', 'memberships.user'])
            ->when(! $request->boolean('includeArchived'), function (Builder $query): void {
                $query->whereNull('archived_at')->where('status', '!=', UnitStatus::Archived->value);
            })
            ->when($validated['compoundId'] ?? null, fn (Builder $query, string $compoundId) => $query->where('compound_id', $compoundId))
            ->when($validated['buildingId'] ?? null, fn (Builder $query, string $buildingId) => $query->where('building_id', $buildingId))
            ->when($validated['floorId'] ?? null, fn (Builder $query, string $floorId) => $query->where('floor_id', $floorId))
            ->when($validated['status'] ?? null, fn (Builder $query, string $status) => $query->where('status', $status))
            ->when($validated['type'] ?? null, fn (Builder $query, string $type) => $query->where('type', $type))
            ->when($validated['search'] ?? null, function (Builder $query, string $search): void {
                $like = "%{$search}%";

                $query->where(function (Builder $query) use ($like): void {
                    $query
                        ->where('unit_number', 'like', $like)
                        ->orWhereHas('compound', function (Builder $query) use ($like): void {
                            $query->where('name', 'like', $like)->orWhere('code', 'like', $like);
                        })
                        ->orWhereHas('building', function (Builder $query) use ($like): void {
                            $query->where('name', 'like', $like)->orWhere('code', 'like', $like);
                        })
                        ->orWhereHas('memberships.user', function (Builder $query) use ($like): void {
                            $query->where('name', 'like', $like)->orWhere('email', 'like', $like);
                        });
                });
            })
            ->when(
                ($validated['userId'] ?? null)
                    || ($validated['relationType'] ?? null)
                    || ($validated['verificationStatus'] ?? null)
                    || $request->boolean('activeMembershipOnly'),
                function (Builder $query) use ($request, $validated): void {
                    $query->whereHas('memberships', function (Builder $query) use ($request, $validated): void {
                        $query
                            ->when($validated['userId'] ?? null, fn (Builder $query, int $userId) => $query->where('user_id', $userId))
                            ->when($validated['relationType'] ?? null, fn (Builder $query, string $relationType) => $query->where('relation_type', $relationType))
                            ->when($validated['verificationStatus'] ?? null, fn (Builder $query, string $status) => $query->where('verification_status', $status))
                            ->when($request->boolean('activeMembershipOnly'), fn (Builder $query) => $query->active());
                    });
                }
            )
            ->orderBy('building_id')
            ->orderBy('unit_number');

        return UnitResource::collection($units->paginate($validated['perPage'] ?? 15)->withQueryString());
    }

    public function index(Building $building): AnonymousResourceCollection
    {
        $units = $building->units()
            ->orderBy('unit_number')
            ->paginate();

        return UnitResource::collection($units);
    }

    public function store(StoreUnitRequest $request, Building $building): JsonResponse
    {
        $validated = $request->validated();

        $unit = $building->units()->create([
            'compound_id' => $building->compound_id,
            'floor_id' => $validated['floorId'] ?? null,
            'unit_number' => $validated['unitNumber'],
            'type' => $validated['type'] ?? 'apartment',
            'area_sqm' => $validated['areaSqm'] ?? null,
            'bedrooms' => $validated['bedrooms'] ?? null,
            'status' => $validated['status'] ?? 'active',
        ]);

        return UnitResource::make($unit)
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(Unit $unit): UnitResource
    {
        return UnitResource::make($unit->load(['compound', 'building', 'floor', 'memberships.user']));
    }

    public function mine(Request $request): AnonymousResourceCollection
    {
        $perPage = min(max($request->integer('perPage', 15), 1), 100);

        $memberships = $request->user()
            ->unitMemberships()
            ->activeForAccess()
            ->with(['unit.compound', 'unit.building', 'unit.floor'])
            ->orderByDesc('is_primary')
            ->latest('starts_at')
            ->latest('created_at')
            ->paginate($perPage)
            ->withQueryString();

        return UnitMembershipResource::collection($memberships);
    }

    public function update(UpdateUnitRequest $request, Unit $unit): UnitResource
    {
        $validated = $request->validated();

        $unit->fill([
            'floor_id' => array_key_exists('floorId', $validated) ? $validated['floorId'] : $unit->floor_id,
            'unit_number' => $validated['unitNumber'] ?? $unit->unit_number,
            'type' => $validated['type'] ?? $unit->type,
            'area_sqm' => array_key_exists('areaSqm', $validated) ? $validated['areaSqm'] : $unit->area_sqm,
            'bedrooms' => array_key_exists('bedrooms', $validated) ? $validated['bedrooms'] : $unit->bedrooms,
            'status' => $validated['status'] ?? $unit->status,
        ])->save();

        return UnitResource::make($unit->refresh());
    }

    public function archive(ArchivePropertyRequest $request, Unit $unit): UnitResource
    {
        $validated = $request->validated();

        $unit->forceFill([
            'status' => 'archived',
            'archived_at' => now(),
            'archived_by' => $request->user()?->id,
            'archive_reason' => $validated['reason'] ?? null,
        ])->save();

        $this->auditLogger->record('property.unit_archived', actor: $request->user(), request: $request, metadata: [
            'unit_id' => $unit->id,
            'reason' => $validated['reason'] ?? null,
        ]);

        return UnitResource::make($unit->refresh()->load(['memberships.user']));
    }
}
