<?php

namespace App\Http\Controllers\Api\V1\Finance;

use App\Http\Controllers\Controller;
use App\Http\Resources\Finance\VendorResource;
use App\Models\Finance\Vendor;
use App\Services\CompoundContextService;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

class VendorController extends Controller
{
    public function __construct(
        private readonly CompoundContextService $compoundContextService,
        private readonly AuditLogger $auditLogger,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $compoundId = $this->compoundContextService->resolve($request);

        $query = Vendor::query()->latest();

        if ($compoundId) {
            $query->where('compound_id', $compoundId);
        }

        if ($request->boolean('active_only', false)) {
            $query->where('is_active', true);
        }

        return VendorResource::collection($query->paginate(50));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'compound_id'  => ['required', 'string', 'exists:compounds,id'],
            'name'         => ['required', 'string', 'max:255'],
            'type'         => ['nullable', Rule::in(['contractor', 'supplier', 'service_provider', 'legal_advisor', 'other'])],
            'contact_name' => ['nullable', 'string', 'max:255'],
            'phone'        => ['nullable', 'string', 'max:50'],
            'email'        => ['nullable', 'email', 'max:255'],
            'notes'        => ['nullable', 'string'],
        ]);

        $this->compoundContextService->ensureCompoundAccess($request, $data['compound_id']);

        $vendor = Vendor::create($data);

        $this->auditLogger->record('vendor.created', $request->user(), $request, 201, $vendor::class, $vendor->id);

        return (new VendorResource($vendor))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(Request $request, Vendor $vendor): VendorResource
    {
        $this->compoundContextService->ensureCompoundAccess($request, $vendor->compound_id);

        return new VendorResource($vendor);
    }

    public function update(Request $request, Vendor $vendor): VendorResource
    {
        $this->compoundContextService->ensureCompoundAccess($request, $vendor->compound_id);

        $data = $request->validate([
            'name'         => ['sometimes', 'string', 'max:255'],
            'type'         => ['sometimes', Rule::in(['contractor', 'supplier', 'service_provider', 'legal_advisor', 'other'])],
            'contact_name' => ['nullable', 'string', 'max:255'],
            'phone'        => ['nullable', 'string', 'max:50'],
            'email'        => ['nullable', 'email', 'max:255'],
            'notes'        => ['nullable', 'string'],
            'is_active'    => ['sometimes', 'boolean'],
        ]);

        $vendor->update($data);

        $this->auditLogger->record('vendor.updated', $request->user(), $request, 200, $vendor::class, $vendor->id);

        return new VendorResource($vendor);
    }
}
