<?php

namespace Tests\Feature\Api\V1;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Models\Meetings\Meeting;
use App\Models\Meetings\MeetingActionItem;
use App\Models\Meetings\MeetingMinutes;
use App\Models\Meetings\MeetingParticipant;
use App\Models\Property\Compound;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

// CM-117: Governance meetings – permission enforcement, lifecycle, scoping
class MeetingsTest extends TestCase
{
    use RefreshDatabase;

    private const BASE = '/api/v1/meetings';

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private function makeAdmin(array $attrs = []): User
    {
        return User::factory()->create(array_merge([
            'role'   => UserRole::SuperAdmin->value,
            'status' => AccountStatus::Active->value,
        ], $attrs));
    }

    private function makeBoard(Compound $compound): User
    {
        return User::factory()->create([
            'role'        => UserRole::BoardMember->value,
            'status'      => AccountStatus::Active->value,
            'compound_id' => $compound->id,
        ]);
    }

    private function makeResident(array $attrs = []): User
    {
        return User::factory()->create(array_merge([
            'role'   => UserRole::ResidentOwner->value,
            'status' => AccountStatus::Active->value,
        ], $attrs));
    }

    // ─── Permission enforcement ───────────────────────────────────────────────

    public function test_unauthenticated_cannot_list_meetings(): void
    {
        $this->getJson(self::BASE)->assertUnauthorized();
    }

    public function test_resident_cannot_create_meeting(): void
    {
        $compound = Compound::factory()->create();
        Sanctum::actingAs($this->makeResident(['compound_id' => $compound->id]));

        $this->postJson(self::BASE, [
            'compoundId' => $compound->id,
            'title'      => 'AGM',
            'scope'      => 'association',
        ])->assertForbidden();
    }

    public function test_super_admin_can_list_meetings(): void
    {
        Sanctum::actingAs($this->makeAdmin());
        $this->getJson(self::BASE)->assertOk();
    }

    public function test_board_member_can_list_meetings(): void
    {
        $compound = Compound::factory()->create();
        Sanctum::actingAs($this->makeBoard($compound));
        $this->getJson(self::BASE)->assertOk();
    }

    // ─── Meeting CRUD ─────────────────────────────────────────────────────────

    public function test_admin_can_create_meeting(): void
    {
        $compound = Compound::factory()->create();
        Sanctum::actingAs($this->makeAdmin());

        $this->postJson(self::BASE, [
            'compoundId'  => $compound->id,
            'title'       => 'Annual General Meeting',
            'scope'       => 'association',
            'scheduledAt' => now()->addDays(7)->toDateTimeString(),
            'location'    => 'Community Hall',
        ])
            ->assertCreated()
            ->assertJsonPath('data.title', 'Annual General Meeting')
            ->assertJsonPath('data.status', 'draft')
            ->assertJsonPath('data.scope', 'association');
    }

    public function test_admin_can_update_meeting(): void
    {
        $compound = Compound::factory()->create();
        $admin    = $this->makeAdmin();
        $meeting  = Meeting::factory()->create([
            'compound_id' => $compound->id,
            'created_by'  => $admin->id,
        ]);

        Sanctum::actingAs($admin);

        $this->patchJson(self::BASE."/{$meeting->id}", [
            'status'   => 'scheduled',
            'location' => 'Board Room',
        ])
            ->assertOk()
            ->assertJsonPath('data.status', 'scheduled')
            ->assertJsonPath('data.location', 'Board Room');
    }

    public function test_admin_can_cancel_meeting(): void
    {
        $compound = Compound::factory()->create();
        $admin    = $this->makeAdmin();
        $meeting  = Meeting::factory()->scheduled()->create([
            'compound_id' => $compound->id,
            'created_by'  => $admin->id,
        ]);

        Sanctum::actingAs($admin);

        $this->postJson(self::BASE."/{$meeting->id}/cancel")
            ->assertOk()
            ->assertJsonPath('data.status', 'cancelled');
    }

    public function test_cannot_update_cancelled_meeting(): void
    {
        $admin   = $this->makeAdmin();
        $meeting = Meeting::factory()->cancelled()->create([
            'compound_id' => Compound::factory()->create()->id,
            'created_by'  => $admin->id,
        ]);

        Sanctum::actingAs($admin);

        $this->patchJson(self::BASE."/{$meeting->id}", ['title' => 'New Title'])
            ->assertStatus(422);
    }

    public function test_meetings_are_scoped_to_compound(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();
        $admin     = $this->makeAdmin();

        Meeting::factory()->count(3)->create(['compound_id' => $compoundA->id, 'created_by' => $admin->id]);
        Meeting::factory()->create(['compound_id' => $compoundB->id, 'created_by' => $admin->id]);

        Sanctum::actingAs($admin);

        $response = $this->getJson(self::BASE, ['X-Compound-Id' => $compoundA->id]);
        $response->assertOk();
        $this->assertSame(3, $response->json('data.total'));
    }

    // ─── Agenda items ─────────────────────────────────────────────────────────

    public function test_admin_can_add_agenda_item(): void
    {
        $admin   = $this->makeAdmin();
        $meeting = Meeting::factory()->create([
            'compound_id' => Compound::factory()->create()->id,
            'created_by'  => $admin->id,
        ]);

        Sanctum::actingAs($admin);

        $this->postJson(self::BASE."/{$meeting->id}/agenda", [
            'title'           => 'Budget review',
            'durationMinutes' => 20,
        ])
            ->assertCreated()
            ->assertJsonPath('data.title', 'Budget review')
            ->assertJsonPath('data.duration_minutes', 20);
    }

    public function test_agenda_item_auto_assigns_position(): void
    {
        $admin   = $this->makeAdmin();
        $meeting = Meeting::factory()->create([
            'compound_id' => Compound::factory()->create()->id,
            'created_by'  => $admin->id,
        ]);

        Sanctum::actingAs($admin);

        $r1 = $this->postJson(self::BASE."/{$meeting->id}/agenda", ['title' => 'Item 1']);
        $r2 = $this->postJson(self::BASE."/{$meeting->id}/agenda", ['title' => 'Item 2']);

        $r1->assertCreated();
        $r2->assertCreated();
        $this->assertGreaterThan($r1->json('data.position'), $r2->json('data.position'));
    }

    public function test_admin_can_delete_agenda_item(): void
    {
        $admin   = $this->makeAdmin();
        $meeting = Meeting::factory()->create([
            'compound_id' => Compound::factory()->create()->id,
            'created_by'  => $admin->id,
        ]);

        Sanctum::actingAs($admin);

        $item = $this->postJson(self::BASE."/{$meeting->id}/agenda", ['title' => 'Delete me'])
            ->assertCreated()
            ->json('data');

        $this->deleteJson(self::BASE."/{$meeting->id}/agenda/{$item['id']}")
            ->assertNoContent();
    }

    // ─── Participants ─────────────────────────────────────────────────────────

    public function test_admin_can_invite_participants(): void
    {
        $admin   = $this->makeAdmin();
        $meeting = Meeting::factory()->create([
            'compound_id' => Compound::factory()->create()->id,
            'created_by'  => $admin->id,
        ]);
        $user1   = User::factory()->create();
        $user2   = User::factory()->create();

        Sanctum::actingAs($admin);

        $this->postJson(self::BASE."/{$meeting->id}/participants", [
            'userIds' => [$user1->id, $user2->id],
        ])
            ->assertCreated();

        $this->assertDatabaseCount('meeting_participants', 2);
    }

    public function test_inviting_same_user_twice_is_idempotent(): void
    {
        $admin   = $this->makeAdmin();
        $meeting = Meeting::factory()->create([
            'compound_id' => Compound::factory()->create()->id,
            'created_by'  => $admin->id,
        ]);
        $user = User::factory()->create();

        Sanctum::actingAs($admin);

        $this->postJson(self::BASE."/{$meeting->id}/participants", ['userIds' => [$user->id]]);
        $this->postJson(self::BASE."/{$meeting->id}/participants", ['userIds' => [$user->id]]);

        $this->assertDatabaseCount('meeting_participants', 1);
    }

    public function test_admin_can_confirm_attendance(): void
    {
        $admin       = $this->makeAdmin();
        $meeting     = Meeting::factory()->create([
            'compound_id' => Compound::factory()->create()->id,
            'created_by'  => $admin->id,
        ]);
        $participant = MeetingParticipant::create([
            'meeting_id'   => $meeting->id,
            'user_id'      => User::factory()->create()->id,
            'rsvp_status'  => 'accepted',
            'invited_at'   => now(),
            'attended'     => false,
        ]);

        Sanctum::actingAs($admin);

        $this->postJson(self::BASE."/{$meeting->id}/participants/{$participant->id}/confirm-attendance", [
            'attended' => true,
        ])
            ->assertOk()
            ->assertJsonPath('data.attended', true);
    }

    // ─── Minutes ─────────────────────────────────────────────────────────────

    public function test_admin_can_write_and_publish_minutes(): void
    {
        $admin   = $this->makeAdmin();
        $meeting = Meeting::factory()->completed()->create([
            'compound_id' => Compound::factory()->create()->id,
            'created_by'  => $admin->id,
        ]);

        Sanctum::actingAs($admin);

        // Write minutes
        $this->postJson(self::BASE."/{$meeting->id}/minutes", [
            'body' => 'Meeting called to order at 18:00. Quorum present.',
        ])
            ->assertCreated()
            ->assertJsonPath('data.published_at', null);

        // Publish minutes
        $this->postJson(self::BASE."/{$meeting->id}/minutes/publish")
            ->assertOk()
            ->assertJsonPath('data.published_at', fn ($v) => $v !== null);
    }

    public function test_cannot_write_minutes_twice(): void
    {
        $admin   = $this->makeAdmin();
        $meeting = Meeting::factory()->completed()->create([
            'compound_id' => Compound::factory()->create()->id,
            'created_by'  => $admin->id,
        ]);

        Sanctum::actingAs($admin);

        $this->postJson(self::BASE."/{$meeting->id}/minutes", ['body' => 'First draft']);
        $this->postJson(self::BASE."/{$meeting->id}/minutes", ['body' => 'Second draft'])
            ->assertStatus(422);
    }

    public function test_admin_can_update_minutes(): void
    {
        $admin   = $this->makeAdmin();
        $meeting = Meeting::factory()->completed()->create([
            'compound_id' => Compound::factory()->create()->id,
            'created_by'  => $admin->id,
        ]);

        MeetingMinutes::create([
            'meeting_id' => $meeting->id,
            'body'       => 'Initial draft.',
            'created_by' => $admin->id,
        ]);

        Sanctum::actingAs($admin);

        $this->patchJson(self::BASE."/{$meeting->id}/minutes", [
            'body' => 'Updated minutes with corrections.',
        ])
            ->assertOk()
            ->assertJsonPath('data.body', 'Updated minutes with corrections.');
    }

    // ─── Action items ─────────────────────────────────────────────────────────

    public function test_admin_can_create_action_item(): void
    {
        $admin   = $this->makeAdmin();
        $meeting = Meeting::factory()->completed()->create([
            'compound_id' => Compound::factory()->create()->id,
            'created_by'  => $admin->id,
        ]);
        $assignee = User::factory()->create();

        Sanctum::actingAs($admin);

        $this->postJson(self::BASE."/{$meeting->id}/action-items", [
            'title'      => 'Update maintenance budget',
            'assignedTo' => $assignee->id,
            'dueDate'    => now()->addDays(14)->toDateString(),
        ])
            ->assertCreated()
            ->assertJsonPath('data.title', 'Update maintenance budget')
            ->assertJsonPath('data.status', 'open');
    }

    public function test_admin_can_mark_action_item_done(): void
    {
        $admin   = $this->makeAdmin();
        $meeting = Meeting::factory()->completed()->create([
            'compound_id' => Compound::factory()->create()->id,
            'created_by'  => $admin->id,
        ]);
        $item = MeetingActionItem::factory()->create([
            'meeting_id' => $meeting->id,
            'created_by' => $admin->id,
        ]);

        Sanctum::actingAs($admin);

        $this->patchJson(self::BASE."/{$meeting->id}/action-items/{$item->id}", [
            'status' => 'done',
        ])
            ->assertOk()
            ->assertJsonPath('data.status', 'done')
            ->assertJsonPath('data.completed_at', fn ($v) => $v !== null);
    }

    public function test_action_items_status_validation(): void
    {
        $admin   = $this->makeAdmin();
        $meeting = Meeting::factory()->create([
            'compound_id' => Compound::factory()->create()->id,
            'created_by'  => $admin->id,
        ]);
        $item = MeetingActionItem::factory()->create([
            'meeting_id' => $meeting->id,
            'created_by' => $admin->id,
        ]);

        Sanctum::actingAs($admin);

        $this->patchJson(self::BASE."/{$meeting->id}/action-items/{$item->id}", [
            'status' => 'invalid_status',
        ])->assertUnprocessable();
    }

    // ─── RSVP ────────────────────────────────────────────────────────────────

    public function test_resident_can_rsvp_to_meeting(): void
    {
        $compound = Compound::factory()->create();
        $resident = $this->makeResident(['compound_id' => $compound->id]);
        $admin    = $this->makeAdmin();
        $meeting  = Meeting::factory()->scheduled()->create([
            'compound_id' => $compound->id,
            'created_by'  => $admin->id,
        ]);
        MeetingParticipant::create([
            'meeting_id'  => $meeting->id,
            'user_id'     => $resident->id,
            'rsvp_status' => 'pending',
            'invited_at'  => now(),
        ]);

        Sanctum::actingAs($resident);

        $this->postJson(self::BASE."/{$meeting->id}/rsvp", ['status' => 'accepted'])
            ->assertOk()
            ->assertJsonPath('data.rsvp_status', 'accepted');
    }

    // ─── Decisions ───────────────────────────────────────────────────────────

    public function test_admin_can_record_decision(): void
    {
        $admin   = $this->makeAdmin();
        $meeting = Meeting::factory()->completed()->create([
            'compound_id' => Compound::factory()->create()->id,
            'created_by'  => $admin->id,
        ]);

        Sanctum::actingAs($admin);

        $this->postJson(self::BASE."/{$meeting->id}/decisions", [
            'title'       => 'Approve 2026 maintenance budget',
            'description' => 'Voted 7-2 in favour.',
        ])
            ->assertCreated()
            ->assertJsonPath('data.title', 'Approve 2026 maintenance budget');
    }

    // ─── Validation ──────────────────────────────────────────────────────────

    public function test_meeting_title_is_required(): void
    {
        $compound = Compound::factory()->create();
        Sanctum::actingAs($this->makeAdmin());

        $this->postJson(self::BASE, ['compoundId' => $compound->id, 'scope' => 'association'])
            ->assertUnprocessable();
    }

    public function test_meeting_scope_must_be_valid(): void
    {
        $compound = Compound::factory()->create();
        Sanctum::actingAs($this->makeAdmin());

        $this->postJson(self::BASE, [
            'compoundId' => $compound->id,
            'title'      => 'Test',
            'scope'      => 'invalid_scope',
        ])->assertUnprocessable();
    }
}
