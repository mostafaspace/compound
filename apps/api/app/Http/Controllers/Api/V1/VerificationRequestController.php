<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\AccountStatus;
use App\Enums\VerificationRequestStatus;
use App\Enums\VerificationStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Onboarding\VerificationDecisionRequest;
use App\Http\Resources\VerificationRequestResource;
use App\Models\Property\UnitMembership;
use App\Models\User;
use App\Models\VerificationRequest;
use App\Notifications\VerificationDecisionNotification;
use App\Support\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class VerificationRequestController extends Controller
{
    public function __construct(private readonly AuditLogger $auditLogger) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $status = $request->string('status')->toString();
        $search = $request->string('q')->toString();

        $verificationRequests = VerificationRequest::query()
            ->with(['residentInvitation', 'reviewer', 'unit', 'user'])
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
    }
}
