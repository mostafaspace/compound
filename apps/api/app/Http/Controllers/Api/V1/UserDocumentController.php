<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\DocumentStatus;
use App\Enums\NotificationCategory;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Documents\ReviewUserDocumentRequest;
use App\Http\Requests\Documents\StoreUserDocumentRequest;
use App\Http\Resources\Documents\UserDocumentResource;
use App\Models\Documents\UserDocument;
use App\Models\Property\Unit;
use App\Models\User;
use App\Services\CompoundContextService;
use App\Services\NotificationService;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class UserDocumentController extends Controller
{
    /**
     * @var list<UserRole>
     */
    private const REVIEWER_ROLES = [
        UserRole::SuperAdmin,
        UserRole::CompoundAdmin,
        UserRole::BoardMember,
        UserRole::FinanceReviewer,
        UserRole::SupportAgent,
    ];

    public function __construct(
        private readonly AuditLogger $auditLogger,
        private readonly CompoundContextService $compoundContext,
        private readonly NotificationService $notificationService,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        /** @var User $user */
        $user = $request->user();

        $documents = UserDocument::query()
            ->with(['documentType', 'user', 'unit'])
            ->when(! $this->isReviewer($user), fn ($query) => $query->where('user_id', $user->id))
            ->when($this->isReviewer($user), fn ($query) => $this->scopeReviewerDocuments($query, $user))
            ->when($request->string('status')->isNotEmpty(), fn ($query) => $query->where('status', $request->string('status')->toString()))
            ->latest()
            ->paginate();

        return UserDocumentResource::collection($documents);
    }

    public function store(StoreUserDocumentRequest $request): JsonResponse
    {
        /** @var User $actor */
        $actor = $request->user();
        $validated = $request->validated();
        $targetUserId = $this->isReviewer($actor) ? ($validated['userId'] ?? $actor->id) : $actor->id;
        $this->ensureCanStoreDocument($request, $actor, $targetUserId, $validated['unitId'] ?? null);
        $file = $request->file('file');
        abort_unless($file !== null, Response::HTTP_UNPROCESSABLE_ENTITY, 'File is required.');

        $disk = config('filesystems.default');
        $extension = $file->getClientOriginalExtension() ?: $file->extension() ?: 'bin';
        $path = $file->storeAs(
            'verification-documents/'.$targetUserId,
            Str::ulid()->toBase32().'.'.$extension,
            $disk,
        );

        $document = UserDocument::query()->create([
            'document_type_id' => $validated['documentTypeId'],
            'user_id' => $targetUserId,
            'unit_id' => $validated['unitId'] ?? null,
            'status' => DocumentStatus::Submitted->value,
            'storage_disk' => $disk,
            'storage_path' => $path,
            'original_name' => $file->getClientOriginalName(),
            'mime_type' => $file->getMimeType() ?? 'application/octet-stream',
            'size_bytes' => $file->getSize(),
            'checksum_sha256' => hash_file('sha256', $file->getRealPath()),
        ]);

        $this->auditLogger->record('documents.user_document_uploaded', actor: $actor, request: $request, metadata: [
            'document_id' => $document->id,
            'user_id' => $targetUserId,
            'unit_id' => $document->unit_id,
        ]);

        return UserDocumentResource::make($document->load(['documentType', 'user', 'unit']))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function review(ReviewUserDocumentRequest $request, UserDocument $userDocument): UserDocumentResource
    {
        /** @var User $user */
        $user = $request->user();
        abort_unless($this->isReviewer($user), Response::HTTP_FORBIDDEN);
        $this->ensureCanAccessDocument($request, $userDocument);

        $validated = $request->validated();

        $userDocument->forceFill([
            'status' => $validated['status'],
            'review_note' => $validated['reviewNote'] ?? null,
            'reviewed_by' => $user->id,
            'reviewed_at' => now(),
        ])->save();

        $this->auditLogger->record('documents.user_document_reviewed', actor: $user, request: $request, metadata: [
            'document_id' => $userDocument->id,
            'status' => $validated['status'],
        ]);

        $userDocument->refresh()->load(['documentType', 'user', 'unit']);

        $this->notificationService->create(
            userId: $userDocument->user_id,
            category: NotificationCategory::Documents,
            title: match ($userDocument->status) {
                DocumentStatus::Approved => 'Document approved',
                DocumentStatus::Rejected => 'Document rejected',
                default => 'Document review updated',
            },
            body: match ($userDocument->status) {
                DocumentStatus::Approved => "Your {$userDocument->documentType->name} document was approved.",
                DocumentStatus::Rejected => "Your {$userDocument->documentType->name} document was rejected. Review the note for details.",
                default => "Your {$userDocument->documentType->name} document review status changed.",
            },
            metadata: [
                'documentId' => $userDocument->id,
                'documentTypeId' => $userDocument->document_type_id,
                'documentTypeName' => $userDocument->documentType->name,
                'status' => $userDocument->status->value,
                'unitId' => $userDocument->unit_id,
                'reviewNote' => $userDocument->review_note,
            ],
            priority: $userDocument->status === DocumentStatus::Rejected ? 'high' : 'normal',
        );

        return UserDocumentResource::make($userDocument);
    }

    public function download(Request $request, UserDocument $userDocument): mixed
    {
        /** @var User $user */
        $user = $request->user();
        $this->ensureCanAccessDocument($request, $userDocument);

        $this->auditLogger->record('documents.user_document_downloaded', actor: $user, request: $request, metadata: [
            'document_id' => $userDocument->id,
        ]);

        return Storage::disk($userDocument->storage_disk)->download($userDocument->storage_path, $userDocument->original_name);
    }

    private function isReviewer(User $user): bool
    {
        return $user->hasAnyEffectiveRole(self::REVIEWER_ROLES);
    }

    private function scopeReviewerDocuments(mixed $query, User $user): mixed
    {
        $managedCompoundId = $this->compoundContext->resolveManagedCompoundId($user);

        if ($managedCompoundId === null) {
            return $query;
        }

        return $query->where(function ($scoped) use ($managedCompoundId): void {
            $scoped
                ->whereHas('unit', fn ($unitQuery) => $unitQuery->where('compound_id', $managedCompoundId))
                ->orWhereHas('user.unitMemberships.unit', fn ($unitQuery) => $unitQuery->where('compound_id', $managedCompoundId));
        });
    }

    private function ensureCanStoreDocument(Request $request, User $actor, int $targetUserId, ?string $unitId): void
    {
        if ($unitId !== null) {
            $unit = Unit::query()->findOrFail($unitId);

            if ($this->isReviewer($actor)) {
                $this->ensureScopedUserCanAccessCompound($request, $unit->compound_id);

                return;
            }

            abort_unless($this->userHasUnitMembership($actor->id, $unitId), Response::HTTP_FORBIDDEN);

            return;
        }

        $managedCompoundId = $this->compoundContext->resolveManagedCompoundId($actor);

        if ($this->isReviewer($actor) && $managedCompoundId !== null) {
            abort_unless($this->userHasCompoundMembership($targetUserId, $managedCompoundId), Response::HTTP_FORBIDDEN);
        }
    }

    private function ensureCanAccessDocument(Request $request, UserDocument $userDocument): void
    {
        /** @var User $user */
        $user = $request->user();

        if (! $this->isReviewer($user)) {
            abort_unless($user->id === $userDocument->user_id, Response::HTTP_FORBIDDEN);

            return;
        }

        $managedCompoundId = $this->compoundContext->resolveManagedCompoundId($user);

        if ($managedCompoundId === null) {
            return;
        }

        abort_unless(
            $this->documentBelongsToCompound($userDocument, $managedCompoundId),
            Response::HTTP_FORBIDDEN,
        );
    }

    private function ensureScopedUserCanAccessCompound(Request $request, string $compoundId): void
    {
        /** @var User $user */
        $user = $request->user();

        if ($this->compoundContext->resolveManagedCompoundId($user) === null) {
            return;
        }

        $this->compoundContext->ensureManagedCompoundAccess($user, $compoundId);
    }

    private function documentBelongsToCompound(UserDocument $userDocument, string $compoundId): bool
    {
        $userDocument->loadMissing(['unit', 'user.unitMemberships.unit']);

        if ($userDocument->unit?->compound_id === $compoundId) {
            return true;
        }

        return $userDocument->user?->unitMemberships
            ->contains(fn ($membership): bool => $membership->unit?->compound_id === $compoundId) ?? false;
    }

    private function userHasUnitMembership(int $userId, string $unitId): bool
    {
        return User::query()
            ->whereKey($userId)
            ->whereHas('unitMemberships', fn ($query) => $query->where('unit_id', $unitId))
            ->exists();
    }

    private function userHasCompoundMembership(int $userId, string $compoundId): bool
    {
        return User::query()
            ->whereKey($userId)
            ->whereHas('unitMemberships.unit', fn ($query) => $query->where('compound_id', $compoundId))
            ->exists();
    }
}
