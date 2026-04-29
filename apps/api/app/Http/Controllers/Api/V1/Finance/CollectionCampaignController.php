<?php

namespace App\Http\Controllers\Api\V1\Finance;

use App\Http\Controllers\Controller;
use App\Http\Requests\Finance\ApplyCampaignChargesRequest;
use App\Http\Requests\Finance\StoreCollectionCampaignRequest;
use App\Http\Resources\Finance\CollectionCampaignResource;
use App\Models\Finance\CollectionCampaign;
use App\Models\User;
use App\Services\CompoundContextService;
use App\Services\FinanceService;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\Response;

class CollectionCampaignController extends Controller
{
    public function __construct(
        private readonly CompoundContextService $compoundContext,
        private readonly FinanceService $financeService,
        private readonly AuditLogger $auditLogger,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        /** @var User $actor */
        $actor = $request->user();
        $requestedCompoundId = $request->filled('compound_id') ? $request->string('compound_id')->toString() : null;
        $compoundIds = $this->compoundContext->resolveRequestedAccessibleCompoundIds($actor, $requestedCompoundId);

        $campaigns = CollectionCampaign::query()
            ->when($compoundIds !== null, fn ($query) => $query->whereIn('compound_id', $compoundIds))
            ->when(
                $request->filled('status'),
                fn ($query) => $query->where('status', $request->string('status')->toString()),
            )
            ->latest()
            ->paginate();

        return CollectionCampaignResource::collection($campaigns);
    }

    public function store(StoreCollectionCampaignRequest $request): JsonResponse
    {
        /** @var User $actor */
        $actor = $request->user();
        $validated = $request->validated();
        $requestedCompoundId = $validated['compound_id'] ?? null;
        $compoundId = $this->compoundContext->resolveRequestedAccessibleCompoundId($actor, $requestedCompoundId);
        abort_if(! filled($compoundId), Response::HTTP_UNPROCESSABLE_ENTITY);
        $validated['compound_id'] = $compoundId;

        $campaign = $this->financeService->createCampaign(
            data: $validated,
            actor: $actor,
        );

        return CollectionCampaignResource::make($campaign)
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(Request $request, CollectionCampaign $campaign): CollectionCampaignResource
    {
        $this->ensureFinanceCompoundAccess($request->user(), $campaign->compound_id);

        return CollectionCampaignResource::make($campaign);
    }

    public function update(Request $request, CollectionCampaign $campaign): CollectionCampaignResource
    {
        /** @var User $actor */
        $actor = $request->user();
        $this->ensureFinanceCompoundAccess($actor, $campaign->compound_id);

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:160'],
            'description' => ['nullable', 'string', 'max:1000'],
            'target_amount' => ['nullable', 'numeric', 'min:0'],
        ]);

        $campaign->fill($validated)->save();

        $this->auditLogger->record(
            'dues.campaign_updated',
            actor: $actor,
            request: $request,
            metadata: ['campaign_id' => $campaign->id],
        );

        return CollectionCampaignResource::make($campaign->refresh());
    }

    public function publish(Request $request, CollectionCampaign $campaign): CollectionCampaignResource
    {
        /** @var User $actor */
        $actor = $request->user();
        $this->ensureFinanceCompoundAccess($actor, $campaign->compound_id);

        $campaign = $this->financeService->publishCampaign(
            campaign: $campaign,
            actor: $actor,
        );

        return CollectionCampaignResource::make($campaign);
    }

    public function archive(Request $request, CollectionCampaign $campaign): CollectionCampaignResource
    {
        /** @var User $actor */
        $actor = $request->user();
        $this->ensureFinanceCompoundAccess($actor, $campaign->compound_id);

        $campaign = $this->financeService->archiveCampaign(
            campaign: $campaign,
            actor: $actor,
        );

        return CollectionCampaignResource::make($campaign);
    }

    public function applyCharges(ApplyCampaignChargesRequest $request, CollectionCampaign $campaign): JsonResponse
    {
        /** @var User $actor */
        $actor = $request->user();
        $this->ensureFinanceCompoundAccess($actor, $campaign->compound_id);

        $validated = $request->validated();

        $count = $this->financeService->applyCampaignCharges(
            campaign: $campaign,
            unitAccountIds: $validated['unit_account_ids'],
            amount: (float) $validated['amount'],
            description: $validated['description'],
            actor: $actor,
        );

        return response()->json(['posted' => $count]);
    }

    private function ensureFinanceCompoundAccess(User $actor, string $compoundId): void
    {
        $this->compoundContext->ensureUserCanAccessCompound($actor, $compoundId);
    }
}
