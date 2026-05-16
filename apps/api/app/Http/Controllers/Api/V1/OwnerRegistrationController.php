<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\AccountStatus;
use App\Enums\NotificationCategory;
use App\Enums\UnitRelationType;
use App\Enums\UnitStatus;
use App\Enums\UnitType;
use App\Enums\UserRole;
use App\Enums\VerificationStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Onboarding\OwnerRegistrationDecisionRequest;
use App\Http\Requests\Onboarding\StoreOwnerRegistrationRequest;
use App\Http\Resources\OwnerRegistrationRequestResource;
use App\Models\Apartments\ApartmentResident;
use App\Models\OwnerRegistrationRequest;
use App\Models\Property\Building;
use App\Models\Property\Compound;
use App\Models\Property\Floor;
use App\Models\Property\Unit;
use App\Models\User;
use App\Services\CompoundContextService;
use App\Services\NotificationService;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class OwnerRegistrationController extends Controller
{
    public function __construct(
        private readonly AuditLogger $auditLogger,
        private readonly CompoundContextService $compoundContext,
        private readonly NotificationService $notificationService,
    ) {}

    public function buildings(): JsonResponse
    {
        $compound = $this->nextPointCompound();

        $buildings = $compound->buildings()
            ->whereNull('archived_at')
            ->orderBy('sort_order')
            ->orderBy('code')
            ->get(['id', 'compound_id', 'name', 'code', 'sort_order', 'metadata']);

        return response()->json([
            'data' => $buildings->map(fn (Building $building): array => [
                'id' => $building->id,
                'code' => $building->code,
                'label' => $building->name,
                'type' => $building->metadata['type'] ?? null,
            ])->values(),
            'meta' => [
                'compound' => [
                    'id' => $compound->id,
                    'name' => $compound->name,
                    'code' => $compound->code,
                ],
            ],
        ]);
    }

    public function store(StoreOwnerRegistrationRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $compound = $this->nextPointCompound();
        $building = Building::query()
            ->whereKey($validated['buildingId'])
            ->where('compound_id', $compound->id)
            ->whereNull('archived_at')
            ->firstOrFail();

        $token = Str::random(48);

        $registrationRequest = DB::transaction(function () use ($building, $compound, $request, $token, $validated): OwnerRegistrationRequest {
            $registrationRequest = OwnerRegistrationRequest::query()->create([
                'compound_id' => $compound->id,
                'building_id' => $building->id,
                'full_name_arabic' => $validated['fullNameArabic'],
                'phone' => $validated['phone'],
                'email' => Str::lower($validated['email']),
                'apartment_code' => Str::upper($validated['apartmentCode']),
                'status' => 'under_review',
                'owner_acknowledged' => true,
                'device_id' => $validated['deviceId'],
                'request_token_hash' => hash('sha256', $token),
                'metadata' => [
                    'source' => 'mobile_contact_admin',
                    'contact_hint' => [
                        'ar' => 'برجاء الرفع PDF (Scan). يمكن استخدام برنامج CamScanner أو خدمة https://jpg2pdf.com/ لدمج الصور في ملف واحد.',
                        'en' => 'Please upload scanned PDFs. CamScanner or https://jpg2pdf.com/ can help merge images into one PDF.',
                    ],
                ],
            ]);

            foreach ([
                'id_card' => 'idCardPdf',
                'contract' => 'contractPdf',
                'handover' => 'handoverPdf',
            ] as $type => $field) {
                $file = $request->file($field);
                $path = $file->store("owner-registration/{$registrationRequest->id}");

                $registrationRequest->documents()->create([
                    'type' => $type,
                    'original_name' => $file->getClientOriginalName(),
                    'path' => $path,
                    'mime_type' => $file->getMimeType(),
                    'size_bytes' => $file->getSize(),
                ]);
            }

            return $registrationRequest;
        });

        $registrationRequest->request_token_plain = $token;

        $this->auditLogger->record('onboarding.owner_registration_submitted', request: $request, statusCode: 201, metadata: [
            'owner_registration_request_id' => $registrationRequest->id,
            'compound_id' => $compound->id,
            'building_id' => $building->id,
        ]);

        return (new OwnerRegistrationRequestResource($registrationRequest->load(['building', 'documents'])))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function status(Request $request): OwnerRegistrationRequestResource
    {
        $validated = $request->validate([
            'deviceId' => ['nullable', 'string', 'max:191'],
            'requestToken' => ['nullable', 'string', 'max:191'],
        ]);

        abort_if(blank($validated['deviceId'] ?? null) && blank($validated['requestToken'] ?? null), Response::HTTP_UNPROCESSABLE_ENTITY, 'Device ID or request token is required.');

        $query = OwnerRegistrationRequest::query()
            ->with(['building', 'documents', 'unit', 'user'])
            ->latest();

        if (filled($validated['requestToken'] ?? null)) {
            $query->where('request_token_hash', hash('sha256', (string) $validated['requestToken']));
        } else {
            $query->where('device_id', $validated['deviceId']);
        }

        $registrationRequest = $query->firstOrFail();

        return new OwnerRegistrationRequestResource($registrationRequest, includePrivateLogin: true);
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        /** @var User $user */
        $user = $request->user();

        $query = OwnerRegistrationRequest::query()
            ->with(['building', 'documents', 'unit', 'user'])
            ->latest();

        $compoundIds = $this->compoundContext->resolveRequestedAccessibleCompoundIds($user, $request->header('X-Compound-Id') ?? $request->query('compoundId'));
        if ($compoundIds !== null) {
            $query->whereIn('compound_id', $compoundIds);
        }

        if ($status = $request->string('status')->toString()) {
            if ($status !== 'all') {
                $query->where('status', $status);
            }
        }

        if ($search = $request->string('q')->toString()) {
            $query->where(function ($sub) use ($search): void {
                $sub->where('full_name_arabic', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('apartment_code', 'like', "%{$search}%");
            });
        }

        return OwnerRegistrationRequestResource::collection($query->paginate($request->integer('perPage', 20)));
    }

    public function approve(OwnerRegistrationDecisionRequest $request, OwnerRegistrationRequest $ownerRegistrationRequest): OwnerRegistrationRequestResource
    {
        $this->abortIfClosed($ownerRegistrationRequest);
        $this->ensureCanManageRequest($request, $ownerRegistrationRequest);

        /** @var User $actor */
        $actor = $request->user();
        $validated = $request->validated();

        $registrationRequest = DB::transaction(function () use ($actor, $ownerRegistrationRequest, $validated): OwnerRegistrationRequest {
            $unit = $this->resolveOrCreateUnit($ownerRegistrationRequest, (bool) ($validated['createUnitIfMissing'] ?? false));
            $user = $this->resolveOrCreateResidentUser($ownerRegistrationRequest);
            $resetToken = Str::random(64);

            DB::table('password_reset_tokens')->updateOrInsert(
                ['email' => $user->email],
                [
                    'token' => Hash::make($resetToken),
                    'created_at' => now(),
                ],
            );

            ApartmentResident::query()->updateOrCreate([
                'unit_id' => $unit->id,
                'user_id' => $user->id,
                'relation_type' => UnitRelationType::Owner->value,
            ], [
                'starts_at' => now()->toDateString(),
                'ends_at' => null,
                'is_primary' => true,
                'verification_status' => VerificationStatus::Verified->value,
                'created_by' => $actor->id,
                'resident_name' => $ownerRegistrationRequest->full_name_arabic,
                'resident_phone' => $ownerRegistrationRequest->phone,
                'phone_public' => false,
                'resident_email' => $ownerRegistrationRequest->email,
                'email_public' => false,
            ]);

            $ownerRegistrationRequest->forceFill([
                'status' => 'approved',
                'unit_id' => $unit->id,
                'user_id' => $user->id,
                'password_setup_token' => Crypt::encryptString($resetToken),
                'password_setup_expires_at' => now()->addDays(7),
                'decision_reason' => $validated['note'] ?? null,
                'reviewed_by' => $actor->id,
                'reviewed_at' => now(),
            ])->save();

            $this->copyRegistrationDocumentsToApartment($ownerRegistrationRequest, $unit->id, $user->id);

            return $ownerRegistrationRequest;
        });

        $this->auditLogger->record('onboarding.owner_registration_approved', actor: $actor, request: $request, metadata: [
            'owner_registration_request_id' => $registrationRequest->id,
            'unit_id' => $registrationRequest->unit_id,
            'user_id' => $registrationRequest->user_id,
        ]);

        $this->notificationService->create(
            userId: $registrationRequest->user_id,
            category: NotificationCategory::Onboarding,
            title: 'Owner registration approved',
            body: "Your registration for {$registrationRequest->apartment_code} has been approved. You can now sign in.",
            metadata: [
                'type' => 'owner_registration_approved',
                'owner_registration_request_id' => $registrationRequest->id,
                'apartment_code' => $registrationRequest->apartment_code,
                'titleTranslations' => [
                    'en' => 'Owner registration approved',
                    'ar' => 'تم قبول طلب المالك',
                ],
                'bodyTranslations' => [
                    'en' => "Your registration for {$registrationRequest->apartment_code} has been approved. You can now sign in.",
                    'ar' => "تم قبول تسجيلك للوحدة {$registrationRequest->apartment_code}. يمكنك تسجيل الدخول الآن.",
                ],
            ],
            priority: 'high',
            respectPreferences: false,
        );

        return new OwnerRegistrationRequestResource(
            $registrationRequest->refresh()->load(['building', 'documents', 'unit', 'user']),
            includePrivateLogin: true,
        );
    }

    public function deny(OwnerRegistrationDecisionRequest $request, OwnerRegistrationRequest $ownerRegistrationRequest): OwnerRegistrationRequestResource
    {
        $this->abortIfClosed($ownerRegistrationRequest);
        $this->ensureCanManageRequest($request, $ownerRegistrationRequest);

        /** @var User $actor */
        $actor = $request->user();
        $validated = $request->validated();

        $ownerRegistrationRequest->forceFill([
            'status' => 'denied',
            'decision_reason' => $validated['reason'],
            'reviewed_by' => $actor->id,
            'reviewed_at' => now(),
        ])->save();

        $this->auditLogger->record('onboarding.owner_registration_denied', actor: $actor, request: $request, metadata: [
            'owner_registration_request_id' => $ownerRegistrationRequest->id,
        ]);

        return OwnerRegistrationRequestResource::make($ownerRegistrationRequest->refresh()->load(['building', 'documents', 'unit', 'user']));
    }

    public function downloadDocument(Request $request, OwnerRegistrationRequest $ownerRegistrationRequest, int $documentId): StreamedResponse
    {
        $this->compoundContext->ensureCompoundAccess($request, $ownerRegistrationRequest->compound_id);

        $document = $ownerRegistrationRequest->documents()->where('id', $documentId)->firstOrFail();

        abort_unless(Storage::exists($document->path), Response::HTTP_NOT_FOUND, 'Document file not found.');

        return Storage::download($document->path, $document->original_name);
    }

    private function nextPointCompound(): Compound
    {
        return Compound::query()
            ->where('code', 'NEXT-POINT')
            ->where('status', 'active')
            ->firstOrFail();
    }

    private function abortIfClosed(OwnerRegistrationRequest $ownerRegistrationRequest): void
    {
        abort_if(in_array($ownerRegistrationRequest->status, ['approved', 'denied'], true), Response::HTTP_UNPROCESSABLE_ENTITY, 'Owner registration request is already closed.');
    }

    private function ensureCanManageRequest(Request $request, OwnerRegistrationRequest $ownerRegistrationRequest): void
    {
        $this->compoundContext->ensureCompoundAccess($request, $ownerRegistrationRequest->compound_id);
    }

    private function resolveOrCreateUnit(OwnerRegistrationRequest $ownerRegistrationRequest, bool $createUnitIfMissing): Unit
    {
        $unit = Unit::query()
            ->where('building_id', $ownerRegistrationRequest->building_id)
            ->where('unit_number', $ownerRegistrationRequest->apartment_code)
            ->first();

        if ($unit instanceof Unit) {
            return $unit;
        }

        abort_unless($createUnitIfMissing, Response::HTTP_UNPROCESSABLE_ENTITY, 'Apartment does not exist. Confirm creation before approval.');

        $floor = $this->resolveFloor($ownerRegistrationRequest);

        return Unit::query()->create([
            'compound_id' => $ownerRegistrationRequest->compound_id,
            'building_id' => $ownerRegistrationRequest->building_id,
            'floor_id' => $floor?->id,
            'unit_number' => $ownerRegistrationRequest->apartment_code,
            'type' => UnitType::Apartment->value,
            'status' => UnitStatus::Active->value,
            'metadata' => [
                'created_from_owner_registration_request_id' => $ownerRegistrationRequest->id,
            ],
        ]);
    }

    private function resolveFloor(OwnerRegistrationRequest $ownerRegistrationRequest): ?Floor
    {
        if (! preg_match('/-F0*(\d+)-/i', $ownerRegistrationRequest->apartment_code, $matches)) {
            return null;
        }

        $level = (int) $matches[1];

        return Floor::query()->firstOrCreate([
            'building_id' => $ownerRegistrationRequest->building_id,
            'level_number' => $level,
        ], [
            'label' => "Floor {$level}",
            'sort_order' => $level,
        ]);
    }

    private function resolveOrCreateResidentUser(OwnerRegistrationRequest $ownerRegistrationRequest): User
    {
        $user = User::query()->where('email', $ownerRegistrationRequest->email)->first();

        if (! $user instanceof User) {
            $user = User::query()->create([
                'name' => $ownerRegistrationRequest->full_name_arabic,
                'email' => $ownerRegistrationRequest->email,
                'phone' => $ownerRegistrationRequest->phone,
                'role' => UserRole::defaultForNewUser()->value,
                'compound_id' => $ownerRegistrationRequest->compound_id,
                'status' => AccountStatus::Active->value,
                'password' => Hash::make(Str::random(48)),
            ]);
        } else {
            $user->forceFill([
                'name' => $ownerRegistrationRequest->full_name_arabic,
                'phone' => $ownerRegistrationRequest->phone,
                'role' => UserRole::defaultForNewUser()->value,
                'compound_id' => $ownerRegistrationRequest->compound_id,
                'status' => AccountStatus::Active->value,
            ])->save();
        }

        $user->syncRoles([UserRole::defaultForNewUser()->value]);

        return $user;
    }

    private function copyRegistrationDocumentsToApartment(
        OwnerRegistrationRequest $registration,
        string $unitId,
        int $userId,
    ): void {
        $docs = DB::table('owner_registration_documents')
            ->where('owner_registration_request_id', $registration->id)
            ->whereNull('migrated_to_apartment_document_id')
            ->get();

        foreach ($docs as $doc) {
            $apartmentDocumentId = DB::table('apartment_documents')->insertGetId([
                'unit_id' => $unitId,
                'uploaded_by_user_id' => $userId,
                'document_type' => $this->mapRegistrationDocType($doc->type ?? 'other'),
                'file_path' => $doc->path,
                'mime_type' => $doc->mime_type ?? null,
                'size_bytes' => $doc->size_bytes ?? null,
                'status' => 'active',
                'version' => 1,
                'created_at' => $doc->created_at,
                'updated_at' => now(),
            ]);

            DB::table('owner_registration_documents')
                ->where('id', $doc->id)
                ->update(['migrated_to_apartment_document_id' => $apartmentDocumentId]);
        }
    }

    private function mapRegistrationDocType(string $source): string
    {
        return match (strtolower($source)) {
            'contract', 'lease', 'rental_contract' => 'lease',
            'id', 'id_card', 'id_copy', 'national_id', 'passport' => 'id_copy',
            'utility', 'utility_bill' => 'utility_bill',
            'handover', 'ownership', 'ownership_proof', 'title_deed' => 'ownership_proof',
            default => 'other',
        };
    }
}
