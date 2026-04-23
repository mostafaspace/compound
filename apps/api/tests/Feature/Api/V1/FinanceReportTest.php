<?php

namespace Tests\Feature\Api\V1;

use App\Enums\LedgerEntryType;
use App\Enums\PaymentStatus;
use App\Enums\UserRole;
use App\Models\Finance\LedgerEntry;
use App\Models\Finance\PaymentSubmission;
use App\Models\Finance\UnitAccount;
use App\Models\Property\Building;
use App\Models\Property\Compound;
use App\Models\Property\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class FinanceReportTest extends TestCase
{
    use RefreshDatabase;

    public function test_summary_returns_correct_totals(): void
    {
        $reviewer = User::factory()->create(['role' => UserRole::FinanceReviewer->value]);
        $account1 = UnitAccount::factory()->for($this->createUnit('A-101'))->create(['balance' => '1000.00']);
        $account2 = UnitAccount::factory()->for($this->createUnit('A-102'))->create(['balance' => '500.00']);
        $account3 = UnitAccount::factory()->for($this->createUnit('A-103'))->create(['balance' => '-200.00']);

        // Post ledger entries to back the balances
        LedgerEntry::query()->insert([
            ['unit_account_id' => $account1->id, 'type' => LedgerEntryType::Charge->value, 'amount' => '1000.00', 'description' => 'Maintenance', 'created_by' => $reviewer->id, 'created_at' => now(), 'updated_at' => now()],
            ['unit_account_id' => $account2->id, 'type' => LedgerEntryType::Charge->value, 'amount' => '500.00', 'description' => 'Maintenance', 'created_by' => $reviewer->id, 'created_at' => now(), 'updated_at' => now()],
            ['unit_account_id' => $account3->id, 'type' => LedgerEntryType::OpeningBalance->value, 'amount' => '300.00', 'description' => 'Opening', 'created_by' => $reviewer->id, 'created_at' => now(), 'updated_at' => now()],
            ['unit_account_id' => $account3->id, 'type' => LedgerEntryType::Payment->value, 'amount' => '-500.00', 'description' => 'Payment', 'created_by' => $reviewer->id, 'created_at' => now(), 'updated_at' => now()],
        ]);

        Sanctum::actingAs($reviewer);

        $response = $this->getJson('/api/v1/finance/reports/summary')->assertOk();

        $data = $response->json('data');

        $this->assertEquals('1800.00', $data['totalBilled']);     // 1000 + 500 + 300
        $this->assertEquals('500.00', $data['totalCollected']);   // abs(-500)
        $this->assertEquals('1500.00', $data['totalOutstanding']); // 1000 + 500
        $this->assertEquals('200.00', $data['totalCredit']);      // abs(-200)
        $this->assertEquals(2, $data['unpaidUnitsCount']);
        $this->assertEquals(1, $data['creditUnitsCount']);
        $this->assertEquals(3, $data['totalAccountsCount']);
    }

    public function test_summary_includes_pending_payments(): void
    {
        $reviewer = User::factory()->create(['role' => UserRole::FinanceReviewer->value]);
        $account = UnitAccount::factory()->for($this->createUnit())->create(['balance' => '800.00']);

        PaymentSubmission::factory()->for($account)->create(['amount' => '300.00', 'status' => PaymentStatus::Submitted->value]);
        PaymentSubmission::factory()->for($account)->create(['amount' => '200.00', 'status' => PaymentStatus::UnderReview->value]);
        PaymentSubmission::factory()->for($account)->create(['amount' => '100.00', 'status' => PaymentStatus::Approved->value]);

        Sanctum::actingAs($reviewer);

        $data = $this->getJson('/api/v1/finance/reports/summary')->assertOk()->json('data');

        $this->assertEquals(2, $data['pendingPaymentsCount']);
        $this->assertEquals('500.00', $data['pendingPaymentsAmount']);
    }

    public function test_summary_collection_rate_is_zero_when_nothing_billed(): void
    {
        $reviewer = User::factory()->create(['role' => UserRole::FinanceReviewer->value]);
        Sanctum::actingAs($reviewer);

        $data = $this->getJson('/api/v1/finance/reports/summary')->assertOk()->json('data');

        $this->assertEquals(0.0, $data['collectionRate']);
        $this->assertEquals(0, $data['totalAccountsCount']);
    }

    public function test_accounts_report_supports_balance_status_filter(): void
    {
        $reviewer = User::factory()->create(['role' => UserRole::FinanceReviewer->value]);
        UnitAccount::factory()->for($this->createUnit('A-101'))->create(['balance' => '1000.00']);
        UnitAccount::factory()->for($this->createUnit('A-102'))->create(['balance' => '0.00']);
        UnitAccount::factory()->for($this->createUnit('A-103'))->create(['balance' => '-300.00']);

        Sanctum::actingAs($reviewer);

        $this->getJson('/api/v1/finance/reports/accounts?balanceStatus=positive')
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->getJson('/api/v1/finance/reports/accounts?balanceStatus=zero')
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->getJson('/api/v1/finance/reports/accounts?balanceStatus=credit')
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->getJson('/api/v1/finance/reports/accounts?balanceStatus=all')
            ->assertOk()
            ->assertJsonCount(3, 'data');
    }

    public function test_accounts_report_ordered_by_balance_descending(): void
    {
        $reviewer = User::factory()->create(['role' => UserRole::FinanceReviewer->value]);
        UnitAccount::factory()->for($this->createUnit('A-101'))->create(['balance' => '200.00']);
        UnitAccount::factory()->for($this->createUnit('A-102'))->create(['balance' => '1000.00']);
        UnitAccount::factory()->for($this->createUnit('A-103'))->create(['balance' => '500.00']);

        Sanctum::actingAs($reviewer);

        $data = $this->getJson('/api/v1/finance/reports/accounts')->assertOk()->json('data');

        $this->assertEquals('1000.00', $data[0]['balance']);
        $this->assertEquals('500.00', $data[1]['balance']);
        $this->assertEquals('200.00', $data[2]['balance']);
    }

    public function test_accounts_report_supports_building_filter(): void
    {
        $reviewer = User::factory()->create(['role' => UserRole::FinanceReviewer->value]);
        $compound = Compound::factory()->create();
        $buildingA = Building::factory()->for($compound)->create();
        $buildingB = Building::factory()->for($compound)->create();

        $unitA = Unit::factory()->for($compound)->for($buildingA)->create(['unit_number' => 'A-101', 'floor_id' => null]);
        $unitB = Unit::factory()->for($compound)->for($buildingB)->create(['unit_number' => 'B-101', 'floor_id' => null]);

        UnitAccount::factory()->for($unitA)->create(['balance' => '500.00']);
        UnitAccount::factory()->for($unitB)->create(['balance' => '300.00']);

        Sanctum::actingAs($reviewer);

        $this->getJson("/api/v1/finance/reports/accounts?buildingId={$buildingA->id}")
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->getJson("/api/v1/finance/reports/accounts?buildingId={$buildingB->id}")
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_payment_method_breakdown_groups_approved_payments(): void
    {
        $reviewer = User::factory()->create(['role' => UserRole::FinanceReviewer->value]);
        $account = UnitAccount::factory()->for($this->createUnit())->create();

        PaymentSubmission::factory()->for($account)->count(2)->create(['method' => 'bank_transfer', 'amount' => '500.00', 'status' => PaymentStatus::Approved->value]);
        PaymentSubmission::factory()->for($account)->create(['method' => 'cash', 'amount' => '200.00', 'status' => PaymentStatus::Approved->value]);
        PaymentSubmission::factory()->for($account)->create(['method' => 'bank_transfer', 'amount' => '100.00', 'status' => PaymentStatus::Submitted->value]);

        Sanctum::actingAs($reviewer);

        $data = $this->getJson('/api/v1/finance/reports/payment-methods')->assertOk()->json('data');

        $bankRow = collect($data)->firstWhere('method', 'bank_transfer');
        $cashRow = collect($data)->firstWhere('method', 'cash');

        $this->assertNotNull($bankRow);
        $this->assertEquals(2, $bankRow['count']);
        $this->assertEquals('1000.00', $bankRow['total']);

        $this->assertNotNull($cashRow);
        $this->assertEquals(1, $cashRow['count']);
        $this->assertEquals('200.00', $cashRow['total']);
    }

    public function test_payment_method_breakdown_excludes_non_approved(): void
    {
        $reviewer = User::factory()->create(['role' => UserRole::FinanceReviewer->value]);
        $account = UnitAccount::factory()->for($this->createUnit())->create();

        PaymentSubmission::factory()->for($account)->create(['method' => 'bank_transfer', 'status' => PaymentStatus::Submitted->value]);
        PaymentSubmission::factory()->for($account)->create(['method' => 'bank_transfer', 'status' => PaymentStatus::Rejected->value]);

        Sanctum::actingAs($reviewer);

        $data = $this->getJson('/api/v1/finance/reports/payment-methods')->assertOk()->json('data');

        $this->assertEmpty($data);
    }

    public function test_resident_cannot_access_report_endpoints(): void
    {
        $resident = User::factory()->create(['role' => UserRole::ResidentOwner->value]);
        Sanctum::actingAs($resident);

        $this->getJson('/api/v1/finance/reports/summary')->assertForbidden();
        $this->getJson('/api/v1/finance/reports/accounts')->assertForbidden();
        $this->getJson('/api/v1/finance/reports/payment-methods')->assertForbidden();
    }

    public function test_unauthenticated_rejected_from_reports(): void
    {
        $this->getJson('/api/v1/finance/reports/summary')->assertUnauthorized();
        $this->getJson('/api/v1/finance/reports/accounts')->assertUnauthorized();
        $this->getJson('/api/v1/finance/reports/payment-methods')->assertUnauthorized();
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
}
