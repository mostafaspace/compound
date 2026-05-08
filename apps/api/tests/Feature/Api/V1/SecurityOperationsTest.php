<?php

namespace Tests\Feature\Api\V1;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Models\Property\Building;
use App\Models\Property\Compound;
use App\Models\Security\ManualVisitorEntry;
use App\Models\Security\SecurityDevice;
use App\Models\Security\SecurityGate;
use App\Models\Security\SecurityIncident;
use App\Models\Security\SecurityShift;
use App\Models\Security\SecurityShiftAssignment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

// CM-114: Security operations — permission enforcement, CRUD, compound scoping
class SecurityOperationsTest extends TestCase
{
    use RefreshDatabase;

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private function makeAdmin(array $attrs = []): User
    {
        return User::factory()->create(array_merge([
            'role' => UserRole::SuperAdmin->value,
            'status' => AccountStatus::Active->value,
        ], $attrs));
    }

    private function makeGuard(Compound $compound): User
    {
        return User::factory()->create([
            'role' => UserRole::SecurityGuard->value,
            'status' => AccountStatus::Active->value,
            'compound_id' => $compound->id,
        ]);
    }

    private function makeResident(array $attrs = []): User
    {
        return User::factory()->create(array_merge([
            'role' => UserRole::ResidentOwner->value,
            'status' => AccountStatus::Active->value,
        ], $attrs));
    }

    // ─── Permission: gates ────────────────────────────────────────────────────

    public function test_unauthenticated_cannot_list_gates(): void
    {
        $this->getJson('/api/v1/security/gates')->assertUnauthorized();
    }

    public function test_resident_cannot_list_gates(): void
    {
        Sanctum::actingAs($this->makeResident());
        $this->getJson('/api/v1/security/gates')->assertForbidden();
    }

    public function test_super_admin_can_list_gates(): void
    {
        Sanctum::actingAs($this->makeAdmin());
        $this->getJson('/api/v1/security/gates')->assertOk();
    }

    public function test_compound_admin_can_list_gates(): void
    {
        $compound = Compound::factory()->create();
        Sanctum::actingAs($this->makeAdmin([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => $compound->id,
        ]));
        $this->getJson('/api/v1/security/gates')->assertOk();
    }

    public function test_support_agent_cannot_list_gates(): void
    {
        Sanctum::actingAs($this->makeAdmin(['role' => UserRole::SupportAgent->value]));
        $this->getJson('/api/v1/security/gates')->assertForbidden();
    }

    // ─── Gate CRUD ────────────────────────────────────────────────────────────

    public function test_admin_can_create_gate(): void
    {
        $compound = Compound::factory()->create();
        Sanctum::actingAs($this->makeAdmin());

        $this->postJson('/api/v1/security/gates', [
            'compoundId' => $compound->id,
            'name' => 'Main Gate',
            'zone' => 'Zone A',
        ])
            ->assertCreated()
            ->assertJsonPath('data.name', 'Main Gate')
            ->assertJsonPath('data.zone', 'Zone A')
            ->assertJsonPath('data.is_active', true);
    }

    public function test_gate_name_is_required(): void
    {
        $compound = Compound::factory()->create();
        Sanctum::actingAs($this->makeAdmin());

        $this->postJson('/api/v1/security/gates', ['compoundId' => $compound->id])
            ->assertUnprocessable();
    }

    public function test_admin_can_update_gate(): void
    {
        $compound = Compound::factory()->create();
        $gate = SecurityGate::factory()->create(['compound_id' => $compound->id]);

        Sanctum::actingAs($this->makeAdmin());

        $this->patchJson("/api/v1/security/gates/{$gate->id}", [
            'isActive' => false,
            'zone' => 'Zone B',
        ])
            ->assertOk()
            ->assertJsonPath('data.is_active', false)
            ->assertJsonPath('data.zone', 'Zone B');
    }

    public function test_gates_are_scoped_to_compound(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();

        SecurityGate::factory()->count(2)->create(['compound_id' => $compoundA->id]);
        SecurityGate::factory()->create(['compound_id' => $compoundB->id]);

        Sanctum::actingAs($this->makeAdmin());

        $response = $this->getJson('/api/v1/security/gates', ['X-Compound-Id' => $compoundA->id]);
        $response->assertOk();
        $this->assertCount(2, $response->json('data'));
    }

    // ─── Shift lifecycle ──────────────────────────────────────────────────────

    public function test_admin_can_create_shift(): void
    {
        $compound = Compound::factory()->create();
        Sanctum::actingAs($this->makeAdmin());

        $this->postJson('/api/v1/security/shifts', [
            'compoundId' => $compound->id,
            'name' => 'Morning Shift',
        ])
            ->assertCreated()
            ->assertJsonPath('data.name', 'Morning Shift')
            ->assertJsonPath('data.status', 'draft');
    }

    public function test_admin_can_activate_shift(): void
    {
        $compound = Compound::factory()->create();
        $admin = $this->makeAdmin();
        $shift = SecurityShift::factory()->create([
            'compound_id' => $compound->id,
            'created_by' => $admin->id,
        ]);

        Sanctum::actingAs($admin);

        $this->postJson("/api/v1/security/shifts/{$shift->id}/activate")
            ->assertOk()
            ->assertJsonPath('data.status', 'active');
    }

    public function test_cannot_activate_non_draft_shift(): void
    {
        $admin = $this->makeAdmin();
        $shift = SecurityShift::factory()->active()->create([
            'compound_id' => Compound::factory()->create()->id,
            'created_by' => $admin->id,
        ]);

        Sanctum::actingAs($admin);

        $this->postJson("/api/v1/security/shifts/{$shift->id}/activate")
            ->assertStatus(422);
    }

    public function test_admin_can_close_shift_with_handover_notes(): void
    {
        $compound = Compound::factory()->create();
        $admin = $this->makeAdmin();
        $shift = SecurityShift::factory()->active()->create([
            'compound_id' => $compound->id,
            'created_by' => $admin->id,
        ]);

        Sanctum::actingAs($admin);

        $this->postJson("/api/v1/security/shifts/{$shift->id}/close", [
            'handoverNotes' => 'All quiet. Gate 2 lock replaced.',
        ])
            ->assertOk()
            ->assertJsonPath('data.status', 'closed')
            ->assertJsonPath('data.handover_notes', 'All quiet. Gate 2 lock replaced.');
    }

    public function test_admin_can_assign_guard_to_shift(): void
    {
        $compound = Compound::factory()->create();
        $admin = $this->makeAdmin();
        $guard = $this->makeGuard($compound);
        $gate = SecurityGate::factory()->create(['compound_id' => $compound->id]);
        $shift = SecurityShift::factory()->active()->create([
            'compound_id' => $compound->id,
            'created_by' => $admin->id,
        ]);

        Sanctum::actingAs($admin);

        $this->postJson("/api/v1/security/shifts/{$shift->id}/assignments", [
            'guardUserId' => $guard->id,
            'gateId' => $gate->id,
        ])
            ->assertCreated()
            ->assertJsonPath('data.guard_user_id', $guard->id);
    }

    public function test_guard_can_checkin_and_checkout(): void
    {
        $compound = Compound::factory()->create();
        $admin = $this->makeAdmin();
        $guard = $this->makeGuard($compound);
        $shift = SecurityShift::factory()->active()->create([
            'compound_id' => $compound->id,
            'created_by' => $admin->id,
        ]);
        $assignment = SecurityShiftAssignment::create([
            'shift_id' => $shift->id,
            'gate_id' => null,
            'guard_user_id' => $guard->id,
            'is_active' => true,
        ]);

        Sanctum::actingAs($admin);

        // Check in
        $this->postJson("/api/v1/security/shifts/{$shift->id}/assignments/{$assignment->id}/checkin")
            ->assertOk()
            ->assertJsonPath('data.checked_in_at', fn ($v) => $v !== null);

        // Check out
        $this->postJson("/api/v1/security/shifts/{$shift->id}/assignments/{$assignment->id}/checkout")
            ->assertOk()
            ->assertJsonPath('data.checked_out_at', fn ($v) => $v !== null)
            ->assertJsonPath('data.is_active', false);
    }

    // ─── Device management ────────────────────────────────────────────────────

    public function test_admin_can_register_device(): void
    {
        $compound = Compound::factory()->create();
        Sanctum::actingAs($this->makeAdmin());

        $this->postJson('/api/v1/security/devices', [
            'compoundId' => $compound->id,
            'name' => 'Gate Scanner #1',
            'appVersion' => '2.0.1',
        ])
            ->assertCreated()
            ->assertJsonPath('data.name', 'Gate Scanner #1')
            ->assertJsonPath('data.status', 'active')
            ->assertJsonStructure(['data' => ['device_identifier']]);
    }

    public function test_admin_can_revoke_device(): void
    {
        $compound = Compound::factory()->create();
        $admin = $this->makeAdmin();
        $device = SecurityDevice::create([
            'compound_id' => $compound->id,
            'name' => 'Old Scanner',
            'device_identifier' => Str::random(64),
            'status' => 'active',
            'registered_by' => $admin->id,
        ]);

        Sanctum::actingAs($admin);

        $this->postJson("/api/v1/security/devices/{$device->id}/revoke")
            ->assertOk()
            ->assertJsonPath('data.status', 'revoked');
    }

    public function test_revoking_already_revoked_device_fails(): void
    {
        $compound = Compound::factory()->create();
        $admin = $this->makeAdmin();
        $device = SecurityDevice::create([
            'compound_id' => $compound->id,
            'name' => 'Old Scanner',
            'device_identifier' => Str::random(64),
            'status' => 'revoked',
            'registered_by' => $admin->id,
            'revoked_by' => $admin->id,
            'revoked_at' => now(),
        ]);

        Sanctum::actingAs($admin);

        $this->postJson("/api/v1/security/devices/{$device->id}/revoke")
            ->assertStatus(422);
    }

    // ─── Incidents ────────────────────────────────────────────────────────────

    public function test_guard_can_create_incident(): void
    {
        $compound = Compound::factory()->create();
        $guard = $this->makeGuard($compound);

        Sanctum::actingAs($guard);

        $this->postJson('/api/v1/security/incidents', [
            'compoundId' => $compound->id,
            'type' => 'denied_entry',
            'title' => 'Denied entry to unknown vehicle',
            'description' => 'Vehicle with no prior notice attempted entry.',
            'occurredAt' => now()->toDateTimeString(),
        ])
            ->assertCreated()
            ->assertJsonPath('data.type', 'denied_entry')
            ->assertJsonPath('data.resolved_at', null);
    }

    public function test_resident_cannot_create_incident(): void
    {
        $compound = Compound::factory()->create();
        Sanctum::actingAs($this->makeResident(['compound_id' => $compound->id]));

        $this->postJson('/api/v1/security/incidents', [
            'compoundId' => $compound->id,
            'type' => 'other',
            'title' => 'Test',
            'description' => 'Test description.',
            'occurredAt' => now()->toDateTimeString(),
        ])->assertForbidden();
    }

    public function test_invalid_incident_type_fails_validation(): void
    {
        $compound = Compound::factory()->create();
        $admin = $this->makeAdmin();
        Sanctum::actingAs($admin);

        $this->postJson('/api/v1/security/incidents', [
            'compoundId' => $compound->id,
            'type' => 'not_a_real_type',
            'title' => 'Test',
            'description' => 'Test.',
            'occurredAt' => now()->toDateTimeString(),
        ])->assertUnprocessable();
    }

    public function test_admin_can_resolve_incident(): void
    {
        $compound = Compound::factory()->create();
        $admin = $this->makeAdmin();
        $incident = SecurityIncident::factory()->create([
            'compound_id' => $compound->id,
            'reported_by' => $admin->id,
        ]);

        Sanctum::actingAs($admin);

        $this->postJson("/api/v1/security/incidents/{$incident->id}/resolve", [
            'notes' => 'Issue was resolved after verification.',
        ])
            ->assertOk()
            ->assertJsonPath('data.resolved_at', fn ($v) => $v !== null);
    }

    public function test_incidents_are_scoped_to_compound(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();
        $admin = $this->makeAdmin();

        SecurityIncident::factory()->count(3)->create([
            'compound_id' => $compoundA->id,
            'reported_by' => $admin->id,
        ]);
        SecurityIncident::factory()->create([
            'compound_id' => $compoundB->id,
            'reported_by' => $admin->id,
        ]);

        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/v1/security/incidents', ['X-Compound-Id' => $compoundA->id]);
        $response->assertOk();
        $this->assertSame(3, $response->json('data.total'));
    }

    // ─── Manual visitor entries ───────────────────────────────────────────────

    public function test_guard_can_create_manual_entry(): void
    {
        $compound = Compound::factory()->create();
        $guard = $this->makeGuard($compound);

        Sanctum::actingAs($guard);

        $this->postJson('/api/v1/security/manual-entries', [
            'compoundId' => $compound->id,
            'visitorName' => 'John Doe',
            'reason' => 'Delivery',
            'status' => 'allowed',
            'occurredAt' => now()->toDateTimeString(),
        ])
            ->assertCreated()
            ->assertJsonPath('data.visitor_name', 'John Doe')
            ->assertJsonPath('data.status', 'allowed');
    }

    public function test_resident_cannot_create_manual_entry(): void
    {
        $compound = Compound::factory()->create();
        Sanctum::actingAs($this->makeResident(['compound_id' => $compound->id]));

        $this->postJson('/api/v1/security/manual-entries', [
            'compoundId' => $compound->id,
            'visitorName' => 'Jane Doe',
            'reason' => 'Visit',
            'status' => 'allowed',
            'occurredAt' => now()->toDateTimeString(),
        ])->assertForbidden();
    }

    public function test_manual_entry_status_must_be_allowed_or_denied(): void
    {
        $compound = Compound::factory()->create();
        Sanctum::actingAs($this->makeAdmin());

        $this->postJson('/api/v1/security/manual-entries', [
            'compoundId' => $compound->id,
            'visitorName' => 'Jane Doe',
            'reason' => 'Visit',
            'status' => 'pending',
            'occurredAt' => now()->toDateTimeString(),
        ])->assertUnprocessable();
    }

    public function test_manual_entries_are_scoped_to_compound(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();
        $admin = $this->makeAdmin();

        ManualVisitorEntry::factory()->count(2)->create([
            'compound_id' => $compoundA->id,
            'processed_by' => $admin->id,
        ]);
        ManualVisitorEntry::factory()->create([
            'compound_id' => $compoundB->id,
            'processed_by' => $admin->id,
        ]);

        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/v1/security/manual-entries', ['X-Compound-Id' => $compoundA->id]);
        $response->assertOk();
        $this->assertSame(2, $response->json('data.total'));
    }

    // ─── Shift filter for incidents / entries ─────────────────────────────────

    public function test_incidents_can_be_filtered_by_shift(): void
    {
        $compound = Compound::factory()->create();
        $admin = $this->makeAdmin();
        $shiftA = SecurityShift::factory()->active()->create([
            'compound_id' => $compound->id,
            'created_by' => $admin->id,
        ]);
        $shiftB = SecurityShift::factory()->active()->create([
            'compound_id' => $compound->id,
            'created_by' => $admin->id,
        ]);

        SecurityIncident::factory()->count(2)->create([
            'compound_id' => $compound->id,
            'shift_id' => $shiftA->id,
            'reported_by' => $admin->id,
        ]);
        SecurityIncident::factory()->create([
            'compound_id' => $compound->id,
            'shift_id' => $shiftB->id,
            'reported_by' => $admin->id,
        ]);

        Sanctum::actingAs($admin);

        $response = $this->getJson("/api/v1/security/incidents?shift_id={$shiftA->id}");
        $response->assertOk();
        $this->assertSame(2, $response->json('data.total'));
    }

    // ─── Gate filter on incidents ─────────────────────────────────────────────

    public function test_incidents_can_be_filtered_by_gate(): void
    {
        $compound = Compound::factory()->create();
        $admin = $this->makeAdmin();
        $gateA = SecurityGate::factory()->create(['compound_id' => $compound->id]);
        $gateB = SecurityGate::factory()->create(['compound_id' => $compound->id]);

        SecurityIncident::factory()->count(3)->create([
            'compound_id' => $compound->id,
            'gate_id' => $gateA->id,
            'reported_by' => $admin->id,
        ]);
        SecurityIncident::factory()->create([
            'compound_id' => $compound->id,
            'gate_id' => $gateB->id,
            'reported_by' => $admin->id,
        ]);

        Sanctum::actingAs($admin);

        $response = $this->getJson("/api/v1/security/incidents?gate_id={$gateA->id}");
        $response->assertOk();
        $this->assertSame(3, $response->json('data.total'));
    }

    // ─── Building-level gate scoping ─────────────────────────────────────────

    public function test_gate_can_be_scoped_to_building(): void
    {
        $compound = Compound::factory()->create();
        $buildingA = Building::factory()->create(['compound_id' => $compound->id]);

        Sanctum::actingAs($this->makeAdmin());

        $response = $this->postJson('/api/v1/security/gates', [
            'compoundId' => $compound->id,
            'buildingId' => $buildingA->id,
            'name' => 'Building A Gate',
        ]);
        $response->assertCreated();
        $this->assertSame((string) $buildingA->id, $response->json('data.building_id'));
    }
}
