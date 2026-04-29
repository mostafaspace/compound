<?php

namespace Tests\Feature\Api\V1;

use App\Enums\BudgetStatus;
use App\Enums\ExpenseStatus;
use App\Enums\UnitRelationType;
use App\Enums\UserRole;
use App\Enums\VerificationStatus;
use App\Models\Finance\Budget;
use App\Models\Finance\BudgetCategory;
use App\Models\Finance\Expense;
use App\Models\Finance\ReserveFund;
use App\Models\Finance\Vendor;
use App\Models\Property\Building;
use App\Models\Property\Compound;
use App\Models\Property\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdvancedFinanceTest extends TestCase
{
    use RefreshDatabase;

    // ── Helpers ──────────────────────────────────────────────────────────────

    private function makeAdmin(Compound $compound): User
    {
        return User::factory()->create([
            'role'        => UserRole::CompoundAdmin->value,
            'compound_id' => $compound->id,
        ]);
    }

    private function makeFinanceReviewer(Compound $compound): User
    {
        return User::factory()->create([
            'role'        => UserRole::FinanceReviewer->value,
            'compound_id' => $compound->id,
        ]);
    }

    private function makeSuperAdmin(): User
    {
        return User::factory()->create(['role' => UserRole::SuperAdmin->value]);
    }

    private function makeMembershipScopedAdmin(Compound $compound): User
    {
        $admin = User::factory()->create([
            'role'        => UserRole::CompoundAdmin->value,
            'compound_id' => null,
        ]);

        $building = Building::factory()->for($compound)->create();
        $unit = Unit::factory()->for($compound)->for($building)->create(['floor_id' => null]);
        $unit->memberships()->create([
            'user_id' => $admin->id,
            'relation_type' => UnitRelationType::Owner->value,
            'verification_status' => VerificationStatus::Verified->value,
            'starts_at' => now()->subYear(),
        ]);

        return $admin->refresh();
    }

    private function makeResident(Compound $compound): User
    {
        return User::factory()->create([
            'role'        => UserRole::ResidentOwner->value,
            'compound_id' => $compound->id,
        ]);
    }

    // ── Reserve Funds ─────────────────────────────────────────────────────────

    public function test_admin_can_create_reserve_fund(): void
    {
        $compound = Compound::factory()->create();
        $admin    = $this->makeAdmin($compound);
        Sanctum::actingAs($admin);

        $res = $this->postJson('/api/v1/finance/reserve-funds', [
            'compound_id' => $compound->id,
            'name'        => 'Emergency Fund',
            'currency'    => 'EGP',
        ]);

        $res->assertCreated()
            ->assertJsonPath('data.name', 'Emergency Fund')
            ->assertJsonPath('data.balance', '0.00');

        $this->assertDatabaseHas('reserve_funds', ['name' => 'Emergency Fund', 'compound_id' => $compound->id]);
    }

    public function test_admin_can_deposit_to_reserve_fund(): void
    {
        $compound = Compound::factory()->create();
        $admin    = $this->makeAdmin($compound);
        $fund     = ReserveFund::factory()->create(['compound_id' => $compound->id, 'balance' => '0.00']);
        Sanctum::actingAs($admin);

        $res = $this->postJson("/api/v1/finance/reserve-funds/{$fund->id}/movements", [
            'type'        => 'deposit',
            'amount'      => 5000,
            'description' => 'Annual allocation',
        ]);

        $res->assertCreated()->assertJsonPath('data.type', 'deposit');

        $fund->refresh();
        $this->assertEquals('5000.00', $fund->balance);
    }

    public function test_withdrawal_reduces_reserve_fund_balance(): void
    {
        $compound = Compound::factory()->create();
        $admin    = $this->makeAdmin($compound);
        $fund     = ReserveFund::factory()->create(['compound_id' => $compound->id, 'balance' => 10000]);
        Sanctum::actingAs($admin);

        $this->postJson("/api/v1/finance/reserve-funds/{$fund->id}/movements", [
            'type'   => 'withdrawal',
            'amount' => 3000,
        ]);

        $fund->refresh();
        $this->assertEquals('7000.00', $fund->balance);
    }

    public function test_cross_compound_reserve_fund_access_is_forbidden(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();
        $adminA    = $this->makeAdmin($compoundA);
        $fundB     = ReserveFund::factory()->create(['compound_id' => $compoundB->id]);
        Sanctum::actingAs($adminA);

        $this->getJson("/api/v1/finance/reserve-funds/{$fundB->id}")->assertForbidden();
    }

    public function test_membership_scoped_admin_can_manage_only_own_compound_reserve_funds_when_compound_id_is_null(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();
        $admin = $this->makeMembershipScopedAdmin($compoundA);
        $fundA = ReserveFund::factory()->create(['compound_id' => $compoundA->id]);
        $fundB = ReserveFund::factory()->create(['compound_id' => $compoundB->id]);
        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/finance/reserve-funds')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $fundA->id);

        $this->getJson("/api/v1/finance/reserve-funds/{$fundB->id}")->assertForbidden();
    }

    // ── Vendors ───────────────────────────────────────────────────────────────

    public function test_admin_can_create_vendor(): void
    {
        $compound = Compound::factory()->create();
        $admin    = $this->makeAdmin($compound);
        Sanctum::actingAs($admin);

        $res = $this->postJson('/api/v1/finance/vendors', [
            'compound_id'  => $compound->id,
            'name'         => 'CleanCo',
            'type'         => 'service_provider',
            'contact_name' => 'Ahmed Hassan',
            'phone'        => '+201001234567',
            'email'        => 'ahmed@cleanco.com',
        ]);

        $res->assertCreated()
            ->assertJsonPath('data.name', 'CleanCo')
            ->assertJsonPath('data.type', 'service_provider');

        $this->assertDatabaseHas('vendors', ['name' => 'CleanCo', 'compound_id' => $compound->id]);
    }

    public function test_vendor_cross_compound_forbidden(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();
        $adminA    = $this->makeAdmin($compoundA);
        $vendorB   = Vendor::factory()->create(['compound_id' => $compoundB->id]);
        Sanctum::actingAs($adminA);

        $this->getJson("/api/v1/finance/vendors/{$vendorB->id}")->assertForbidden();
    }

    public function test_membership_scoped_admin_can_manage_only_own_compound_vendors_when_compound_id_is_null(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();
        $admin = $this->makeMembershipScopedAdmin($compoundA);
        $vendorA = Vendor::factory()->create(['compound_id' => $compoundA->id]);
        $vendorB = Vendor::factory()->create(['compound_id' => $compoundB->id]);
        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/finance/vendors')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $vendorA->id);

        $this->getJson("/api/v1/finance/vendors/{$vendorB->id}")->assertForbidden();
    }

    // ── Budgets ───────────────────────────────────────────────────────────────

    public function test_admin_can_create_and_activate_budget(): void
    {
        $compound = Compound::factory()->create();
        $admin    = $this->makeAdmin($compound);
        Sanctum::actingAs($admin);

        $res = $this->postJson('/api/v1/finance/budgets', [
            'compound_id' => $compound->id,
            'name'        => 'Budget 2026',
            'period_type' => 'annual',
            'period_year' => 2026,
        ]);

        $res->assertCreated()->assertJsonPath('data.status', 'draft');

        $budgetId = $res->json('data.id');

        // Add a category
        $catRes = $this->postJson("/api/v1/finance/budgets/{$budgetId}/categories", [
            'name'           => 'Maintenance',
            'planned_amount' => 20000,
        ]);
        $catRes->assertCreated()->assertJsonPath('data.plannedAmount', '20000.00');

        // Activate
        $activateRes = $this->postJson("/api/v1/finance/budgets/{$budgetId}/activate");
        $activateRes->assertOk()->assertJsonPath('data.status', 'active');
    }

    public function test_cannot_activate_already_active_budget(): void
    {
        $compound = Compound::factory()->create();
        $admin    = $this->makeAdmin($compound);
        $budget   = Budget::factory()->create([
            'compound_id' => $compound->id,
            'status'      => BudgetStatus::Active,
            'created_by'  => $admin->id,
        ]);
        Sanctum::actingAs($admin);

        $this->postJson("/api/v1/finance/budgets/{$budget->id}/activate")
            ->assertUnprocessable();
    }

    public function test_closed_budget_cannot_be_edited(): void
    {
        $compound = Compound::factory()->create();
        $admin    = $this->makeAdmin($compound);
        $budget   = Budget::factory()->create([
            'compound_id' => $compound->id,
            'status'      => BudgetStatus::Closed,
            'created_by'  => $admin->id,
        ]);
        Sanctum::actingAs($admin);

        $this->patchJson("/api/v1/finance/budgets/{$budget->id}", ['name' => 'New Name'])
            ->assertUnprocessable();
    }

    public function test_budget_cross_compound_forbidden(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();
        $adminA    = $this->makeAdmin($compoundA);
        $budgetB   = Budget::factory()->create([
            'compound_id' => $compoundB->id,
            'created_by'  => User::factory()->create()->id,
        ]);
        Sanctum::actingAs($adminA);

        $this->getJson("/api/v1/finance/budgets/{$budgetB->id}")->assertForbidden();
    }

    public function test_membership_scoped_admin_can_manage_only_own_compound_budgets_when_compound_id_is_null(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();
        $admin = $this->makeMembershipScopedAdmin($compoundA);
        $budgetA = Budget::factory()->create([
            'compound_id' => $compoundA->id,
            'created_by' => User::factory()->create()->id,
        ]);
        $budgetB = Budget::factory()->create([
            'compound_id' => $compoundB->id,
            'created_by' => User::factory()->create()->id,
        ]);
        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/finance/budgets')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $budgetA->id);

        $this->getJson("/api/v1/finance/budgets/{$budgetB->id}")->assertForbidden();
    }

    // ── Expenses ──────────────────────────────────────────────────────────────

    public function test_finance_reviewer_can_submit_expense(): void
    {
        $compound = Compound::factory()->create();
        $reviewer = $this->makeFinanceReviewer($compound);
        Sanctum::actingAs($reviewer);

        $res = $this->postJson('/api/v1/finance/expenses', [
            'compound_id'  => $compound->id,
            'title'        => 'Elevator Repair',
            'amount'       => 8500,
            'expense_date' => '2026-04-20',
        ]);

        $res->assertCreated()
            ->assertJsonPath('data.status', 'pending_approval')
            ->assertJsonPath('data.title', 'Elevator Repair');
    }

    public function test_admin_can_approve_expense_and_updates_budget_category(): void
    {
        $compound = Compound::factory()->create();
        $admin    = $this->makeAdmin($compound);
        $reviewer = $this->makeFinanceReviewer($compound);

        $budget   = Budget::factory()->create([
            'compound_id' => $compound->id,
            'status'      => BudgetStatus::Active,
            'created_by'  => $admin->id,
        ]);
        $category = BudgetCategory::factory()->create([
            'budget_id'      => $budget->id,
            'planned_amount' => 20000,
            'actual_amount'  => 0,
        ]);
        $expense = Expense::factory()->create([
            'compound_id'        => $compound->id,
            'budget_category_id' => $category->id,
            'amount'             => 5000,
            'status'             => ExpenseStatus::PendingApproval,
            'submitted_by'       => $reviewer->id,
        ]);

        Sanctum::actingAs($admin);

        $res = $this->postJson("/api/v1/finance/expenses/{$expense->id}/approve", [
            'reason' => 'Approved after review',
        ]);

        $res->assertOk()->assertJsonPath('data.status', 'approved');

        $category->refresh();
        $this->assertEquals('5000.00', $category->actual_amount);
        $this->assertDatabaseHas('expense_approvals', [
            'expense_id' => $expense->id,
            'action'     => 'approve',
        ]);
    }

    public function test_admin_can_reject_expense_with_reason(): void
    {
        $compound = Compound::factory()->create();
        $admin    = $this->makeAdmin($compound);
        $reviewer = $this->makeFinanceReviewer($compound);
        $expense  = Expense::factory()->create([
            'compound_id'  => $compound->id,
            'status'       => ExpenseStatus::PendingApproval,
            'submitted_by' => $reviewer->id,
        ]);
        Sanctum::actingAs($admin);

        $res = $this->postJson("/api/v1/finance/expenses/{$expense->id}/reject", [
            'reason' => 'Budget exceeded',
        ]);

        $res->assertOk()->assertJsonPath('data.status', 'rejected');
        $this->assertDatabaseHas('expense_approvals', ['action' => 'reject', 'expense_id' => $expense->id]);
    }

    public function test_cannot_approve_already_approved_expense(): void
    {
        $compound = Compound::factory()->create();
        $admin    = $this->makeAdmin($compound);
        $expense  = Expense::factory()->create([
            'compound_id'  => $compound->id,
            'status'       => ExpenseStatus::Approved,
            'submitted_by' => $admin->id,
        ]);
        Sanctum::actingAs($admin);

        $this->postJson("/api/v1/finance/expenses/{$expense->id}/approve")
            ->assertUnprocessable();
    }

    public function test_resident_can_see_public_expense_summary(): void
    {
        $compound = Compound::factory()->create();
        $resident = $this->makeResident($compound);
        $admin    = $this->makeAdmin($compound);

        Expense::factory()->create([
            'compound_id'  => $compound->id,
            'status'       => ExpenseStatus::Approved,
            'submitted_by' => $admin->id,
        ]);
        Expense::factory()->create([
            'compound_id'  => $compound->id,
            'status'       => ExpenseStatus::PendingApproval,
            'submitted_by' => $admin->id,
        ]);

        Sanctum::actingAs($resident);

        $res = $this->getJson('/api/v1/finance/expenses/public-summary', [
            'X-Compound-Id' => $compound->id,
        ]);

        $res->assertOk();
        // Only approved expenses visible
        $statuses = collect($res->json('data'))->pluck('status')->unique()->values()->toArray();
        $this->assertEquals(['approved'], $statuses);
    }

    public function test_expense_cross_compound_forbidden(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();
        $adminA    = $this->makeAdmin($compoundA);
        $adminB    = $this->makeAdmin($compoundB);
        $expense   = Expense::factory()->create([
            'compound_id'  => $compoundB->id,
            'status'       => ExpenseStatus::PendingApproval,
            'submitted_by' => $adminB->id,
        ]);
        Sanctum::actingAs($adminA);

        $this->getJson("/api/v1/finance/expenses/{$expense->id}")->assertForbidden();
    }

    public function test_membership_scoped_admin_can_manage_only_own_compound_expenses_when_compound_id_is_null(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();
        $admin = $this->makeMembershipScopedAdmin($compoundA);
        $expenseA = Expense::factory()->create([
            'compound_id' => $compoundA->id,
            'status' => ExpenseStatus::PendingApproval,
            'submitted_by' => User::factory()->create()->id,
        ]);
        $expenseB = Expense::factory()->create([
            'compound_id' => $compoundB->id,
            'status' => ExpenseStatus::PendingApproval,
            'submitted_by' => User::factory()->create()->id,
        ]);
        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/finance/expenses')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $expenseA->id);

        $this->getJson("/api/v1/finance/expenses/{$expenseB->id}")->assertForbidden();
        $this->postJson("/api/v1/finance/expenses/{$expenseB->id}/approve", [
            'reason' => 'Should not be allowed.',
        ])->assertForbidden();
    }
}
