<?php

namespace App\Http\Controllers\Api\V1\Finance;

use App\Enums\UserRole;
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
        /** @var User $actor */
        $actor = $request->user();
        $requestedCompoundId = $request->filled('compound_id') ? $request->string('compound_id')->toString() : null;

        if (filled($actor->compound_id) && $requestedCompoundId !== null && $requestedCompoundId !== $actor->compound_id) {
            abort(Response::HTTP_FORBIDDEN);
        }

        $compoundId = filled($actor->compound_id) ? $actor->compound_id : $requestedCompoundId;

        $campaigns = CollectionCampaign::query()
            ->when($compoundId, fn ($query) => $query->where('compound_id', $compoundId))
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

        if (filled($actor->compound_id)) {
            abort_if($requestedCompoundId !== $actor->compound_id, Response::HTTP_FORBIDDEN);
            $validated['compound_id'] = $actor->compound_id;
        } else {
            abort_if(! filled($requestedCompoundId), Response::HTTP_UNPROCESSABLE_ENTITY);
        }

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
        if ($actor->role === UserRole::SuperAdmin || ! filled($actor->compound_id)) {
            return;
        }

        abort_if($actor->compound_id !== $compoundId, Response::HTTP_FORBIDDEN);
    }
}
