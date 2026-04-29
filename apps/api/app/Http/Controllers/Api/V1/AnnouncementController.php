<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\AnnouncementStatus;
use App\Enums\AnnouncementTargetType;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Announcements\StoreAnnouncementAttachmentRequest;
use App\Http\Requests\Announcements\StoreAnnouncementRequest;
use App\Http\Requests\Announcements\UpdateAnnouncementRequest;
use App\Http\Resources\AnnouncementResource;
use App\Models\Announcements\Announcement;
use App\Models\Announcements\AnnouncementAttachment;
use App\Models\Property\Building;
use App\Models\Property\Floor;
use App\Models\Property\Unit;
use App\Services\AnnouncementService;
use App\Services\CompoundContextService;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;

class AnnouncementController extends Controller
{
    public function __construct(
        private AnnouncementService $announcementService,
        private AuditLogger $auditLogger,
        private CompoundContextService $compoundContext,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $this->announcementService->expireDueAnnouncements();

        $query = Announcement::query()->with('author')->latest();

        // Compound isolation: scope to the resolved compound (null = super-admin sees all).
        $compoundId = $this->compoundContext->resolve($request);
        if ($compoundId !== null) {
            $query->where('compound_id', $compoundId);
        }

        if ($request->filled('status') && $request->input('status') !== 'all') {
            if ($request->input('status') === AnnouncementStatus::Expired->value) {
                $query->where(function ($query): void {
                    $query
                        ->where('status', AnnouncementStatus::Expired->value)
                        ->orWhere(function ($query): void {
                            $query
                                ->where('status', AnnouncementStatus::Published->value)
                                ->whereNotNull('expires_at')
                                ->where('expires_at', '<=', now());
                        });
                });
            } else {
                $query->where('status', $request->input('status'));
            }
        }

        if ($request->filled('category') && $request->input('category') !== 'all') {
            $query->where('category', $request->input('category'));
        }

        if ($request->filled('targetType') && $request->input('targetType') !== 'all') {
            $query->where('target_type', $request->input('targetType'));
        }

        if ($request->filled('authorId')) {
            $query->where('created_by', $request->input('authorId'));
        }

        if ($request->filled('buildingId')) {
            $query
                ->where('target_type', 'building')
                ->whereJsonContains('target_ids', $request->input('buildingId'));
        }

        if ($request->filled('targetId')) {
            $query->whereJsonContains('target_ids', $request->input('targetId'));
        }

        $publishedFrom = $request->filled('publishedFrom') ? 'publishedFrom' : ($request->filled('from') ? 'from' : null);
        $publishedTo = $request->filled('publishedTo') ? 'publishedTo' : ($request->filled('to') ? 'to' : null);

        if ($publishedFrom !== null) {
            $query->where('published_at', '>=', $request->date($publishedFrom));
        }

        if ($publishedTo !== null) {
            $query->where('published_at', '<=', $request->date($publishedTo));
        }

        if ($request->filled('archivedFrom')) {
            $query->where('archived_at', '>=', $request->date('archivedFrom'));
        }

        if ($request->filled('archivedTo')) {
            $query->where('archived_at', '<=', $request->date('archivedTo'));
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
        $this->announcementService->publishDueScheduled();
        $this->announcementService->expireDueAnnouncements();

        $user = $request->user();
        $query = Announcement::query()
            ->with(['author', 'acknowledgements' => fn ($query) => $query->where('user_id', $user?->id)])
            ->where('status', AnnouncementStatus::Published->value)
            ->where(function ($query): void {
                $query->whereNull('expires_at')->orWhere('expires_at', '>', now());
            })
            ->latest();

        $this->announcementService->applyVisibleToUser($query, $user);

        return AnnouncementResource::collection($query->paginate((int) $request->input('perPage', 20)));
    }

    public function store(StoreAnnouncementRequest $request): AnnouncementResource
    {
        $payload = $request->payload();
        $requestedCompoundId = $payload['compound_id'] ?: $this->compoundContext->resolve($request);

        abort_unless(filled($requestedCompoundId), 422, 'A compoundId is required to create an announcement.');

        $payload['compound_id'] = $this->compoundContext->resolveManagedCompound(
            $request,
            $requestedCompoundId,
            false,
        );

        $this->validateAnnouncementTargets(
            $payload['compound_id'],
            $payload['target_type'],
            $payload['target_ids'] ?? [],
        );

        $announcement = Announcement::query()->create($payload);

        $this->auditLogger->record(
            action: 'announcements.created',
            actor: $request->user(),
            request: $request,
            statusCode: 201,
            auditableType: $announcement::class,
            auditableId: $announcement->id,
            metadata: ['status' => $announcement->status->value]
        );

        return new AnnouncementResource($announcement->load(['author', 'uploadedAttachments']));
    }

    public function show(Request $request, Announcement $announcement): AnnouncementResource
    {
        abort_unless($this->canAccessAnnouncement($request, $announcement), Response::HTTP_FORBIDDEN);

        return new AnnouncementResource($announcement->load([
            'author',
            'uploadedAttachments',
            'acknowledgements' => fn ($query) => $query->where('user_id', $request->user()?->id),
        ]));
    }

    public function update(UpdateAnnouncementRequest $request, Announcement $announcement): AnnouncementResource
    {
        $this->ensureAnnouncementAdminAccess($request, $announcement->compound_id);
        abort_if($announcement->status === AnnouncementStatus::Archived, 422, 'Archived announcements cannot be edited.');

        $payload = $request->payload();
        $this->validateAnnouncementTargets(
            $announcement->compound_id,
            $payload['target_type'] ?? $announcement->target_type->value,
            $payload['target_ids'] ?? $announcement->target_ids ?? [],
        );
        $contentFields = ['title_en', 'title_ar', 'body_en', 'body_ar'];
        $contentChanged = count(array_intersect(array_keys($payload), $contentFields)) > 0;

        if ($contentChanged && in_array($announcement->status, [AnnouncementStatus::Published, AnnouncementStatus::Scheduled], true)) {
            $this->announcementService->recordRevision(
                $announcement,
                $request->user(),
                ['action' => 'before_update', 'fields' => array_keys($payload)]
            );

            $payload['revision'] = $announcement->revision + 1;
            $payload['last_published_snapshot'] = $this->announcementService->snapshot($announcement);
        }

        $announcement->update($payload);

        if ($contentChanged && in_array($announcement->status, [AnnouncementStatus::Published, AnnouncementStatus::Scheduled], true)) {
            $this->announcementService->recordRevision(
                $announcement->refresh(),
                $request->user(),
                ['action' => 'after_update', 'fields' => array_keys($payload)]
            );
        }

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
        $this->ensureAnnouncementAdminAccess($request, $announcement->compound_id);
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
        $this->ensureAnnouncementAdminAccess($request, $announcement->compound_id);
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

    public function storeAttachment(
        StoreAnnouncementAttachmentRequest $request,
        Announcement $announcement
    ): JsonResponse {
        $this->ensureAnnouncementAdminAccess($request, $announcement->compound_id);

        $file = $request->file('file');
        $disk = config('filesystems.default', 'local');
        $path = $file->store("announcements/{$announcement->id}", $disk);

        $attachment = $announcement->uploadedAttachments()->create([
            'uploaded_by' => $request->user()?->id,
            'disk' => $disk,
            'path' => $path,
            'original_name' => $file->getClientOriginalName(),
            'mime_type' => $file->getClientMimeType(),
            'size' => $file->getSize() ?: 0,
        ]);

        $this->auditLogger->record(
            action: 'announcements.attachment_uploaded',
            actor: $request->user(),
            request: $request,
            statusCode: 201,
            auditableType: $announcement::class,
            auditableId: $announcement->id,
            metadata: ['attachmentId' => $attachment->id, 'originalName' => $attachment->original_name]
        );

        return response()->json([
            'data' => $this->attachmentPayload($attachment),
        ], 201);
    }

    public function downloadAttachment(
        Request $request,
        Announcement $announcement,
        AnnouncementAttachment $attachment
    ) {
        abort_unless($attachment->announcement_id === $announcement->id, 404);
        abort_unless($this->canAccessAnnouncement($request, $announcement), Response::HTTP_FORBIDDEN);

        $this->auditLogger->record(
            action: 'announcements.attachment_downloaded',
            actor: $request->user(),
            request: $request,
            auditableType: $announcement::class,
            auditableId: $announcement->id,
            metadata: ['attachmentId' => $attachment->id]
        );

        return Storage::disk($attachment->disk)->download($attachment->path, $attachment->original_name);
    }

    public function acknowledge(Request $request, Announcement $announcement): JsonResponse
    {
        abort_unless($this->announcementService->canUserView($announcement, $request->user()), Response::HTTP_FORBIDDEN);
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

    public function acknowledgements(Request $request, Announcement $announcement): JsonResponse
    {
        $this->ensureAnnouncementAdminAccess($request, $announcement->compound_id);
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

    private function attachmentPayload(AnnouncementAttachment $attachment): array
    {
        return [
            'id' => $attachment->id,
            'name' => $attachment->original_name,
            'mimeType' => $attachment->mime_type,
            'size' => $attachment->size,
            'downloadUrl' => "/api/v1/announcements/{$attachment->announcement_id}/attachments/{$attachment->id}/download",
            'createdAt' => $attachment->created_at?->toIso8601String(),
        ];
    }

    private function isAnnouncementAdmin(Request $request): bool
    {
        return $request->user()?->hasAnyEffectiveRole([
            UserRole::SuperAdmin,
            UserRole::CompoundAdmin,
            UserRole::BoardMember,
            UserRole::FinanceReviewer,
            UserRole::SupportAgent,
        ]) ?? false;
    }

    private function canAccessAnnouncement(Request $request, Announcement $announcement): bool
    {
        if ($this->isAnnouncementAdmin($request)) {
            return $this->canAdminAccessAnnouncement($request, $announcement);
        }

        return $this->announcementService->canUserView($announcement, $request->user());
    }

    private function canAdminAccessAnnouncement(Request $request, Announcement $announcement): bool
    {
        $user = $request->user();

        if ($user === null || ! $this->isAnnouncementAdmin($request)) {
            return false;
        }

        if ($user->isEffectiveSuperAdmin()) {
            return true;
        }

        return $this->compoundContext->resolveManagedCompoundId($user) === $announcement->compound_id;
    }

    private function ensureAnnouncementAdminAccess(Request $request, string $compoundId): void
    {
        abort_unless($this->isAnnouncementAdmin($request), Response::HTTP_FORBIDDEN);

        $user = $request->user();

        if ($user === null || $user->isEffectiveSuperAdmin()) {
            return;
        }

        $this->compoundContext->ensureManagedCompoundAccess($user, $compoundId);
    }

    /**
     * @param  list<string>  $targetIds
     */
    private function validateAnnouncementTargets(string $compoundId, string $targetType, array $targetIds): void
    {
        $targetIds = array_values(array_unique(array_filter(
            $targetIds,
            static fn (mixed $value): bool => filled($value),
        )));

        if ($targetIds === []) {
            return;
        }

        $matchesCompound = match ($targetType) {
            AnnouncementTargetType::Compound->value => count($targetIds) === 1 && $targetIds[0] === $compoundId,
            AnnouncementTargetType::Building->value => Building::query()
                ->where('compound_id', $compoundId)
                ->whereIn('id', $targetIds)
                ->count() === count($targetIds),
            AnnouncementTargetType::Floor->value => Floor::query()
                ->whereIn('id', $targetIds)
                ->whereHas('building', fn ($query) => $query->where('compound_id', $compoundId))
                ->count() === count($targetIds),
            AnnouncementTargetType::Unit->value => Unit::query()
                ->where('compound_id', $compoundId)
                ->whereIn('id', $targetIds)
                ->count() === count($targetIds),
            default => true,
        };

        abort_unless(
            $matchesCompound,
            Response::HTTP_UNPROCESSABLE_ENTITY,
            'Announcement targets must belong to the selected compound.'
        );
    }
}
