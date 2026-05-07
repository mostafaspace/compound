<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\AccountStatus;
use App\Enums\AuditSeverity;
use App\Enums\VerificationStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\Apartments\ApartmentResident;
use App\Models\User;
use App\Services\CompoundContextService;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserLifecycleController extends Controller
{
    public function __construct(
        private readonly AuditLogger $auditLogger,
        private readonly CompoundContextService $context,
    ) {}

    /**
     * Suspend a user account.
     */
    public function suspend(Request $request, User $user): JsonResponse
    {
        $this->ensureLifecycleAccess($request, $user);

        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:500'],
        ]);

        if ($user->isEffectiveSuperAdmin()) {
            abort(422, 'Super-admin accounts cannot be suspended.');
        }

        if ($user->status === AccountStatus::Suspended) {
            abort(422, 'User is already suspended.');
        }

        $user->update(['status' => AccountStatus::Suspended]);

        $this->auditLogger->record(
            'users.suspended',
            actor: $request->user(),
            request: $request,
            statusCode: 200,
            auditableType: 'user',
            auditableId: (string) $user->id,
            severity: AuditSeverity::Critical,
            reason: $validated['reason'],
            metadata: ['user_id' => $user->id, 'previous_status' => AccountStatus::Active->value],
        );

        return response()->json(['message' => 'User suspended.', 'user' => UserResource::make($user->fresh()->loadAuthorizationSnapshot())]);
    }

    /**
     * Reactivate a suspended or archived user.
     */
    public function reactivate(Request $request, User $user): JsonResponse
    {
        $this->ensureLifecycleAccess($request, $user);

        $validated = $request->validate([
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        if ($user->status === AccountStatus::Active) {
            abort(422, 'User is already active.');
        }

        $user->update(['status' => AccountStatus::Active]);

        $this->auditLogger->record(
            'users.reactivated',
            actor: $request->user(),
            request: $request,
            statusCode: 200,
            auditableType: 'user',
            auditableId: (string) $user->id,
            severity: AuditSeverity::Warning,
            reason: $validated['reason'] ?? null,
            metadata: ['user_id' => $user->id],
        );

        return response()->json(['message' => 'User reactivated.', 'user' => UserResource::make($user->fresh()->loadAuthorizationSnapshot())]);
    }

    /**
     * Move out a user: end all active unit memberships and optionally archive the account.
     */
    public function moveOut(Request $request, User $user): JsonResponse
    {
        $this->ensureLifecycleAccess($request, $user);

        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:500'],
            'effective_date' => ['nullable', 'date'],
            'archive_account' => ['nullable', 'boolean'],
        ]);

        $effectiveDate = $validated['effective_date'] ?? now()->toDateString();

        // End all currently-active memberships
        $endedCount = ApartmentResident::query()
            ->where('user_id', $user->id)
            ->active()
            ->update([
                'ends_at' => $effectiveDate,
                'verification_status' => VerificationStatus::Expired->value,
            ]);

        if ($validated['archive_account'] ?? false) {
            $user->update(['status' => AccountStatus::Archived]);
        }

        $this->auditLogger->record(
            'users.moved_out',
            actor: $request->user(),
            request: $request,
            statusCode: 200,
            auditableType: 'user',
            auditableId: (string) $user->id,
            severity: AuditSeverity::Warning,
            reason: $validated['reason'],
            metadata: [
                'user_id' => $user->id,
                'memberships_ended' => $endedCount,
                'effective_date' => $effectiveDate,
                'account_archived' => $validated['archive_account'] ?? false,
            ],
        );

        return response()->json([
            'message' => 'Move-out processed.',
            'memberships_ended' => $endedCount,
            'user' => UserResource::make($user->fresh()->loadAuthorizationSnapshot()),
        ]);
    }

    /**
     * Recover an account: reactivate + optionally update contact details.
     */
    public function recover(Request $request, User $user): JsonResponse
    {
        $this->ensureLifecycleAccess($request, $user);

        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:500'],
            'name' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255', 'unique:users,email,'.$user->id],
            'phone' => ['nullable', 'string', 'max:30', 'unique:users,phone,'.$user->id],
        ]);

        $updates = array_filter([
            'status' => AccountStatus::Active,
            'name' => $validated['name'] ?? null,
            'email' => $validated['email'] ?? null,
            'phone' => $validated['phone'] ?? null,
        ], fn ($v) => $v !== null);

        $user->update($updates);

        $this->auditLogger->record(
            'users.recovered',
            actor: $request->user(),
            request: $request,
            statusCode: 200,
            auditableType: 'user',
            auditableId: (string) $user->id,
            severity: AuditSeverity::Warning,
            reason: $validated['reason'],
            metadata: [
                'user_id' => $user->id,
                'fields_updated' => array_keys($updates),
            ],
        );

        return response()->json(['message' => 'Account recovered.', 'user' => UserResource::make($user->fresh()->loadAuthorizationSnapshot())]);
    }

    /**
     * Ensure the acting user can manage the lifecycle of the target user.
     */
    private function ensureLifecycleAccess(Request $request, User $user): void
    {
        $this->context->ensureUserAccess($request, $user);
    }
}
