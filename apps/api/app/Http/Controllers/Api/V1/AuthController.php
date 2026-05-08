<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Resources\UserResource;
use App\Models\Property\Compound;
use App\Models\User;
use App\Support\AuditLogger;
use Database\Seeders\RbacSeeder;
use Database\Seeders\UatSeeder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    private const SELF_HEALING_UAT_EMAILS = [
        'super-admin@uat.compound.local',
        'compound-admin@uat.compound.local',
        'president@uat.compound.local',
        'board-member@uat.compound.local',
        'finance-reviewer@uat.compound.local',
        'support-agent@uat.compound.local',
        'resident@uat.compound.local',
        'resident-owner@uat.compound.local',
        'resident-tenant@uat.compound.local',
        'security-guard@uat.compound.local',
        'ahmed.hassan@uat.compound.local',
        'sara.mohamed@uat.compound.local',
        'omar.khalil@uat.compound.local',
        'nour.eldin@uat.compound.local',
        'fatima.ibrahim@uat.compound.local',
    ];

    public function __construct(private readonly AuditLogger $auditLogger) {}

    /**
     * @throws ValidationException
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $validated = $request->validated();

        /** @var User|null $user */
        $user = User::query()->where('email', $validated['email'])->first();

        if ($this->shouldSelfHealUatPersona($validated['email'], $user, $validated['password'])) {
            app(RbacSeeder::class)->run();
            app(UatSeeder::class)->run();

            /** @var User|null $user */
            $user = User::query()->where('email', $validated['email'])->first();
        }

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
                'user' => UserResource::make($user->refresh()->load(['roles', 'permissions', 'scopeAssignments'])),
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

    public function forgotPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email:rfc', 'max:255'],
        ]);

        $email = Str::lower($validated['email']);
        $resetToken = null;

        /** @var User|null $user */
        $user = User::query()->where('email', $email)->first();

        if ($user) {
            $resetToken = Str::random(64);

            DB::table('password_reset_tokens')->updateOrInsert(
                ['email' => $email],
                [
                    'token' => Hash::make($resetToken),
                    'created_at' => now(),
                ],
            );

            $this->auditLogger->record('auth.password_reset_requested', actor: $user, request: $request, statusCode: 200);
        } else {
            $this->auditLogger->record('auth.password_reset_requested_unknown_email', request: $request, statusCode: 200, metadata: [
                'email' => $email,
            ]);
        }

        return response()->json([
            'data' => [
                'status' => $user ? 'reset_available' : 'reset_requested',
                'message' => 'If this email exists, password reset instructions are available.',
            ],
            'meta' => app()->environment('production') || ! $resetToken ? (object) [] : [
                'resetToken' => $resetToken,
            ],
        ]);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email:rfc', 'max:255'],
            'token' => ['required', 'string', 'max:255'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $email = Str::lower($validated['email']);
        $record = DB::table('password_reset_tokens')->where('email', $email)->first();

        abort_unless($record && Hash::check($validated['token'], $record->token), 422, 'The password reset token is invalid.');
        abort_if($record->created_at && Carbon::parse($record->created_at)->lt(now()->subHours(2)), 422, 'The password reset token has expired.');

        /** @var User $user */
        $user = User::query()->where('email', $email)->firstOrFail();
        $user->forceFill([
            'password' => Hash::make($validated['password']),
            'status' => AccountStatus::Active->value,
        ])->save();

        DB::table('password_reset_tokens')->where('email', $email)->delete();

        $this->auditLogger->record('auth.password_reset_completed', actor: $user, request: $request, statusCode: 200);

        return response()->json([
            'data' => [
                'status' => 'password_reset',
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

        return $this->abilitiesForRole($this->effectiveAbilityRoleForUser($user));
    }

    private function effectiveAbilityRoleForUser(User $user): UserRole
    {
        return match (true) {
            $user->isEffectiveSuperAdmin() => UserRole::SuperAdmin,
            $user->hasEffectiveRole(UserRole::CompoundAdmin) => UserRole::CompoundAdmin,
            $user->hasEffectiveRole(UserRole::President) => UserRole::President,
            $user->hasEffectiveRole(UserRole::BoardMember) => UserRole::BoardMember,
            $user->hasEffectiveRole(UserRole::FinanceReviewer) => UserRole::FinanceReviewer,
            $user->hasEffectiveRole(UserRole::SupportAgent) => UserRole::SupportAgent,
            $user->hasEffectiveRole(UserRole::SecurityGuard) => UserRole::SecurityGuard,
            $user->hasEffectiveRole(UserRole::ResidentOwner) => UserRole::ResidentOwner,
            $user->hasEffectiveRole(UserRole::ResidentTenant) => UserRole::ResidentTenant,
            $user->hasEffectiveRole(UserRole::Resident) => UserRole::Resident,
            default => $user->role ?? UserRole::Resident,
        };
    }

    /**
     * @return array<int, string>
     */
    private function abilitiesForRole(UserRole $role): array
    {
        return match ($role) {
            UserRole::SuperAdmin => ['*'],
            UserRole::CompoundAdmin => ['admin:*', 'property:*', 'resident:*', 'finance:read'],
            UserRole::President => ['property:read', 'governance:*', 'finance:read', 'resident:read', 'issues:*'],
            UserRole::BoardMember => ['property:read', 'governance:*', 'finance:read'],
            UserRole::FinanceReviewer => ['property:read', 'finance:*'],
            UserRole::SupportAgent => ['property:read', 'resident:read', 'support:*'],
            UserRole::SecurityGuard => ['property:read', 'visitor:*', 'security:*'],
            UserRole::ResidentOwner, UserRole::ResidentTenant => ['resident:self'],
            UserRole::Resident => ['resident:self'],
        };
    }

    private function shouldSelfHealUatPersona(string $email, ?User $user, string $password): bool
    {
        if (app()->environment('production')) {
            return false;
        }

        if (! in_array($email, self::SELF_HEALING_UAT_EMAILS, strict: true)) {
            return false;
        }

        if (! $user || ! Hash::check($password, $user->password)) {
            return true;
        }

        if (in_array($email, ['super-admin@uat.compound.local', 'support-agent@uat.compound.local'], strict: true)) {
            return $user->compound_id !== null;
        }

        $nextPointId = Compound::query()->where('code', 'NEXT-POINT')->value('id');

        return $nextPointId !== null && $user->compound_id !== $nextPointId;
    }
}
