<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\AnnouncementStatus;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Announcements\StoreAnnouncementRequest;
use App\Http\Requests\Announcements\UpdateAnnouncementRequest;
use App\Http\Resources\AnnouncementResource;
use App\Models\Announcements\Announcement;
use App\Services\AnnouncementService;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Pagination\LengthAwarePaginator;

class AnnouncementController extends Controller
{
    public function __construct(
        private AnnouncementService $announcementService,
        private AuditLogger $auditLogger,
    ) {
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Announcement::query()->with('author')->latest();

        if ($request->filled('status') && $request->input('status') !== 'all') {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('category') && $request->input('category') !== 'all') {
            $query->where('category', $request->input('category'));
        }

        if ($request->filled('targetType') && $request->input('targetType') !== 'all') {
            $query->where('target_type', $request->input('targetType'));
        }

        if ($request->filled('search')) {
            $search = $request->string('search')->toString();
            $query->where(function ($query) use ($search): void {
                $query
                    ->where('title_en', 'like', "%{$search}%")
                    ->orWhere('title_ar', 'like', "%{$search}%")
                    ->orWhere('body_en', 'like', "%{$search}%")
                    ->orWhere('body_ar', 'like', "%{$search}%");
            });
        }

        return AnnouncementResource::collection($query->paginate((int) $request->input('perPage', 20)));
    }

    public function feed(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();
        $perPage = (int) $request->input('perPage', 20);
        $page = LengthAwarePaginator::resolveCurrentPage();

        $announcements = Announcement::query()
            ->with(['author', 'acknowledgements' => fn ($query) => $query->where('user_id', $user?->id)])
            ->whereIn('status', [AnnouncementStatus::Published->value, AnnouncementStatus::Scheduled->value])
            ->latest()
            ->get()
            ->filter(fn (Announcement $announcement): bool => $user !== null && $this->announcementService->canUserView($announcement, $user))
            ->values();

        $slice = $announcements->slice(($page - 1) * $perPage, $perPage)->values();
        $paginator = new LengthAwarePaginator($slice, $announcements->count(), $perPage, $page, [
            'path' => $request->url(),
            'query' => $request->query(),
        ]);

        return AnnouncementResource::collection($paginator);
    }

    public function store(StoreAnnouncementRequest $request): AnnouncementResource
    {
        $announcement = Announcement::query()->create($request->payload());

        $this->auditLogger->record(
            action: 'announcements.created',
            actor: $request->user(),
            request: $request,
            statusCode: 201,
            auditableType: $announcement::class,
            auditableId: $announcement->id,
            metadata: ['status' => $announcement->status->value]
        );

        return new AnnouncementResource($announcement->load('author'));
    }

    public function show(Request $request, Announcement $announcement): AnnouncementResource
    {
        abort_unless(
            $this->isAnnouncementAdmin($request) || $this->announcementService->canUserView($announcement, $request->user()),
            403
        );

        return new AnnouncementResource($announcement->load([
            'author',
            'acknowledgements' => fn ($query) => $query->where('user_id', $request->user()?->id),
        ]));
    }

    public function update(UpdateAnnouncementRequest $request, Announcement $announcement): AnnouncementResource
    {
        abort_if($announcement->status === AnnouncementStatus::Archived, 422, 'Archived announcements cannot be edited.');

        $payload = $request->payload();
        $contentFields = ['title_en', 'title_ar', 'body_en', 'body_ar'];
        $contentChanged = count(array_intersect(array_keys($payload), $contentFields)) > 0;

        if ($contentChanged && in_array($announcement->status, [AnnouncementStatus::Published, AnnouncementStatus::Scheduled], true)) {
            $payload['revision'] = $announcement->revision + 1;
            $payload['last_published_snapshot'] = $this->announcementService->snapshot($announcement);
        }

        $announcement->update($payload);

        $this->auditLogger->record(
            action: 'announcements.updated',
            actor: $request->user(),
            request: $request,
            auditableType: $announcement::class,
            auditableId: $announcement->id,
            metadata: [
                'revision' => $announcement->revision,
                'contentChanged' => $contentChanged,
            ]
        );

        return new AnnouncementResource($announcement->refresh()->load('author'));
    }

    public function publish(Request $request, Announcement $announcement): AnnouncementResource
    {
        abort_if($announcement->status === AnnouncementStatus::Archived, 422, 'Archived announcements cannot be published.');

        $announcement = $this->announcementService->publish($announcement);

        $this->auditLogger->record(
            action: 'announcements.published',
            actor: $request->user(),
            request: $request,
            auditableType: $announcement::class,
            auditableId: $announcement->id,
            metadata: ['status' => $announcement->status->value]
        );

        return new AnnouncementResource($announcement->load('author'));
    }

    public function archive(Request $request, Announcement $announcement): AnnouncementResource
    {
        $announcement = $this->announcementService->archive($announcement);

        $this->auditLogger->record(
            action: 'announcements.archived',
            actor: $request->user(),
            request: $request,
            auditableType: $announcement::class,
            auditableId: $announcement->id,
        );

        return new AnnouncementResource($announcement->load('author'));
    }

    public function acknowledge(Request $request, Announcement $announcement): JsonResponse
    {
        abort_unless($this->announcementService->canUserView($announcement, $request->user()), 403);
        abort_unless($announcement->requires_acknowledgement, 422, 'This announcement does not require acknowledgement.');

        $acknowledgement = $this->announcementService->acknowledge($announcement, $request->user());

        $this->auditLogger->record(
            action: 'announcements.acknowledged',
            actor: $request->user(),
            request: $request,
            auditableType: $announcement::class,
            auditableId: $announcement->id,
            metadata: ['acknowledgedAt' => $acknowledgement->acknowledged_at->toIso8601String()]
        );

        return response()->json([
            'data' => [
                'announcementId' => $announcement->id,
                'acknowledgedAt' => $acknowledgement->acknowledged_at->toIso8601String(),
            ],
        ]);
    }

    public function acknowledgements(Announcement $announcement): JsonResponse
    {
        $announcement->load('acknowledgements.user');

        return response()->json([
            'summary' => $this->announcementService->acknowledgementSummary($announcement),
            'data' => $announcement->acknowledgements->map(fn ($acknowledgement): array => [
                'userId' => $acknowledgement->user_id,
                'userName' => $acknowledgement->user?->name,
                'acknowledgedAt' => $acknowledgement->acknowledged_at->toIso8601String(),
            ])->values(),
        ]);
    }

    private function isAnnouncementAdmin(Request $request): bool
    {
        return in_array($request->user()?->role, [
            UserRole::SuperAdmin,
            UserRole::CompoundAdmin,
            UserRole::BoardMember,
            UserRole::SupportAgent,
        ], true);
    }
}
