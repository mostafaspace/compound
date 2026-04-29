<?php

namespace Tests\Feature\Api\V1;

use App\Enums\AccountStatus;
use App\Enums\AuditSeverity;
use App\Enums\UserRole;
use App\Models\AuditLog;
use App\Models\Property\Building;
use App\Models\Property\Compound;
use App\Models\Property\Unit;
use App\Models\Property\UnitMembership;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

// CM-103: Audit report APIs, investigation timelines, exports, retention guards
class AuditReportingTest extends TestCase
{
    use RefreshDatabase;

    private function makeAdmin(array $attrs = []): User
    {
        return User::factory()->create(array_merge([
            'role'   => UserRole::SuperAdmin->value,
            'status' => AccountStatus::Active->value,
        ], $attrs));
    }

    private function makeLog(array $attrs = []): AuditLog
    {
        return AuditLog::query()->create(array_merge([
            'action'      => 'test.action',
            'method'      => 'PATCH',
            'path'        => 'api/v1/test',
            'status_code' => 200,
            'metadata'    => [],
        ], $attrs));
    }

    private function makeMembershipScopedResident(Compound $compound): User
    {
        $building = Building::factory()->for($compound)->create();
        $unit = Unit::factory()->for($compound)->for($building)->create(['floor_id' => null]);
        $resident = User::factory()->create([
            'role' => UserRole::ResidentOwner->value,
            'compound_id' => null,
            'status' => AccountStatus::Active->value,
        ]);

        UnitMembership::factory()->create([
            'user_id' => $resident->id,
            'unit_id' => $unit->id,
        ]);

        return $resident;
    }

    // --- Severity & Reason filtering ---

    public function test_index_filters_by_severity(): void
    {
        $admin = $this->makeAdmin();

        $this->makeLog(['action' => 'settings.updated', 'severity' => AuditSeverity::Warning]);
        $this->makeLog(['action' => 'role.assigned',    'severity' => AuditSeverity::Critical]);
        $this->makeLog(['action' => 'document.viewed',  'severity' => AuditSeverity::Info]);

        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/audit-logs?severity=warning')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.action', 'settings.updated')
            ->assertJsonPath('data.0.severity', 'warning');
    }

    public function test_index_filters_by_module_prefix(): void
    {
        $admin = $this->makeAdmin();

        $this->makeLog(['action' => 'finance.payment_submitted']);
        $this->makeLog(['action' => 'finance.charge_created']);
        $this->makeLog(['action' => 'documents.reviewed']);

        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/audit-logs?module=finance')
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_index_filters_by_auditable_type_and_id(): void
    {
        $admin = $this->makeAdmin();

        $this->makeLog([
            'action'         => 'documents.reviewed',
            'auditable_type' => 'user_document',
            'auditable_id'   => '42',
        ]);
        $this->makeLog([
            'action'         => 'documents.uploaded',
            'auditable_type' => 'user_document',
            'auditable_id'   => '99',
        ]);

        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/audit-logs?auditableType=user_document&auditableId=42')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.auditableId', '42');
    }

    public function test_audit_log_resource_includes_severity_and_reason(): void
    {
        $admin = $this->makeAdmin();

        $this->makeLog([
            'action'   => 'admin.account_suspended',
            'severity' => AuditSeverity::Critical,
            'reason'   => 'Repeated payment failures',
        ]);

        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/audit-logs')
            ->assertOk()
            ->assertJsonPath('data.0.severity', 'critical')
            ->assertJsonPath('data.0.reason', 'Repeated payment failures');
    }

    public function test_q_search_matches_reason_field(): void
    {
        $admin = $this->makeAdmin();

        $this->makeLog(['action' => 'finance.refund_issued', 'reason' => 'resident billing dispute']);
        $this->makeLog(['action' => 'settings.updated',     'reason' => null]);

        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/audit-logs?q=billing+dispute')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.action', 'finance.refund_issued');
    }

    // --- Investigation timeline ---

    public function test_timeline_returns_chronological_events_for_entity(): void
    {
        $admin = $this->makeAdmin();

        // Three events for document #7
        $this->makeLog([
            'action'         => 'documents.uploaded',
            'auditable_type' => 'user_document',
            'auditable_id'   => '7',
            'created_at'     => now()->subHours(3),
        ]);
        $this->makeLog([
            'action'         => 'documents.reviewed',
            'auditable_type' => 'user_document',
            'auditable_id'   => '7',
            'created_at'     => now()->subHours(1),
        ]);

        // Unrelated event
        $this->makeLog([
            'action'         => 'documents.uploaded',
            'auditable_type' => 'user_document',
            'auditable_id'   => '99',
        ]);

        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/v1/audit-logs/timeline?entity_type=user_document&entity_id=7')
            ->assertOk()
            ->assertJsonCount(2, 'data');

        $actions = collect($response->json('data'))->pluck('action')->all();
        $this->assertSame(['documents.uploaded', 'documents.reviewed'], $actions);
    }

    public function test_timeline_requires_entity_type_and_id(): void
    {
        $admin = $this->makeAdmin();

        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/audit-logs/timeline')
            ->assertUnprocessable();

        $this->getJson('/api/v1/audit-logs/timeline?entity_type=user_document')
            ->assertUnprocessable();
    }

    public function test_scoped_admin_cannot_see_foreign_entity_timeline(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();

        $adminA = User::factory()->create([
            'role'        => UserRole::CompoundAdmin->value,
            'compound_id' => $compoundA->id,
            'status'      => AccountStatus::Active->value,
        ]);
        $actorB = User::factory()->create([
            'role'        => UserRole::SupportAgent->value,
            'compound_id' => $compoundB->id,
            'status'      => AccountStatus::Active->value,
        ]);

        // Log for entity in compound B
        $this->makeLog([
            'actor_id'       => $actorB->id,
            'action'         => 'documents.reviewed',
            'auditable_type' => 'user_document',
            'auditable_id'   => '55',
        ]);

        Sanctum::actingAs($adminA);

        $this->getJson('/api/v1/audit-logs/timeline?entity_type=user_document&entity_id=55')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_scoped_admin_can_see_membership_scoped_resident_entity_timeline(): void
    {
        $compound = Compound::factory()->create();
        $otherCompound = Compound::factory()->create();

        $admin = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => $compound->id,
            'status' => AccountStatus::Active->value,
        ]);
        $resident = $this->makeMembershipScopedResident($compound);
        $foreignResident = $this->makeMembershipScopedResident($otherCompound);

        $this->makeLog([
            'actor_id' => $resident->id,
            'action' => 'documents.uploaded',
            'auditable_type' => 'user_document',
            'auditable_id' => '700',
            'created_at' => now()->subHour(),
        ]);
        $this->makeLog([
            'actor_id' => $resident->id,
            'action' => 'documents.reviewed',
            'auditable_type' => 'user_document',
            'auditable_id' => '700',
        ]);
        $this->makeLog([
            'actor_id' => $foreignResident->id,
            'action' => 'documents.reviewed',
            'auditable_type' => 'user_document',
            'auditable_id' => '700',
        ]);

        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/v1/audit-logs/timeline?entity_type=user_document&entity_id=700')
            ->assertOk();

        $this->assertEqualsCanonicalizing(
            ['documents.uploaded', 'documents.reviewed'],
            collect($response->json('data'))->pluck('action')->all(),
        );
    }

    public function test_membership_scoped_compound_admin_can_see_own_entity_timeline_when_compound_id_is_null(): void
    {
        $compound = Compound::factory()->create();
        $otherCompound = Compound::factory()->create();

        $admin = $this->makeMembershipScopedResident($compound);
        $admin->forceFill([
            'role' => UserRole::CompoundAdmin->value,
            'status' => AccountStatus::Active->value,
        ])->save();
        $resident = $this->makeMembershipScopedResident($compound);
        $foreignResident = $this->makeMembershipScopedResident($otherCompound);

        $this->makeLog([
            'actor_id' => $resident->id,
            'action' => 'documents.uploaded',
            'auditable_type' => 'user_document',
            'auditable_id' => '701',
            'created_at' => now()->subHour(),
        ]);
        $this->makeLog([
            'actor_id' => $resident->id,
            'action' => 'documents.reviewed',
            'auditable_type' => 'user_document',
            'auditable_id' => '701',
        ]);
        $this->makeLog([
            'actor_id' => $foreignResident->id,
            'action' => 'documents.reviewed',
            'auditable_type' => 'user_document',
            'auditable_id' => '701',
        ]);

        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/v1/audit-logs/timeline?entity_type=user_document&entity_id=701')
            ->assertOk();

        $this->assertEqualsCanonicalizing(
            ['documents.uploaded', 'documents.reviewed'],
            collect($response->json('data'))->pluck('action')->all(),
        );
    }

    // --- CSV Export ---

    public function test_export_returns_csv_download(): void
    {
        $admin = $this->makeAdmin(['name' => 'Test Reviewer']);

        $this->makeLog([
            'action'   => 'finance.payment_submitted',
            'severity' => AuditSeverity::Warning,
            'reason'   => 'Manual override',
        ]);

        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/v1/audit-logs/export')->assertOk();

        $this->assertStringContainsString('text/csv', $response->headers->get('Content-Type') ?? '');
        $this->assertStringContainsString('attachment', $response->headers->get('Content-Disposition') ?? '');
        $body = $response->streamedContent();
        $this->assertStringContainsString('Test Reviewer', $body);
        $this->assertStringContainsString('finance.payment_submitted', $body);
    }

    public function test_export_applies_same_filters_as_index(): void
    {
        $admin = $this->makeAdmin();

        $this->makeLog(['action' => 'finance.payment_submitted', 'severity' => AuditSeverity::Warning]);
        $this->makeLog(['action' => 'documents.reviewed',        'severity' => AuditSeverity::Info]);

        Sanctum::actingAs($admin);

        $body = $this->getJson('/api/v1/audit-logs/export?severity=warning')
            ->assertOk()
            ->streamedContent();

        $this->assertStringContainsString('finance.payment_submitted', $body);
        $this->assertStringNotContainsString('documents.reviewed', $body);
    }

    public function test_residents_cannot_access_export(): void
    {
        $resident = User::factory()->create([
            'role'   => UserRole::ResidentOwner->value,
            'status' => AccountStatus::Active->value,
        ]);

        Sanctum::actingAs($resident);

        $this->getJson('/api/v1/audit-logs/export')->assertForbidden();
        $this->getJson('/api/v1/audit-logs/timeline?entity_type=x&entity_id=1')->assertForbidden();
    }

    public function test_audit_logger_records_severity_and_reason(): void
    {
        $actor  = User::factory()->create();
        $logger = app(\App\Support\AuditLogger::class);

        $logger->record(
            'settings.critical_change',
            actor: $actor,
            severity: AuditSeverity::Critical,
            reason: 'Emergency maintenance',
        );

        $this->assertDatabaseHas('audit_logs', [
            'action'   => 'settings.critical_change',
            'severity' => 'critical',
            'reason'   => 'Emergency maintenance',
        ]);
    }
}
