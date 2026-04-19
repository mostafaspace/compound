<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\DocumentStatus;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Documents\ReviewUserDocumentRequest;
use App\Http\Requests\Documents\StoreUserDocumentRequest;
use App\Http\Resources\Documents\UserDocumentResource;
use App\Models\Documents\UserDocument;
use App\Models\User;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class UserDocumentController extends Controller
{
    public function __construct(private readonly AuditLogger $auditLogger) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        /** @var User $user */
        $user = $request->user();

        $documents = UserDocument::query()
            ->with(['documentType', 'user', 'unit'])
            ->when(! $this->isReviewer($user), fn ($query) => $query->where('user_id', $user->id))
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

        return UserDocumentResource::make($userDocument->refresh()->load(['documentType', 'user', 'unit']));
    }

    public function download(Request $request, UserDocument $userDocument): mixed
    {
        /** @var User $user */
        $user = $request->user();
        abort_unless($this->isReviewer($user) || $user->id === $userDocument->user_id, Response::HTTP_FORBIDDEN);

        $this->auditLogger->record('documents.user_document_downloaded', actor: $user, request: $request, metadata: [
            'document_id' => $userDocument->id,
        ]);

        return Storage::disk($userDocument->storage_disk)->download($userDocument->storage_path, $userDocument->original_name);
    }

    private function isReviewer(User $user): bool
    {
        return in_array($user->role, [
            UserRole::SuperAdmin,
            UserRole::CompoundAdmin,
            UserRole::BoardMember,
            UserRole::FinanceReviewer,
            UserRole::SupportAgent,
        ], strict: true);
    }
}
