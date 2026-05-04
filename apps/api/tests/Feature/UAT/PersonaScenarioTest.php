<?php

namespace Tests\Feature\UAT;

use App\Models\Property\Compound;
use App\Models\User;
use App\Models\Visitors\VisitorRequest;
use Database\Seeders\RbacSeeder;
use Database\Seeders\UatSeeder;
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
        $this->seed(RbacSeeder::class);
        $this->seed(UatSeeder::class);
    }

    /**
     * Persona 1: Super Admin Scenarios (UAT-SA)
     */
    public function test_super_admin_scenarios(): void
    {
        $sa = User::where('email', 'super-admin@uat.compound.local')->firstOrFail();

        // UAT-SA-01: Compound onboarding
        $this->actingAs($sa)
            ->postJson('/api/v1/compounds', [
                'name' => 'UAT Compound Beta',
                'address' => '123 UAT St',
                'timezone' => 'Africa/Cairo',
                'status' => 'active',
                'code' => 'UAT-BETA',
                'currency' => 'EGP',
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
        $ca = User::where('email', 'compound-admin@uat.compound.local')->firstOrFail();
        

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
                'titleEn' => 'Urgent UAT Announcement',
                'titleAr' => 'إعلان هام',
                'bodyEn' => 'System will be live soon.',
                'bodyAr' => 'النظام سيعمل قريباً',
                'category' => 'general',
                'targetType' => 'compound',
                'targetIds' => [$compound->id],
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

        $guard = User::where('email', 'security-guard@uat.compound.local')->firstOrFail();
        

        // UAT-SG-01: Visitor pass validation
        $request = VisitorRequest::factory()->create([
            'unit_id' => $unit->id,
            'status' => 'pending',
        ]);
        $token = app(\App\Services\VisitorPassService::class)->issuePass($request);

        $this->actingAs($guard)
            ->postJson('/api/v1/visitor-requests/validate-pass', [
                'token' => $token
            ])
            ->assertStatus(200)
            ->assertJsonPath('data.visitorRequest.id', $request->id);

        // Arrive visitor
        $this->actingAs($guard)
            ->postJson("/api/v1/visitor-requests/{$request->id}/arrive")
            ->assertStatus(200);

        // UAT-SG-02: Incident reporting
        $this->actingAs($guard)
            ->postJson('/api/v1/security/incidents', [
                'compoundId' => $compound->id,
                'title' => 'UAT Noise Complaint',
                'description' => 'Loud music in Building A',
                'type' => 'other',
                'occurredAt' => now()->toIso8601String(),
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
        $fr = User::where('email', 'finance-reviewer@uat.compound.local')->firstOrFail();


        // UAT-FR-01: Unit account and ledger entry
        $unitAccount = \App\Models\Finance\UnitAccount::where('unit_id', $unit->id)->firstOrFail();
        $unitAccount->update(['balance' => 1000]);

        $this->actingAs($fr)
            ->postJson("/api/v1/finance/unit-accounts/{$unitAccount->id}/ledger-entries", [
                'amount' => 500,
                'type' => 'charge',
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
        $bm = User::where('email', 'board-member@uat.compound.local')->firstOrFail();


        // UAT-BM-02: Meeting management
        $this->actingAs($bm)
            ->postJson('/api/v1/meetings', [
                'compoundId' => $compound->id,
                'title' => 'UAT General Assembly',
                'scheduledAt' => now()->addDays(7)->toIso8601String(),
                'location' => 'UAT Clubhouse',
                'scope' => 'association',
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
        $resident = User::where('email', 'resident-owner@uat.compound.local')->firstOrFail();


        // UAT-RO-02: Issue submission
        $this->actingAs($resident)
            ->postJson('/api/v1/issues', [
                'unitId' => $unit->id,
                'title' => 'UAT Leak',
                'description' => 'Water leaking from ceiling',
                'category' => 'maintenance',
                'priority' => 'normal',
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
        $agent = User::where('email', 'support-agent@uat.compound.local')->firstOrFail();

        $user = User::factory()->create();

        // UAT-AGT-01: User duplicate detection
        $this->actingAs($agent)
            ->getJson("/api/v1/users/{$user->id}/duplicates")
            ->assertStatus(200);
    }
}
