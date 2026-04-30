<?php
namespace Tests\Feature\Api\V1;

use App\Enums\AnnouncementStatus;
use App\Enums\AuditSeverity;
use App\Enums\UserRole;
use App\Models\Announcements\Announcement;
use App\Models\AuditLog;
use App\Models\Issues\Issue;
use App\Models\Maintenance\WorkOrder;
use App\Models\Meetings\Meeting;
use App\Models\Property\Compound;
use App\Models\User;
use App\Models\UserScopeAssignment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OperationalScopingTest extends TestCase
{
    use RefreshDatabase;

    private function makeScopedUser(UserRole $role, string $compoundId): User
    {
        $user = User::factory()->create([
            'role' => $role->value,
            'compound_id' => null, // Explicitly null to test membership-based scoping
        ]);

        UserScopeAssignment::create([
            'user_id' => $user->id,
            'scope_type' => 'compound',
            'scope_id' => $compoundId,
            'role_name' => $role->value,
        ]);

        return $user;
    }

    // ─── Issues ───────────────────────────────────────────────────────────────

    public function test_scope_assigned_staff_cannot_list_issues_from_other_compounds(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();

        Issue::create([
            'compound_id' => $compoundA->id,
            'title' => 'Issue A',
            'description' => 'Desc A',
            'category' => 'general',
            'status' => 'new',
            'reported_by' => User::factory()->create()->id,
        ]);

        Issue::create([
            'compound_id' => $compoundB->id,
            'title' => 'Issue B',
            'description' => 'Desc B',
            'category' => 'general',
            'status' => 'new',
            'reported_by' => User::factory()->create()->id,
        ]);

        $staff = $this->makeScopedUser(UserRole::FinanceReviewer, $compoundA->id);
        Sanctum::actingAs($staff);

        $response = $this->getJson('/api/v1/issues');
        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
        $this->assertEquals($compoundA->id, $response->json('data.0.compoundId'));
    }

    public function test_scope_assigned_staff_cannot_view_cross_compound_issue(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();

        $issueB = Issue::create([
            'compound_id' => $compoundB->id,
            'title' => 'Issue B',
            'description' => 'Desc B',
            'category' => 'general',
            'status' => 'new',
            'reported_by' => User::factory()->create()->id,
        ]);

        $staff = $this->makeScopedUser(UserRole::FinanceReviewer, $compoundA->id);
        Sanctum::actingAs($staff);

        $this->getJson("/api/v1/issues/{$issueB->id}")
            ->assertForbidden();
    }

    public function test_scope_assigned_staff_cannot_update_cross_compound_issue(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();

        $issueB = Issue::create([
            'compound_id' => $compoundB->id,
            'title' => 'Issue B',
            'description' => 'Desc B',
            'category' => 'general',
            'status' => 'new',
            'reported_by' => User::factory()->create()->id,
        ]);

        $staff = $this->makeScopedUser(UserRole::FinanceReviewer, $compoundA->id);
        Sanctum::actingAs($staff);

        $this->patchJson("/api/v1/issues/{$issueB->id}", ['status' => 'resolved'])
            ->assertForbidden();
    }

    public function test_scope_assigned_staff_cannot_escalate_cross_compound_issue(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();

        $issueB = Issue::create([
            'compound_id' => $compoundB->id,
            'title' => 'Issue B',
            'description' => 'Desc B',
            'category' => 'general',
            'status' => 'new',
            'reported_by' => User::factory()->create()->id,
        ]);

        $staff = $this->makeScopedUser(UserRole::FinanceReviewer, $compoundA->id);
        Sanctum::actingAs($staff);

        $this->postJson("/api/v1/issues/{$issueB->id}/escalate", ['reason' => 'Testing'])
            ->assertForbidden();
    }

    // ─── Announcements ────────────────────────────────────────────────────────

    public function test_scope_assigned_staff_cannot_list_announcements_from_other_compounds(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();

        Announcement::create([
            'compound_id' => $compoundA->id,
            'title_en' => 'Ann A',
            'title_ar' => 'Ann A AR',
            'body_en' => 'Body A',
            'body_ar' => 'Body A AR',
            'category' => 'general',
            'status' => AnnouncementStatus::Published->value,
            'target_type' => 'all',
            'created_by' => User::factory()->create()->id,
        ]);

        Announcement::create([
            'compound_id' => $compoundB->id,
            'title_en' => 'Ann B',
            'title_ar' => 'Ann B AR',
            'body_en' => 'Body B',
            'body_ar' => 'Body B AR',
            'category' => 'general',
            'status' => AnnouncementStatus::Published->value,
            'target_type' => 'all',
            'created_by' => User::factory()->create()->id,
        ]);

        $staff = $this->makeScopedUser(UserRole::SupportAgent, $compoundA->id);
        Sanctum::actingAs($staff);

        $response = $this->getJson('/api/v1/announcements');
        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
    }

    public function test_scope_assigned_staff_cannot_view_cross_compound_announcement(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();

        $announcementB = Announcement::create([
            'compound_id' => $compoundB->id,
            'title_en' => 'Ann B',
            'title_ar' => 'Ann B AR',
            'body_en' => 'Body B',
            'body_ar' => 'Body B AR',
            'category' => 'general',
            'status' => AnnouncementStatus::Published->value,
            'target_type' => 'all',
            'created_by' => User::factory()->create()->id,
        ]);

        $staff = $this->makeScopedUser(UserRole::SupportAgent, $compoundA->id);
        Sanctum::actingAs($staff);

        $this->getJson("/api/v1/announcements/{$announcementB->id}")
            ->assertForbidden();
    }

    public function test_scope_assigned_staff_cannot_update_cross_compound_announcement(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();

        $announcementB = Announcement::create([
            'compound_id' => $compoundB->id,
            'title_en' => 'Ann B',
            'title_ar' => 'Ann B AR',
            'body_en' => 'Body B',
            'body_ar' => 'Body B AR',
            'category' => 'general',
            'status' => AnnouncementStatus::Draft->value,
            'target_type' => 'all',
            'created_by' => User::factory()->create()->id,
        ]);

        $staff = $this->makeScopedUser(UserRole::SupportAgent, $compoundA->id);
        Sanctum::actingAs($staff);

        $this->patchJson("/api/v1/announcements/{$announcementB->id}", ['title_en' => 'Hacked'])
            ->assertForbidden();
    }

    public function test_scope_assigned_staff_cannot_archive_cross_compound_announcement(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();

        $announcementB = Announcement::create([
            'compound_id' => $compoundB->id,
            'title_en' => 'Ann B',
            'title_ar' => 'Ann B AR',
            'body_en' => 'Body B',
            'body_ar' => 'Body B AR',
            'category' => 'general',
            'status' => AnnouncementStatus::Published->value,
            'target_type' => 'all',
            'created_by' => User::factory()->create()->id,
        ]);

        $staff = $this->makeScopedUser(UserRole::SupportAgent, $compoundA->id);
        Sanctum::actingAs($staff);

        $this->postJson("/api/v1/announcements/{$announcementB->id}/archive")
            ->assertForbidden();
    }

    public function test_scope_assigned_staff_cannot_create_announcement_in_other_compound(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();

        $staff = $this->makeScopedUser(UserRole::SupportAgent, $compoundA->id);
        Sanctum::actingAs($staff);

        $this->postJson('/api/v1/announcements', [
            'compoundId' => $compoundB->id,
            'titleEn' => 'Hacked',
            'bodyEn' => 'Hacked',
            'category' => 'general',
            'targetType' => 'compound'
        ])->assertForbidden();
    }

    // ─── Audit Logs ───────────────────────────────────────────────────────────

    public function test_scope_assigned_staff_cannot_list_audit_logs_from_other_compounds(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();

        // Actor from Compound A
        $actorA = User::factory()->create(['compound_id' => $compoundA->id]);
        AuditLog::create([
            'actor_id' => $actorA->id,
            'action' => 'test.action',
            'severity' => AuditSeverity::Info,
        ]);

        // Actor from Compound B
        $actorB = User::factory()->create(['compound_id' => $compoundB->id]);
        AuditLog::create([
            'actor_id' => $actorB->id,
            'action' => 'test.action',
            'severity' => AuditSeverity::Info,
        ]);

        $staff = $this->makeScopedUser(UserRole::CompoundAdmin, $compoundA->id);
        Sanctum::actingAs($staff);

        $response = $this->getJson('/api/v1/audit-logs');
        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
    }

    // ─── Meetings ─────────────────────────────────────────────────────────────

    public function test_scope_assigned_staff_cannot_list_meetings_from_other_compounds(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();

        Meeting::create([
            'compound_id' => $compoundA->id,
            'title' => 'Meeting A',
            'scope' => 'association',
            'status' => 'draft',
            'created_by' => User::factory()->create()->id,
        ]);

        Meeting::create([
            'compound_id' => $compoundB->id,
            'title' => 'Meeting B',
            'scope' => 'association',
            'status' => 'draft',
            'created_by' => User::factory()->create()->id,
        ]);

        $staff = $this->makeScopedUser(UserRole::CompoundAdmin, $compoundA->id);
        Sanctum::actingAs($staff);

        $response = $this->getJson('/api/v1/meetings');
        $response->assertOk();
        $this->assertCount(1, $response->json('data.data'));
    }

    public function test_scope_assigned_staff_cannot_view_cross_compound_meeting(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();

        $meetingB = Meeting::create([
            'compound_id' => $compoundB->id,
            'title' => 'Meeting B',
            'scope' => 'association',
            'status' => 'draft',
            'created_by' => User::factory()->create()->id,
        ]);

        $staff = $this->makeScopedUser(UserRole::CompoundAdmin, $compoundA->id);
        Sanctum::actingAs($staff);

        $this->getJson("/api/v1/meetings/{$meetingB->id}")
            ->assertForbidden();
    }

    public function test_scope_assigned_staff_cannot_update_cross_compound_meeting(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();

        $meetingB = Meeting::create([
            'compound_id' => $compoundB->id,
            'title' => 'Meeting B',
            'scope' => 'association',
            'status' => 'draft',
            'created_by' => User::factory()->create()->id,
        ]);

        $staff = $this->makeScopedUser(UserRole::CompoundAdmin, $compoundA->id);
        Sanctum::actingAs($staff);

        $this->patchJson("/api/v1/meetings/{$meetingB->id}", ['title' => 'Hacked'])
            ->assertForbidden();
    }

    public function test_scope_assigned_staff_cannot_cancel_cross_compound_meeting(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();

        $meetingB = Meeting::create([
            'compound_id' => $compoundB->id,
            'title' => 'Meeting B',
            'scope' => 'association',
            'status' => 'draft',
            'created_by' => User::factory()->create()->id,
        ]);

        $staff = $this->makeScopedUser(UserRole::CompoundAdmin, $compoundA->id);
        Sanctum::actingAs($staff);

        $this->postJson("/api/v1/meetings/{$meetingB->id}/cancel")
            ->assertForbidden();
    }

    // ─── Work Orders ──────────────────────────────────────────────────────────

    public function test_scope_assigned_staff_cannot_list_work_orders_from_other_compounds(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();

        WorkOrder::create([
            'compound_id' => $compoundA->id,
            'title' => 'WO A',
            'category' => 'plumbing',
            'status' => 'draft',
            'created_by' => User::factory()->create()->id,
        ]);

        WorkOrder::create([
            'compound_id' => $compoundB->id,
            'title' => 'WO B',
            'category' => 'electrical',
            'status' => 'draft',
            'created_by' => User::factory()->create()->id,
        ]);

        $staff = $this->makeScopedUser(UserRole::CompoundAdmin, $compoundA->id);
        Sanctum::actingAs($staff);

        $response = $this->getJson('/api/v1/work-orders');
        $response->assertOk();
        $this->assertCount(1, $response->json('data.data'));
    }

    public function test_scope_assigned_staff_cannot_view_cross_compound_work_order(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();

        $woB = WorkOrder::create([
            'compound_id' => $compoundB->id,
            'title' => 'WO B',
            'category' => 'electrical',
            'status' => 'draft',
            'created_by' => User::factory()->create()->id,
        ]);

        $staff = $this->makeScopedUser(UserRole::CompoundAdmin, $compoundA->id);
        Sanctum::actingAs($staff);

        $this->getJson("/api/v1/work-orders/{$woB->id}")
            ->assertForbidden();
    }

    public function test_scope_assigned_staff_cannot_update_cross_compound_work_order(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();

        $woB = WorkOrder::create([
            'compound_id' => $compoundB->id,
            'title' => 'WO B',
            'category' => 'electrical',
            'status' => 'draft',
            'created_by' => User::factory()->create()->id,
        ]);

        $staff = $this->makeScopedUser(UserRole::CompoundAdmin, $compoundA->id);
        Sanctum::actingAs($staff);

        $this->patchJson("/api/v1/work-orders/{$woB->id}", ['title' => 'Hacked'])
            ->assertForbidden();
    }
}
