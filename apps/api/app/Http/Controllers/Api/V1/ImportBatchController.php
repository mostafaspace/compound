<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\ImportBatchType;
use App\Http\Controllers\Controller;
use App\Http\Resources\ImportBatchResource;
use App\Models\Import\ImportBatch;
use App\Models\Property\Compound;
use App\Models\User;
use App\Services\CompoundContextService;
use App\Services\ImportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Validation\Rules\Enum;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ImportBatchController extends Controller
{
    public function __construct(
        private readonly ImportService $importService,
        private readonly CompoundContextService $compoundContext,
    ) {}

    // -------------------------------------------------------------------------
    // GET /api/v1/imports
    // -------------------------------------------------------------------------

    public function index(Request $request): AnonymousResourceCollection
    {
        $compoundId = $this->compoundContext->resolve($request);

        $batches = ImportBatch::query()
            ->with(['compound', 'actor'])
            ->when($compoundId, fn ($q) => $q->where('compound_id', $compoundId))
            ->when($request->filled('type'), fn ($q) => $q->where('type', $request->string('type')->toString()))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')->toString()))
            ->latest()
            ->paginate();

        return ImportBatchResource::collection($batches);
    }

    // -------------------------------------------------------------------------
    // POST /api/v1/imports
    // -------------------------------------------------------------------------

    public function store(Request $request): ImportBatchResource
    {
        $validated = $request->validate([
            'compound_id' => ['required', 'string', 'exists:compounds,id'],
            'type' => ['required', new Enum(ImportBatchType::class)],
            'file' => ['required', 'file', 'mimes:csv,txt', 'max:10240'],
            'dry_run' => ['sometimes', 'boolean'],
        ]);

        $compound = Compound::query()->findOrFail($validated['compound_id']);

        // Compound-scoped users may only import into their own compound
        $compoundId = $this->compoundContext->resolve($request);
        if ($compoundId !== null) {
            abort_unless($compound->id === $compoundId, Response::HTTP_FORBIDDEN);
        }

        /** @var User $actor */
        $actor = $request->user();
        $type = ImportBatchType::from($validated['type']);
        $dryRun = (bool) ($validated['dry_run'] ?? true);

        $batch = $this->importService->run(
            compound: $compound,
            actor: $actor,
            type: $type,
            file: $request->file('file'),
            dryRun: $dryRun,
        );

        $batch->load(['compound', 'actor']);

        return ImportBatchResource::make($batch);
    }

    // -------------------------------------------------------------------------
    // GET /api/v1/imports/{importBatch}
    // -------------------------------------------------------------------------

    public function show(Request $request, ImportBatch $importBatch): ImportBatchResource
    {
        $compoundId = $this->compoundContext->resolve($request);
        if ($compoundId !== null) {
            abort_unless($importBatch->compound_id === $compoundId, Response::HTTP_FORBIDDEN);
        }

        $importBatch->load(['compound', 'actor']);

        return ImportBatchResource::make($importBatch);
    }

    // -------------------------------------------------------------------------
    // GET /api/v1/imports/templates/{type}
    // Returns a CSV template with the correct headers for the given type.
    // -------------------------------------------------------------------------

    public function template(string $type): StreamedResponse|JsonResponse
    {
        $importType = ImportBatchType::tryFrom($type);
        if ($importType === null) {
            return response()->json(['message' => 'Unknown import type.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $headers = $importType->templateHeaders();
        $filename = "import-template-{$type}.csv";

        return response()->streamDownload(function () use ($headers, $importType): void {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, $headers);

            // Add a sample row so users can see the expected format
            $sampleRow = match ($importType) {
                ImportBatchType::Units => ['B01', '101', 'apartment', '120.5', '3', '1'],
                ImportBatchType::Users => ['John Smith', 'john@example.com', '+201234567890', 'resident_owner', '101', 'owner'],
                ImportBatchType::OpeningBalances => ['101', '5000.00', 'EGP', 'Opening balance as of handover', '2026-01-01'],
            };
            fputcsv($handle, $sampleRow);
            fclose($handle);
        }, $filename, [
            'Content-Type' => 'text/csv',
        ]);
    }
}
