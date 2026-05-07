<?php

namespace Tests\Feature\Api\V1;

use App\Enums\LedgerEntryType;
use App\Enums\NotificationCategory;
use App\Enums\PaymentStatus;
use App\Enums\Permission;
use App\Enums\UnitRelationType;
use App\Enums\UserRole;
use App\Enums\VerificationStatus;
use App\Models\Finance\LedgerEntry;
use App\Models\Finance\PaymentSubmission;
use App\Models\Finance\UnitAccount;
use App\Models\Notification;
use App\Models\Property\Building;
use App\Models\Property\Compound;
use App\Models\Property\Unit;
use App\Models\User;
use App\Models\UserScopeAssignment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission as SpatiePermission;
use Spatie\Permission\Models\Role as SpatieRole;
use Tests\TestCase;

class FinanceTest extends TestCase
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

    public function test_finance_reviewer_can_create_account_and_post_ledger_charge(): void
    {
        $reviewer = User::factory()->create(['role' => UserRole::FinanceReviewer->value]);
        $unit = $this->createUnit();

        Sanctum::actingAs($reviewer);

        $accountId = $this->postJson('/api/v1/finance/unit-accounts', [
            'unitId' => $unit->id,
            'currency' => 'egp',
            'openingBalance' => 1200,
            'description' => 'Initial imported balance',
        ])
            ->assertCreated()
            ->assertJsonPath('data.unitId', $unit->id)
            ->assertJsonPath('data.currency', 'EGP')
            ->assertJsonPath('data.balance', '1200.00')
            ->assertJsonPath('data.ledgerEntries.0.type', LedgerEntryType::OpeningBalance->value)
            ->json('data.id');

        $this->postJson("/api/v1/finance/unit-accounts/{$accountId}/ledger-entries", [
            'type' => LedgerEntryType::Charge->value,
            'amount' => 350,
            'description' => 'Monthly maintenance charge',
        ])
            ->assertCreated()
            ->assertJsonPath('data.type', LedgerEntryType::Charge->value)
            ->assertJsonPath('data.amount', '350.00');

        $this->assertDatabaseHas('unit_accounts', [
            'id' => $accountId,
            'balance' => '1550.00',
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'actor_id' => $reviewer->id,
            'action' => 'finance.unit_account_created',
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'actor_id' => $reviewer->id,
            'action' => 'finance.ledger_entry_created',
        ]);
    }

    public function test_resident_can_view_only_verified_unit_accounts_and_submit_payment(): void
    {
        Storage::fake('local');
        config(['filesystems.default' => 'local']);

        $resident = User::factory()->create(['role' => UserRole::ResidentOwner->value]);
        $ownUnit = $this->createUnit();
        $otherUnit = $this->createUnit('B-202');
        $ownAccount = UnitAccount::factory()->for($ownUnit)->create(['balance' => '500.00']);
        $otherAccount = UnitAccount::factory()->for($otherUnit)->create(['balance' => '700.00']);

        $ownUnit->apartmentResidents()->create([
            'user_id' => $resident->id,
            'relation_type' => UnitRelationType::Owner->value,
            'verification_status' => VerificationStatus::Verified->value,
            'is_primary' => true,
        ]);

        Sanctum::actingAs($resident);

        $this->getJson('/api/v1/my/finance/unit-accounts')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $ownAccount->id);

        $this->post("/api/v1/finance/unit-accounts/{$ownAccount->id}/payment-submissions", [
            'amount' => 250,
            'method' => 'bank_transfer',
            'reference' => 'TRX-100',
            'notes' => 'Paid from resident bank app.',
            'proof' => UploadedFile::fake()->create('receipt.pdf', 128, 'application/pdf'),
        ])
            ->assertCreated()
            ->assertJsonPath('data.unitAccountId', $ownAccount->id)
            ->assertJsonPath('data.submittedBy', $resident->id)
            ->assertJsonPath('data.status', PaymentStatus::Submitted->value)
            ->assertJsonPath('data.hasProof', true);

        $payment = PaymentSubmission::query()->firstOrFail();
        $this->assertNotNull($payment->proof_path);
        Storage::disk('local')->assertExists($payment->proof_path);

        $this->postJson("/api/v1/finance/unit-accounts/{$otherAccount->id}/payment-submissions", [
            'amount' => 100,
            'method' => 'bank_transfer',
        ])->assertForbidden();
    }

    public function test_effective_resident_role_cannot_bypass_finance_account_access_when_legacy_role_is_stale(): void
    {
        $residentRole = SpatieRole::findOrCreate('resident_owner', 'sanctum');
        $resident = User::factory()->create(['role' => UserRole::FinanceReviewer->value]);
        $resident->assignRole($residentRole);

        $ownUnit = $this->createUnit();
        $otherUnit = $this->createUnit('C-303');
        $ownAccount = UnitAccount::factory()->for($ownUnit)->create(['balance' => '500.00']);
        $otherAccount = UnitAccount::factory()->for($otherUnit)->create(['balance' => '700.00']);

        $ownUnit->apartmentResidents()->create([
            'user_id' => $resident->id,
            'relation_type' => UnitRelationType::Owner->value,
            'verification_status' => VerificationStatus::Verified->value,
            'is_primary' => true,
        ]);

        Sanctum::actingAs($resident);

        $this->postJson("/api/v1/finance/unit-accounts/{$ownAccount->id}/payment-submissions", [
            'amount' => 150,
            'method' => 'bank_transfer',
        ])->assertCreated();

        $this->postJson("/api/v1/finance/unit-accounts/{$otherAccount->id}/payment-submissions", [
            'amount' => 100,
            'method' => 'bank_transfer',
        ])->assertForbidden();
    }

    public function test_reviewer_can_approve_payment_and_create_payment_ledger_entry(): void
    {
        $reviewer = User::factory()->create(['role' => UserRole::FinanceReviewer->value]);
        $resident = User::factory()->create(['role' => UserRole::ResidentOwner->value]);
        $unit = $this->createUnit();
        $account = UnitAccount::factory()->for($unit)->create(['balance' => '1000.00']);
        $payment = PaymentSubmission::factory()->for($account)->create([
            'submitted_by' => $resident->id,
            'amount' => '400.00',
            'currency' => 'EGP',
            'status' => PaymentStatus::Submitted->value,
        ]);

        Event::fake();
        Sanctum::actingAs($reviewer);

        $this->patchJson("/api/v1/finance/payment-submissions/{$payment->id}/approve", [
            'description' => 'Bank transfer matched statement.',
        ])
            ->assertOk()
            ->assertJsonPath('data.status', PaymentStatus::Approved->value)
            ->assertJsonPath('data.reviewedBy', $reviewer->id);

        $this->assertDatabaseHas('unit_accounts', [
            'id' => $account->id,
            'balance' => '600.00',
        ]);
        $this->assertDatabaseHas('ledger_entries', [
            'unit_account_id' => $account->id,
            'type' => LedgerEntryType::Payment->value,
            'amount' => '-400.00',
            'reference_id' => $payment->id,
        ]);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $resident->id,
            'category' => NotificationCategory::Finance->value,
            'title' => 'Payment approved',
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'actor_id' => $reviewer->id,
            'action' => 'finance.payment_approved',
        ]);
    }

    public function test_reviewer_can_reject_payment_with_reason_without_changing_balance(): void
    {
        $reviewer = User::factory()->create(['role' => UserRole::FinanceReviewer->value]);
        $resident = User::factory()->create(['role' => UserRole::ResidentOwner->value]);
        $account = UnitAccount::factory()->for($this->createUnit())->create(['balance' => '1000.00']);
        $payment = PaymentSubmission::factory()->for($account)->create([
            'submitted_by' => $resident->id,
            'amount' => '300.00',
            'status' => PaymentStatus::Submitted->value,
        ]);

        Event::fake();
        Sanctum::actingAs($reviewer);

        $this->patchJson("/api/v1/finance/payment-submissions/{$payment->id}/reject")
            ->assertUnprocessable();

        $this->patchJson("/api/v1/finance/payment-submissions/{$payment->id}/reject", [
            'reason' => 'Receipt is unreadable.',
        ])
            ->assertOk()
            ->assertJsonPath('data.status', PaymentStatus::Rejected->value)
            ->assertJsonPath('data.rejectionReason', 'Receipt is unreadable.');

        $this->assertDatabaseHas('unit_accounts', [
            'id' => $account->id,
            'balance' => '1000.00',
        ]);
        $this->assertSame(0, LedgerEntry::query()->count());
        $this->assertDatabaseHas('notifications', [
            'user_id' => $resident->id,
            'category' => NotificationCategory::Finance->value,
            'title' => 'Payment rejected',
        ]);
    }

    public function test_resident_cannot_use_admin_finance_routes(): void
    {
        $resident = User::factory()->create(['role' => UserRole::ResidentOwner->value]);
        Sanctum::actingAs($resident);

        $this->getJson('/api/v1/finance/unit-accounts')->assertForbidden();
        $this->getJson('/api/v1/finance/payment-submissions')->assertForbidden();
    }

    public function test_account_created_without_opening_balance_has_zero_balance(): void
    {
        $reviewer = User::factory()->create(['role' => UserRole::FinanceReviewer->value]);
        $unit = $this->createUnit();
        Sanctum::actingAs($reviewer);

        $this->postJson('/api/v1/finance/unit-accounts', ['unitId' => $unit->id])
            ->assertCreated()
            ->assertJsonPath('data.balance', '0.00')
            ->assertJsonPath('data.ledgerEntries', []);
    }

    public function test_multiple_ledger_entry_types_correctly_update_balance(): void
    {
        $reviewer = User::factory()->create(['role' => UserRole::FinanceReviewer->value]);
        $account = UnitAccount::factory()->for($this->createUnit())->create(['balance' => '0.00']);
        Sanctum::actingAs($reviewer);

        $base = "/api/v1/finance/unit-accounts/{$account->id}/ledger-entries";

        $this->postJson($base, ['type' => LedgerEntryType::Charge->value, 'amount' => 500, 'description' => 'Maintenance'])
            ->assertCreated();
        $this->postJson($base, ['type' => LedgerEntryType::Penalty->value, 'amount' => 100, 'description' => 'Late fee'])
            ->assertCreated();
        $this->postJson($base, ['type' => LedgerEntryType::Adjustment->value, 'amount' => -200, 'description' => 'Correction'])
            ->assertCreated();
        $this->postJson($base, ['type' => LedgerEntryType::Refund->value, 'amount' => -50, 'description' => 'Overpayment'])
            ->assertCreated();

        $this->assertDatabaseHas('unit_accounts', ['id' => $account->id, 'balance' => '350.00']);
        $this->assertSame(4, LedgerEntry::query()->where('unit_account_id', $account->id)->count());
    }

    public function test_ledger_entry_rejects_payment_type_and_zero_amount(): void
    {
        $reviewer = User::factory()->create(['role' => UserRole::FinanceReviewer->value]);
        $account = UnitAccount::factory()->for($this->createUnit())->create();
        Sanctum::actingAs($reviewer);

        $base = "/api/v1/finance/unit-accounts/{$account->id}/ledger-entries";

        $this->postJson($base, ['type' => LedgerEntryType::Payment->value, 'amount' => 100, 'description' => 'Direct pay'])
            ->assertUnprocessable();

        $this->postJson($base, ['type' => LedgerEntryType::Charge->value, 'amount' => 0, 'description' => 'Zero'])
            ->assertUnprocessable();
    }

    public function test_cannot_create_duplicate_account_for_same_unit(): void
    {
        $reviewer = User::factory()->create(['role' => UserRole::FinanceReviewer->value]);
        $unit = $this->createUnit();
        UnitAccount::factory()->for($unit)->create();
        Sanctum::actingAs($reviewer);

        $this->postJson('/api/v1/finance/unit-accounts', ['unitId' => $unit->id])
            ->assertUnprocessable();
    }

    public function test_unit_account_index_supports_unit_id_filter(): void
    {
        $reviewer = User::factory()->create(['role' => UserRole::FinanceReviewer->value]);
        $unit1 = $this->createUnit('A-101');
        $unit2 = $this->createUnit('B-202');
        $account1 = UnitAccount::factory()->for($unit1)->create();
        UnitAccount::factory()->for($unit2)->create();
        Sanctum::actingAs($reviewer);

        $this->getJson("/api/v1/finance/unit-accounts?unitId={$unit1->id}")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $account1->id);
    }

    public function test_admin_can_view_account_detail_with_ledger_entries(): void
    {
        $reviewer = User::factory()->create(['role' => UserRole::FinanceReviewer->value]);
        $account = UnitAccount::factory()->for($this->createUnit('A-201'))->create(['balance' => '750.00']);

        LedgerEntry::query()->create([
            'unit_account_id' => $account->id,
            'type' => LedgerEntryType::Charge->value,
            'amount' => '750.00',
            'description' => 'Annual fee',
            'created_by' => $reviewer->id,
        ]);

        Sanctum::actingAs($reviewer);

        $this->getJson("/api/v1/finance/unit-accounts/{$account->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $account->id)
            ->assertJsonPath('data.balance', '750.00')
            ->assertJsonCount(1, 'data.ledgerEntries');

        $resident = User::factory()->create(['role' => UserRole::ResidentOwner->value]);
        Sanctum::actingAs($resident);

        $this->getJson("/api/v1/finance/unit-accounts/{$account->id}")
            ->assertForbidden();
    }

    public function test_cannot_approve_or_reject_already_reviewed_payment(): void
    {
        $reviewer = User::factory()->create(['role' => UserRole::FinanceReviewer->value]);
        $account = UnitAccount::factory()->for($this->createUnit())->create(['balance' => '800.00']);
        $payment = PaymentSubmission::factory()->for($account)->create([
            'amount' => '200.00',
            'status' => PaymentStatus::Submitted->value,
        ]);

        Event::fake();
        Sanctum::actingAs($reviewer);

        $this->patchJson("/api/v1/finance/payment-submissions/{$payment->id}/approve")
            ->assertOk();

        $this->patchJson("/api/v1/finance/payment-submissions/{$payment->id}/approve")
            ->assertUnprocessable();

        $this->patchJson("/api/v1/finance/payment-submissions/{$payment->id}/reject", ['reason' => 'Late'])
            ->assertUnprocessable();
    }

    public function test_board_member_can_approve_payment(): void
    {
        $boardMember = User::factory()->create(['role' => UserRole::BoardMember->value]);
        $account = UnitAccount::factory()->for($this->createUnit())->create(['balance' => '600.00']);
        $payment = PaymentSubmission::factory()->for($account)->create([
            'amount' => '150.00',
            'status' => PaymentStatus::Submitted->value,
        ]);

        Event::fake();
        Sanctum::actingAs($boardMember);

        $this->patchJson("/api/v1/finance/payment-submissions/{$payment->id}/approve")
            ->assertOk()
            ->assertJsonPath('data.status', PaymentStatus::Approved->value);

        $this->assertDatabaseHas('unit_accounts', ['id' => $account->id, 'balance' => '450.00']);
    }

    public function test_resident_can_list_own_payment_submissions(): void
    {
        $resident = User::factory()->create(['role' => UserRole::ResidentOwner->value]);
        $otherResident = User::factory()->create(['role' => UserRole::ResidentOwner->value]);
        $account = UnitAccount::factory()->for($this->createUnit())->create();

        PaymentSubmission::factory()->for($account)->count(2)->create(['submitted_by' => $resident->id]);
        PaymentSubmission::factory()->for($account)->create(['submitted_by' => $otherResident->id]);

        Sanctum::actingAs($resident);

        $this->getJson('/api/v1/my/finance/payment-submissions')
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_payment_submission_index_supports_status_filter(): void
    {
        $reviewer = User::factory()->create(['role' => UserRole::FinanceReviewer->value]);
        $account = UnitAccount::factory()->for($this->createUnit())->create();

        PaymentSubmission::factory()->for($account)->count(2)->create(['status' => PaymentStatus::Submitted->value]);
        PaymentSubmission::factory()->for($account)->create(['status' => PaymentStatus::Approved->value]);

        Sanctum::actingAs($reviewer);

        $this->getJson('/api/v1/finance/payment-submissions?status=submitted')
            ->assertOk()
            ->assertJsonCount(2, 'data');

        $this->getJson('/api/v1/finance/payment-submissions?status=approved')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_scoped_finance_reviewer_cannot_access_or_mutate_other_compound_unit_account(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();

        $reviewer = User::factory()->create([
            'role' => UserRole::FinanceReviewer->value,
            'compound_id' => $compoundA->id,
        ]);

        $unitA = $this->createUnitForCompound($compoundA, 'A-101');
        $unitB = $this->createUnitForCompound($compoundB, 'B-101');
        $unbilledUnitB = $this->createUnitForCompound($compoundB, 'B-102');
        $accountA = UnitAccount::factory()->for($unitA)->create();
        $accountB = UnitAccount::factory()->for($unitB)->create();

        Sanctum::actingAs($reviewer);

        $this->getJson('/api/v1/finance/unit-accounts')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $accountA->id);

        $this->getJson("/api/v1/finance/unit-accounts/{$accountB->id}")
            ->assertForbidden();

        $this->postJson("/api/v1/finance/unit-accounts/{$accountB->id}/ledger-entries", [
            'type' => LedgerEntryType::Charge->value,
            'amount' => 350,
            'description' => 'Cross-compound charge must be blocked.',
        ])->assertForbidden();

        $this->postJson('/api/v1/finance/unit-accounts', [
            'unitId' => $unbilledUnitB->id,
            'currency' => 'EGP',
        ])->assertForbidden();
    }

    public function test_membership_scoped_compound_admin_cannot_access_or_mutate_other_compound_unit_account_when_compound_id_is_null(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();

        $admin = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => null,
        ]);

        $managedUnit = $this->createUnitForCompound($compoundA, 'A-111');
        $managedUnit->apartmentResidents()->create([
            'user_id' => $admin->id,
            'relation_type' => UnitRelationType::Owner->value,
            'verification_status' => VerificationStatus::Verified->value,
            'starts_at' => now()->subYear(),
        ]);

        $unitA = $this->createUnitForCompound($compoundA, 'A-101');
        $unitB = $this->createUnitForCompound($compoundB, 'B-101');
        $unbilledUnitB = $this->createUnitForCompound($compoundB, 'B-102');
        $accountA = UnitAccount::factory()->for($unitA)->create();
        $accountB = UnitAccount::factory()->for($unitB)->create();

        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/finance/unit-accounts')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $accountA->id);

        $this->getJson("/api/v1/finance/unit-accounts/{$accountB->id}")
            ->assertForbidden();

        $this->postJson("/api/v1/finance/unit-accounts/{$accountB->id}/ledger-entries", [
            'type' => LedgerEntryType::Charge->value,
            'amount' => 350,
            'description' => 'Cross-compound charge must be blocked.',
        ])->assertForbidden();

        $this->postJson('/api/v1/finance/unit-accounts', [
            'unitId' => $unbilledUnitB->id,
            'currency' => 'EGP',
        ])->assertForbidden();
    }

    public function test_scoped_finance_reviewer_cannot_access_or_review_other_compound_payment_submission(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();

        $reviewer = User::factory()->create([
            'role' => UserRole::FinanceReviewer->value,
            'compound_id' => $compoundA->id,
        ]);

        $accountA = UnitAccount::factory()
            ->for($this->createUnitForCompound($compoundA, 'A-201'))
            ->create(['balance' => '500.00']);
        $accountB = UnitAccount::factory()
            ->for($this->createUnitForCompound($compoundB, 'B-201'))
            ->create(['balance' => '700.00']);

        $paymentA = PaymentSubmission::factory()->for($accountA)->create([
            'status' => PaymentStatus::Submitted->value,
        ]);
        $paymentB = PaymentSubmission::factory()->for($accountB)->create([
            'status' => PaymentStatus::Submitted->value,
            'amount' => '200.00',
        ]);

        Sanctum::actingAs($reviewer);

        $this->getJson('/api/v1/finance/payment-submissions')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $paymentA->id);

        $this->patchJson("/api/v1/finance/payment-submissions/{$paymentB->id}/approve")
            ->assertForbidden();
        $this->patchJson("/api/v1/finance/payment-submissions/{$paymentB->id}/reject", [
            'reason' => 'Cross-compound review must be blocked.',
        ])->assertForbidden();
        $this->patchJson("/api/v1/finance/payment-submissions/{$paymentB->id}/request-correction", [
            'note' => 'Cross-compound correction must be blocked.',
        ])->assertForbidden();

        $this->assertDatabaseHas('payment_submissions', [
            'id' => $paymentB->id,
            'status' => PaymentStatus::Submitted->value,
            'reviewed_by' => null,
        ]);
        $this->assertDatabaseHas('unit_accounts', [
            'id' => $accountB->id,
            'balance' => '700.00',
        ]);
    }

    public function test_scope_assigned_finance_reviewer_without_direct_compound_id_cannot_cross_compound_unit_accounts_or_payment_reviews(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();

        $reviewer = $this->makeScopeAssignedFinanceReviewer($compoundA);

        $unitA = $this->createUnitForCompound($compoundA, 'A-301');
        $unitB = $this->createUnitForCompound($compoundB, 'B-301');
        $unbilledUnitB = $this->createUnitForCompound($compoundB, 'B-302');
        $accountA = UnitAccount::factory()->for($unitA)->create(['balance' => '500.00']);
        $accountB = UnitAccount::factory()->for($unitB)->create(['balance' => '700.00']);

        $paymentA = PaymentSubmission::factory()->for($accountA)->create([
            'status' => PaymentStatus::Submitted->value,
        ]);
        $paymentB = PaymentSubmission::factory()->for($accountB)->create([
            'status' => PaymentStatus::Submitted->value,
        ]);

        Sanctum::actingAs($reviewer);

        $this->getJson('/api/v1/finance/unit-accounts')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $accountA->id);

        $this->getJson("/api/v1/finance/unit-accounts/{$accountB->id}")
            ->assertForbidden();

        $this->postJson('/api/v1/finance/unit-accounts', [
            'unitId' => $unbilledUnitB->id,
            'currency' => 'EGP',
        ])->assertForbidden();

        $this->getJson('/api/v1/finance/payment-submissions')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $paymentA->id);

        $this->patchJson("/api/v1/finance/payment-submissions/{$paymentB->id}/approve")
            ->assertForbidden();

        $this->assertDatabaseHas('payment_submissions', [
            'id' => $paymentB->id,
            'status' => PaymentStatus::Submitted->value,
            'reviewed_by' => null,
        ]);
    }

    public function test_membership_scoped_compound_admin_cannot_access_or_review_other_compound_payment_submission_when_compound_id_is_null(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();

        $admin = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => null,
        ]);

        $managedUnit = $this->createUnitForCompound($compoundA, 'A-301');
        $managedUnit->apartmentResidents()->create([
            'user_id' => $admin->id,
            'relation_type' => UnitRelationType::Owner->value,
            'verification_status' => VerificationStatus::Verified->value,
            'starts_at' => now()->subYear(),
        ]);

        $accountA = UnitAccount::factory()
            ->for($this->createUnitForCompound($compoundA, 'A-201'))
            ->create(['balance' => '500.00']);
        $accountB = UnitAccount::factory()
            ->for($this->createUnitForCompound($compoundB, 'B-201'))
            ->create(['balance' => '700.00']);

        $paymentA = PaymentSubmission::factory()->for($accountA)->create([
            'status' => PaymentStatus::Submitted->value,
        ]);
        $paymentB = PaymentSubmission::factory()->for($accountB)->create([
            'status' => PaymentStatus::Submitted->value,
            'amount' => '200.00',
        ]);

        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/finance/payment-submissions')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $paymentA->id);

        $this->patchJson("/api/v1/finance/payment-submissions/{$paymentB->id}/approve")
            ->assertForbidden();
        $this->patchJson("/api/v1/finance/payment-submissions/{$paymentB->id}/reject", [
            'reason' => 'Cross-compound review must be blocked.',
        ])->assertForbidden();
        $this->patchJson("/api/v1/finance/payment-submissions/{$paymentB->id}/request-correction", [
            'note' => 'Cross-compound correction must be blocked.',
        ])->assertForbidden();

        $this->assertDatabaseHas('payment_submissions', [
            'id' => $paymentB->id,
            'status' => PaymentStatus::Submitted->value,
            'reviewed_by' => null,
        ]);
        $this->assertDatabaseHas('unit_accounts', [
            'id' => $accountB->id,
            'balance' => '700.00',
        ]);
    }

    public function test_unauthenticated_requests_are_rejected(): void
    {
        $this->getJson('/api/v1/finance/unit-accounts')->assertUnauthorized();
        $this->getJson('/api/v1/finance/payment-submissions')->assertUnauthorized();
        $this->getJson('/api/v1/my/finance/unit-accounts')->assertUnauthorized();
        $this->getJson('/api/v1/my/finance/payment-submissions')->assertUnauthorized();
    }

    public function test_payment_notifications_include_arabic_translations(): void
    {
        $reviewer = User::factory()->create(['role' => UserRole::FinanceReviewer->value]);
        $resident = User::factory()->create(['role' => UserRole::ResidentOwner->value]);
        $account = UnitAccount::factory()->for($this->createUnit())->create(['balance' => '1000.00']);

        $approvedPayment = PaymentSubmission::factory()->for($account)->create([
            'submitted_by' => $resident->id,
            'amount' => '300.00',
            'status' => PaymentStatus::Submitted->value,
        ]);
        $rejectedPayment = PaymentSubmission::factory()->for($account)->create([
            'submitted_by' => $resident->id,
            'amount' => '200.00',
            'status' => PaymentStatus::Submitted->value,
        ]);

        Event::fake();
        Sanctum::actingAs($reviewer);

        $this->patchJson("/api/v1/finance/payment-submissions/{$approvedPayment->id}/approve")->assertOk();
        $this->patchJson("/api/v1/finance/payment-submissions/{$rejectedPayment->id}/reject", ['reason' => 'Unclear receipt'])->assertOk();

        $notifications = Notification::query()
            ->where('user_id', $resident->id)
            ->get()
            ->keyBy('title');

        $approveNotif = $notifications->get('Payment approved');
        $this->assertNotNull($approveNotif);
        $this->assertSame('تمت الموافقة على الدفعة', $approveNotif->metadata['titleTranslations']['ar'] ?? null);

        $rejectNotif = $notifications->get('Payment rejected');
        $this->assertNotNull($rejectNotif);
        $this->assertSame('تم رفض الدفعة', $rejectNotif->metadata['titleTranslations']['ar'] ?? null);
    }

    // -------------------------------------------------------------------------
    // P13 – Payment correction, payment date, and allocation
    // -------------------------------------------------------------------------

    public function test_reviewer_can_request_correction_on_submitted_payment(): void
    {
        $reviewer = User::factory()->create(['role' => UserRole::FinanceReviewer->value]);
        $resident = User::factory()->create(['role' => UserRole::ResidentOwner->value]);
        $account = UnitAccount::factory()->for($this->createUnit())->create(['balance' => '500.00']);
        $payment = PaymentSubmission::factory()->for($account)->create([
            'submitted_by' => $resident->id,
            'amount' => '200.00',
            'status' => PaymentStatus::Submitted->value,
        ]);

        Event::fake();
        Sanctum::actingAs($reviewer);

        $this->patchJson("/api/v1/finance/payment-submissions/{$payment->id}/request-correction", [
            'note' => 'Please upload a clearer receipt image.',
        ])
            ->assertOk()
            ->assertJsonPath('data.status', PaymentStatus::UnderReview->value)
            ->assertJsonPath('data.correctionNote', 'Please upload a clearer receipt image.');

        $this->assertDatabaseHas('payment_submissions', [
            'id' => $payment->id,
            'status' => PaymentStatus::UnderReview->value,
            'correction_note' => 'Please upload a clearer receipt image.',
        ]);
        // Balance must remain unchanged
        $this->assertDatabaseHas('unit_accounts', ['id' => $account->id, 'balance' => '500.00']);

        $this->assertDatabaseHas('notifications', [
            'user_id' => $resident->id,
            'category' => NotificationCategory::Finance->value,
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'actor_id' => $reviewer->id,
            'action' => 'finance.payment_correction_requested',
        ]);
    }

    public function test_request_correction_requires_note(): void
    {
        $reviewer = User::factory()->create(['role' => UserRole::FinanceReviewer->value]);
        $account = UnitAccount::factory()->for($this->createUnit())->create();
        $payment = PaymentSubmission::factory()->for($account)->create([
            'status' => PaymentStatus::Submitted->value,
        ]);

        Sanctum::actingAs($reviewer);

        $this->patchJson("/api/v1/finance/payment-submissions/{$payment->id}/request-correction")
            ->assertUnprocessable();

        $this->patchJson("/api/v1/finance/payment-submissions/{$payment->id}/request-correction", [
            'note' => '',
        ])->assertUnprocessable();
    }

    public function test_can_request_correction_on_under_review_payment(): void
    {
        $reviewer = User::factory()->create(['role' => UserRole::FinanceReviewer->value]);
        $account = UnitAccount::factory()->for($this->createUnit())->create(['balance' => '300.00']);
        $payment = PaymentSubmission::factory()->for($account)->create([
            'amount' => '100.00',
            'status' => PaymentStatus::UnderReview->value,
            'correction_note' => 'First correction note.',
        ]);

        Event::fake();
        Sanctum::actingAs($reviewer);

        $this->patchJson("/api/v1/finance/payment-submissions/{$payment->id}/request-correction", [
            'note' => 'Still unclear — please resubmit.',
        ])
            ->assertOk()
            ->assertJsonPath('data.status', PaymentStatus::UnderReview->value)
            ->assertJsonPath('data.correctionNote', 'Still unclear — please resubmit.');
    }

    public function test_cannot_request_correction_on_approved_or_rejected_payment(): void
    {
        $reviewer = User::factory()->create(['role' => UserRole::FinanceReviewer->value]);
        $account = UnitAccount::factory()->for($this->createUnit())->create(['balance' => '1000.00']);
        $approvedPayment = PaymentSubmission::factory()->for($account)->create([
            'amount' => '200.00',
            'status' => PaymentStatus::Approved->value,
        ]);
        $rejectedPayment = PaymentSubmission::factory()->for($account)->create([
            'amount' => '200.00',
            'status' => PaymentStatus::Rejected->value,
        ]);

        Sanctum::actingAs($reviewer);

        $this->patchJson("/api/v1/finance/payment-submissions/{$approvedPayment->id}/request-correction", [
            'note' => 'Too late.',
        ])->assertUnprocessable();

        $this->patchJson("/api/v1/finance/payment-submissions/{$rejectedPayment->id}/request-correction", [
            'note' => 'Too late.',
        ])->assertUnprocessable();
    }

    public function test_payment_submission_stores_optional_payment_date(): void
    {
        $resident = User::factory()->create(['role' => UserRole::ResidentOwner->value]);
        $unit = $this->createUnit('C-301');
        $account = UnitAccount::factory()->for($unit)->create();

        $unit->apartmentResidents()->create([
            'user_id' => $resident->id,
            'relation_type' => UnitRelationType::Owner->value,
            'verification_status' => VerificationStatus::Verified->value,
            'is_primary' => true,
        ]);

        Sanctum::actingAs($resident);

        $this->postJson("/api/v1/finance/unit-accounts/{$account->id}/payment-submissions", [
            'amount' => 150,
            'method' => 'bank_transfer',
            'payment_date' => '2026-04-20',
        ])
            ->assertCreated()
            ->assertJsonPath('data.paymentDate', '2026-04-20');

        $this->assertDatabaseHas('payment_submissions', [
            'unit_account_id' => $account->id,
            'payment_date' => '2026-04-20',
        ]);
    }

    public function test_payment_date_must_not_be_in_the_future(): void
    {
        $resident = User::factory()->create(['role' => UserRole::ResidentOwner->value]);
        $unit = $this->createUnit('D-401');
        $account = UnitAccount::factory()->for($unit)->create();

        $unit->apartmentResidents()->create([
            'user_id' => $resident->id,
            'relation_type' => UnitRelationType::Owner->value,
            'verification_status' => VerificationStatus::Verified->value,
            'is_primary' => true,
        ]);

        Sanctum::actingAs($resident);

        $futureDate = now()->addDays(5)->toDateString();

        $this->postJson("/api/v1/finance/unit-accounts/{$account->id}/payment-submissions", [
            'amount' => 100,
            'method' => 'bank_transfer',
            'payment_date' => $futureDate,
        ])->assertUnprocessable();
    }

    public function test_correction_notification_includes_arabic_translation(): void
    {
        $reviewer = User::factory()->create(['role' => UserRole::FinanceReviewer->value]);
        $resident = User::factory()->create(['role' => UserRole::ResidentOwner->value]);
        $account = UnitAccount::factory()->for($this->createUnit())->create(['balance' => '400.00']);
        $payment = PaymentSubmission::factory()->for($account)->create([
            'submitted_by' => $resident->id,
            'amount' => '100.00',
            'status' => PaymentStatus::Submitted->value,
        ]);

        Event::fake();
        Sanctum::actingAs($reviewer);

        $this->patchJson("/api/v1/finance/payment-submissions/{$payment->id}/request-correction", [
            'note' => 'Please reupload.',
        ])->assertOk();

        $notification = Notification::query()
            ->where('user_id', $resident->id)
            ->where('category', NotificationCategory::Finance->value)
            ->latest()
            ->first();

        $this->assertNotNull($notification);
        $this->assertNotEmpty($notification->metadata['titleTranslations']['ar'] ?? '');
    }

    private function createUnit(string $unitNumber = 'A-101'): Unit
    {
        $compound = Compound::factory()->create();
        $building = Building::factory()->for($compound)->create();

        return Unit::factory()
            ->for($compound)
            ->for($building)
            ->create(['floor_id' => null, 'unit_number' => $unitNumber]);
    }

    private function createUnitForCompound(Compound $compound, string $unitNumber): Unit
    {
        $building = Building::factory()->for($compound)->create();

        return Unit::factory()
            ->for($compound)
            ->for($building)
            ->create(['floor_id' => null, 'unit_number' => $unitNumber]);
    }
}
