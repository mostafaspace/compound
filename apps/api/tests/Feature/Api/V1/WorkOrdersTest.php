<?php

namespace Tests\Feature\Api\V1;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Models\Finance\Vendor;
use App\Models\Maintenance\WorkOrder;
use App\Models\Maintenance\WorkOrderEstimate;
use App\Models\Property\Compound;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

// CM-120: Work orders – permission enforcement, lifecycle, estimates, scoping
class WorkOrdersTest extends TestCase
{
    use RefreshDatabase;

    private const BASE = '/api/v1/work-orders';

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private function makeAdmin(array $attrs = []): User
    {
        return User::factory()->create(array_merge([
            'role' => UserRole::SuperAdmin->value,
            'status' => AccountStatus::Active->value,
        ], $attrs));
    }

    private function makeResident(array $attrs = []): User
    {
        return User::factory()->create(array_merge([
            'role' => UserRole::ResidentOwner->value,
            'status' => AccountStatus::Active->value,
        ], $attrs));
    }

    // ─── Permission enforcement ───────────────────────────────────────────────

    public function test_unauthenticated_cannot_list_work_orders(): void
    {
        $this->getJson(self::BASE)->assertUnauthorized();
    }

    public function test_resident_cannot_create_work_order(): void
    {
        $compound = Compound::factory()->create();
        Sanctum::actingAs($this->makeResident(['compound_id' => $compound->id]));

        $this->postJson(self::BASE, [
            'compoundId' => $compound->id,
            'title' => 'Fix pipe',
            'category' => 'plumbing',
        ])->assertForbidden();
    }

    public function test_admin_can_list_work_orders(): void
    {
        Sanctum::actingAs($this->makeAdmin());
        $this->getJson(self::BASE)->assertOk();
    }

    // ─── Work order CRUD ─────────────────────────────────────────────────────

    public function test_admin_can_create_work_order(): void
    {
        $compound = Compound::factory()->create();
        Sanctum::actingAs($this->makeAdmin());

        $this->postJson(self::BASE, [
            'compoundId' => $compound->id,
            'title' => 'Fix broken pipe in lobby',
            'description' => 'Water leaking near entrance.',
            'category' => 'plumbing',
            'priority' => 'high',
        ])
            ->assertCreated()
            ->assertJsonPath('data.title', 'Fix broken pipe in lobby')
            ->assertJsonPath('data.status', 'draft')
            ->assertJsonPath('data.priority', 'high')
            ->assertJsonPath('data.category', 'plumbing');
    }

    public function test_admin_can_update_work_order(): void
    {
        $compound = Compound::factory()->create();
        $admin = $this->makeAdmin();
        $order = WorkOrder::factory()->create([
            'compound_id' => $compound->id,
            'created_by' => $admin->id,
        ]);

        Sanctum::actingAs($admin);

        $this->patchJson(self::BASE."/{$order->id}", [
            'priority' => 'urgent',
        ])
            ->assertOk()
            ->assertJsonPath('data.priority', 'urgent');
    }

    public function test_cannot_update_completed_work_order(): void
    {
        $admin = $this->makeAdmin();
        $order = WorkOrder::factory()->completed()->create([
            'compound_id' => Compound::factory()->create()->id,
            'created_by' => $admin->id,
        ]);

        Sanctum::actingAs($admin);

        $this->patchJson(self::BASE."/{$order->id}", ['priority' => 'low'])
            ->assertStatus(422);
    }

    public function test_work_orders_are_scoped_to_compound(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();
        $admin = $this->makeAdmin();

        WorkOrder::factory()->count(3)->create(['compound_id' => $compoundA->id, 'created_by' => $admin->id]);
        WorkOrder::factory()->create(['compound_id' => $compoundB->id, 'created_by' => $admin->id]);

        Sanctum::actingAs($admin);

        $response = $this->getJson(self::BASE, ['X-Compound-Id' => $compoundA->id]);
        $response->assertOk();
        $this->assertSame(3, $response->json('data.total'));
    }

    // ─── Lifecycle transitions ────────────────────────────────────────────────

    public function test_admin_can_submit_draft_work_order(): void
    {
        $admin = $this->makeAdmin();
        $order = WorkOrder::factory()->create([
            'compound_id' => Compound::factory()->create()->id,
            'created_by' => $admin->id,
        ]);

        Sanctum::actingAs($admin);

        $this->postJson(self::BASE."/{$order->id}/submit")
            ->assertOk()
            ->assertJsonPath('data.status', 'requested');
    }

    public function test_cannot_submit_non_draft_work_order(): void
    {
        $admin = $this->makeAdmin();
        $order = WorkOrder::factory()->requested()->create([
            'compound_id' => Compound::factory()->create()->id,
            'created_by' => $admin->id,
        ]);

        Sanctum::actingAs($admin);

        $this->postJson(self::BASE."/{$order->id}/submit")
            ->assertStatus(422);
    }

    public function test_admin_can_approve_work_order(): void
    {
        $admin = $this->makeAdmin();
        $order = WorkOrder::factory()->requested()->create([
            'compound_id' => Compound::factory()->create()->id,
            'created_by' => $admin->id,
        ]);

        Sanctum::actingAs($admin);

        $this->postJson(self::BASE."/{$order->id}/approve", ['approvedCost' => 1500.00])
            ->assertOk()
            ->assertJsonPath('data.status', 'approved')
            ->assertJsonPath('data.approved_cost', '1500.00');
    }

    public function test_admin_can_reject_work_order(): void
    {
        $admin = $this->makeAdmin();
        $order = WorkOrder::factory()->quoted()->create([
            'compound_id' => Compound::factory()->create()->id,
            'created_by' => $admin->id,
        ]);

        Sanctum::actingAs($admin);

        $this->postJson(self::BASE."/{$order->id}/reject", ['rejectionReason' => 'Budget exceeded.'])
            ->assertOk()
            ->assertJsonPath('data.status', 'rejected')
            ->assertJsonPath('data.rejection_reason', 'Budget exceeded.');
    }

    public function test_admin_can_start_approved_work_order(): void
    {
        $admin = $this->makeAdmin();
        $order = WorkOrder::factory()->approved()->create([
            'compound_id' => Compound::factory()->create()->id,
            'created_by' => $admin->id,
        ]);

        Sanctum::actingAs($admin);

        $this->postJson(self::BASE."/{$order->id}/start")
            ->assertOk()
            ->assertJsonPath('data.status', 'in_progress')
            ->assertJsonPath('data.started_at', fn ($v) => $v !== null);
    }

    public function test_admin_can_complete_work_order(): void
    {
        $admin = $this->makeAdmin();
        $order = WorkOrder::factory()->inProgress()->create([
            'compound_id' => Compound::factory()->create()->id,
            'created_by' => $admin->id,
        ]);

        Sanctum::actingAs($admin);

        $this->postJson(self::BASE."/{$order->id}/complete", [
            'completionNotes' => 'Pipe replaced successfully.',
            'actualCost' => 1200.00,
        ])
            ->assertOk()
            ->assertJsonPath('data.status', 'completed')
            ->assertJsonPath('data.completion_notes', 'Pipe replaced successfully.')
            ->assertJsonPath('data.completed_at', fn ($v) => $v !== null);
    }

    public function test_admin_can_cancel_work_order(): void
    {
        $admin = $this->makeAdmin();
        $order = WorkOrder::factory()->requested()->create([
            'compound_id' => Compound::factory()->create()->id,
            'created_by' => $admin->id,
        ]);

        Sanctum::actingAs($admin);

        $this->postJson(self::BASE."/{$order->id}/cancel")
            ->assertOk()
            ->assertJsonPath('data.status', 'cancelled');
    }

    public function test_cannot_cancel_completed_work_order(): void
    {
        $admin = $this->makeAdmin();
        $order = WorkOrder::factory()->completed()->create([
            'compound_id' => Compound::factory()->create()->id,
            'created_by' => $admin->id,
        ]);

        Sanctum::actingAs($admin);

        $this->postJson(self::BASE."/{$order->id}/cancel")
            ->assertStatus(422);
    }

    // ─── Estimates ────────────────────────────────────────────────────────────

    public function test_admin_can_add_estimate(): void
    {
        $admin = $this->makeAdmin();
        $order = WorkOrder::factory()->requested()->create([
            'compound_id' => Compound::factory()->create()->id,
            'created_by' => $admin->id,
        ]);
        $vendor = Vendor::factory()->create(['compound_id' => $order->compound_id]);

        Sanctum::actingAs($admin);

        $this->postJson(self::BASE."/{$order->id}/estimates", [
            'vendorId' => $vendor->id,
            'amount' => 2500.00,
            'notes' => 'Including materials.',
        ])
            ->assertCreated()
            ->assertJsonPath('data.amount', '2500.00')
            ->assertJsonPath('data.status', 'pending');
    }

    public function test_adding_estimate_advances_status_to_quoted(): void
    {
        $admin = $this->makeAdmin();
        $order = WorkOrder::factory()->requested()->create([
            'compound_id' => Compound::factory()->create()->id,
            'created_by' => $admin->id,
        ]);

        Sanctum::actingAs($admin);

        $this->postJson(self::BASE."/{$order->id}/estimates", ['amount' => 800.00])
            ->assertCreated();

        $this->assertDatabaseHas('work_orders', ['id' => $order->id, 'status' => 'quoted']);
    }

    public function test_admin_can_review_estimate(): void
    {
        $admin = $this->makeAdmin();
        $order = WorkOrder::factory()->quoted()->create([
            'compound_id' => Compound::factory()->create()->id,
            'created_by' => $admin->id,
        ]);
        $estimate = WorkOrderEstimate::create([
            'work_order_id' => $order->id,
            'amount' => 3000.00,
            'status' => 'pending',
            'submitted_by' => $admin->id,
        ]);

        Sanctum::actingAs($admin);

        $this->postJson(self::BASE."/{$order->id}/estimates/{$estimate->id}/review", [
            'status' => 'approved',
            'reviewNotes' => 'Cost is acceptable.',
        ])
            ->assertOk()
            ->assertJsonPath('data.status', 'approved');
    }

    public function test_cannot_review_estimate_twice(): void
    {
        $admin = $this->makeAdmin();
        $order = WorkOrder::factory()->quoted()->create([
            'compound_id' => Compound::factory()->create()->id,
            'created_by' => $admin->id,
        ]);
        $estimate = WorkOrderEstimate::create([
            'work_order_id' => $order->id,
            'amount' => 3000.00,
            'status' => 'approved',
            'submitted_by' => $admin->id,
        ]);

        Sanctum::actingAs($admin);

        $this->postJson(self::BASE."/{$order->id}/estimates/{$estimate->id}/review", [
            'status' => 'rejected',
        ])->assertStatus(422);
    }

    // ─── Validation ──────────────────────────────────────────────────────────

    public function test_work_order_title_is_required(): void
    {
        $compound = Compound::factory()->create();
        Sanctum::actingAs($this->makeAdmin());

        $this->postJson(self::BASE, ['compoundId' => $compound->id, 'category' => 'plumbing'])
            ->assertUnprocessable();
    }

    public function test_work_order_category_must_be_valid(): void
    {
        $compound = Compound::factory()->create();
        Sanctum::actingAs($this->makeAdmin());

        $this->postJson(self::BASE, [
            'compoundId' => $compound->id,
            'title' => 'Test order',
            'category' => 'invalid_category',
        ])->assertUnprocessable();
    }

    public function test_rejection_requires_reason(): void
    {
        $admin = $this->makeAdmin();
        $order = WorkOrder::factory()->requested()->create([
            'compound_id' => Compound::factory()->create()->id,
            'created_by' => $admin->id,
        ]);

        Sanctum::actingAs($admin);

        $this->postJson(self::BASE."/{$order->id}/reject", [])
            ->assertUnprocessable();
    }
}
