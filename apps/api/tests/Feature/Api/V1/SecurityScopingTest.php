<?php

namespace Tests\Feature\Api\V1;

use App\Enums\AccountStatus;
use App\Enums\Permission;
use App\Enums\UserRole;
use App\Models\Property\Compound;
use App\Models\Security\ManualVisitorEntry;
use App\Models\Security\SecurityDevice;
use App\Models\Security\SecurityGate;
use App\Models\Security\SecurityIncident;
use App\Models\Security\SecurityShift;
use App\Models\User;
use App\Models\UserScopeAssignment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission as SpatiePermission;
use Spatie\Permission\Models\Role as SpatieRole;
use Tests\TestCase;

/**
 * Regression tests for security scoping: gates, shifts, devices, incidents,
 * and manual visitor entries must enforce compound boundaries for
 * scope-assigned security operators with compound_id = null.
 *
 * Bug class: These endpoints used CompoundContextService::resolve() followed
 * by a soft `if ($compoundId !== null)` guard. For scope-assigned operators
 * who have compound_id = null, resolve() returns null (same as super-admin
 * global), causing the guard to be bypassed and returning all records globally.
 * Additionally, show/update/mutation endpoints had NO compound access check.
 */
class SecurityScopingTest extends TestCase
{
    use RefreshDatabase;

    private function makeScopeAssignedSecurityOperator(Compound $compound): User
    {
        $role = SpatieRole::findOrCreate('security_operator', 'sanctum');
        $role->givePermissionTo(
            SpatiePermission::findOrCreate(Permission::ManageSecurity->value, 'sanctum'),
        );
        $operator = User::factory()->create([
            'role' => UserRole::SecurityGuard->value,
            'status' => AccountStatus::Active->value,
            'compound_id' => null,
        ]);
        $operator->assignRole($role);

        UserScopeAssignment::create([
            'user_id' => $operator->id,
            'role_name' => 'security_operator',
            'scope_type' => 'compound',
            'scope_id' => $compound->id,
            'created_by' => $operator->id,
        ]);

        return $operator->refresh();
    }

    // ── Gate scoping ──────────────────────────────────────────────────

    public function test_scope_assigned_security_operator_cannot_list_gates_from_other_compounds(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();

        $operator = $this->makeScopeAssignedSecurityOperator($compoundA);

        $gateA = SecurityGate::factory()->create(['compound_id' => $compoundA->id]);
        SecurityGate::factory()->create(['compound_id' => $compoundB->id]);

        Sanctum::actingAs($operator);

        $response = $this->getJson('/api/v1/security/gates');
        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
        $this->assertEquals($gateA->id, $response->json('data.0.id'));
    }

    public function test_scope_assigned_security_operator_cannot_view_cross_compound_gate(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();

        $operator = $this->makeScopeAssignedSecurityOperator($compoundA);

        $gateB = SecurityGate::factory()->create(['compound_id' => $compoundB->id]);

        Sanctum::actingAs($operator);

        $this->getJson("/api/v1/security/gates/{$gateB->id}")->assertForbidden();
    }

    public function test_scope_assigned_security_operator_cannot_update_cross_compound_gate(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();

        $operator = $this->makeScopeAssignedSecurityOperator($compoundA);

        $gateB = SecurityGate::factory()->create(['compound_id' => $compoundB->id]);

        Sanctum::actingAs($operator);

        $this->patchJson("/api/v1/security/gates/{$gateB->id}", ['name' => 'Hacked'])
            ->assertForbidden();
    }

    // ── Shift scoping ─────────────────────────────────────────────────

    public function test_scope_assigned_security_operator_cannot_list_shifts_from_other_compounds(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();

        $operator = $this->makeScopeAssignedSecurityOperator($compoundA);
        $admin = User::factory()->create(['role' => UserRole::SuperAdmin->value]);

        SecurityShift::factory()->create([
            'compound_id' => $compoundA->id,
            'created_by' => $admin->id,
        ]);
        SecurityShift::factory()->create([
            'compound_id' => $compoundB->id,
            'created_by' => $admin->id,
        ]);

        Sanctum::actingAs($operator);

        $response = $this->getJson('/api/v1/security/shifts');
        $response->assertOk();
        $this->assertSame(1, $response->json('data.total'));
    }

    public function test_scope_assigned_security_operator_cannot_view_cross_compound_shift(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();

        $operator = $this->makeScopeAssignedSecurityOperator($compoundA);
        $admin = User::factory()->create(['role' => UserRole::SuperAdmin->value]);

        $shiftB = SecurityShift::factory()->create([
            'compound_id' => $compoundB->id,
            'created_by' => $admin->id,
        ]);

        Sanctum::actingAs($operator);

        $this->getJson("/api/v1/security/shifts/{$shiftB->id}")->assertForbidden();
    }

    // ── Device scoping ────────────────────────────────────────────────

    public function test_scope_assigned_security_operator_cannot_list_devices_from_other_compounds(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();

        $operator = $this->makeScopeAssignedSecurityOperator($compoundA);
        $admin = User::factory()->create(['role' => UserRole::SuperAdmin->value]);

        SecurityDevice::create([
            'compound_id' => $compoundA->id,
            'name' => 'Scanner A',
            'device_identifier' => Str::random(64),
            'status' => 'active',
            'registered_by' => $admin->id,
        ]);
        SecurityDevice::create([
            'compound_id' => $compoundB->id,
            'name' => 'Scanner B',
            'device_identifier' => Str::random(64),
            'status' => 'active',
            'registered_by' => $admin->id,
        ]);

        Sanctum::actingAs($operator);

        $response = $this->getJson('/api/v1/security/devices');
        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
    }

    public function test_scope_assigned_security_operator_cannot_view_cross_compound_device(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();

        $operator = $this->makeScopeAssignedSecurityOperator($compoundA);
        $admin = User::factory()->create(['role' => UserRole::SuperAdmin->value]);

        $deviceB = SecurityDevice::create([
            'compound_id' => $compoundB->id,
            'name' => 'Scanner B',
            'device_identifier' => Str::random(64),
            'status' => 'active',
            'registered_by' => $admin->id,
        ]);

        Sanctum::actingAs($operator);

        $this->getJson("/api/v1/security/devices/{$deviceB->id}")->assertForbidden();
    }

    // ── Incident scoping ──────────────────────────────────────────────

    public function test_scope_assigned_security_operator_cannot_list_incidents_from_other_compounds(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();

        $operator = $this->makeScopeAssignedSecurityOperator($compoundA);
        $admin = User::factory()->create(['role' => UserRole::SuperAdmin->value]);

        SecurityIncident::factory()->create([
            'compound_id' => $compoundA->id,
            'reported_by' => $admin->id,
        ]);
        SecurityIncident::factory()->create([
            'compound_id' => $compoundB->id,
            'reported_by' => $admin->id,
        ]);

        Sanctum::actingAs($operator);

        $response = $this->getJson('/api/v1/security/incidents');
        $response->assertOk();
        $this->assertSame(1, $response->json('data.total'));
    }

    public function test_scope_assigned_security_operator_cannot_view_cross_compound_incident(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();

        $operator = $this->makeScopeAssignedSecurityOperator($compoundA);
        $admin = User::factory()->create(['role' => UserRole::SuperAdmin->value]);

        $incidentB = SecurityIncident::factory()->create([
            'compound_id' => $compoundB->id,
            'reported_by' => $admin->id,
        ]);

        Sanctum::actingAs($operator);

        $this->getJson("/api/v1/security/incidents/{$incidentB->id}")->assertForbidden();
    }

    public function test_scope_assigned_security_operator_cannot_resolve_cross_compound_incident(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();

        $operator = $this->makeScopeAssignedSecurityOperator($compoundA);
        $admin = User::factory()->create(['role' => UserRole::SuperAdmin->value]);

        $incidentB = SecurityIncident::factory()->create([
            'compound_id' => $compoundB->id,
            'reported_by' => $admin->id,
        ]);

        Sanctum::actingAs($operator);

        $this->postJson("/api/v1/security/incidents/{$incidentB->id}/resolve", [
            'notes' => 'Should not be allowed.',
        ])->assertForbidden();
    }

    // ── Manual visitor entry scoping ──────────────────────────────────

    public function test_scope_assigned_security_operator_cannot_list_manual_entries_from_other_compounds(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();

        $operator = $this->makeScopeAssignedSecurityOperator($compoundA);
        $admin = User::factory()->create(['role' => UserRole::SuperAdmin->value]);

        ManualVisitorEntry::factory()->create([
            'compound_id' => $compoundA->id,
            'processed_by' => $admin->id,
        ]);
        ManualVisitorEntry::factory()->create([
            'compound_id' => $compoundB->id,
            'processed_by' => $admin->id,
        ]);

        Sanctum::actingAs($operator);

        $response = $this->getJson('/api/v1/security/manual-entries');
        $response->assertOk();
        $this->assertSame(1, $response->json('data.total'));
    }

    public function test_scope_assigned_security_operator_cannot_view_cross_compound_manual_entry(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();

        $operator = $this->makeScopeAssignedSecurityOperator($compoundA);
        $admin = User::factory()->create(['role' => UserRole::SuperAdmin->value]);

        $entryB = ManualVisitorEntry::factory()->create([
            'compound_id' => $compoundB->id,
            'processed_by' => $admin->id,
        ]);

        Sanctum::actingAs($operator);

        $this->getJson("/api/v1/security/manual-entries/{$entryB->id}")->assertForbidden();
    }
}
