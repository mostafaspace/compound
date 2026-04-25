<?php

namespace App\Services;

use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Storage;
use Throwable;

class OperationalStatusService
{
    /**
     * @return array<string, mixed>
     */
    public function publicStatus(): array
    {
        return [
            'service' => 'compound-api',
            'status' => 'ok',
            'environment' => app()->environment(),
            'timezone' => config('app.timezone'),
            'appVersion' => app()->version(),
            'timestamp' => now()->toIso8601String(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function operatorStatus(): array
    {
        $checks = [
            'database' => $this->databaseCheck(),
            'redis' => $this->redisCheck(),
            'queue' => $this->queueCheck(),
            'storage' => $this->storageCheck(),
            'broadcasting' => $this->broadcastingCheck(),
            'notifications' => $this->notificationsCheck(),
            'scheduledJobs' => $this->scheduledJobsCheck(),
        ];

        $warnings = [];

        if (($checks['queue']['failedJobs'] ?? 0) > 0) {
            $warnings[] = 'Queue has failed jobs that need operator review.';
        }

        if (config('app.debug')) {
            $warnings[] = 'APP_DEBUG is enabled.';
        }

        if (($checks['notifications']['status'] ?? 'ok') === 'degraded') {
            $warnings[] = 'Notification channels are degraded.';
        }

        if (($checks['scheduledJobs']['status'] ?? 'ok') === 'degraded') {
            $warnings[] = 'Scheduled jobs are not configured or not runnable.';
        }

        return [
            ...$this->publicStatus(),
            'status' => $this->overallStatus($checks),
            'checks' => $checks,
            'warnings' => $warnings,
        ];
    }

    /**
     * @param  array<string, array<string, mixed>>  $checks
     */
    private function overallStatus(array $checks): string
    {
        foreach (['database', 'redis', 'queue', 'storage'] as $key) {
            if (($checks[$key]['status'] ?? 'degraded') !== 'ok') {
                return 'degraded';
            }
        }

        return 'ok';
    }

    /**
     * @return array<string, mixed>
     */
    private function databaseCheck(): array
    {
        $startedAt = hrtime(true);
        $driver = config('database.default');

        try {
            DB::connection()->select('select 1');

            return [
                'status' => 'ok',
                'driver' => $driver,
                'latencyMs' => $this->elapsedMilliseconds($startedAt),
            ];
        } catch (Throwable $exception) {
            return [
                'status' => 'degraded',
                'driver' => $driver,
                'latencyMs' => $this->elapsedMilliseconds($startedAt),
                'message' => $this->exceptionMessage($exception),
            ];
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function redisCheck(): array
    {
        $startedAt = hrtime(true);

        try {
            Redis::connection()->ping();

            return [
                'status' => 'ok',
                'client' => config('database.redis.client'),
                'latencyMs' => $this->elapsedMilliseconds($startedAt),
            ];
        } catch (Throwable $exception) {
            return [
                'status' => 'degraded',
                'client' => config('database.redis.client'),
                'latencyMs' => $this->elapsedMilliseconds($startedAt),
                'message' => $this->exceptionMessage($exception),
            ];
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function queueCheck(): array
    {
        $startedAt = hrtime(true);

        try {
            $failedJobs = DB::table('failed_jobs')->count();

            return [
                'status' => $failedJobs > 0 ? 'degraded' : 'ok',
                'connection' => config('queue.default'),
                'failedJobs' => $failedJobs,
                'latencyMs' => $this->elapsedMilliseconds($startedAt),
            ];
        } catch (Throwable $exception) {
            return [
                'status' => 'degraded',
                'connection' => config('queue.default'),
                'failedJobs' => null,
                'latencyMs' => $this->elapsedMilliseconds($startedAt),
                'message' => $this->exceptionMessage($exception),
            ];
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function storageCheck(): array
    {
        $startedAt = hrtime(true);
        $disk = config('filesystems.default');

        try {
            Storage::disk($disk)->exists('.compound-healthcheck');

            return [
                'status' => 'ok',
                'disk' => $disk,
                'driver' => config("filesystems.disks.$disk.driver"),
                'latencyMs' => $this->elapsedMilliseconds($startedAt),
            ];
        } catch (Throwable $exception) {
            return [
                'status' => 'degraded',
                'disk' => $disk,
                'driver' => config("filesystems.disks.$disk.driver"),
                'latencyMs' => $this->elapsedMilliseconds($startedAt),
                'message' => $this->exceptionMessage($exception),
            ];
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function broadcastingCheck(): array
    {
        $connection = config('broadcasting.default');
        $config = config("broadcasting.connections.$connection", []);

        return [
            'status' => $connection && $connection !== 'null' ? 'configured' : 'not_configured',
            'connection' => $connection,
            'driver' => $config['driver'] ?? null,
            'host' => $config['options']['host'] ?? null,
            'port' => $config['options']['port'] ?? null,
        ];
    }

    /**
     * Check notification channel configuration.
     *
     * @return array<string, mixed>
     */
    private function notificationsCheck(): array
    {
        $startedAt = hrtime(true);

        try {
            $mailConfig = config('mail.default');
            $mailHost = config('mail.mailers.smtp.host');
            $mailPort = config('mail.mailers.smtp.port');

            $channels = [];
            $hasError = false;

            // Check mail configuration.
            if ($mailConfig && $mailConfig !== 'array' && $mailHost) {
                $channels['mail'] = [
                    'configured' => true,
                    'host' => $mailHost,
                    'port' => $mailPort,
                ];
            } else {
                $channels['mail'] = ['configured' => false];
                $hasError = true;
            }

            // Check broadcast channel (used for realtime notifications).
            $broadcastDriver = config('broadcasting.default');
            $channels['broadcast'] = [
                'configured' => $broadcastDriver && $broadcastDriver !== 'null',
                'driver' => $broadcastDriver,
            ];

            // Check database notifications table exists.
            $hasNotificationsTable = false;
            try {
                $hasNotificationsTable = DB::select('SHOW TABLES LIKE "notifications"')[0] !== null;
            } catch (Throwable) {
                // Table check failed - ignore, not critical.
            }

            $channels['database'] = ['configured' => $hasNotificationsTable];

            return [
                'status' => $hasError ? 'degraded' : 'ok',
                'channels' => $channels,
                'latencyMs' => $this->elapsedMilliseconds($startedAt),
            ];
        } catch (Throwable $exception) {
            return [
                'status' => 'degraded',
                'latencyMs' => $this->elapsedMilliseconds($startedAt),
                'message' => $this->exceptionMessage($exception),
            ];
        }
    }

    /**
     * Check that scheduled jobs are configured and runnable.
     *
     * @return array<string, mixed>
     */
    private function scheduledJobsCheck(): array
    {
        $startedAt = hrtime(true);

        try {
            // Verify the schedule:list command is runnable.
            $exitCode = null;
            try {
                Artisan::call('schedule:list');
                $exitCode = 0;
            } catch (Throwable) {
                $exitCode = 1;
            }

            return [
                'status' => $exitCode === 0 ? 'ok' : 'degraded',
                'configurable' => true,
                'latencyMs' => $this->elapsedMilliseconds($startedAt),
            ];
        } catch (Throwable $exception) {
            return [
                'status' => 'degraded',
                'latencyMs' => $this->elapsedMilliseconds($startedAt),
                'message' => $this->exceptionMessage($exception),
            ];
        }
    }

    private function elapsedMilliseconds(int $startedAt): int
    {
        return (int) round((hrtime(true) - $startedAt) / 1_000_000);
    }

    private function exceptionMessage(Throwable $exception): string
    {
        return mb_substr($exception->getMessage(), 0, 160);
    }
}
