<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Property\ArchivePropertyRequest;
use App\Http\Requests\Property\StoreCompoundRequest;
use App\Http\Requests\Property\UpdateCompoundRequest;
use App\Http\Resources\CompoundResource;
use App\Models\Property\Compound;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\Response;

class CompoundController extends Controller
{
    public function __construct(private readonly AuditLogger $auditLogger) {}

    public function index(): AnonymousResourceCollection
    {
        $compounds = Compound::query()
            ->withCount(['buildings', 'units'])
            ->orderBy('name')
            ->paginate();

        return CompoundResource::collection($compounds);
    }

    public function store(StoreCompoundRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $compound = Compound::query()->create([
            'name' => $validated['name'],
            'legal_name' => $validated['legalName'] ?? null,
            'code' => strtoupper($validated['code']),
            'timezone' => $validated['timezone'],
            'currency' => strtoupper($validated['currency']),
            'status' => 'draft',
        ]);

        return CompoundResource::make($compound->loadCount(['buildings', 'units']))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(Compound $compound): CompoundResource
    {
        $compound->load([
            'buildings' => fn ($query) => $query->withCount(['floors', 'units'])->orderBy('sort_order')->orderBy('name'),
        ])->loadCount(['buildings', 'units']);

        return CompoundResource::make($compound);
    }

    public function update(UpdateCompoundRequest $request, Compound $compound): CompoundResource
    {
        $validated = $request->validated();

        $compound->fill([
            'name' => $validated['name'] ?? $compound->name,
            'legal_name' => array_key_exists('legalName', $validated) ? $validated['legalName'] : $compound->legal_name,
            'code' => isset($validated['code']) ? strtoupper($validated['code']) : $compound->code,
            'timezone' => $validated['timezone'] ?? $compound->timezone,
            'currency' => isset($validated['currency']) ? strtoupper($validated['currency']) : $compound->currency,
            'status' => $validated['status'] ?? $compound->status,
        ])->save();

        return CompoundResource::make($compound->refresh()->loadCount(['buildings', 'units']));
    }

    public function archive(ArchivePropertyRequest $request, Compound $compound): CompoundResource
    {
        $validated = $request->validated();

        $compound->forceFill([
            'status' => 'archived',
            'archived_at' => now(),
            'archived_by' => $request->user()?->id,
            'archive_reason' => $validated['reason'] ?? null,
        ])->save();

        $this->auditLogger->record('property.compound_archived', actor: $request->user(), request: $request, metadata: [
            'compound_id' => $compound->id,
            'reason' => $validated['reason'] ?? null,
        ]);

        return CompoundResource::make($compound->refresh()->loadCount(['buildings', 'units']));
    }
}
