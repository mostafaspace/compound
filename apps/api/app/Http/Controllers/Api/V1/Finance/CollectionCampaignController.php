<?php

namespace App\Http\Controllers\Api\V1\Finance;

use App\Http\Controllers\Controller;
use App\Http\Requests\Finance\ApplyCampaignChargesRequest;
use App\Http\Requests\Finance\StoreCollectionCampaignRequest;
use App\Http\Resources\Finance\CollectionCampaignResource;
use App\Models\Finance\CollectionCampaign;
use App\Models\User;
use App\Services\FinanceService;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\Response;

class CollectionCampaignController extends Controller
{
    public function __construct(
        private readonly FinanceService $financeService,
        private readonly AuditLogger $auditLogger,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $campaigns = CollectionCampaign::query()
            ->when(
                $request->filled('compound_id'),
                fn ($query) => $query->where('compound_id', $request->string('compound_id')->toString()),
            )
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

        $campaign = $this->financeService->createCampaign(
            data: $request->validated(),
            actor: $actor,
        );

        return CollectionCampaignResource::make($campaign)
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(CollectionCampaign $campaign): CollectionCampaignResource
    {
        return CollectionCampaignResource::make($campaign);
    }

    public function update(Request $request, CollectionCampaign $campaign): CollectionCampaignResource
    {
        /** @var User $actor */
        $actor = $request->user();

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
}
