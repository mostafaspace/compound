<?php

namespace Tests\Feature\Api\V1;

use App\Enums\ExpenseStatus;
use App\Enums\LedgerEntryType;
use App\Enums\PaymentStatus;
use App\Enums\Permission;
use App\Enums\UnitRelationType;
use App\Enums\UserRole;
use App\Enums\VerificationStatus;
use App\Models\Finance\Budget;
use App\Models\Finance\Expense;
use App\Models\Finance\LedgerEntry;
use App\Models\Finance\PaymentSubmission;
use App\Models\Finance\ReserveFund;
use App\Models\Finance\UnitAccount;
use App\Models\Finance\Vendor;
use App\Models\Property\Building;
use App\Models\Property\Compound;
use App\Models\Property\Unit;
use App\Models\User;
use App\Models\UserScopeAssignment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission as SpatiePermission;
use Spatie\Permission\Models\Role as SpatieRole;
use Tests\TestCase;

/**
 * Regression tests for finance scoping: expense, budget, vendor, reserve fund,
 * and finance report index/list endpoints must enforce compound boundaries
 * for scope-assigned finance reviewers with compound_id = null.
 *
 * Bug class: These endpoints used CompoundContextService::resolve() followed
 * by a soft `if ($compoundId)` guard. For scope-assigned reviewers who are
 * not CompoundAdmin and have compound_id = null, resolve() returns null
 * (same as super-admin global), causing the if-guard to be bypassed and
 * returning all records globally.
 */
class FinanceScopingTest extends TestCase
{
    use RefreshDatabase;

    private function makeScopeAssignedFinanceReviewer(Compound $compound): User
    {
        $reviewerRole = SpatieRole::findOrCreate('finance_reviewer', 'sanctum');
        $reviewerRole->givePermissionTo(
            SpatiePermission::findOrCreate(Permission::ViewFinance->value, 'sanctum'),
            SpatiePermission::findOrCreate(Permission::ManageFinance->value, 'sanctum'),
        );
        $reviewer = User::factory()->create([
            'role' => UserRole::ResidentOwner->value,
            'compound_id' => null,
        ]);
        $reviewer->assignRole($reviewerRole);

        UserScopeAssignment::create([
            'user_id' => $reviewer->id,
            'role_name' => 'finance_reviewer',
            'scope_type' => 'compound',
            'scope_id' => $compound->id,
            'created_by' => $reviewer->id,
        ]);

        return $reviewer->refresh();
    }

    private function createUnitForCompound(Compound $compound, string $unitNumber): Unit
    {
        $building = Building::factory()->for($compound)->create();

        return Unit::factory()
            ->for($compound)
            ->for($building)
            ->create(['floor_id' => null, 'unit_number' => $unitNumber]);
    }

    // ── Expense scoping ──────────────────────────────────────────────────

    public function test_scope_assigned_finance_reviewer_cannot_list_expenses_from_other_compounds(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();

        $reviewer = $this->makeScopeAssignedFinanceReviewer($compoundA);

        $expenseA = Expense::factory()->create([
            'compound_id' => $compoundA->id,
            'status' => ExpenseStatus::PendingApproval,
            'submitted_by' => User::factory()->create()->id,
        ]);
        Expense::factory()->create([
            'compound_id' => $compoundB->id,
            'status' => ExpenseStatus::PendingApproval,
            'submitted_by' => User::factory()->create()->id,
        ]);

        Sanctum::actingAs($reviewer);

        $this->getJson('/api/v1/finance/expenses')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $expenseA->id);
    }

    public function test_scope_assigned_finance_reviewer_cannot_view_or_mutate_cross_compound_expenses(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();

        $reviewer = $this->makeScopeAssignedFinanceReviewer($compoundA);

        $expenseB = Expense::factory()->create([
            'compound_id' => $compoundB->id,
            'status' => ExpenseStatus::PendingApproval,
            'submitted_by' => User::factory()->create()->id,
        ]);

        Sanctum::actingAs($reviewer);

        $this->getJson("/api/v1/finance/expenses/{$expenseB->id}")->assertForbidden();
        $this->postJson("/api/v1/finance/expenses/{$expenseB->id}/approve")->assertForbidden();
        $this->postJson("/api/v1/finance/expenses/{$expenseB->id}/reject", [
            'reason' => 'Should not be allowed.',
        ])->assertForbidden();
    }

    // ── Budget scoping ───────────────────────────────────────────────────

    public function test_scope_assigned_finance_reviewer_cannot_list_budgets_from_other_compounds(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();

        $reviewer = $this->makeScopeAssignedFinanceReviewer($compoundA);

        $budgetA = Budget::factory()->create([
            'compound_id' => $compoundA->id,
            'created_by' => User::factory()->create()->id,
        ]);
        Budget::factory()->create([
            'compound_id' => $compoundB->id,
            'created_by' => User::factory()->create()->id,
        ]);

        Sanctum::actingAs($reviewer);

        $this->getJson('/api/v1/finance/budgets')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $budgetA->id);
    }

    public function test_scope_assigned_finance_reviewer_cannot_view_cross_compound_budget(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();

        $reviewer = $this->makeScopeAssignedFinanceReviewer($compoundA);

        $budgetB = Budget::factory()->create([
            'compound_id' => $compoundB->id,
            'created_by' => User::factory()->create()->id,
        ]);

        Sanctum::actingAs($reviewer);

        $this->getJson("/api/v1/finance/budgets/{$budgetB->id}")->assertForbidden();
    }

    // ── Vendor scoping ───────────────────────────────────────────────────

    public function test_scope_assigned_finance_reviewer_cannot_list_vendors_from_other_compounds(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();

        $reviewer = $this->makeScopeAssignedFinanceReviewer($compoundA);

        $vendorA = Vendor::factory()->create(['compound_id' => $compoundA->id]);
        Vendor::factory()->create(['compound_id' => $compoundB->id]);

        Sanctum::actingAs($reviewer);

        $this->getJson('/api/v1/finance/vendors')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $vendorA->id);
    }

    public function test_scope_assigned_finance_reviewer_cannot_view_cross_compound_vendor(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();

        $reviewer = $this->makeScopeAssignedFinanceReviewer($compoundA);

        $vendorB = Vendor::factory()->create(['compound_id' => $compoundB->id]);

        Sanctum::actingAs($reviewer);

        $this->getJson("/api/v1/finance/vendors/{$vendorB->id}")->assertForbidden();
    }

    // ── Reserve fund scoping ─────────────────────────────────────────────

    public function test_scope_assigned_finance_reviewer_cannot_list_reserve_funds_from_other_compounds(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();

        $reviewer = $this->makeScopeAssignedFinanceReviewer($compoundA);

        $fundA = ReserveFund::factory()->create(['compound_id' => $compoundA->id]);
        ReserveFund::factory()->create(['compound_id' => $compoundB->id]);

        Sanctum::actingAs($reviewer);

        $this->getJson('/api/v1/finance/reserve-funds')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $fundA->id);
    }

    public function test_scope_assigned_finance_reviewer_cannot_view_cross_compound_reserve_fund(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();

        $reviewer = $this->makeScopeAssignedFinanceReviewer($compoundA);

        $fundB = ReserveFund::factory()->create(['compound_id' => $compoundB->id]);

        Sanctum::actingAs($reviewer);

        $this->getJson("/api/v1/finance/reserve-funds/{$fundB->id}")->assertForbidden();
    }

    // ── Finance report scoping ───────────────────────────────────────────

    public function test_scope_assigned_finance_reviewer_sees_only_own_compound_in_finance_summary(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();

        $reviewer = $this->makeScopeAssignedFinanceReviewer($compoundA);

        $unitA = $this->createUnitForCompound($compoundA, 'A-101');
        $unitB = $this->createUnitForCompound($compoundB, 'B-101');

        $accountA = UnitAccount::factory()->for($unitA)->create(['balance' => '500.00']);
        $accountB = UnitAccount::factory()->for($unitB)->create(['balance' => '800.00']);

        LedgerEntry::query()->create([
            'unit_account_id' => $accountA->id,
            'type' => LedgerEntryType::Charge->value,
            'amount' => '500.00',
            'description' => 'Compound A charge',
            'created_by' => $reviewer->id,
        ]);
        LedgerEntry::query()->create([
            'unit_account_id' => $accountB->id,
            'type' => LedgerEntryType::Charge->value,
            'amount' => '800.00',
            'description' => 'Compound B charge',
            'created_by' => $reviewer->id,
        ]);

        Sanctum::actingAs($reviewer);

        $data = $this->getJson('/api/v1/finance/reports/summary')->assertOk()->json('data');

        // Should see only compound A's $500, not compound B's $800
        $this->assertEquals('500.00', $data['totalBilled']);
        $this->assertEquals(1, $data['totalAccountsCount']);
    }

    public function test_scope_assigned_finance_reviewer_sees_only_own_compound_in_finance_accounts_report(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();

        $reviewer = $this->makeScopeAssignedFinanceReviewer($compoundA);

        $unitA = $this->createUnitForCompound($compoundA, 'A-201');
        $unitB = $this->createUnitForCompound($compoundB, 'B-201');

        $accountA = UnitAccount::factory()->for($unitA)->create(['balance' => '500.00']);
        UnitAccount::factory()->for($unitB)->create(['balance' => '800.00']);

        Sanctum::actingAs($reviewer);

        $this->getJson('/api/v1/finance/reports/accounts')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $accountA->id);
    }

    public function test_scope_assigned_finance_reviewer_sees_only_own_compound_in_payment_method_breakdown(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();

        $reviewer = $this->makeScopeAssignedFinanceReviewer($compoundA);

        $unitA = $this->createUnitForCompound($compoundA, 'A-301');
        $unitB = $this->createUnitForCompound($compoundB, 'B-301');

        $accountA = UnitAccount::factory()->for($unitA)->create();
        $accountB = UnitAccount::factory()->for($unitB)->create();

        PaymentSubmission::factory()->for($accountA)->create([
            'status' => PaymentStatus::Approved->value,
            'method' => 'bank_transfer',
            'amount' => '300.00',
        ]);
        PaymentSubmission::factory()->for($accountB)->create([
            'status' => PaymentStatus::Approved->value,
            'method' => 'bank_transfer',
            'amount' => '700.00',
        ]);

        Sanctum::actingAs($reviewer);

        $data = $this->getJson('/api/v1/finance/reports/payment-methods')->assertOk()->json('data');

        $this->assertCount(1, $data);
        $this->assertEquals('300.00', $data[0]['total']);
    }

    // ── Public expense summary scoping ───────────────────────────────────

    public function test_scope_assigned_finance_reviewer_sees_only_own_compound_in_public_expense_summary(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();

        $reviewer = $this->makeScopeAssignedFinanceReviewer($compoundA);

        Expense::factory()->create([
            'compound_id' => $compoundA->id,
            'status' => ExpenseStatus::Approved,
            'submitted_by' => User::factory()->create()->id,
            'amount' => 1000,
        ]);
        Expense::factory()->create([
            'compound_id' => $compoundB->id,
            'status' => ExpenseStatus::Approved,
            'submitted_by' => User::factory()->create()->id,
            'amount' => 2000,
        ]);

        Sanctum::actingAs($reviewer);

        $response = $this->getJson('/api/v1/finance/expenses/public-summary');
        $response->assertOk()->assertJsonCount(1, 'data');
    }
}
