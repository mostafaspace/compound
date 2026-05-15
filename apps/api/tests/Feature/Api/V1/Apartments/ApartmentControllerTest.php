<?php

namespace Tests\Feature\Api\V1\Apartments;

use App\Enums\LedgerEntryType;
use App\Enums\UnitRelationType;
use App\Enums\VerificationStatus;
use App\Models\Apartments\ApartmentResident;
use App\Models\Finance\LedgerEntry;
use App\Models\Finance\UnitAccount;
use App\Models\Property\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ApartmentControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_returns_units_for_resident(): void
    {
        $user = User::factory()->create();
        $unit = Unit::factory()->create();
        ApartmentResident::factory()->create([
            'unit_id' => $unit->id,
            'user_id' => $user->id,
            'verification_status' => VerificationStatus::Verified,
            'relation_type' => UnitRelationType::Owner,
        ]);
        Sanctum::actingAs($user);

        $this->getJson('/api/v1/apartments')
            ->assertOk()
            ->assertJsonPath('data.0.id', $unit->id);
    }

    public function test_show_returns_aggregate_payload(): void
    {
        $user = User::factory()->create();
        $unit = Unit::factory()->create(['has_parking' => true]);
        ApartmentResident::factory()->create([
            'unit_id' => $unit->id,
            'user_id' => $user->id,
            'verification_status' => VerificationStatus::Verified,
        ]);
        Sanctum::actingAs($user);

        $this->getJson("/api/v1/apartments/{$unit->id}")
            ->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'residents',
                    'vehicles',
                    'parkingSpots',
                    'violationsSummary',
                    'documents',
                    'finance',
                ],
            ]);
    }

    public function test_submitted_contribution_refreshes_outstanding_and_recent_payments(): void
    {
        $user = User::factory()->create();
        $unit = Unit::factory()->create();
        $account = UnitAccount::factory()->for($unit)->create(['balance' => '500.00']);
        $charge = LedgerEntry::query()->create([
            'unit_account_id' => $account->id,
            'type' => LedgerEntryType::Charge->value,
            'amount' => '500.00',
            'description' => 'Monthly contribution',
        ]);
        ApartmentResident::factory()->create([
            'unit_id' => $unit->id,
            'user_id' => $user->id,
            'verification_status' => VerificationStatus::Verified,
            'relation_type' => UnitRelationType::Owner,
        ]);
        Sanctum::actingAs($user);

        $this->getJson("/api/v1/apartments/{$unit->id}")
            ->assertOk()
            ->assertJsonPath('data.finance.outstandingEntries.0.id', $charge->id)
            ->assertJsonCount(0, 'data.finance.account.paymentSubmissions');

        $this->postJson("/api/v1/finance/unit-accounts/{$account->id}/payment-submissions", [
            'amount' => 500,
            'method' => 'bank_transfer',
            'ledger_entry_ids' => [$charge->id],
        ])->assertCreated();

        $this->getJson("/api/v1/apartments/{$unit->id}")
            ->assertOk()
            ->assertJsonCount(0, 'data.finance.outstandingEntries')
            ->assertJsonPath('data.finance.account.paymentSubmissions.0.amount', '500.00')
            ->assertJsonPath('data.finance.account.paymentSubmissions.0.status', 'submitted');
    }

    public function test_show_blocks_non_member(): void
    {
        $user = User::factory()->create();
        $unit = Unit::factory()->create();
        Sanctum::actingAs($user);

        $this->getJson("/api/v1/apartments/{$unit->id}")->assertForbidden();
    }
}
