<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Property\Compound;
use App\Models\User;
use App\Services\OperationalStatusService;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * Launch readiness health check (CM-127).
 *
 * Extends the standard operational-status checks with launch-specific
 * gate checks: seed data presence, audit log health, compound config,
 * and notification channel configuration.
 *
 * Only accessible to super_admin.
 */
class LaunchReadinessController extends Controller
{
    public function __construct(
        private readonly OperationalStatusService $ops,
        private readonly AuditLogger $auditLogger,
    ) {}

    public function __invoke(Request $request): JsonResponse
    {
        $ops     = $this->ops->operatorStatus();
        $launch  = $this->launchChecks();

        $allOk = $ops['status'] === 'ok'
            && collect($launch)->every(fn ($c) => ($c['status'] ?? 'fail') === 'pass');

        $overall = $allOk ? 'ready' : 'not_ready';

        $this->auditLogger->record(
            action: 'system.launch_readiness_checked',
            actor: $request->user(),
            request: $request,
            statusCode: 200,
            metadata: ['overall' => $overall],
        );

        return response()->json([
            'data' => [
                'overall'      => $overall,
                'timestamp'    => now()->toIso8601String(),
                'environment'  => app()->environment(),
                'infrastructure' => $ops['checks'],
                'launch'         => $launch,
                'warnings'       => array_merge(
                    $ops['warnings'] ?? [],
                    $this->launchWarnings($launch),
                ),
            ],
        ]);
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    private function launchChecks(): array
    {
        return [
            'seed_data'          => $this->seedDataCheck(),
            'audit_log'          => $this->auditLogCheck(),
            'compounds'          => $this->compoundsCheck(),
            'notification_config' => $this->notificationConfigCheck(),
            'privacy_config'     => $this->privacyConfigCheck(),
            'debug_mode'         => $this->debugModeCheck(),
            'scheduled_jobs'     => $this->scheduledJobsCheck(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function seedDataCheck(): array
    {
        try {
            $superAdminCount  = $this->countUsersForEffectiveRole('super_admin');
            $compoundAdminCount = $this->countUsersForEffectiveRole('compound_admin');
            $hasUatAccounts   = User::query()->where('email', 'like', '%@uat.compound.local')->exists();

            return [
                'status'            => $superAdminCount > 0 ? 'pass' : 'fail',
                'superAdmins'       => $superAdminCount,
                'compoundAdmins'    => $compoundAdminCount,
                'hasUatPersonas'    => $hasUatAccounts,
            ];
        } catch (Throwable $e) {
            return ['status' => 'fail', 'message' => mb_substr($e->getMessage(), 0, 160)];
        }
    }

    private function countUsersForEffectiveRole(string $role): int
    {
        $effectiveRoleNames = match ($role) {
            'compound_admin' => ['compound_admin', 'compound_head'],
            default => [$role],
        };

        return User::query()
            ->where(function ($query) use ($role, $effectiveRoleNames): void {
                $query
                    ->whereHas('roles', fn ($assignedRoles) => $assignedRoles->whereIn('name', $effectiveRoleNames))
                    ->orWhere(function ($legacyFallback) use ($role): void {
                        $legacyFallback
                            ->whereDoesntHave('roles')
                            ->where('role', $role);
                    });
            })
            ->count();
    }

    /**
     * @return array<string, mixed>
     */
    private function auditLogCheck(): array
    {
        try {
            $total   = AuditLog::query()->count();
            $recent  = AuditLog::query()
                ->where('created_at', '>=', now()->subDays(1))
                ->count();

            return [
                'status'      => 'pass',
                'totalLogs'   => $total,
                'last24Hours' => $recent,
            ];
        } catch (Throwable $e) {
            return ['status' => 'fail', 'message' => mb_substr($e->getMessage(), 0, 160)];
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function compoundsCheck(): array
    {
        try {
            $total  = Compound::query()->count();
            $active = Compound::query()->where('status', 'active')->count();

            return [
                'status'  => $total > 0 ? 'pass' : 'fail',
                'total'   => $total,
                'active'  => $active,
            ];
        } catch (Throwable $e) {
            return ['status' => 'fail', 'message' => mb_substr($e->getMessage(), 0, 160)];
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function notificationConfigCheck(): array
    {
        $emailDriver = config('mail.default', 'log');
        $smsDriver   = config('services.sms.driver', null);

        return [
            'status'     => $emailDriver !== 'log' ? 'pass' : 'warn',
            'emailDriver' => $emailDriver,
            'smsDriver'   => $smsDriver ?? 'not_configured',
            'note'        => $emailDriver === 'log'
                ? 'Email driver is set to log — configure SMTP/SES for production.'
                : null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function privacyConfigCheck(): array
    {
        try {
            $legalHoldCount  = DB::table('users')->where('legal_hold', true)->count();
            $consentCount    = DB::table('user_policy_consents')
                ->whereNull('revoked_at')
                ->count();

            return [
                'status'           => 'pass',
                'activeLegalHolds' => $legalHoldCount,
                'activeConsents'   => $consentCount,
            ];
        } catch (Throwable $e) {
            return ['status' => 'fail', 'message' => mb_substr($e->getMessage(), 0, 160)];
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function debugModeCheck(): array
    {
        $debug = (bool) config('app.debug');

        return [
            'status' => $debug ? 'fail' : 'pass',
            'debug'  => $debug,
            'note'   => $debug ? 'APP_DEBUG must be false in production.' : null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function scheduledJobsCheck(): array
    {
        try {
            $failedJobCount = DB::table('failed_jobs')->count();
            $hasScheduler   = file_exists(base_path('artisan'));

            return [
                'status'         => $failedJobCount === 0 ? 'pass' : 'warn',
                'failedJobs'     => $failedJobCount,
                'schedulerReady' => $hasScheduler,
            ];
        } catch (Throwable $e) {
            return ['status' => 'fail', 'message' => mb_substr($e->getMessage(), 0, 160)];
        }
    }

    /**
     * @param  array<string, array<string, mixed>>  $checks
     * @return string[]
     */
    private function launchWarnings(array $checks): array
    {
        $warnings = [];

        foreach ($checks as $name => $check) {
            if (($check['status'] ?? '') === 'warn' && isset($check['note'])) {
                $warnings[] = "[{$name}] {$check['note']}";
            } elseif (($check['status'] ?? '') === 'fail') {
                $msg = $check['message'] ?? 'Check failed.';
                $warnings[] = "[{$name}] {$msg}";
            }
        }

        return $warnings;
    }
}
