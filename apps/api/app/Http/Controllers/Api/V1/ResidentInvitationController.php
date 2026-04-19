<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\AccountStatus;
use App\Enums\InvitationStatus;
use App\Enums\VerificationStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Onboarding\AcceptResidentInvitationRequest;
use App\Http\Requests\Onboarding\StoreResidentInvitationRequest;
use App\Http\Resources\ResidentInvitationResource;
use App\Models\Property\Unit;
use App\Models\ResidentInvitation;
use App\Models\User;
use App\Notifications\ResidentInvitationNotification;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class ResidentInvitationController extends Controller
{
    public function __construct(private readonly AuditLogger $auditLogger) {}

    public function index(): AnonymousResourceCollection
    {
        $request = request();
        $status = $request->string('status')->toString();
        $search = $request->string('q')->toString();

        $invitations = ResidentInvitation::query()
            ->with(['user', 'unit'])
            ->when($status !== '' && $status !== InvitationStatus::Expired->value, fn ($query) => $query->where('status', $status))
            ->when($status === InvitationStatus::Expired->value, fn ($query) => $query
                ->where('status', InvitationStatus::Pending->value)
                ->where('expires_at', '<', now()))
            ->when($search !== '', fn ($query) => $query->where(function ($query) use ($search): void {
                $query->where('email', 'like', "%{$search}%")
                    ->orWhereHas('user', fn ($userQuery) => $userQuery
                        ->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%"));
            }))
            ->latest()
            ->paginate();

        return ResidentInvitationResource::collection($invitations);
    }

    public function store(StoreResidentInvitationRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $plainToken = Str::random(48);

        $invitation = DB::transaction(function () use ($request, $validated, $plainToken): ResidentInvitation {
            $user = User::query()->create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'phone' => $validated['phone'] ?? null,
                'role' => $validated['role'],
                'status' => AccountStatus::Invited->value,
                'password' => Hash::make(Str::password(32)),
            ]);

            $invitation = ResidentInvitation::query()->create([
                'user_id' => $user->id,
                'unit_id' => $validated['unitId'] ?? null,
                'token_hash' => hash('sha256', $plainToken),
                'email' => $user->email,
                'role' => $validated['role'],
                'relation_type' => $validated['relationType'] ?? null,
                'status' => InvitationStatus::Pending->value,
                'expires_at' => $validated['expiresAt'] ?? now()->addDays(7),
                'created_by' => $request->user()?->id,
            ]);

            if (($validated['unitId'] ?? null) && ($validated['relationType'] ?? null)) {
                /** @var Unit $unit */
                $unit = Unit::query()->findOrFail($validated['unitId']);
                $unit->memberships()->create([
                    'user_id' => $user->id,
                    'relation_type' => $validated['relationType'],
                    'starts_at' => $validated['startsAt'] ?? null,
                    'is_primary' => $validated['isPrimary'] ?? false,
                    'verification_status' => VerificationStatus::Pending->value,
                    'created_by' => $request->user()?->id,
                ]);
            }

            return $invitation;
        });

        $this->deliverInvitation($invitation, $plainToken);

        $this->auditLogger->record('onboarding.resident_invited', actor: $request->user(), request: $request, metadata: [
            'invitation_id' => $invitation->id,
            'email' => $invitation->email,
            'unit_id' => $invitation->unit_id,
        ]);

        return ResidentInvitationResource::make($invitation->refresh()->load(['user', 'unit']))
            ->additional(['meta' => ['acceptUrl' => $this->acceptUrl($plainToken), 'token' => $plainToken]])
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(string $token): ResidentInvitationResource
    {
        return ResidentInvitationResource::make($this->findByPlainToken($token)->load(['user', 'unit']));
    }

    public function accept(AcceptResidentInvitationRequest $request, string $token): ResidentInvitationResource
    {
        $validated = $request->validated();
        $invitation = $this->findByPlainToken($token);

        abort_if($invitation->status !== InvitationStatus::Pending, Response::HTTP_GONE, 'Invitation is no longer pending.');
        abort_if($invitation->revoked_at !== null, Response::HTTP_GONE, 'Invitation was revoked.');
        abort_if($invitation->expires_at->isPast(), Response::HTTP_GONE, 'Invitation expired.');

        DB::transaction(function () use ($invitation, $validated): void {
            $invitation->user->forceFill([
                'name' => $validated['name'],
                'phone' => $validated['phone'] ?? $invitation->user->phone,
                'password' => Hash::make($validated['password']),
                'status' => AccountStatus::Active->value,
                'email_verified_at' => now(),
            ])->save();

            $invitation->forceFill([
                'status' => InvitationStatus::Accepted->value,
                'accepted_at' => now(),
            ])->save();
        });

        $this->auditLogger->record('onboarding.resident_invitation_accepted', actor: $invitation->user, request: $request, metadata: [
            'invitation_id' => $invitation->id,
        ]);

        return ResidentInvitationResource::make($invitation->refresh()->load(['user', 'unit']));
    }

    public function revoke(Request $request, ResidentInvitation $residentInvitation): ResidentInvitationResource
    {
        abort_if($residentInvitation->status === InvitationStatus::Accepted, Response::HTTP_UNPROCESSABLE_ENTITY, 'Accepted invitations cannot be revoked.');

        $residentInvitation->forceFill([
            'status' => InvitationStatus::Revoked->value,
            'revoked_at' => now(),
        ])->save();

        $this->auditLogger->record('onboarding.resident_invitation_revoked', actor: $request->user(), request: $request, metadata: [
            'invitation_id' => $residentInvitation->id,
        ]);

        return ResidentInvitationResource::make($residentInvitation->refresh()->load(['user', 'unit']));
    }

    public function resend(Request $request, ResidentInvitation $residentInvitation): JsonResponse
    {
        abort_if($residentInvitation->status === InvitationStatus::Accepted, Response::HTTP_UNPROCESSABLE_ENTITY, 'Accepted invitations cannot be resent.');

        $plainToken = Str::random(48);
        $residentInvitation->forceFill([
            'token_hash' => hash('sha256', $plainToken),
            'status' => InvitationStatus::Pending->value,
            'expires_at' => now()->addDays(7),
            'revoked_at' => null,
        ])->save();

        $this->deliverInvitation($residentInvitation, $plainToken);

        $this->auditLogger->record('onboarding.resident_invitation_resent', actor: $request->user(), request: $request, metadata: [
            'invitation_id' => $residentInvitation->id,
            'email' => $residentInvitation->email,
        ]);

        return ResidentInvitationResource::make($residentInvitation->refresh()->load(['user', 'unit']))
            ->additional(['meta' => ['acceptUrl' => $this->acceptUrl($plainToken), 'token' => $plainToken]])
            ->response();
    }

    private function findByPlainToken(string $token): ResidentInvitation
    {
        return ResidentInvitation::query()
            ->where('token_hash', hash('sha256', $token))
            ->firstOrFail();
    }

    private function acceptUrl(string $token): string
    {
        return rtrim(config('app.admin_url', 'http://localhost:3000'), '/').'/invitations/'.$token;
    }

    private function deliverInvitation(ResidentInvitation $invitation, string $plainToken): void
    {
        $invitation->loadMissing(['user', 'unit.building.compound']);

        $compoundName = $invitation->unit?->building?->compound?->name ?? config('app.name', 'Compound Management');
        $invitation->user->notify(new ResidentInvitationNotification(
            acceptUrl: $this->acceptUrl($plainToken),
            compoundName: $compoundName,
            unitNumber: $invitation->unit?->unit_number,
            expiresAt: $invitation->expires_at,
        ));

        $invitation->forceFill(['last_sent_at' => now()])->save();
        $invitation->increment('delivery_count');
    }
}
