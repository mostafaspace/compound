<?php

namespace Tests\Feature\Api\V1;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Models\Announcements\Announcement;
use App\Models\Governance\Vote;
use App\Models\Governance\VoteOption;
use App\Models\Governance\VoteParticipation;
use App\Models\Issues\Issue;
use App\Models\Property\Building;
use App\Models\Property\Compound;
use App\Models\Property\Unit;
use App\Models\User;
use App\Models\Visitors\VisitorRequest;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

// CM-111: Operational analytics – permission enforcement, metric counts, filters
class OperationalAnalyticsTest extends TestCase
{
    use RefreshDatabase;

    private const ENDPOINT = '/api/v1/analytics/operational';

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private function makeAdmin(array $attrs = []): User
    {
        return User::factory()->create(array_merge([
            'role' => UserRole::SuperAdmin->value,
            'status' => AccountStatus::Active->value,
        ], $attrs));
    }

    private function makeUser(array $attrs = []): User
    {
        return User::factory()->create(array_merge([
            'role' => UserRole::ResidentOwner->value,
            'status' => AccountStatus::Active->value,
        ], $attrs));
    }

    // ─── Permission enforcement ───────────────────────────────────────────────

    public function test_unauthenticated_request_returns_401(): void
    {
        $this->getJson(self::ENDPOINT)->assertUnauthorized();
    }

    public function test_resident_is_forbidden(): void
    {
        Sanctum::actingAs($this->makeUser(['role' => UserRole::ResidentOwner->value]));
        $this->getJson(self::ENDPOINT)->assertForbidden();
    }

    public function test_board_member_is_forbidden(): void
    {
        Sanctum::actingAs($this->makeUser(['role' => UserRole::BoardMember->value]));
        $this->getJson(self::ENDPOINT)->assertForbidden();
    }

    public function test_super_admin_can_access(): void
    {
        Sanctum::actingAs($this->makeAdmin());
        $this->getJson(self::ENDPOINT)->assertOk();
    }

    public function test_compound_admin_can_access(): void
    {
        $compound = Compound::factory()->create();
        Sanctum::actingAs($this->makeAdmin([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => $compound->id,
        ]));
        $this->getJson(self::ENDPOINT)->assertOk();
    }

    public function test_support_agent_can_access(): void
    {
        $compound = Compound::factory()->create();
        Sanctum::actingAs($this->makeAdmin([
            'role' => UserRole::SupportAgent->value,
            'compound_id' => $compound->id,
        ]));
        $this->getJson(self::ENDPOINT)->assertOk();
    }

    // ─── Response structure ───────────────────────────────────────────────────

    public function test_response_contains_all_metric_sections(): void
    {
        Sanctum::actingAs($this->makeAdmin());

        $this->getJson(self::ENDPOINT)
            ->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'users' => ['total', 'active', 'invited', 'pendingReview', 'suspended', 'archived'],
                    'invitations' => ['total', 'pending', 'accepted', 'revoked', 'expired'],
                    'verifications' => ['total', 'pendingReview', 'moreInfoRequested', 'approved', 'rejected'],
                    'documents' => ['total', 'submitted', 'approved', 'rejected'],
                    'visitors' => ['total', 'pending', 'allowed', 'denied', 'completed', 'cancelled'],
                    'issues' => ['total', 'new', 'inProgress', 'escalated', 'resolved', 'closed'],
                    'announcements' => ['total', 'draft', 'published', 'archived', 'requiresAckCount', 'ackCount'],
                    'votes' => ['total', 'draft', 'active', 'closed', 'cancelled', 'participations'],
                    'generatedAt',
                ],
            ]);
    }

    // ─── User metric counts ───────────────────────────────────────────────────

    public function test_user_counts_are_scoped_to_compound(): void
    {
        $compound = Compound::factory()->create();

        // 2 active + 1 suspended in target compound
        User::factory()->count(2)->create([
            'compound_id' => $compound->id,
            'status' => AccountStatus::Active->value,
        ]);
        User::factory()->create([
            'compound_id' => $compound->id,
            'status' => AccountStatus::Suspended->value,
        ]);

        // 1 active in a different compound — must NOT appear
        User::factory()->create([
            'compound_id' => Compound::factory()->create()->id,
            'status' => AccountStatus::Active->value,
        ]);

        // Use super_admin (no compound_id) + X-Compound-Id header so the caller
        // is not themselves counted in the compound's user metrics.
        Sanctum::actingAs($this->makeAdmin());

        $this->getJson(self::ENDPOINT, ['X-Compound-Id' => $compound->id])
            ->assertOk()
            ->assertJsonPath('data.users.active', 2)
            ->assertJsonPath('data.users.suspended', 1);
    }

    // ─── Issue metric counts ──────────────────────────────────────────────────

    public function test_issue_counts_are_scoped_to_compound(): void
    {
        $compound = Compound::factory()->create();
        $building = Building::factory()->create(['compound_id' => $compound->id]);

        Issue::factory()->count(2)->create([
            'compound_id' => $compound->id,
            'building_id' => $building->id,
            'status' => 'new',
        ]);
        Issue::factory()->create([
            'compound_id' => $compound->id,
            'building_id' => $building->id,
            'status' => 'escalated',
        ]);

        // Issue in a different compound — must NOT appear
        $other = Compound::factory()->create();
        $otherBuild = Building::factory()->create(['compound_id' => $other->id]);
        Issue::factory()->create([
            'compound_id' => $other->id,
            'building_id' => $otherBuild->id,
            'status' => 'new',
        ]);

        $admin = $this->makeAdmin([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => $compound->id,
        ]);
        Sanctum::actingAs($admin);

        $this->getJson(self::ENDPOINT)
            ->assertOk()
            ->assertJsonPath('data.issues.new', 2)
            ->assertJsonPath('data.issues.escalated', 1)
            ->assertJsonPath('data.issues.total', 3);
    }

    // ─── Building filter ──────────────────────────────────────────────────────

    public function test_building_filter_scopes_visitors_and_issues(): void
    {
        $compound = Compound::factory()->create();
        $buildingA = Building::factory()->create(['compound_id' => $compound->id]);
        $buildingB = Building::factory()->create(['compound_id' => $compound->id]);

        $unitA = Unit::factory()->create([
            'compound_id' => $compound->id,
            'building_id' => $buildingA->id,
        ]);
        $unitB = Unit::factory()->create([
            'compound_id' => $compound->id,
            'building_id' => $buildingB->id,
        ]);

        VisitorRequest::factory()->create(['unit_id' => $unitA->id, 'status' => 'completed']);
        VisitorRequest::factory()->create(['unit_id' => $unitB->id, 'status' => 'completed']);

        Issue::factory()->create(['compound_id' => $compound->id, 'building_id' => $buildingA->id]);
        Issue::factory()->create(['compound_id' => $compound->id, 'building_id' => $buildingB->id]);

        Sanctum::actingAs($this->makeAdmin());

        $this->getJson(self::ENDPOINT.'?buildingId='.$buildingA->id)
            ->assertOk()
            ->assertJsonPath('data.visitors.total', 1)
            ->assertJsonPath('data.issues.total', 1);
    }

    // ─── Date range filter ────────────────────────────────────────────────────

    public function test_date_filter_excludes_old_records(): void
    {
        $compound = Compound::factory()->create();
        $building = Building::factory()->create(['compound_id' => $compound->id]);

        // Recent issue
        Issue::factory()->create([
            'compound_id' => $compound->id,
            'building_id' => $building->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Old issue — 30 days ago
        Issue::factory()->create([
            'compound_id' => $compound->id,
            'building_id' => $building->id,
            'created_at' => now()->subDays(30),
            'updated_at' => now()->subDays(30),
        ]);

        Sanctum::actingAs($this->makeAdmin());

        $from = now()->subDays(5)->toDateString();
        $to = now()->toDateString();

        $this->getJson(self::ENDPOINT."?from={$from}&to={$to}")
            ->assertOk()
            ->assertJsonPath('data.issues.total', 1);
    }

    // ─── Compound scoping via X-Compound-Id header ────────────────────────────

    public function test_super_admin_can_scope_via_compound_header(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();
        $bldgA = Building::factory()->create(['compound_id' => $compoundA->id]);
        $bldgB = Building::factory()->create(['compound_id' => $compoundB->id]);

        Issue::factory()->count(2)->create(['compound_id' => $compoundA->id, 'building_id' => $bldgA->id]);
        Issue::factory()->create(['compound_id' => $compoundB->id, 'building_id' => $bldgB->id]);

        Sanctum::actingAs($this->makeAdmin());

        // Scoped to A → 2 issues
        $this->getJson(self::ENDPOINT, ['X-Compound-Id' => $compoundA->id])
            ->assertOk()
            ->assertJsonPath('data.issues.total', 2);

        // Scoped to B → 1 issue
        $this->getJson(self::ENDPOINT, ['X-Compound-Id' => $compoundB->id])
            ->assertOk()
            ->assertJsonPath('data.issues.total', 1);

        // No header → all compounds
        $this->getJson(self::ENDPOINT)
            ->assertOk()
            ->assertJsonPath('data.issues.total', 3);
    }

    // ─── Announcement acknowledgement metrics ─────────────────────────────────

    public function test_announcement_ack_metrics_are_accurate(): void
    {
        $compound = Compound::factory()->create();

        $annoId = Str::ulid();
        DB::table('announcements')->insert([
            'id' => $annoId,
            'compound_id' => $compound->id,
            'category' => 'general',
            'status' => 'published',
            'requires_acknowledgement' => true,
            'title_en' => 'Notice',
            'title_ar' => 'إشعار',
            'body_en' => 'Body',
            'body_ar' => 'النص',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $u1 = User::factory()->create();
        $u2 = User::factory()->create();
        DB::table('announcement_acknowledgements')->insert([
            ['announcement_id' => $annoId, 'user_id' => $u1->id, 'acknowledged_at' => now(), 'created_at' => now(), 'updated_at' => now()],
            ['announcement_id' => $annoId, 'user_id' => $u2->id, 'acknowledged_at' => now(), 'created_at' => now(), 'updated_at' => now()],
        ]);

        $admin = $this->makeAdmin([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => $compound->id,
        ]);
        Sanctum::actingAs($admin);

        $this->getJson(self::ENDPOINT)
            ->assertOk()
            ->assertJsonPath('data.announcements.requiresAckCount', 1)
            ->assertJsonPath('data.announcements.ackCount', 2);
    }

    // ─── Vote participation metrics ───────────────────────────────────────────

    public function test_vote_participation_count_is_accurate(): void
    {
        $compound = Compound::factory()->create();
        $creator = $this->makeAdmin();

        $vote = Vote::factory()->create([
            'compound_id' => $compound->id,
            'created_by' => $creator->id,
            'status' => 'active',
        ]);
        $option = VoteOption::factory()->create(['vote_id' => $vote->id]);

        foreach (User::factory()->count(3)->create() as $u) {
            VoteParticipation::create([
                'vote_id' => $vote->id,
                'user_id' => $u->id,
                'option_id' => $option->id,
                'eligibility_snapshot' => [],
            ]);
        }

        $admin = $this->makeAdmin([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => $compound->id,
        ]);
        Sanctum::actingAs($admin);

        $this->getJson(self::ENDPOINT)
            ->assertOk()
            ->assertJsonPath('data.votes.total', 1)
            ->assertJsonPath('data.votes.active', 1)
            ->assertJsonPath('data.votes.participations', 3);
    }

    // ─── Validation ───────────────────────────────────────────────────────────

    public function test_invalid_from_date_fails_validation(): void
    {
        Sanctum::actingAs($this->makeAdmin());
        $this->getJson(self::ENDPOINT.'?from=not-a-date')->assertUnprocessable();
    }

    public function test_to_before_from_fails_validation(): void
    {
        Sanctum::actingAs($this->makeAdmin());
        $this->getJson(self::ENDPOINT.'?from=2026-04-20&to=2026-04-10')->assertUnprocessable();
    }
}
