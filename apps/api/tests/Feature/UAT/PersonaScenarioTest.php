<?php

namespace Tests\Feature\UAT;

use App\Models\Property\Compound;
use App\Models\User;
use App\Models\Visitors\VisitorRequest;
use Database\Seeders\PermissionsSeeder;
use Database\Seeders\PropertyHierarchySeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Persona-Based UAT Scenario Tests (CM-128).
 * 
 * Proves that all core personas can complete their primary workflows
 * and that the system is operationally ready for launch.
 */
class PersonaScenarioTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PermissionsSeeder::class);
        $this->seed(PropertyHierarchySeeder::class);
    }

    /**
     * Persona 1: Super Admin Scenarios (UAT-SA)
     */
    public function test_super_admin_scenarios(): void
    {
        $sa = User::factory()->create(['email' => 'super-admin@uat.compound.local']);
        $sa->assignRole('super_admin');

        // UAT-SA-01: Compound onboarding
        $this->actingAs($sa)
            ->postJson('/api/v1/compounds', [
                'name' => 'UAT Compound Beta',
                'address' => '123 UAT St',
                'timezone' => 'Africa/Cairo',
                'status' => 'active',
            ])
            ->assertStatus(201)
            ->assertJsonPath('data.name', 'UAT Compound Beta');

        // UAT-SA-04: Launch readiness gate
        $this->actingAs($sa)
            ->getJson('/api/v1/system/launch-readiness')
            ->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'overall',
                    'infrastructure',
                    'launch' => [
                        'property_health',
                        'finance_readiness'
                    ]
                ]
            ]);
    }

    /**
     * Persona 2: Compound Admin Scenarios (UAT-CA)
     */
    public function test_compound_admin_scenarios(): void
    {
        $compound = Compound::first();
        $ca = User::factory()->create(['email' => 'compound-admin@uat.compound.local']);
        $ca->assignRole('compound_admin');
        
        // Scope the admin to the compound
        DB::table('compound_user')->insert([
            'compound_id' => $compound->id,
            'user_id' => $ca->id,
            'role' => 'admin'
        ]);

        // UAT-CA-01: Building management
        $this->actingAs($ca)
            ->postJson("/api/v1/compounds/{$compound->id}/buildings", [
                'name' => 'Building UAT-X',
                'code' => 'UX',
            ])
            ->assertStatus(201);

        // UAT-CA-04: Announcement publishing
        $this->actingAs($ca)
            ->postJson('/api/v1/announcements', [
                'compound_id' => $compound->id,
                'title' => 'Urgent UAT Announcement',
                'content' => 'System will be live soon.',
                'category' => 'general',
                'priority' => 'urgent',
            ])
            ->assertStatus(201);
    }

    /**
     * Persona 5: Security Guard Scenarios (UAT-SG)
     */
    public function test_security_guard_scenarios(): void
    {
        $compound = Compound::first();
        $building = $compound->buildings->first();
        $floor = $building->floors->first();
        $unit = $floor->units->first();

        $guard = User::factory()->create(['email' => 'security-guard@uat.compound.local']);
        $guard->assignRole('security_guard');
        
        // Scope guard to the compound
        DB::table('compound_user')->insert([
            'compound_id' => $compound->id,
            'user_id' => $guard->id,
            'role' => 'security'
        ]);

        // UAT-SG-01: Visitor pass validation
        $request = VisitorRequest::factory()->create([
            'unit_id' => $unit->id,
            'status' => 'approved',
            'access_code' => 'UAT-123',
        ]);

        $this->actingAs($guard)
            ->postJson('/api/v1/visitor-requests/validate-pass', [
                'code' => 'UAT-123'
            ])
            ->assertStatus(200)
            ->assertJsonPath('data.id', $request->id);

        // Arrive visitor
        $this->actingAs($guard)
            ->postJson("/api/v1/visitor-requests/{$request->id}/arrive")
            ->assertStatus(200);

        // UAT-SG-02: Incident reporting
        $this->actingAs($guard)
            ->postJson('/api/v1/security/incidents', [
                'compound_id' => $compound->id,
                'title' => 'UAT Noise Complaint',
                'description' => 'Loud music in Building A',
                'severity' => 'low',
            ])
            ->assertStatus(201);
    }

    /**
     * Persona 4: Finance Reviewer Scenarios (UAT-FR)
     */
    public function test_finance_reviewer_scenarios(): void
    {
        $compound = Compound::first();
        $unit = $compound->units->first();
        $fr = User::factory()->create(['email' => 'finance-reviewer@uat.compound.local']);
        $fr->assignRole('finance_reviewer');

        // Scope reviewer to compound
        DB::table('compound_user')->insert([
            'compound_id' => $compound->id,
            'user_id' => $fr->id,
            'role' => 'finance'
        ]);

        // UAT-FR-01: Unit account and ledger entry
        $unitAccount = \App\Models\Finance\UnitAccount::factory()->create([
            'unit_id' => $unit->id,
            'compound_id' => $compound->id,
            'balance' => 1000
        ]);

        $this->actingAs($fr)
            ->postJson("/api/v1/finance/unit-accounts/{$unitAccount->id}/ledger-entries", [
                'amount' => 500,
                'type' => 'debit',
                'description' => 'UAT Service Charge',
            ])
            ->assertStatus(201);

        $this->assertEquals(1500, $unitAccount->fresh()->balance);
    }

    /**
     * Persona 3: Board Member Scenarios (UAT-BM)
     */
    public function test_board_member_scenarios(): void
    {
        $compound = Compound::first();
        $bm = User::factory()->create(['email' => 'board-member@uat.compound.local']);
        $bm->assignRole('board_member');

        // Scope to compound
        DB::table('compound_user')->insert([
            'compound_id' => $compound->id,
            'user_id' => $bm->id,
            'role' => 'board'
        ]);

        // UAT-BM-02: Meeting management
        $this->actingAs($bm)
            ->postJson('/api/v1/meetings', [
                'compound_id' => $compound->id,
                'title' => 'UAT General Assembly',
                'scheduled_at' => now()->addDays(7)->toIso8601String(),
                'location' => 'UAT Clubhouse',
                'type' => 'general_assembly',
            ])
            ->assertStatus(201);
    }

    /**
     * Persona 7 & 8: Resident Scenarios (UAT-RO / UAT-RT)
     */
    public function test_resident_scenarios(): void
    {
        $compound = Compound::first();
        $unit = $compound->units->first();
        $resident = User::factory()->create(['email' => 'resident-owner@uat.compound.local']);
        $resident->assignRole('resident_owner');

        // Create membership
        \App\Models\Property\UnitMembership::create([
            'unit_id' => $unit->id,
            'user_id' => $resident->id,
            'role' => 'owner',
            'status' => 'active',
            'started_at' => now(),
        ]);

        // UAT-RO-02: Issue submission
        $this->actingAs($resident)
            ->postJson('/api/v1/issues', [
                'title' => 'UAT Leak',
                'description' => 'Water leaking from ceiling',
                'category' => 'maintenance',
                'priority' => 'medium',
            ])
            ->assertStatus(201);

        // UAT-RO-04: Data export request
        $this->actingAs($resident)
            ->postJson('/api/v1/privacy/export-requests', [
                'format' => 'json'
            ])
            ->assertStatus(201);
    }

    /**
     * Persona 6: Support Agent Scenarios (UAT-AGT)
     */
    public function test_support_agent_scenarios(): void
    {
        $agent = User::factory()->create(['email' => 'support-agent@uat.compound.local']);
        $agent->assignRole('support_agent');

        $user = User::factory()->create();

        // UAT-AGT-01: User duplicate detection
        $this->actingAs($agent)
            ->getJson("/api/v1/users/{$user->id}/duplicates")
            ->assertStatus(200);
    }
}
