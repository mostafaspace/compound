<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function __construct(private readonly AuditLogger $auditLogger) {}

    /**
     * @throws ValidationException
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $validated = $request->validated();

        /** @var User|null $user */
        $user = User::query()->where('email', $validated['email'])->first();

        if (! $user || ! Hash::check($validated['password'], $user->password)) {
            $this->auditLogger->record('auth.login_failed', request: $request, statusCode: 422, metadata: [
                'email' => $validated['email'],
            ]);

            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        if (! in_array($user->status, [AccountStatus::Active, AccountStatus::PendingReview], strict: true)) {
            $this->auditLogger->record('auth.login_blocked', actor: $user, request: $request, statusCode: 403);

            abort(403, 'Account is not active.');
        }

        $user->forceFill(['last_login_at' => now()])->save();

        $token = $user->createToken(
            name: $validated['deviceName'],
            abilities: $this->abilitiesForUser($user),
        )->plainTextToken;

        $this->auditLogger->record('auth.login_succeeded', actor: $user, request: $request, statusCode: 200);

        return response()->json([
            'data' => [
                'token' => $token,
                'tokenType' => 'Bearer',
                'user' => UserResource::make($user->refresh()),
            ],
        ]);
    }

    public function me(Request $request): UserResource
    {
        $user = $request->user()->load(['roles', 'permissions', 'scopeAssignments']);
        return UserResource::make($user);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()?->currentAccessToken()?->delete();

        $this->auditLogger->record('auth.logout', actor: $request->user(), request: $request, statusCode: 200);

        return response()->json([
            'data' => [
                'status' => 'ok',
            ],
        ]);
    }

    /**
     * @return array<int, string>
     */
    private function abilitiesForUser(User $user): array
    {
        if ($user->status === AccountStatus::PendingReview) {
            return ['verification:self'];
        }

        return $this->abilitiesForRole($user->role);
    }

    /**
     * @return array<int, string>
     */
    private function abilitiesForRole(UserRole $role): array
    {
        return match ($role) {
            UserRole::SuperAdmin => ['*'],
            UserRole::CompoundAdmin => ['admin:*', 'property:*', 'resident:*', 'finance:read'],
            UserRole::BoardMember => ['property:read', 'governance:*', 'finance:read'],
            UserRole::FinanceReviewer => ['property:read', 'finance:*'],
            UserRole::SupportAgent => ['property:read', 'resident:read', 'support:*'],
            UserRole::SecurityGuard => ['property:read', 'visitor:*', 'security:*'],
            UserRole::ResidentOwner, UserRole::ResidentTenant => ['resident:self'],
        };
    }
}
