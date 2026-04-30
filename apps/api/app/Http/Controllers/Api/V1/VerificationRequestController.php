<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\AccountStatus;
use App\Enums\NotificationCategory;
use App\Enums\VerificationRequestStatus;
use App\Enums\VerificationStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Onboarding\VerificationDecisionRequest;
use App\Http\Resources\VerificationRequestResource;
use App\Models\Property\UnitMembership;
use App\Models\User;
use App\Models\VerificationRequest;
use App\Notifications\VerificationDecisionNotification;
use App\Services\CompoundContextService;
use App\Services\NotificationService;
use App\Support\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class VerificationRequestController extends Controller
{
    public function __construct(
        private readonly AuditLogger $auditLogger,
        private readonly CompoundContextService $compoundContext,
        private readonly NotificationService $notificationService,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $status = $request->string('status')->toString();
        $search = $request->string('q')->toString();

        $verificationRequests = VerificationRequest::query()
            ->with(['residentInvitation', 'reviewer', 'unit', 'user'])
            ->when(true, fn ($query) => $this->scopeVerificationRequests($query, $request))
            ->when($status !== '' && $status !== 'all', fn ($query) => $query->where('status', $status))
            ->when($search !== '', fn ($query) => $query->where(function ($query) use ($search): void {
                $query->where('requested_role', 'like', "%{$search}%")
                    ->orWhere('relation_type', 'like', "%{$search}%")
                    ->orWhereHas('user', fn ($userQuery) => $userQuery
                        ->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%"))
                    ->orWhereHas('unit', fn ($unitQuery) => $unitQuery
                        ->where('unit_number', 'like', "%{$search}%"));
            }))
            ->latest('submitted_at')
            ->latest()
            ->paginate();

        return VerificationRequestResource::collection($verificationRequests);
    }

    public function mine(Request $request): AnonymousResourceCollection
    {
        /** @var User $user */
        $user = $request->user();

        $verificationRequests = VerificationRequest::query()
            ->with(['residentInvitation', 'reviewer', 'unit', 'user'])
            ->where('user_id', $user->id)
            ->latest('submitted_at')
            ->latest()
            ->paginate();

        return VerificationRequestResource::collection($verificationRequests);
    }

    public function approve(VerificationDecisionRequest $request, VerificationRequest $verificationRequest): VerificationRequestResource
    {
        $this->abortIfClosed($verificationRequest);
        $this->ensureCanManageVerificationRequest($request, $verificationRequest);

        /** @var User $actor */
        $actor = $request->user();
        $validated = $request->validated();

        DB::transaction(function () use ($actor, $validated, $verificationRequest): void {
            $verificationRequest->forceFill([
                'status' => VerificationRequestStatus::Approved->value,
                'reviewed_by' => $actor->id,
                'reviewed_at' => now(),
                'decision_note' => $validated['note'] ?? null,
            ])->save();

            $verificationRequest->user->forceFill([
                'status' => AccountStatus::Active->value,
            ])->save();

            $this->updateMembershipVerification($verificationRequest, VerificationStatus::Verified);
        });

        $this->auditLogger->record('onboarding.verification_request_approved', actor: $actor, request: $request, metadata: [
            'verification_request_id' => $verificationRequest->id,
            'user_id' => $verificationRequest->user_id,
            'unit_id' => $verificationRequest->unit_id,
        ]);

        $this->notifyResident($verificationRequest);

        return VerificationRequestResource::make($verificationRequest->refresh()->load(['residentInvitation', 'reviewer', 'unit', 'user']));
    }

    public function reject(VerificationDecisionRequest $request, VerificationRequest $verificationRequest): VerificationRequestResource
    {
        $this->abortIfClosed($verificationRequest);
        $this->ensureCanManageVerificationRequest($request, $verificationRequest);

        /** @var User $actor */
        $actor = $request->user();
        $validated = $request->validated();

        DB::transaction(function () use ($actor, $validated, $verificationRequest): void {
            $verificationRequest->forceFill([
                'status' => VerificationRequestStatus::Rejected->value,
                'reviewed_by' => $actor->id,
                'reviewed_at' => now(),
                'decision_note' => $validated['note'],
            ])->save();

            $verificationRequest->user->forceFill([
                'status' => AccountStatus::Suspended->value,
            ])->save();

            $this->updateMembershipVerification($verificationRequest, VerificationStatus::Rejected);
        });

        $this->auditLogger->record('onboarding.verification_request_rejected', actor: $actor, request: $request, metadata: [
            'verification_request_id' => $verificationRequest->id,
            'user_id' => $verificationRequest->user_id,
            'unit_id' => $verificationRequest->unit_id,
        ]);

        $this->notifyResident($verificationRequest);

        return VerificationRequestResource::make($verificationRequest->refresh()->load(['residentInvitation', 'reviewer', 'unit', 'user']));
    }

    public function requestMoreInfo(VerificationDecisionRequest $request, VerificationRequest $verificationRequest): VerificationRequestResource
    {
        $this->abortIfClosed($verificationRequest);
        $this->ensureCanManageVerificationRequest($request, $verificationRequest);

        /** @var User $actor */
        $actor = $request->user();
        $validated = $request->validated();

        DB::transaction(function () use ($actor, $validated, $verificationRequest): void {
            $verificationRequest->forceFill([
                'status' => VerificationRequestStatus::MoreInfoRequested->value,
                'reviewed_by' => $actor->id,
                'reviewed_at' => now(),
                'more_info_note' => $validated['note'],
            ])->save();

            $verificationRequest->user->forceFill([
                'status' => AccountStatus::PendingReview->value,
            ])->save();

            $this->updateMembershipVerification($verificationRequest, VerificationStatus::Pending);
        });

        $this->auditLogger->record('onboarding.verification_request_more_info_requested', actor: $actor, request: $request, metadata: [
            'verification_request_id' => $verificationRequest->id,
            'user_id' => $verificationRequest->user_id,
            'unit_id' => $verificationRequest->unit_id,
        ]);

        $this->notifyResident($verificationRequest);

        return VerificationRequestResource::make($verificationRequest->refresh()->load(['residentInvitation', 'reviewer', 'unit', 'user']));
    }

    private function abortIfClosed(VerificationRequest $verificationRequest): void
    {
        abort_if(
            in_array($verificationRequest->status, [
                VerificationRequestStatus::Approved,
                VerificationRequestStatus::Rejected,
            ], strict: true),
            Response::HTTP_UNPROCESSABLE_ENTITY,
            'Verification request is already closed.',
        );
    }

    private function scopeVerificationRequests(mixed $query, Request $request): mixed
    {
        /** @var User $user */
        $user = $request->user();

        return $query->where(function ($q) use ($user): void {
            $q->whereHas('unit', fn ($sub) => $this->compoundContext->scopePropertyQuery($sub, $user))
                ->orWhereHas('residentInvitation.unit', fn ($sub) => $this->compoundContext->scopePropertyQuery($sub, $user))
                ->orWhereHas('user', function ($subUser) use ($user): void {
                    $subUser->whereHas('unitMemberships.unit', fn ($subUnit) => $this->compoundContext->scopePropertyQuery($subUnit, $user));
                });
        });
    }

    private function ensureCanManageVerificationRequest(Request $request, VerificationRequest $verificationRequest): void
    {
        /** @var User $user */
        $user = $request->user();

        // Use the same logic as scoping to verify individual access
        $canAccess = false;

        if ($verificationRequest->unit_id) {
            $canAccess = $this->compoundContext->userCanAccessUnit($user, $verificationRequest->unit_id);
        } elseif ($verificationRequest->residentInvitation?->unit_id) {
            $canAccess = $this->compoundContext->userCanAccessUnit($user, $verificationRequest->residentInvitation->unit_id);
        } else {
            // Check if they can access any of the user's unit memberships
            $verificationRequest->loadMissing('user.unitMemberships.unit');
            $canAccess = $verificationRequest->user->unitMemberships->contains(function ($m) use ($user) {
                return $m->unit_id && $this->compoundContext->userCanAccessUnit($user, $m->unit_id);
            });
        }

        abort_unless($canAccess, Response::HTTP_FORBIDDEN);
    }

    private function verificationRequestBelongsToCompound(VerificationRequest $verificationRequest, string $compoundId): bool
    {
        $verificationRequest->loadMissing(['residentInvitation.unit', 'unit', 'user.unitMemberships.unit']);

        if ($verificationRequest->unit?->compound_id === $compoundId) {
            return true;
        }

        if ($verificationRequest->residentInvitation?->unit?->compound_id === $compoundId) {
            return true;
        }

        return $verificationRequest->user?->unitMemberships
            ->contains(fn ($membership): bool => $membership->unit?->compound_id === $compoundId) ?? false;
    }

    private function updateMembershipVerification(VerificationRequest $verificationRequest, VerificationStatus $status): void
    {
        if (! $verificationRequest->unit_id) {
            return;
        }

        UnitMembership::query()
            ->where('user_id', $verificationRequest->user_id)
            ->where('unit_id', $verificationRequest->unit_id)
            ->whereNull('ends_at')
            ->update(['verification_status' => $status->value]);
    }

    private function notifyResident(VerificationRequest $verificationRequest): void
    {
        $verificationRequest->loadMissing(['unit.building.compound', 'user']);

        $compoundName = $verificationRequest->unit?->building?->compound?->name ?? config('app.name', 'Compound Management');
        $residentAppUrl = config('app.resident_app_url');
        $actionUrl = is_string($residentAppUrl) && $residentAppUrl !== ''
            ? rtrim($residentAppUrl, '/').'/verification'
            : null;

        $verificationRequest->user->notify(new VerificationDecisionNotification(
            status: $verificationRequest->status,
            compoundName: $compoundName,
            unitNumber: $verificationRequest->unit?->unit_number,
            note: $verificationRequest->decision_note ?? $verificationRequest->more_info_note,
            actionUrl: $actionUrl,
        ));

        $titleEn = match ($verificationRequest->status) {
            VerificationRequestStatus::Approved => 'Verification approved',
            VerificationRequestStatus::Rejected => 'Verification rejected',
            VerificationRequestStatus::MoreInfoRequested => 'More information requested',
            VerificationRequestStatus::PendingReview => 'Verification pending review',
        };
        $titleAr = match ($verificationRequest->status) {
            VerificationRequestStatus::Approved => 'تمت الموافقة على التحقق',
            VerificationRequestStatus::Rejected => 'تم رفض التحقق',
            VerificationRequestStatus::MoreInfoRequested => 'مطلوب معلومات إضافية',
            VerificationRequestStatus::PendingReview => 'التحقق قيد المراجعة',
        };
        $bodyEn = match ($verificationRequest->status) {
            VerificationRequestStatus::Approved => "Your {$compoundName} access has been approved.",
            VerificationRequestStatus::Rejected => "Your {$compoundName} verification was rejected. Review the note for details.",
            VerificationRequestStatus::MoreInfoRequested => "The administration team needs more information before approving your {$compoundName} access.",
            VerificationRequestStatus::PendingReview => "Your {$compoundName} verification is pending review.",
        };
        $bodyAr = match ($verificationRequest->status) {
            VerificationRequestStatus::Approved => "تمت الموافقة على وصولك إلى {$compoundName}.",
            VerificationRequestStatus::Rejected => "تم رفض تحققك في {$compoundName}. راجع الملاحظة لمعرفة التفاصيل.",
            VerificationRequestStatus::MoreInfoRequested => "تحتاج الإدارة إلى معلومات إضافية قبل الموافقة على وصولك إلى {$compoundName}.",
            VerificationRequestStatus::PendingReview => "تحققك في {$compoundName} قيد المراجعة.",
        };

        $this->notificationService->create(
            userId: $verificationRequest->user_id,
            category: NotificationCategory::Documents,
            title: $titleEn,
            body: $bodyEn,
            metadata: [
                'verificationRequestId' => $verificationRequest->id,
                'status' => $verificationRequest->status->value,
                'unitId' => $verificationRequest->unit_id,
                'unitNumber' => $verificationRequest->unit?->unit_number,
                'actionUrl' => $actionUrl,
                'titleEn' => $titleEn,
                'titleAr' => $titleAr,
                'bodyEn' => $bodyEn,
                'bodyAr' => $bodyAr,
            ],
            priority: $verificationRequest->status === VerificationRequestStatus::MoreInfoRequested ? 'high' : 'normal',
        );
    }
}
