<?php

namespace Tests\Feature\Api\V1;

use App\Enums\AccountStatus;
use App\Enums\NotificationCategory;
use App\Enums\UnitRelationType;
use App\Enums\UserRole;
use App\Enums\VerificationStatus;
use App\Models\Issues\Issue;
use App\Models\Issues\IssueAttachment;
use App\Models\Notification;
use App\Models\Property\Building;
use App\Models\Property\Compound;
use App\Models\Property\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class IssuesTest extends TestCase
{
    use RefreshDatabase;

    // ──────────────────────────────────────────────────────────
    // Issue creation
    // ──────────────────────────────────────────────────────────

    public function test_resident_can_create_issue_with_category_and_location(): void
    {
        [$resident, $unit] = $this->residentWithVerifiedUnit();
        Sanctum::actingAs($resident);

        $response = $this->postJson('/api/v1/issues', [
            'buildingId' => $unit->building_id,
            'category' => 'maintenance',
            'title' => 'Water leak in bathroom',
            'description' => 'There is a persistent water leak under the bathroom sink.',
            'priority' => 'high',
        ])
            ->assertCreated()
            ->assertJsonPath('data.category', 'maintenance')
            ->assertJsonPath('data.priority', 'high')
            ->assertJsonPath('data.status', 'new')
            ->assertJsonPath('data.reportedBy', $resident->id);

        $this->assertDatabaseHas('issues', [
            'id' => $response->json('data.id'),
            'reported_by' => $resident->id,
            'category' => 'maintenance',
            'status' => 'new',
        ]);

        $this->assertDatabaseHas('audit_logs', [
            'actor_id' => $resident->id,
            'action' => 'issue.created',
        ]);
    }

    public function test_issue_requires_either_unit_or_building(): void
    {
        [$resident] = $this->residentWithVerifiedUnit();
        Sanctum::actingAs($resident);

        $this->postJson('/api/v1/issues', [
            'category' => 'maintenance',
            'title' => 'General complaint',
            'description' => 'No location specified.',
        ])->assertUnprocessable();
    }

    public function test_issue_validates_required_fields(): void
    {
        [$resident] = $this->residentWithVerifiedUnit();
        Sanctum::actingAs($resident);

        $this->postJson('/api/v1/issues', [])->assertUnprocessable();
    }

    public function test_resident_can_view_own_issues(): void
    {
        [$resident, $unit] = $this->residentWithVerifiedUnit();
        $compound = $unit->compound;
        $building = $unit->building;

        Issue::factory()->create([
            'compound_id' => $compound->id,
            'building_id' => $building->id,
            'unit_id' => $unit->id,
            'reported_by' => $resident->id,
            'category' => 'noise',
            'title' => 'Loud music from neighbor',
        ]);

        Issue::factory()->create([
            'compound_id' => $compound->id,
            'building_id' => $building->id,
            'reported_by' => User::factory()->create()->id,
            'category' => 'cleaning',
        ]);

        Sanctum::actingAs($resident);

        $this->getJson('/api/v1/my/issues')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'Loud music from neighbor');
    }

    // ──────────────────────────────────────────────────────────
    // Admin index & filters
    // ──────────────────────────────────────────────────────────

    public function test_admin_can_list_all_issues_with_filters(): void
    {
        [$resident, $unit] = $this->residentWithVerifiedUnit();
        $admin = $this->makeScopedAdminForCompound($unit->compound);
        $compound = $unit->compound;
        $building = $unit->building;

        Issue::factory()->create([
            'compound_id' => $compound->id,
            'building_id' => $building->id,
            'reported_by' => $resident->id,
            'category' => 'maintenance',
            'status' => 'new',
        ]);

        Issue::factory()->create([
            'compound_id' => $compound->id,
            'building_id' => $building->id,
            'reported_by' => $resident->id,
            'category' => 'security',
            'status' => 'in_progress',
        ]);

        Sanctum::actingAs($admin);

        // No filters — list all
        $this->getJson('/api/v1/issues')
            ->assertOk()
            ->assertJsonCount(2, 'data');

        // Filter by status
        $this->getJson('/api/v1/issues?status=new')
            ->assertOk()
            ->assertJsonCount(1, 'data');

        // Filter by category
        $this->getJson('/api/v1/issues?category=security')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_admin_can_view_issue_detail(): void
    {
        [$resident, $unit] = $this->residentWithVerifiedUnit();
        $admin = $this->makeScopedAdminForCompound($unit->compound);
        $compound = $unit->compound;
        $building = $unit->building;

        $issue = Issue::factory()->create([
            'compound_id' => $compound->id,
            'building_id' => $building->id,
            'unit_id' => $unit->id,
            'reported_by' => $resident->id,
            'category' => 'maintenance',
            'title' => 'Elevator stuck',
            'description' => 'The elevator on floor 3 does not close its door.',
        ]);

        Sanctum::actingAs($admin);

        $this->getJson("/api/v1/issues/{$issue->id}")
            ->assertOk()
            ->assertJsonPath('data.title', 'Elevator stuck')
            ->assertJsonPath('data.category', 'maintenance');
    }

    // ──────────────────────────────────────────────────────────
    // Status transitions
    // ──────────────────────────────────────────────────────────

    public function test_admin_can_update_issue_status_through_lifecycle(): void
    {
        [$resident, $unit] = $this->residentWithVerifiedUnit();
        $admin = $this->makeScopedAdminForCompound($unit->compound);
        $compound = $unit->compound;

        $issue = Issue::factory()->create([
            'compound_id' => $compound->id,
            'building_id' => $unit->building_id,
            'reported_by' => $resident->id,
            'status' => 'new',
        ]);

        Sanctum::actingAs($admin);

        // New -> In Progress
        $this->patchJson("/api/v1/issues/{$issue->id}", ['status' => 'in_progress'])
            ->assertOk()
            ->assertJsonPath('data.status', 'in_progress');

        // In Progress -> Resolved
        $this->patchJson("/api/v1/issues/{$issue->id}", ['status' => 'resolved'])
            ->assertOk()
            ->assertJsonPath('data.status', 'resolved');

        $this->assertDatabaseHas('issues', [
            'id' => $issue->id,
            'status' => 'resolved',
        ]);
        $issue->refresh();
        $this->assertNotNull($issue->resolved_at);

        // Resolved -> Closed
        $this->patchJson("/api/v1/issues/{$issue->id}", ['status' => 'closed'])
            ->assertOk()
            ->assertJsonPath('data.status', 'closed');

        // Check audit logs
        $this->assertDatabaseHas('audit_logs', [
            'actor_id' => $admin->id,
            'action' => 'issue.updated',
        ]);

        // Check notification was sent to reporter on status change
        $this->assertDatabaseHas('notifications', [
            'user_id' => $resident->id,
            'category' => NotificationCategory::Issues->value,
            'title' => 'Your issue status changed',
        ]);
    }

    // ──────────────────────────────────────────────────────────
    // Assignment
    // ──────────────────────────────────────────────────────────

    public function test_admin_can_reassign_issue(): void
    {
        $assignee = User::factory()->create(['role' => UserRole::SupportAgent->value]);
        [$resident, $unit] = $this->residentWithVerifiedUnit();
        $admin = $this->makeScopedAdminForCompound($unit->compound);

        $issue = Issue::factory()->create([
            'compound_id' => $unit->compound_id,
            'building_id' => $unit->building_id,
            'reported_by' => $resident->id,
            'assigned_to' => null,
        ]);

        Sanctum::actingAs($admin);

        $this->patchJson("/api/v1/issues/{$issue->id}", ['assignedTo' => $assignee->id])
            ->assertOk()
            ->assertJsonPath('data.assignedTo', $assignee->id);

        $this->assertDatabaseHas('issues', [
            'id' => $issue->id,
            'assigned_to' => $assignee->id,
        ]);
    }

    // ──────────────────────────────────────────────────────────
    // Comments
    // ──────────────────────────────────────────────────────────

    public function test_user_can_add_comment_to_issue(): void
    {
        [$resident, $unit] = $this->residentWithVerifiedUnit();
        $compound = $unit->compound;

        $issue = Issue::factory()->create([
            'compound_id' => $compound->id,
            'building_id' => $unit->building_id,
            'reported_by' => $resident->id,
        ]);

        Sanctum::actingAs($resident);

        $this->postJson("/api/v1/issues/{$issue->id}/comments", [
            'body' => 'Could you please provide an update?',
        ])
            ->assertCreated()
            ->assertJsonPath('data.body', 'Could you please provide an update?')
            ->assertJsonPath('data.isInternal', false);

        $this->assertDatabaseHas('issue_comments', [
            'issue_id' => $issue->id,
            'user_id' => $resident->id,
            'is_internal' => false,
        ]);

        $this->assertDatabaseHas('audit_logs', [
            'actor_id' => $resident->id,
            'action' => 'issue.comment_added',
        ]);
    }

    public function test_admin_can_add_internal_comment(): void
    {
        [$resident, $unit] = $this->residentWithVerifiedUnit();
        $admin = $this->makeScopedAdminForCompound($unit->compound);
        $compound = $unit->compound;

        $issue = Issue::factory()->create([
            'compound_id' => $compound->id,
            'building_id' => $unit->building_id,
            'reported_by' => $resident->id,
        ]);

        Sanctum::actingAs($admin);

        $this->postJson("/api/v1/issues/{$issue->id}/comments", [
            'body' => 'Internal: awaiting maintenance vendor call back.',
            'isInternal' => true,
        ])
            ->assertCreated()
            ->assertJsonPath('data.isInternal', true);

        $this->assertDatabaseHas('issue_comments', [
            'issue_id' => $issue->id,
            'is_internal' => true,
        ]);
    }

    public function test_comment_notifies_reporter_when_commenter_is_different(): void
    {
        [$resident, $unit] = $this->residentWithVerifiedUnit();
        $admin = $this->makeScopedAdminForCompound($unit->compound);
        $compound = $unit->compound;

        $issue = Issue::factory()->create([
            'compound_id' => $compound->id,
            'building_id' => $unit->building_id,
            'reported_by' => $resident->id,
        ]);

        Sanctum::actingAs($admin);

        $this->postJson("/api/v1/issues/{$issue->id}/comments", [
            'body' => 'We have scheduled a plumber visit for tomorrow.',
        ])->assertCreated();

        $this->assertDatabaseHas('notifications', [
            'user_id' => $resident->id,
            'category' => NotificationCategory::Issues->value,
            'title' => 'New comment on your issue',
        ]);
    }

    // ──────────────────────────────────────────────────────────
    // Escalation
    // ──────────────────────────────────────────────────────────

    public function test_admin_can_escalate_issue(): void
    {
        [$resident, $unit] = $this->residentWithVerifiedUnit();
        $admin = $this->makeScopedAdminForCompound($unit->compound);
        $compound = $unit->compound;

        $issue = Issue::factory()->create([
            'compound_id' => $compound->id,
            'building_id' => $unit->building_id,
            'reported_by' => $resident->id,
            'assigned_to' => $admin->id,
            'status' => 'in_progress',
        ]);

        Sanctum::actingAs($admin);

        $this->postJson("/api/v1/issues/{$issue->id}/escalate", [
            'reason' => 'Maintenance vendor failed to respond within SLA.',
        ])
            ->assertOk()
            ->assertJsonPath('data.status', 'escalated');

        $issue->refresh();
        $this->assertSame('escalated', $issue->status);
        $this->assertSame('Maintenance vendor failed to respond within SLA.', $issue->metadata['escalationReason'] ?? null);

        $this->assertDatabaseHas('audit_logs', [
            'actor_id' => $admin->id,
            'action' => 'issue.escalated',
        ]);

        // Notification sent to reporter
        $this->assertDatabaseHas('notifications', [
            'user_id' => $resident->id,
            'category' => NotificationCategory::Issues->value,
            'title' => 'Issue escalated',
        ]);
    }

    public function test_escalation_requires_reason(): void
    {
        [$resident, $unit] = $this->residentWithVerifiedUnit();
        $admin = $this->makeScopedAdminForCompound($unit->compound);

        $issue = Issue::factory()->create([
            'compound_id' => $unit->compound_id,
            'building_id' => $unit->building_id,
            'reported_by' => $resident->id,
            'status' => 'in_progress',
        ]);

        Sanctum::actingAs($admin);

        $this->postJson("/api/v1/issues/{$issue->id}/escalate", [])
            ->assertUnprocessable();
    }

    // ──────────────────────────────────────────────────────────
    // Attachments
    // ──────────────────────────────────────────────────────────

    public function test_user_can_upload_attachment_to_issue(): void
    {
        Storage::fake('local');
        config(['filesystems.default' => 'local']);

        [$resident, $unit] = $this->residentWithVerifiedUnit();
        $admin = $this->makeScopedAdminForCompound($unit->compound);
        $compound = $unit->compound;

        $issue = Issue::factory()->create([
            'compound_id' => $compound->id,
            'building_id' => $unit->building_id,
            'reported_by' => $resident->id,
        ]);

        Sanctum::actingAs($admin);

        $this->post("/api/v1/issues/{$issue->id}/attachments", [
            'file' => UploadedFile::fake()->create('leak-photo.jpg', 128, 'image/jpeg'),
        ])
            ->assertCreated()
            ->assertJsonPath('data.originalName', 'leak-photo.jpg');

        $this->assertSame(1, IssueAttachment::query()->where('issue_id', $issue->id)->count());

        $attachment = IssueAttachment::query()->where('issue_id', $issue->id)->first();
        Storage::disk('local')->assertExists($attachment->path);

        $this->assertDatabaseHas('audit_logs', [
            'actor_id' => $admin->id,
            'action' => 'issue.attachment_added',
        ]);
    }

    public function test_admin_can_list_attachments_for_issue(): void
    {
        Storage::fake('local');
        config(['filesystems.default' => 'local']);

        [$resident, $unit] = $this->residentWithVerifiedUnit();
        $admin = $this->makeScopedAdminForCompound($unit->compound);

        $issue = Issue::factory()->create([
            'compound_id' => $unit->compound_id,
            'building_id' => $unit->building_id,
            'reported_by' => $resident->id,
        ]);

        // Create an attachment directly
        IssueAttachment::create([
            'issue_id' => $issue->id,
            'uploaded_by' => $admin->id,
            'disk' => 'local',
            'path' => 'issue-attachments/test/file.jpg',
            'original_name' => 'photo.jpg',
            'mime_type' => 'image/jpeg',
            'size' => 12345,
        ]);

        Sanctum::actingAs($admin);

        $this->getJson("/api/v1/issues/{$issue->id}/attachments")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.originalName', 'photo.jpg');
    }

    // ──────────────────────────────────────────────────────────
    // RBAC
    // ──────────────────────────────────────────────────────────

    public function test_unauthenticated_requests_are_rejected(): void
    {
        $this->getJson('/api/v1/issues')->assertUnauthorized();
        $this->getJson('/api/v1/my/issues')->assertUnauthorized();
        $this->postJson('/api/v1/issues', [])->assertUnauthorized();
    }

    // ──────────────────────────────────────────────────────────
    // Bilingual notifications
    // ──────────────────────────────────────────────────────────

    public function test_issue_notifications_include_arabic_translations(): void
    {
        [$resident, $unit] = $this->residentWithVerifiedUnit();
        $admin = $this->makeScopedAdminForCompound($unit->compound);
        $compound = $unit->compound;

        // Create issue with auto-assigned admin
        $issue = Issue::factory()->create([
            'compound_id' => $compound->id,
            'building_id' => $unit->building_id,
            'reported_by' => $resident->id,
            'assigned_to' => $admin->id,
            'status' => 'new',
        ]);

        Sanctum::actingAs($admin);

        // Update status → notification to reporter
        $this->patchJson("/api/v1/issues/{$issue->id}", ['status' => 'in_progress'])->assertOk();

        $notification = Notification::query()
            ->where('user_id', $resident->id)
            ->where('category', NotificationCategory::Issues->value)
            ->where('title', 'Your issue status changed')
            ->first();

        $this->assertNotNull($notification);
        $this->assertSame('تم تغيير حالة بلاغك', $notification->metadata['titleTranslations']['ar'] ?? null);

        // Escalate → notification to reporter
        $this->postJson("/api/v1/issues/{$issue->id}/escalate", [
            'reason' => 'Vendor SLA breach',
        ])->assertOk();

        $escalateNotif = Notification::query()
            ->where('user_id', $resident->id)
            ->where('title', 'Issue escalated')
            ->first();

        $this->assertNotNull($escalateNotif);
        $this->assertSame('تم تصعيد البلاغ', $escalateNotif->metadata['titleTranslations']['ar'] ?? null);
    }

    // ──────────────────────────────────────────────────────────
    // Helpers
    // ──────────────────────────────────────────────────────────

    public function test_scoped_admin_cannot_access_or_mutate_other_compound_issue(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();
        $buildingB = Building::factory()->for($compoundB)->create();

        $scopedAdmin = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => $compoundA->id,
        ]);
        $reporter = User::factory()->create(['role' => UserRole::ResidentOwner->value]);

        $issue = Issue::factory()->create([
            'compound_id' => $compoundB->id,
            'building_id' => $buildingB->id,
            'reported_by' => $reporter->id,
            'status' => 'in_progress',
        ]);

        Sanctum::actingAs($scopedAdmin);

        $this->getJson("/api/v1/issues/{$issue->id}")->assertForbidden();
        $this->patchJson("/api/v1/issues/{$issue->id}", ['status' => 'resolved'])->assertForbidden();
        $this->postJson("/api/v1/issues/{$issue->id}/escalate", [
            'reason' => 'Cross-compound escalation should be blocked.',
        ])->assertForbidden();
    }

    public function test_membership_scoped_compound_admin_cannot_access_or_mutate_other_compound_issue_when_compound_id_is_null(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();
        $buildingA = Building::factory()->for($compoundA)->create();
        $buildingB = Building::factory()->for($compoundB)->create();
        $unitA = Unit::factory()->for($compoundA)->for($buildingA)->create(['floor_id' => null]);

        $scopedAdmin = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => null,
            'status' => AccountStatus::Active->value,
        ]);
        $unitA->memberships()->create([
            'user_id' => $scopedAdmin->id,
            'relation_type' => UnitRelationType::Owner->value,
            'starts_at' => now()->toDateString(),
            'verification_status' => VerificationStatus::Verified->value,
        ]);

        $reporterA = User::factory()->create(['role' => UserRole::ResidentOwner->value]);
        $reporterB = User::factory()->create(['role' => UserRole::ResidentOwner->value]);

        $issueA = Issue::factory()->create([
            'compound_id' => $compoundA->id,
            'building_id' => $buildingA->id,
            'reported_by' => $reporterA->id,
            'status' => 'in_progress',
        ]);
        $issueB = Issue::factory()->create([
            'compound_id' => $compoundB->id,
            'building_id' => $buildingB->id,
            'reported_by' => $reporterB->id,
            'status' => 'in_progress',
        ]);

        Sanctum::actingAs($scopedAdmin);

        $this->getJson('/api/v1/issues')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $issueA->id);

        $this->getJson("/api/v1/issues/{$issueB->id}")->assertForbidden();
        $this->patchJson("/api/v1/issues/{$issueB->id}", ['status' => 'resolved'])->assertForbidden();
        $this->postJson("/api/v1/issues/{$issueB->id}/escalate", [
            'reason' => 'Cross-compound escalation should be blocked.',
        ])->assertForbidden();
    }

    public function test_scoped_admin_cannot_comment_or_manage_attachments_for_other_compound_issue(): void
    {
        Storage::fake('local');
        config(['filesystems.default' => 'local']);

        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();
        $buildingB = Building::factory()->for($compoundB)->create();

        $scopedAdmin = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => $compoundA->id,
        ]);
        $reporter = User::factory()->create(['role' => UserRole::ResidentOwner->value]);

        $issue = Issue::factory()->create([
            'compound_id' => $compoundB->id,
            'building_id' => $buildingB->id,
            'reported_by' => $reporter->id,
        ]);

        IssueAttachment::create([
            'issue_id' => $issue->id,
            'uploaded_by' => $reporter->id,
            'disk' => 'local',
            'path' => 'issue-attachments/test/cross-compound.jpg',
            'original_name' => 'cross-compound.jpg',
            'mime_type' => 'image/jpeg',
            'size' => 2048,
        ]);

        Sanctum::actingAs($scopedAdmin);

        $this->postJson("/api/v1/issues/{$issue->id}/comments", [
            'body' => 'This should be forbidden.',
        ])->assertForbidden();
        $this->getJson("/api/v1/issues/{$issue->id}/attachments")->assertForbidden();
        $this->post("/api/v1/issues/{$issue->id}/attachments", [
            'file' => UploadedFile::fake()->create('blocked.jpg', 64, 'image/jpeg'),
        ])->assertForbidden();

        $this->assertDatabaseCount('issue_comments', 0);
        $this->assertDatabaseCount('issue_attachments', 1);
    }

    /**
     * @return array{0: User, 1: Unit}
     */
    private function residentWithVerifiedUnit(): array
    {
        $admin = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'status' => AccountStatus::Active->value,
        ]);
        $resident = User::factory()->create([
            'role' => UserRole::ResidentOwner->value,
            'status' => AccountStatus::Active->value,
        ]);
        $unit = $this->makeUnit();

        $unit->memberships()->create([
            'user_id' => $resident->id,
            'relation_type' => UnitRelationType::Owner->value,
            'starts_at' => now()->toDateString(),
            'is_primary' => true,
            'verification_status' => VerificationStatus::Verified->value,
            'created_by' => $admin->id,
        ]);

        return [$resident, $unit];
    }

    private function makeUnit(): Unit
    {
        $compound = Compound::factory()->create();
        $building = Building::factory()->for($compound)->create();

        return Unit::factory()
            ->for($compound)
            ->for($building)
            ->create([
                'floor_id' => null,
                'unit_number' => 'A-101',
            ]);
    }

    private function makeScopedAdminForCompound(Compound $compound): User
    {
        return User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => $compound->id,
            'status' => AccountStatus::Active->value,
        ]);
    }
}
