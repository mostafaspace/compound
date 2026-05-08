<?php

namespace Tests\Feature\Api\V1;

use App\Enums\UserRole;
use App\Models\AuditLog;
use App\Models\CompoundSetting;
use App\Models\Property\Compound;
use App\Models\User;
use App\Support\SettingsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SettingsTest extends TestCase
{
    use RefreshDatabase;

    // ─────────────────────────────────────────────────────────────────
    // Namespace list
    // ─────────────────────────────────────────────────────────────────

    public function test_admin_can_list_namespaces(): void
    {
        $admin = User::factory()->create(['role' => UserRole::SuperAdmin->value]);
        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/v1/settings')->assertOk();

        $namespaces = $response->json('data');
        $this->assertIsArray($namespaces);
        $this->assertContains('documents', $namespaces);
        $this->assertContains('finance', $namespaces);
        $this->assertContains('governance', $namespaces);
    }

    public function test_resident_cannot_list_namespaces(): void
    {
        $resident = User::factory()->create(['role' => UserRole::ResidentOwner->value]);
        Sanctum::actingAs($resident);

        $this->getJson('/api/v1/settings')->assertForbidden();
    }

    public function test_unauthenticated_cannot_list_namespaces(): void
    {
        $this->getJson('/api/v1/settings')->assertUnauthorized();
    }

    // ─────────────────────────────────────────────────────────────────
    // Read defaults
    // ─────────────────────────────────────────────────────────────────

    public function test_admin_can_read_namespace_defaults(): void
    {
        $admin = User::factory()->create(['role' => UserRole::SuperAdmin->value]);
        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/v1/settings/documents')->assertOk();

        $settings = $response->json('data.settings');
        $this->assertArrayHasKey('require_upload_for_onboarding', $settings);
        $this->assertArrayHasKey('max_file_size_mb', $settings);
        $this->assertTrue($settings['require_upload_for_onboarding']);
        $this->assertEquals(10, $settings['max_file_size_mb']);
    }

    public function test_compound_admin_can_read_namespace_for_their_compound(): void
    {
        $compound = Compound::factory()->create();
        $admin = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => $compound->id,
        ]);
        Sanctum::actingAs($admin);

        $response = $this->getJson("/api/v1/settings/visitors?compoundId={$compound->id}")->assertOk();

        $this->assertEquals($compound->id, $response->json('data.compoundId'));
        $settings = $response->json('data.settings');
        $this->assertArrayHasKey('require_pre_approval', $settings);
    }

    public function test_compound_admin_cannot_read_another_compounds_settings(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();
        $admin = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => $compoundA->id,
        ]);
        Sanctum::actingAs($admin);

        $this->getJson("/api/v1/settings/visitors?compoundId={$compoundB->id}")
            ->assertForbidden();
    }

    public function test_reading_unknown_namespace_returns_422(): void
    {
        $admin = User::factory()->create(['role' => UserRole::SuperAdmin->value]);
        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/settings/unicorns')->assertUnprocessable();
    }

    // ─────────────────────────────────────────────────────────────────
    // Compound-level overrides
    // ─────────────────────────────────────────────────────────────────

    public function test_compound_override_is_returned_over_default(): void
    {
        $admin = User::factory()->create(['role' => UserRole::SuperAdmin->value]);
        $compound = Compound::factory()->create();
        Sanctum::actingAs($admin);

        // Insert a compound-specific override
        CompoundSetting::create([
            'compound_id' => $compound->id,
            'namespace' => 'visitors',
            'key' => 'max_visitors_per_unit_per_day',
            'value' => 5,
        ]);

        $response = $this->getJson("/api/v1/settings/visitors?compoundId={$compound->id}")->assertOk();
        $this->assertEquals(5, $response->json('data.settings.max_visitors_per_unit_per_day'));
    }

    public function test_global_override_is_returned_when_no_compound_given(): void
    {
        $admin = User::factory()->create(['role' => UserRole::SuperAdmin->value]);
        Sanctum::actingAs($admin);

        CompoundSetting::create([
            'compound_id' => null,
            'namespace' => 'finance',
            'key' => 'late_fee_enabled',
            'value' => true,
        ]);

        $response = $this->getJson('/api/v1/settings/finance')->assertOk();
        $this->assertTrue($response->json('data.settings.late_fee_enabled'));
    }

    // ─────────────────────────────────────────────────────────────────
    // Updating settings
    // ─────────────────────────────────────────────────────────────────

    public function test_admin_can_update_settings(): void
    {
        $admin = User::factory()->create(['role' => UserRole::SuperAdmin->value]);
        $compound = Compound::factory()->create();
        Sanctum::actingAs($admin);

        $response = $this->patchJson('/api/v1/settings/visitors', [
            'compoundId' => $compound->id,
            'settings' => [
                'require_pre_approval' => true,
                'max_visitors_per_unit_per_day' => 3,
            ],
        ])->assertOk();

        $settings = $response->json('data.settings');
        $this->assertTrue($settings['require_pre_approval']);
        $this->assertEquals(3, $settings['max_visitors_per_unit_per_day']);

        // Verify persisted in DB
        $this->assertDatabaseHas('compound_settings', [
            'compound_id' => $compound->id,
            'namespace' => 'visitors',
            'key' => 'require_pre_approval',
        ]);
    }

    public function test_compound_admin_updates_only_their_compound_settings(): void
    {
        $compound = Compound::factory()->create();
        $admin = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => $compound->id,
        ]);
        Sanctum::actingAs($admin);

        $this->patchJson('/api/v1/settings/visitors', [
            'settings' => [
                'require_pre_approval' => true,
                'max_visitors_per_unit_per_day' => 4,
            ],
        ])->assertOk()
            ->assertJsonPath('data.compoundId', $compound->id)
            ->assertJsonPath('data.settings.max_visitors_per_unit_per_day', 4);

        $this->assertTrue(
            CompoundSetting::query()
                ->where('compound_id', $compound->id)
                ->where('namespace', 'visitors')
                ->where('key', 'max_visitors_per_unit_per_day')
                ->exists()
        );
    }

    public function test_compound_admin_cannot_update_another_compounds_settings(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();
        $admin = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => $compoundA->id,
        ]);
        Sanctum::actingAs($admin);

        $this->patchJson('/api/v1/settings/visitors', [
            'compoundId' => $compoundB->id,
            'settings' => ['require_pre_approval' => true],
        ])->assertForbidden();
    }

    public function test_updating_settings_without_compound_sets_global_override(): void
    {
        $admin = User::factory()->create(['role' => UserRole::SuperAdmin->value]);
        Sanctum::actingAs($admin);

        $this->patchJson('/api/v1/settings/governance', [
            'settings' => ['default_eligibility' => 'all_verified'],
        ])->assertOk();

        $this->assertDatabaseHas('compound_settings', [
            'compound_id' => null,
            'namespace' => 'governance',
            'key' => 'default_eligibility',
        ]);
    }

    public function test_resident_cannot_update_settings(): void
    {
        $resident = User::factory()->create(['role' => UserRole::ResidentTenant->value]);
        Sanctum::actingAs($resident);

        $this->patchJson('/api/v1/settings/visitors', [
            'settings' => ['require_pre_approval' => true],
        ])->assertForbidden();
    }

    public function test_updating_unknown_namespace_returns_422(): void
    {
        $admin = User::factory()->create(['role' => UserRole::SuperAdmin->value]);
        Sanctum::actingAs($admin);

        $this->patchJson('/api/v1/settings/dragons', [
            'settings' => ['fire_breath' => true],
        ])->assertUnprocessable();
    }

    public function test_settings_payload_must_be_array(): void
    {
        $admin = User::factory()->create(['role' => UserRole::SuperAdmin->value]);
        Sanctum::actingAs($admin);

        $this->patchJson('/api/v1/settings/finance', [
            'settings' => 'not-an-array',
        ])->assertUnprocessable();
    }

    // ─────────────────────────────────────────────────────────────────
    // Audit logging
    // ─────────────────────────────────────────────────────────────────

    public function test_updating_settings_writes_audit_log(): void
    {
        $admin = User::factory()->create(['role' => UserRole::SuperAdmin->value]);
        $compound = Compound::factory()->create();
        Sanctum::actingAs($admin);

        $this->patchJson('/api/v1/settings/finance', [
            'compoundId' => $compound->id,
            'settings' => ['late_fee_percentage' => 5.0],
            'reason' => 'Approved by board meeting 2026-04-23',
        ])->assertOk();

        $this->assertDatabaseHas('audit_logs', [
            'actor_id' => $admin->id,
            'action' => 'settings.updated',
        ]);

        $log = AuditLog::query()->where('action', 'settings.updated')->latest()->first();
        $this->assertNotNull($log);
        $this->assertEquals('finance', $log->metadata['namespace']);
        $this->assertEquals('late_fee_percentage', $log->metadata['key']);
        $this->assertEquals(2.0, $log->metadata['before']);
        $this->assertEquals(5.0, $log->metadata['after']);
        $this->assertEquals('Approved by board meeting 2026-04-23', $log->metadata['reason']);
    }

    public function test_updating_multiple_keys_writes_one_audit_log_per_key(): void
    {
        $admin = User::factory()->create(['role' => UserRole::SuperAdmin->value]);
        Sanctum::actingAs($admin);

        $this->patchJson('/api/v1/settings/notifications', [
            'settings' => [
                'sms_enabled' => true,
                'digest_frequency' => 'daily',
            ],
        ])->assertOk();

        $this->assertEquals(
            2,
            AuditLog::query()->where('action', 'settings.updated')->count(),
        );
    }

    // ─────────────────────────────────────────────────────────────────
    // SettingsService unit tests
    // ─────────────────────────────────────────────────────────────────

    public function test_settings_service_returns_default_when_no_row_exists(): void
    {
        $service = app(SettingsService::class);
        $value = $service->get('documents', 'max_file_size_mb');
        $this->assertEquals(10, $value);
    }

    public function test_settings_service_returns_fallback_for_unknown_key(): void
    {
        $service = app(SettingsService::class);
        $value = $service->get('documents', 'nonexistent_key', null, 'my-fallback');
        $this->assertEquals('my-fallback', $value);
    }

    public function test_settings_service_get_namespace_merges_defaults_and_overrides(): void
    {
        $compound = Compound::factory()->create();

        // Set a global override
        CompoundSetting::create([
            'compound_id' => null,
            'namespace' => 'finance',
            'key' => 'late_fee_enabled',
            'value' => true,
        ]);

        // Set a compound override
        CompoundSetting::create([
            'compound_id' => $compound->id,
            'namespace' => 'finance',
            'key' => 'late_fee_percentage',
            'value' => 3.5,
        ]);

        $service = app(SettingsService::class);
        $result = $service->getNamespace('finance', $compound->id);

        $this->assertTrue($result['late_fee_enabled']);          // global override
        $this->assertEquals(3.5, $result['late_fee_percentage']); // compound override
        $this->assertArrayHasKey('currency', $result);            // default still present
    }
}
