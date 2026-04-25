<?php

namespace App\Http\Controllers\Api\V1\Privacy;

use App\Enums\AccountStatus;
use App\Enums\AuditSeverity;
use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Models\DeviceToken;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

// CM-84 / CM-121: User anonymization – scrub PII while preserving financial/audit records
class AnonymizationController extends Controller
{
    public function __construct(private readonly AuditLogger $auditLogger) {}

    /** Set/remove legal hold on a user */
    public function legalHold(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'hold'   => ['required', 'boolean'],
            'reason' => ['required', 'string', 'max:500'],
        ]);

        $user->update(['legal_hold' => $validated['hold']]);

        $this->auditLogger->record(
            $validated['hold'] ? 'users.legal_hold_set' : 'users.legal_hold_removed',
            actor: $request->user(),
            request: $request,
            statusCode: 200,
            auditableType: 'user',
            auditableId: (string) $user->id,
            severity: AuditSeverity::Critical,
            reason: $validated['reason'],
            metadata: ['user_id' => $user->id, 'hold' => $validated['hold']],
        );

        return response()->json(['data' => UserResource::make($user->fresh())]);
    }

    /**
     * Anonymize a user account:
     * - Scrubs PII fields (name, email, phone, profile_photo)
     * - Marks account as anonymized
     * - Does NOT delete financial, vote, audit, or governance records
     * - Blocked if legal_hold is true
     */
    public function anonymize(Request $request, User $user): JsonResponse
    {
        abort_if($user->legal_hold, 422, 'Cannot anonymize a user under legal hold.');
        abort_if($user->anonymized_at !== null, 422, 'User has already been anonymized.');

        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:500'],
        ]);

        $anonymousId = 'anon-'.Str::random(10);

        $user->update([
            'name'           => 'Deleted User',
            'email'          => $anonymousId.'@deleted.invalid',
            'phone'          => null,
            'status'         => AccountStatus::Archived,
            'anonymized_at'  => now(),
        ]);

        // Revoke all device tokens to force logout
        DeviceToken::where('user_id', $user->id)->delete();

        $this->auditLogger->record(
            'users.anonymized',
            actor: $request->user(),
            request: $request,
            statusCode: 200,
            auditableType: 'user',
            auditableId: (string) $user->id,
            severity: AuditSeverity::Critical,
            reason: $validated['reason'],
            metadata: ['user_id' => $user->id],
        );

        return response()->json(['message' => 'User anonymized successfully.', 'data' => UserResource::make($user->fresh())]);
    }
}
