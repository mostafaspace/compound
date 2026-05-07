<?php

namespace Tests\Feature\Api\V1;

use App\Enums\AccountStatus;
use App\Enums\GatewayTransactionStatus;
use App\Enums\PaymentSessionStatus;
use App\Enums\PaymentStatus;
use App\Enums\UnitRelationType;
use App\Enums\UserRole;
use App\Enums\VerificationStatus;
use App\Models\Finance\GatewayTransaction;
use App\Models\Finance\PaymentSession;
use App\Models\Finance\PaymentSubmission;
use App\Models\Finance\UnitAccount;
use App\Models\Property\Building;
use App\Models\Property\Compound;
use App\Models\Property\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OnlinePaymentTest extends TestCase
{
    use RefreshDatabase;

    // ── Helpers ──────────────────────────────────────────────────────────────

    private function makeAdmin(Compound $compound): User
    {
        return User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => $compound->id,
            'status' => AccountStatus::Active->value,
        ]);
    }

    private function makeMembershipScopedAdmin(Compound $compound): User
    {
        $admin = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => null,
            'status' => AccountStatus::Active->value,
        ]);

        [$unit] = $this->createUnitWithAccount($compound, $admin);

        return $admin->refresh();
    }

    private function makeResident(Compound $compound): User
    {
        return User::factory()->create([
            'role' => UserRole::ResidentOwner->value,
            'compound_id' => $compound->id,
            'status' => AccountStatus::Active->value,
        ]);
    }

    private function createUnitWithAccount(Compound $compound, User $resident, float $balance = 1000.0): array
    {
        $building = Building::factory()->for($compound)->create();
        $unit = Unit::factory()->for($compound)->for($building)->create(['floor_id' => null, 'unit_number' => 'T-'.random_int(100, 999)]);

        $unit->apartmentResidents()->create([
            'user_id' => $resident->id,
            'relation_type' => UnitRelationType::Owner->value,
            'starts_at' => now()->toDateString(),
            'is_primary' => true,
            'verification_status' => VerificationStatus::Verified->value,
            'created_by' => $resident->id,
        ]);

        $account = UnitAccount::factory()->for($unit)->create(['balance' => $balance, 'currency' => 'EGP']);

        return [$unit, $account];
    }

    // ── Resident: create payment session ─────────────────────────────────────

    public function test_resident_can_create_payment_session(): void
    {
        $compound = Compound::factory()->create();
        $resident = $this->makeResident($compound);
        [, $account] = $this->createUnitWithAccount($compound, $resident);

        Sanctum::actingAs($resident);

        $response = $this->postJson('/api/v1/finance/payment-sessions', [
            'unit_account_id' => $account->id,
            'amount' => 500,
        ]);

        $response->assertCreated();
        $response->assertJsonPath('data.status', 'pending');
        $response->assertJsonPath('data.provider', 'mock');

        $this->assertDatabaseHas('payment_sessions', [
            'unit_account_id' => $account->id,
            'status' => 'pending',
            'amount' => '500.00',
        ]);
    }

    public function test_resident_cannot_create_session_for_another_residents_account(): void
    {
        $compound = Compound::factory()->create();
        $resident1 = $this->makeResident($compound);
        $resident2 = $this->makeResident($compound);
        [, $account] = $this->createUnitWithAccount($compound, $resident1);

        Sanctum::actingAs($resident2);

        $this->postJson('/api/v1/finance/payment-sessions', [
            'unit_account_id' => $account->id,
            'amount' => 500,
        ])->assertForbidden();
    }

    // ── Webhook: mock payment confirmed ──────────────────────────────────────

    public function test_mock_webhook_confirms_payment_and_creates_submission(): void
    {
        $compound = Compound::factory()->create();
        $resident = $this->makeResident($compound);
        [, $account] = $this->createUnitWithAccount($compound, $resident, balance: 1000.0);

        // Create a pending session
        $session = PaymentSession::factory()->create([
            'unit_account_id' => $account->id,
            'initiated_by' => $resident->id,
            'provider' => 'mock',
            'provider_session_id' => 'mock_sess_test_01',
            'amount' => 300.00,
            'currency' => 'EGP',
            'status' => PaymentSessionStatus::Pending,
        ]);

        $txId = 'mock_tx_'.Str::ulid();

        $response = $this->postJson('/api/v1/webhooks/payments/mock', [
            'event_type' => 'payment.succeeded',
            'transaction_id' => $txId,
            'session_id' => 'mock_sess_test_01',
            'status' => 'confirmed',
            'amount' => 300.00,
            'currency' => 'EGP',
        ]);

        $response->assertSuccessful();
        $response->assertJsonPath('data.status', 'confirmed');

        // Session should be confirmed
        $this->assertDatabaseHas('payment_sessions', [
            'id' => $session->id,
            'status' => 'confirmed',
        ]);

        // A PaymentSubmission should be auto-created and approved
        $this->assertDatabaseHas('payment_submissions', [
            'unit_account_id' => $account->id,
            'amount' => '300.00',
            'status' => PaymentStatus::Approved->value,
        ]);

        // Balance should decrease from 1000 to 700
        $account->refresh();
        $this->assertEquals('700.00', number_format((float) $account->balance, 2, '.', ''));
    }

    public function test_duplicate_webhook_is_idempotent(): void
    {
        $compound = Compound::factory()->create();
        $resident = $this->makeResident($compound);
        [, $account] = $this->createUnitWithAccount($compound, $resident, balance: 1000.0);

        $session = PaymentSession::factory()->create([
            'unit_account_id' => $account->id,
            'initiated_by' => $resident->id,
            'provider' => 'mock',
            'provider_session_id' => 'mock_sess_dup_01',
            'amount' => 200.00,
            'status' => PaymentSessionStatus::Pending,
        ]);

        $txId = 'mock_tx_dup_'.Str::ulid();
        $payload = [
            'event_type' => 'payment.succeeded',
            'transaction_id' => $txId,
            'session_id' => 'mock_sess_dup_01',
            'status' => 'confirmed',
            'amount' => 200.00,
            'currency' => 'EGP',
        ];

        // First webhook
        $this->postJson('/api/v1/webhooks/payments/mock', $payload)->assertSuccessful();

        // Duplicate webhook
        $this->postJson('/api/v1/webhooks/payments/mock', $payload)->assertSuccessful();

        // Only one PaymentSubmission created
        $this->assertEquals(1, PaymentSubmission::query()
            ->where('unit_account_id', $account->id)
            ->where('amount', 200.00)
            ->count());
    }

    // ── Admin: list sessions ──────────────────────────────────────────────────

    public function test_admin_can_list_payment_sessions(): void
    {
        $compound = Compound::factory()->create();
        $admin = $this->makeAdmin($compound);
        $resident = $this->makeResident($compound);
        [, $account] = $this->createUnitWithAccount($compound, $resident);

        PaymentSession::factory()->count(3)->create([
            'unit_account_id' => $account->id,
            'initiated_by' => $resident->id,
        ]);

        Sanctum::actingAs($admin);

        $this->getJson("/api/v1/finance/payment-sessions?compound_id={$compound->id}")
            ->assertOk()
            ->assertJsonCount(3, 'data');
    }

    public function test_membership_scoped_admin_cannot_list_other_compounds_payment_sessions_when_compound_id_is_null(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();
        $admin = $this->makeMembershipScopedAdmin($compoundA);
        $residentA = $this->makeResident($compoundA);
        $residentB = $this->makeResident($compoundB);
        [, $accountA] = $this->createUnitWithAccount($compoundA, $residentA);
        [, $accountB] = $this->createUnitWithAccount($compoundB, $residentB);

        $sessionA = PaymentSession::factory()->create([
            'unit_account_id' => $accountA->id,
            'initiated_by' => $residentA->id,
        ]);
        PaymentSession::factory()->create([
            'unit_account_id' => $accountB->id,
            'initiated_by' => $residentB->id,
        ]);

        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/finance/payment-sessions')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $sessionA->id);

        $this->getJson("/api/v1/finance/payment-sessions?compound_id={$compoundB->id}")
            ->assertForbidden();
    }

    // ── Admin: refund ─────────────────────────────────────────────────────────

    public function test_admin_can_refund_confirmed_transaction(): void
    {
        $compound = Compound::factory()->create();
        $admin = $this->makeAdmin($compound);
        $resident = $this->makeResident($compound);
        [, $account] = $this->createUnitWithAccount($compound, $resident, balance: 500.0);

        $session = PaymentSession::factory()->confirmed()->create([
            'unit_account_id' => $account->id,
            'initiated_by' => $resident->id,
            'amount' => 500.00,
        ]);

        $tx = GatewayTransaction::factory()->create([
            'payment_session_id' => $session->id,
            'provider' => 'mock',
            'provider_transaction_id' => 'mock_tx_refund_'.Str::ulid(),
            'status' => GatewayTransactionStatus::Confirmed,
            'amount' => 500.00,
            'currency' => 'EGP',
        ]);

        Sanctum::actingAs($admin);

        $this->postJson("/api/v1/finance/gateway-transactions/{$tx->id}/refund", [
            'amount' => 500,
        ])->assertCreated();

        // Original tx still confirmed; refund tx is refunded
        $this->assertDatabaseHas('gateway_transactions', [
            'payment_session_id' => $session->id,
            'status' => GatewayTransactionStatus::Refunded->value,
        ]);
    }

    public function test_cannot_refund_more_than_transaction_amount(): void
    {
        $compound = Compound::factory()->create();
        $admin = $this->makeAdmin($compound);
        $resident = $this->makeResident($compound);
        [, $account] = $this->createUnitWithAccount($compound, $resident);

        $session = PaymentSession::factory()->confirmed()->create([
            'unit_account_id' => $account->id,
            'initiated_by' => $resident->id,
            'amount' => 100.00,
        ]);

        $tx = GatewayTransaction::factory()->create([
            'payment_session_id' => $session->id,
            'status' => GatewayTransactionStatus::Confirmed,
            'amount' => 100.00,
        ]);

        Sanctum::actingAs($admin);

        $this->postJson("/api/v1/finance/gateway-transactions/{$tx->id}/refund", [
            'amount' => 200,
        ])->assertUnprocessable();
    }

    // ── Cross-compound isolation ──────────────────────────────────────────────

    public function test_admin_cannot_refund_other_compounds_transaction(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();

        $adminA = $this->makeAdmin($compoundA);
        $residentB = $this->makeResident($compoundB);
        [, $accountB] = $this->createUnitWithAccount($compoundB, $residentB);

        $session = PaymentSession::factory()->confirmed()->create([
            'unit_account_id' => $accountB->id,
            'initiated_by' => $residentB->id,
        ]);

        $tx = GatewayTransaction::factory()->create([
            'payment_session_id' => $session->id,
            'status' => GatewayTransactionStatus::Confirmed,
            'amount' => 100.00,
        ]);

        Sanctum::actingAs($adminA);

        $this->postJson("/api/v1/finance/gateway-transactions/{$tx->id}/refund")
            ->assertForbidden();
    }

    public function test_membership_scoped_admin_cannot_refund_other_compounds_transaction_when_compound_id_is_null(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();

        $admin = $this->makeMembershipScopedAdmin($compoundA);
        $residentB = $this->makeResident($compoundB);
        [, $accountB] = $this->createUnitWithAccount($compoundB, $residentB);

        $session = PaymentSession::factory()->confirmed()->create([
            'unit_account_id' => $accountB->id,
            'initiated_by' => $residentB->id,
        ]);

        $tx = GatewayTransaction::factory()->create([
            'payment_session_id' => $session->id,
            'status' => GatewayTransactionStatus::Confirmed,
            'amount' => 100.00,
        ]);

        Sanctum::actingAs($admin);

        $this->postJson("/api/v1/finance/gateway-transactions/{$tx->id}/refund")
            ->assertForbidden();
    }
}
