<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Issues\StoreIssueRequest;
use App\Http\Requests\Issues\UpdateIssueRequest;
use App\Http\Resources\Issues\IssueResource;
use App\Models\Issues\Issue;
use App\Models\User;
use App\Services\CompoundContextService;
use App\Services\IssueService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\Response;

class IssueController extends Controller
{
    public function __construct(
        private readonly IssueService $issueService,
        private readonly CompoundContextService $compoundContext,
    ) {}

    public function index(Request $request): AnonymousResourceCollection|JsonResponse
    {
        $query = Issue::with(['reporter', 'assignee', 'unit', 'building'])
            ->latest();

        // Compound isolation: scope to the resolved compounds (null = super-admin sees all).
        /** @var User $actor */
        $actor = $request->user();
        $requestedCompoundId = $request->header('X-Compound-Id') ?: $request->query('compoundId');
        $compoundIds = $this->compoundContext->resolveRequestedAccessibleCompoundIds($actor, $requestedCompoundId);

        $query->when($compoundIds !== null, fn ($q) => $q->whereIn('compound_id', $compoundIds));

        // Role-based scope: floor reps see their floor, building reps their building, etc.
        $this->issueService->applyScopeForUser($query, $actor);

        if ($request->has('status') && $request->input('status') !== 'all') {
            $query->where('status', $request->input('status'));
        }

        if ($request->has('category') && $request->input('category') !== 'all') {
            $query->where('category', $request->input('category'));
        }

        if ($request->has('building_id')) {
            $query->where('building_id', $request->input('building_id'));
        }

        return match ($request->input('paginate', 'true')) {
            'false' => IssueResource::collection($query->get()),
            default => IssueResource::collection($query->paginate(20)),
        };
    }

    public function myIssues(Request $request): AnonymousResourceCollection
    {
        $issues = Issue::with(['assignee', 'unit', 'building'])
            ->where('reported_by', $request->user()?->id)
            ->latest()
            ->get();

        return IssueResource::collection($issues);
    }

    public function store(StoreIssueRequest $request): JsonResponse
    {
        $location = $request->resolveLocationAndQueue();

        /** @var User $user */
        $user = $request->user();

        $issue = $this->issueService->createIssue(
            data: [
                'unit_id' => $request->input('unitId'),
                'category' => $request->input('category'),
                'title' => $request->input('title'),
                'description' => $request->input('description'),
                'priority' => $request->input('priority', 'normal'),
            ],
            reporter: $user,
            location: $location,
        );

        return IssueResource::make($issue->load(['reporter', 'assignee', 'unit', 'building']))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Request $request, Issue $issue): JsonResponse
    {
        abort_unless($this->issueService->userCanAccessIssue($request->user(), $issue), Response::HTTP_FORBIDDEN);

        return IssueResource::make(
            $issue->load(['reporter', 'assignee', 'unit', 'building', 'comments.user', 'attachments'])
        )->response();
    }

    public function update(UpdateIssueRequest $request, Issue $issue): JsonResponse
    {
        abort_unless($this->issueService->userCanManageIssue($request->user(), $issue), Response::HTTP_FORBIDDEN);

        /** @var User $user */
        $user = $request->user();

        $changes = [];

        if ($request->has('status')) {
            $changes['status'] = $request->input('status');
        }

        if ($request->has('priority')) {
            $changes['priority'] = $request->input('priority');
        }

        if ($request->has('assignedTo')) {
            $changes['assigned_to'] = $request->input('assignedTo');
        }

        if ($request->has('categoryId')) {
            $changes['category'] = $request->input('categoryId');
        }

        $issue = $this->issueService->updateIssue($issue, $changes, $user);

        return IssueResource::make($issue->load(['reporter', 'assignee', 'unit', 'building']))->response();
    }

    public function escalate(Request $request, Issue $issue): JsonResponse
    {
        abort_unless($this->issueService->userCanEscalateIssue($request->user(), $issue), Response::HTTP_FORBIDDEN);

        $request->validate([
            'reason' => ['required', 'string', 'max:1000'],
        ]);

        /** @var User $user */
        $user = $request->user();

        $issue = $this->issueService->escalateIssue($issue, $user, $request->input('reason'));

        return IssueResource::make($issue->load(['reporter', 'assignee', 'unit', 'building']))->response();
    }
}
