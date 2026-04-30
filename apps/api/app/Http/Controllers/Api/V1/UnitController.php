<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\UnitStatus;
use App\Enums\UnitType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Property\ArchivePropertyRequest;
use App\Http\Requests\Property\ImportUnitsRequest;
use App\Http\Requests\Property\IndexUnitsRequest;
use App\Http\Requests\Property\StoreUnitRequest;
use App\Http\Requests\Property\UpdateUnitRequest;
use App\Http\Resources\UnitMembershipResource;
use App\Http\Resources\UnitResource;
use App\Models\Property\Building;
use App\Models\Property\Unit;
use App\Services\CompoundContextService;
use App\Support\AuditLogger;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class UnitController extends Controller
{
    public function __construct(
        private readonly AuditLogger $auditLogger,
        private readonly CompoundContextService $compoundContext,
    ) {}

    public function lookup(IndexUnitsRequest $request): AnonymousResourceCollection
    {
        $validated = $request->validated();
        $actor = $request->user();
        $accessibleCompoundIds = $this->compoundContext->resolveRequestedAccessibleCompoundIds(
            $actor,
            $validated['compoundId'] ?? null,
        );
        $hasExplicitScopeAssignments = $actor->scopeAssignments()->exists();

        $units = Unit::query()
            ->with(['compound', 'building', 'floor', 'memberships.user'])
            ->when(! $request->boolean('includeArchived'), function (Builder $query): void {
                $query->whereNull('archived_at')->where('status', '!=', UnitStatus::Archived->value);
            })
            ->when($accessibleCompoundIds !== null, fn (Builder $query) => $query->whereIn('compound_id', $accessibleCompoundIds))
            ->when($hasExplicitScopeAssignments, fn (Builder $query) => $this->compoundContext->scopePropertyQuery($query, $actor))
            ->when($validated['buildingId'] ?? null, function (Builder $query, string $buildingId) use ($request): void {
                $this->compoundContext->ensureUserCanAccessBuilding($request->user(), $buildingId);
                $query->where('building_id', $buildingId);
            })
            ->when($validated['floorId'] ?? null, function (Builder $query, string $floorId) use ($request): void {
                $this->compoundContext->ensureUserCanAccessFloor($request->user(), $floorId);
                $query->where('floor_id', $floorId);
            })
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

    public function index(Request $request, Building $building): AnonymousResourceCollection
    {
        $this->compoundContext->ensureUserCanAccessBuilding($request->user(), $building->id);

        $units = $building->units()
            ->orderBy('unit_number')
            ->paginate();

        return UnitResource::collection($units);
    }

    public function import(ImportUnitsRequest $request, Building $building): JsonResponse
    {
        $this->compoundContext->ensureUserCanAccessBuilding($request->user(), $building->id);

        $dryRun = $request->boolean('dryRun');
        $parsed = $this->parseUnitCsv($request->file('file')->getRealPath());
        $validRows = [];
        $errors = $parsed['errors'];
        $seenUnitNumbers = [];

        foreach ($parsed['rows'] as $row) {
            $rowNumber = $row['_row'];
            $unitNumber = trim((string) ($row['unitNumber'] ?? ''));

            if ($unitNumber !== '') {
                $duplicateKey = mb_strtolower($unitNumber);

                if (isset($seenUnitNumbers[$duplicateKey])) {
                    $errors[] = [
                        'row' => $rowNumber,
                        'errors' => ['unitNumber' => ['Duplicate unit number in import file.']],
                    ];
                    continue;
                }

                $seenUnitNumbers[$duplicateKey] = true;
            }

            $validator = Validator::make($row, [
                'unitNumber' => [
                    'required',
                    'string',
                    'max:40',
                    Rule::unique('units', 'unit_number')->where('building_id', $building->id),
                ],
                'floorId' => [
                    'nullable',
                    'string',
                    Rule::exists('floors', 'id')->where('building_id', $building->id),
                ],
                'type' => ['nullable', Rule::enum(UnitType::class)],
                'areaSqm' => ['nullable', 'numeric', 'min:0', 'max:999999.99'],
                'bedrooms' => ['nullable', 'integer', 'min:0', 'max:50'],
                'status' => ['nullable', Rule::enum(UnitStatus::class)],
            ]);

            if ($validator->fails()) {
                $errors[] = [
                    'row' => $rowNumber,
                    'errors' => $validator->errors()->toArray(),
                ];
                continue;
            }

            $validRows[] = $validator->validated();
        }

        if ($errors !== []) {
            return response()->json([
                'message' => 'The imported unit CSV contains invalid rows.',
                'data' => [
                    'dryRun' => $dryRun,
                    'validated' => count($validRows),
                    'created' => 0,
                    'errors' => $errors,
                ],
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        if (! $dryRun) {
            DB::transaction(function () use ($building, $validRows): void {
                foreach ($validRows as $row) {
                    $building->units()->create([
                        'compound_id' => $building->compound_id,
                        'floor_id' => $row['floorId'] ?? null,
                        'unit_number' => $row['unitNumber'],
                        'type' => $row['type'] ?? UnitType::Apartment->value,
                        'area_sqm' => $row['areaSqm'] ?? null,
                        'bedrooms' => $row['bedrooms'] ?? null,
                        'status' => $row['status'] ?? UnitStatus::Active->value,
                    ]);
                }
            });
        }

        $this->auditLogger->record(
            $dryRun ? 'property.units_import_validated' : 'property.units_imported',
            actor: $request->user(),
            request: $request,
            statusCode: $dryRun ? Response::HTTP_OK : Response::HTTP_CREATED,
            metadata: [
                'building_id' => $building->id,
                'validated' => count($validRows),
                'created' => $dryRun ? 0 : count($validRows),
                'dry_run' => $dryRun,
            ],
        );

        return response()->json([
            'data' => [
                'dryRun' => $dryRun,
                'validated' => count($validRows),
                'created' => $dryRun ? 0 : count($validRows),
                'errors' => [],
            ],
        ], $dryRun ? Response::HTTP_OK : Response::HTTP_CREATED);
    }

    public function export(Request $request, Building $building): StreamedResponse
    {
        $this->compoundContext->ensureUserCanAccessBuilding($request->user(), $building->id);

        $this->auditLogger->record('property.units_exported', actor: $request->user(), request: $request, metadata: [
            'building_id' => $building->id,
        ]);

        $filename = 'units-'.$building->code.'-'.now()->format('Ymd-His').'.csv';

        return response()->streamDownload(function () use ($building): void {
            $output = fopen('php://output', 'w');

            fputcsv($output, ['unitNumber', 'type', 'status', 'floorId', 'floorLabel', 'areaSqm', 'bedrooms']);

            $building->units()
                ->with('floor')
                ->orderBy('unit_number')
                ->chunk(100, function ($units) use ($output): void {
                    foreach ($units as $unit) {
                        fputcsv($output, [
                            $unit->unit_number,
                            $unit->type->value,
                            $unit->status->value,
                            $unit->floor_id,
                            $unit->floor?->label,
                            $unit->area_sqm,
                            $unit->bedrooms,
                        ]);
                    }
                });

            fclose($output);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    public function store(StoreUnitRequest $request, Building $building): JsonResponse
    {
        $this->compoundContext->ensureUserCanAccessBuilding($request->user(), $building->id);

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

    public function show(Request $request, Unit $unit): UnitResource
    {
        abort_unless($this->compoundContext->userCanAccessUnit($request->user(), $unit->id), Response::HTTP_FORBIDDEN);

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
        $this->compoundContext->ensureUserCanAccessBuilding($request->user(), $unit->building_id);

        if ($unit->floor_id) {
            $this->compoundContext->ensureUserCanAccessFloor($request->user(), $unit->floor_id);
        }

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
        $this->compoundContext->ensureUserCanAccessBuilding($request->user(), $unit->building_id);

        if ($unit->floor_id) {
            $this->compoundContext->ensureUserCanAccessFloor($request->user(), $unit->floor_id);
        }

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

    /**
     * @return array{rows: array<int, array<string, mixed>>, errors: array<int, array<string, mixed>>}
     */
    private function parseUnitCsv(string $path): array
    {
        $handle = fopen($path, 'r');

        if ($handle === false) {
            return [
                'rows' => [],
                'errors' => [
                    ['row' => 0, 'errors' => ['file' => ['Unable to read uploaded CSV file.']]],
                ],
            ];
        }

        $headers = fgetcsv($handle);

        if ($headers === false) {
            fclose($handle);

            return [
                'rows' => [],
                'errors' => [
                    ['row' => 1, 'errors' => ['file' => ['CSV file must include a header row.']]],
                ],
            ];
        }

        $normalizedHeaders = array_map(fn (?string $header): string => trim((string) $header), $headers);
        $rows = [];
        $errors = [];
        $rowNumber = 1;

        if (! in_array('unitNumber', $normalizedHeaders, true)) {
            $errors[] = [
                'row' => 1,
                'errors' => ['unitNumber' => ['CSV header must include unitNumber.']],
            ];
        }

        while (($values = fgetcsv($handle)) !== false) {
            $rowNumber++;

            if ($values === [null] || $values === false) {
                continue;
            }

            $row = ['_row' => $rowNumber];

            foreach ($normalizedHeaders as $index => $header) {
                if ($header === '') {
                    continue;
                }

                $value = isset($values[$index]) ? trim((string) $values[$index]) : null;
                $row[$header] = $value === '' ? null : $value;
            }

            $rows[] = $row;
        }

        fclose($handle);

        return ['rows' => $rows, 'errors' => $errors];
    }
}
