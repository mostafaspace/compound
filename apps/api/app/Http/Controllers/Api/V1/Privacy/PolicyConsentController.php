<?php

namespace App\Http\Controllers\Api\V1\Privacy;

use App\Http\Controllers\Controller;
use App\Models\Privacy\UserPolicyConsent;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// CM-84 / CM-121: Policy consent – accept, revoke, list
class PolicyConsentController extends Controller
{
    /** List the authenticated user's consents */
    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $consents = UserPolicyConsent::where('user_id', $user->id)
            ->orderByDesc('accepted_at')
            ->get();

        return response()->json(['data' => $consents]);
    }

    /** Accept a policy version */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'policyType' => ['required', 'string', 'in:privacy_policy,terms_of_service,data_processing'],
            'policyVersion' => ['required', 'string', 'max:20'],
        ]);

        /** @var User $user */
        $user = $request->user();

        // Revoke any previous active consent for this policy type
        UserPolicyConsent::where('user_id', $user->id)
            ->where('policy_type', $validated['policyType'])
            ->whereNull('revoked_at')
            ->update(['revoked_at' => now()]);

        $consent = UserPolicyConsent::create([
            'user_id' => $user->id,
            'policy_type' => $validated['policyType'],
            'policy_version' => $validated['policyVersion'],
            'accepted_at' => now(),
            'ip_address' => $request->ip(),
        ]);

        return response()->json(['data' => $consent], 201);
    }

    /** Admin: list all consents for a specific user */
    public function forUser(Request $request, int $userId): JsonResponse
    {
        $consents = UserPolicyConsent::where('user_id', $userId)
            ->orderByDesc('accepted_at')
            ->get();

        return response()->json(['data' => $consents]);
    }
}
