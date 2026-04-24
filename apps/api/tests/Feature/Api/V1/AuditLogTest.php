<?php

namespace Tests\Feature\Api\V1;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Models\AuditLog;
use App\Models\Property\Compound;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AuditLogTest extends TestCase
{
    use RefreshDatabase;

    public function test_authorized_admin_can_filter_audit_logs(): void
    {
        $admin = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'status' => AccountStatus::Active->value,
        ]);
        $actor = User::factory()->create([
            'role' => UserRole::SupportAgent->value,
            'status' => AccountStatus::Active->value,
        ]);

        AuditLog::query()->create([
            'actor_id' => $actor->id,
            'action' => 'documents.user_document_reviewed',
            'auditable_type' => 'user_document',
            'auditable_id' => '12',
            'ip_address' => '127.0.0.1',
            'method' => 'PATCH',
            'path' => 'api/v1/documents/12/review',
            'status_code' => 200,
            'metadata' => ['status' => 'approved'],
        ]);
        AuditLog::query()->create([
            'actor_id' => null,
            'action' => 'auth.login_failed',
            'ip_address' => '127.0.0.2',
            'method' => 'POST',
            'path' => 'api/v1/auth/login',
            'status_code' => 422,
            'metadata' => ['email' => 'blocked@example.com'],
        ]);

        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/audit-logs?action=documents.user_document_reviewed&method=PATCH')
            ->assertOk()
            ->assertJsonPath('data.0.action', 'documents.user_document_reviewed')
            ->assertJsonPath('data.0.actor.id', $actor->id)
            ->assertJsonPath('data.0.metadata.status', 'approved')
            ->assertJsonCount(1, 'data');
    }

    public function test_residents_cannot_view_audit_logs(): void
    {
        $resident = User::factory()->create([
            'role' => UserRole::ResidentOwner->value,
            'status' => AccountStatus::Active->value,
        ]);

        Sanctum::actingAs($resident);

        $this->getJson('/api/v1/audit-logs')->assertForbidden();
    }

    public function test_scoped_admin_only_sees_audit_logs_for_own_compound(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();
        $adminA = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => $compoundA->id,
            'status' => AccountStatus::Active->value,
        ]);
        $actorA = User::factory()->create([
            'role' => UserRole::SupportAgent->value,
            'compound_id' => $compoundA->id,
            'status' => AccountStatus::Active->value,
        ]);
        $actorB = User::factory()->create([
            'role' => UserRole::SupportAgent->value,
            'compound_id' => $compoundB->id,
            'status' => AccountStatus::Active->value,
        ]);

        AuditLog::query()->create([
            'actor_id' => $actorA->id,
            'action' => 'own.actor',
            'method' => 'PATCH',
            'path' => 'api/v1/own',
            'status_code' => 200,
            'metadata' => [],
        ]);
        AuditLog::query()->create([
            'actor_id' => $actorB->id,
            'action' => 'foreign.actor',
            'method' => 'PATCH',
            'path' => 'api/v1/foreign',
            'status_code' => 200,
            'metadata' => [],
        ]);
        AuditLog::query()->create([
            'actor_id' => null,
            'action' => 'own.metadata',
            'method' => 'POST',
            'path' => 'api/v1/own-metadata',
            'status_code' => 201,
            'metadata' => ['compound_id' => $compoundA->id],
        ]);
        AuditLog::query()->create([
            'actor_id' => null,
            'action' => 'foreign.metadata',
            'method' => 'POST',
            'path' => 'api/v1/foreign-metadata',
            'status_code' => 201,
            'metadata' => ['compound_id' => $compoundB->id],
        ]);

        Sanctum::actingAs($adminA);

        $response = $this->getJson('/api/v1/audit-logs')->assertOk();

        $this->assertEqualsCanonicalizing(
            ['own.actor', 'own.metadata'],
            collect($response->json('data'))->pluck('action')->all(),
        );
    }
}
