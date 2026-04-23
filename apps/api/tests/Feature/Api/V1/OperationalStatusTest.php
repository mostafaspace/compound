<?php

namespace Tests\Feature\Api\V1;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OperationalStatusTest extends TestCase
{
    use RefreshDatabase;

    public function test_authorized_operator_can_view_ops_status(): void
    {
        DB::table('failed_jobs')->delete();
        config(['filesystems.default' => 'local']);
        Storage::fake('local');

        $admin = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'status' => AccountStatus::Active->value,
        ]);

        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/v1/system/ops-status');

        $response
            ->assertOk()
            ->assertJsonPath('data.service', 'compound-api')
            ->assertJsonPath('data.environment', app()->environment())
            ->assertJsonPath('data.status', 'ok')
            ->assertJsonStructure([
                'data' => [
                    'service',
                    'status',
                    'environment',
                    'timezone',
                    'appVersion',
                    'timestamp',
                    'checks' => [
                        'database' => ['status', 'driver', 'latencyMs'],
                        'redis' => ['status', 'client', 'latencyMs'],
                        'queue' => ['status', 'connection', 'failedJobs', 'latencyMs'],
                        'storage' => ['status', 'disk', 'driver', 'latencyMs'],
                        'broadcasting' => ['status', 'connection', 'driver'],
                    ],
                    'warnings',
                ],
            ]);

        $this->assertDatabaseHas('audit_logs', [
            'actor_id' => $admin->id,
            'action' => 'system.ops_status_viewed',
            'status_code' => 200,
        ]);
    }

    public function test_queue_failures_mark_ops_status_as_degraded(): void
    {
        config(['filesystems.default' => 'local']);
        Storage::fake('local');

        $supportAgent = User::factory()->create([
            'role' => UserRole::SupportAgent->value,
            'status' => AccountStatus::Active->value,
        ]);

        DB::table('failed_jobs')->insert([
            'uuid' => (string) str()->uuid(),
            'connection' => 'redis',
            'queue' => 'default',
            'payload' => '{"job":"Example"}',
            'exception' => 'Example exception',
            'failed_at' => now(),
        ]);

        Sanctum::actingAs($supportAgent);

        $response = $this->getJson('/api/v1/system/ops-status');

        $response
            ->assertOk()
            ->assertJsonPath('data.status', 'degraded')
            ->assertJsonPath('data.checks.queue.status', 'degraded')
            ->assertJsonPath('data.checks.queue.failedJobs', 1);

        $this->assertContains(
            'Queue has failed jobs that need operator review.',
            $response->json('data.warnings', []),
        );
    }

    public function test_resident_cannot_view_ops_status(): void
    {
        $resident = User::factory()->create([
            'role' => UserRole::ResidentOwner->value,
            'status' => AccountStatus::Active->value,
        ]);

        Sanctum::actingAs($resident);

        $this->getJson('/api/v1/system/ops-status')->assertForbidden();
    }
}
