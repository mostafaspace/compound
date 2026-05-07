<?php

namespace Tests\Feature\Api\V1;

use App\Enums\CampaignStatus;
use App\Enums\ChargeFrequency;
use App\Enums\Permission;
use App\Enums\UnitRelationType;
use App\Enums\UserRole;
use App\Enums\VerificationStatus;
use App\Models\Finance\ChargeType;
use App\Models\Finance\CollectionCampaign;
use App\Models\Finance\RecurringCharge;
use App\Models\Finance\UnitAccount;
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

class ChargesTest extends TestCase
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

    // ──────────────────────────────────────────────────────────
    // Charge types
    // ──────────────────────────────────────────────────────────

    public function test_super_admin_can_create_charge_type(): void
    {
        $admin = User::factory()->create(['role' => UserRole::SuperAdmin->value]);
        Sanctum::actingAs($admin);

        $this->postJson('/api/v1/finance/charge-types', [
            'name' => 'Monthly Maintenance',
            'code' => 'MAINT',
            'default_amount' => 500,
            'is_recurring' => true,
        ])
            ->assertCreated()
            ->assertJsonPath('data.name', 'Monthly Maintenance')
            ->assertJsonPath('data.code', 'MAINT')
            ->assertJsonPath('data.isRecurring', true);

        $this->assertDatabaseHas('charge_types', [
            'name' => 'Monthly Maintenance',
            'code' => 'MAINT',
        ]);

        $this->assertDatabaseHas('audit_logs', [
            'actor_id' => $admin->id,
            'action' => 'dues.charge_type_created',
        ]);
    }

    public function test_finance_reviewer_can_list_charge_types(): void
    {
        $reviewer = User::factory()->create(['role' => UserRole::FinanceReviewer->value]);
        ChargeType::factory()->count(3)->create();

        Sanctum::actingAs($reviewer);

        $this->getJson('/api/v1/finance/charge-types')
            ->assertOk()
            ->assertJsonCount(3, 'data');
    }

    public function test_super_admin_can_update_charge_type(): void
    {
        $admin = User::factory()->create(['role' => UserRole::SuperAdmin->value]);
        $chargeType = ChargeType::factory()->create(['name' => 'Original Name']);

        Sanctum::actingAs($admin);

        $this->patchJson("/api/v1/finance/charge-types/{$chargeType->id}", [
            'name' => 'Updated Name',
            'code' => $chargeType->code,
        ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Updated Name');
    }

    public function test_charge_type_search_filter_works(): void
    {
        $reviewer = User::factory()->create(['role' => UserRole::FinanceReviewer->value]);
        ChargeType::factory()->create(['name' => 'Maintenance Fee']);
        ChargeType::factory()->create(['name' => 'Parking Fee']);

        Sanctum::actingAs($reviewer);

        $this->getJson('/api/v1/finance/charge-types?search=Parking')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Parking Fee');
    }

    // ──────────────────────────────────────────────────────────
    // Recurring charges
    // ──────────────────────────────────────────────────────────

    public function test_finance_reviewer_can_create_recurring_charge(): void
    {
        $reviewer = User::factory()->create(['role' => UserRole::FinanceReviewer->value]);
        $compound = Compound::factory()->create();
        $chargeType = ChargeType::factory()->create(['is_recurring' => true]);

        Sanctum::actingAs($reviewer);

        $this->postJson('/api/v1/finance/recurring-charges', [
            'compound_id' => $compound->id,
            'charge_type_id' => $chargeType->id,
            'name' => 'Monthly Maintenance Q1',
            'amount' => 750,
            'currency' => 'EGP',
            'frequency' => ChargeFrequency::Monthly->value,
            'billing_day' => 1,
            'target_type' => 'all',
            'starts_at' => now()->startOfMonth()->toDateString(),
        ])
            ->assertCreated()
            ->assertJsonPath('data.name', 'Monthly Maintenance Q1')
            ->assertJsonPath('data.amount', '750.00')
            ->assertJsonPath('data.frequency', ChargeFrequency::Monthly->value);

        $this->assertDatabaseHas('recurring_charges', [
            'compound_id' => $compound->id,
            'charge_type_id' => $chargeType->id,
            'name' => 'Monthly Maintenance Q1',
            'is_active' => true,
        ]);

        $this->assertDatabaseHas('audit_logs', [
            'actor_id' => $reviewer->id,
            'action' => 'dues.recurring_charge_created',
        ]);
    }

    public function test_finance_reviewer_can_list_recurring_charges(): void
    {
        $reviewer = User::factory()->create(['role' => UserRole::FinanceReviewer->value]);
        $compound = Compound::factory()->create();
        $chargeType = ChargeType::factory()->create();

        RecurringCharge::factory()->count(2)->create([
            'compound_id' => $compound->id,
            'charge_type_id' => $chargeType->id,
        ]);

        Sanctum::actingAs($reviewer);

        $this->getJson('/api/v1/finance/recurring-charges')
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_finance_reviewer_can_deactivate_recurring_charge(): void
    {
        $reviewer = User::factory()->create(['role' => UserRole::FinanceReviewer->value]);
        $compound = Compound::factory()->create();
        $chargeType = ChargeType::factory()->create();

        $charge = RecurringCharge::factory()->create([
            'compound_id' => $compound->id,
            'charge_type_id' => $chargeType->id,
            'is_active' => true,
        ]);

        Sanctum::actingAs($reviewer);

        $this->patchJson("/api/v1/finance/recurring-charges/{$charge->id}/deactivate")
            ->assertOk()
            ->assertJsonPath('data.isActive', false);

        $this->assertDatabaseHas('recurring_charges', [
            'id' => $charge->id,
            'is_active' => false,
        ]);
    }

    public function test_recurring_charges_filter_by_compound_and_active(): void
    {
        $reviewer = User::factory()->create(['role' => UserRole::FinanceReviewer->value]);
        $compound1 = Compound::factory()->create();
        $compound2 = Compound::factory()->create();
        $chargeType = ChargeType::factory()->create();

        RecurringCharge::factory()->create([
            'compound_id' => $compound1->id,
            'charge_type_id' => $chargeType->id,
            'is_active' => true,
        ]);
        RecurringCharge::factory()->create([
            'compound_id' => $compound2->id,
            'charge_type_id' => $chargeType->id,
            'is_active' => false,
        ]);

        Sanctum::actingAs($reviewer);

        $this->getJson("/api/v1/finance/recurring-charges?compound_id={$compound1->id}")
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->getJson('/api/v1/finance/recurring-charges?is_active=true')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_compound_scoped_finance_reviewer_cannot_cross_compound_recurring_charge_access(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();
        $reviewer = User::factory()->create([
            'role' => UserRole::FinanceReviewer->value,
            'compound_id' => $compoundA->id,
        ]);
        $chargeType = ChargeType::factory()->create();
        $chargeA = RecurringCharge::factory()->create([
            'compound_id' => $compoundA->id,
            'charge_type_id' => $chargeType->id,
        ]);
        $chargeB = RecurringCharge::factory()->create([
            'compound_id' => $compoundB->id,
            'charge_type_id' => $chargeType->id,
        ]);

        Sanctum::actingAs($reviewer);

        $this->getJson('/api/v1/finance/recurring-charges')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $chargeA->id);

        $this->getJson("/api/v1/finance/recurring-charges?compound_id={$compoundB->id}")
            ->assertForbidden();

        $this->getJson("/api/v1/finance/recurring-charges/{$chargeB->id}")
            ->assertForbidden();

        $this->patchJson("/api/v1/finance/recurring-charges/{$chargeB->id}/deactivate")
            ->assertForbidden();
    }

    public function test_membership_scoped_compound_admin_cannot_cross_compound_recurring_charge_access_when_compound_id_is_null(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();
        $admin = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => null,
        ]);
        $managedUnit = $this->createUnitForCompound($compoundA, 'A-401');
        $managedUnit->apartmentResidents()->create([
            'user_id' => $admin->id,
            'relation_type' => UnitRelationType::Owner->value,
            'verification_status' => VerificationStatus::Verified->value,
            'starts_at' => now()->subYear(),
        ]);

        $chargeType = ChargeType::factory()->create();
        $chargeA = RecurringCharge::factory()->create([
            'compound_id' => $compoundA->id,
            'charge_type_id' => $chargeType->id,
        ]);
        $chargeB = RecurringCharge::factory()->create([
            'compound_id' => $compoundB->id,
            'charge_type_id' => $chargeType->id,
        ]);

        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/finance/recurring-charges')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $chargeA->id);

        $this->getJson("/api/v1/finance/recurring-charges?compound_id={$compoundB->id}")
            ->assertForbidden();

        $this->getJson("/api/v1/finance/recurring-charges/{$chargeB->id}")
            ->assertForbidden();

        $this->patchJson("/api/v1/finance/recurring-charges/{$chargeB->id}/deactivate")
            ->assertForbidden();
    }

    public function test_compound_scoped_finance_reviewer_cannot_create_recurring_charge_for_other_compound(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();
        $reviewer = User::factory()->create([
            'role' => UserRole::FinanceReviewer->value,
            'compound_id' => $compoundA->id,
        ]);
        $chargeType = ChargeType::factory()->create(['is_recurring' => true]);

        Sanctum::actingAs($reviewer);

        $this->postJson('/api/v1/finance/recurring-charges', [
            'compound_id' => $compoundB->id,
            'charge_type_id' => $chargeType->id,
            'name' => 'Cross Compound Charge',
            'amount' => 750,
            'currency' => 'EGP',
            'frequency' => ChargeFrequency::Monthly->value,
            'billing_day' => 1,
            'target_type' => 'all',
            'starts_at' => now()->startOfMonth()->toDateString(),
        ])->assertForbidden();
    }

    // ──────────────────────────────────────────────────────────
    // Collection campaigns
    // ──────────────────────────────────────────────────────────

    public function test_finance_reviewer_can_create_collection_campaign(): void
    {
        $reviewer = User::factory()->create(['role' => UserRole::FinanceReviewer->value]);
        $compound = Compound::factory()->create();

        Sanctum::actingAs($reviewer);

        $this->postJson('/api/v1/finance/collection-campaigns', [
            'compound_id' => $compound->id,
            'name' => 'Elevator Repair Campaign',
            'description' => 'Collect funds for elevator repair in Building A.',
            'target_amount' => 50000,
        ])
            ->assertCreated()
            ->assertJsonPath('data.name', 'Elevator Repair Campaign')
            ->assertJsonPath('data.status', CampaignStatus::Draft->value);

        $this->assertDatabaseHas('collection_campaigns', [
            'compound_id' => $compound->id,
            'name' => 'Elevator Repair Campaign',
            'status' => CampaignStatus::Draft->value,
        ]);
    }

    public function test_campaign_can_be_published_and_archived(): void
    {
        $reviewer = User::factory()->create(['role' => UserRole::FinanceReviewer->value]);
        $compound = Compound::factory()->create();
        $campaign = CollectionCampaign::factory()->create([
            'compound_id' => $compound->id,
            'status' => CampaignStatus::Draft,
        ]);

        Sanctum::actingAs($reviewer);

        // Draft -> Active
        $this->patchJson("/api/v1/finance/collection-campaigns/{$campaign->id}/publish")
            ->assertOk()
            ->assertJsonPath('data.status', CampaignStatus::Active->value);

        $this->assertDatabaseHas('collection_campaigns', [
            'id' => $campaign->id,
            'status' => CampaignStatus::Active->value,
        ]);

        // Active -> Archived
        $this->patchJson("/api/v1/finance/collection-campaigns/{$campaign->id}/archive")
            ->assertOk()
            ->assertJsonPath('data.status', CampaignStatus::Archived->value);
    }

    public function test_campaign_can_be_updated(): void
    {
        $reviewer = User::factory()->create(['role' => UserRole::FinanceReviewer->value]);
        $compound = Compound::factory()->create();
        $campaign = CollectionCampaign::factory()->create([
            'compound_id' => $compound->id,
            'name' => 'Original Campaign',
        ]);

        Sanctum::actingAs($reviewer);

        $this->patchJson("/api/v1/finance/collection-campaigns/{$campaign->id}", [
            'name' => 'Renamed Campaign',
            'target_amount' => 75000,
        ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Renamed Campaign');
    }

    public function test_campaign_can_apply_charges_to_unit_accounts(): void
    {
        $reviewer = User::factory()->create(['role' => UserRole::FinanceReviewer->value]);
        $compound = Compound::factory()->create();
        $building = Building::factory()->for($compound)->create();

        $unit1 = Unit::factory()->for($compound)->for($building)->create(['floor_id' => null, 'unit_number' => 'A-101']);
        $unit2 = Unit::factory()->for($compound)->for($building)->create(['floor_id' => null, 'unit_number' => 'A-102']);

        $account1 = UnitAccount::factory()->for($unit1)->create(['balance' => '0.00']);
        $account2 = UnitAccount::factory()->for($unit2)->create(['balance' => '0.00']);

        $campaign = CollectionCampaign::factory()->create([
            'compound_id' => $compound->id,
            'status' => CampaignStatus::Active,
        ]);

        Sanctum::actingAs($reviewer);

        $this->postJson("/api/v1/finance/collection-campaigns/{$campaign->id}/charges", [
            'unit_account_ids' => [$account1->id, $account2->id],
            'amount' => 500,
            'description' => 'Elevator repair share',
        ])
            ->assertOk()
            ->assertJsonPath('posted', 2);

        // Verify balances went up
        $this->assertDatabaseHas('unit_accounts', ['id' => $account1->id, 'balance' => '500.00']);
        $this->assertDatabaseHas('unit_accounts', ['id' => $account2->id, 'balance' => '500.00']);
    }

    public function test_campaign_list_supports_status_and_compound_filters(): void
    {
        $reviewer = User::factory()->create(['role' => UserRole::FinanceReviewer->value]);
        $compound = Compound::factory()->create();

        CollectionCampaign::factory()->create([
            'compound_id' => $compound->id,
            'status' => CampaignStatus::Draft,
        ]);
        CollectionCampaign::factory()->create([
            'compound_id' => $compound->id,
            'status' => CampaignStatus::Active,
        ]);

        Sanctum::actingAs($reviewer);

        $this->getJson('/api/v1/finance/collection-campaigns?status=draft')
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->getJson("/api/v1/finance/collection-campaigns?compound_id={$compound->id}")
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_compound_scoped_finance_reviewer_cannot_cross_compound_campaign_access(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();
        $reviewer = User::factory()->create([
            'role' => UserRole::FinanceReviewer->value,
            'compound_id' => $compoundA->id,
        ]);
        $campaignA = CollectionCampaign::factory()->create([
            'compound_id' => $compoundA->id,
            'status' => CampaignStatus::Draft,
        ]);
        $campaignB = CollectionCampaign::factory()->create([
            'compound_id' => $compoundB->id,
            'status' => CampaignStatus::Draft,
        ]);

        Sanctum::actingAs($reviewer);

        $this->getJson('/api/v1/finance/collection-campaigns')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $campaignA->id);

        $this->getJson("/api/v1/finance/collection-campaigns?compound_id={$compoundB->id}")
            ->assertForbidden();

        $this->getJson("/api/v1/finance/collection-campaigns/{$campaignB->id}")
            ->assertForbidden();

        $this->patchJson("/api/v1/finance/collection-campaigns/{$campaignB->id}", [
            'name' => 'Blocked rename',
        ])->assertForbidden();

        $this->patchJson("/api/v1/finance/collection-campaigns/{$campaignB->id}/publish")
            ->assertForbidden();

        $this->patchJson("/api/v1/finance/collection-campaigns/{$campaignB->id}/archive")
            ->assertForbidden();
    }

    public function test_membership_scoped_compound_admin_cannot_cross_compound_campaign_access_when_compound_id_is_null(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();
        $admin = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => null,
        ]);
        $managedUnit = $this->createUnitForCompound($compoundA, 'A-501');
        $managedUnit->apartmentResidents()->create([
            'user_id' => $admin->id,
            'relation_type' => UnitRelationType::Owner->value,
            'verification_status' => VerificationStatus::Verified->value,
            'starts_at' => now()->subYear(),
        ]);

        $campaignA = CollectionCampaign::factory()->create([
            'compound_id' => $compoundA->id,
            'status' => CampaignStatus::Draft,
        ]);
        $campaignB = CollectionCampaign::factory()->create([
            'compound_id' => $compoundB->id,
            'status' => CampaignStatus::Draft,
        ]);

        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/finance/collection-campaigns')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $campaignA->id);

        $this->getJson("/api/v1/finance/collection-campaigns?compound_id={$compoundB->id}")
            ->assertForbidden();

        $this->getJson("/api/v1/finance/collection-campaigns/{$campaignB->id}")
            ->assertForbidden();

        $this->patchJson("/api/v1/finance/collection-campaigns/{$campaignB->id}", [
            'name' => 'Blocked rename',
        ])->assertForbidden();

        $this->patchJson("/api/v1/finance/collection-campaigns/{$campaignB->id}/publish")
            ->assertForbidden();

        $this->patchJson("/api/v1/finance/collection-campaigns/{$campaignB->id}/archive")
            ->assertForbidden();
    }

    public function test_compound_scoped_finance_reviewer_cannot_create_campaign_for_other_compound(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();
        $reviewer = User::factory()->create([
            'role' => UserRole::FinanceReviewer->value,
            'compound_id' => $compoundA->id,
        ]);

        Sanctum::actingAs($reviewer);

        $this->postJson('/api/v1/finance/collection-campaigns', [
            'compound_id' => $compoundB->id,
            'name' => 'Cross Compound Campaign',
            'description' => 'Should not be allowed.',
            'target_amount' => 50000,
        ])->assertForbidden();
    }

    public function test_campaign_charge_application_rejects_unit_accounts_from_other_compounds(): void
    {
        $compound = Compound::factory()->create();
        $otherCompound = Compound::factory()->create();
        $reviewer = User::factory()->create([
            'role' => UserRole::FinanceReviewer->value,
            'compound_id' => $compound->id,
        ]);
        $building = Building::factory()->for($compound)->create();
        $otherBuilding = Building::factory()->for($otherCompound)->create();
        $unit = Unit::factory()->for($compound)->for($building)->create(['floor_id' => null]);
        $otherUnit = Unit::factory()->for($otherCompound)->for($otherBuilding)->create(['floor_id' => null]);
        $account = UnitAccount::factory()->for($unit)->create(['balance' => '0.00']);
        $otherAccount = UnitAccount::factory()->for($otherUnit)->create(['balance' => '0.00']);
        $campaign = CollectionCampaign::factory()->create([
            'compound_id' => $compound->id,
            'status' => CampaignStatus::Active,
        ]);

        Sanctum::actingAs($reviewer);

        $this->postJson("/api/v1/finance/collection-campaigns/{$campaign->id}/charges", [
            'unit_account_ids' => [$account->id, $otherAccount->id],
            'amount' => 500,
            'description' => 'Cross compound attempt',
        ])->assertUnprocessable();

        $this->assertDatabaseHas('unit_accounts', ['id' => $account->id, 'balance' => '0.00']);
        $this->assertDatabaseHas('unit_accounts', ['id' => $otherAccount->id, 'balance' => '0.00']);
    }

    public function test_scope_assigned_finance_reviewer_without_direct_compound_id_cannot_cross_compound_recurring_charges_or_campaigns(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();
        $reviewer = $this->makeScopeAssignedFinanceReviewer($compoundA);
        $chargeType = ChargeType::factory()->create(['is_recurring' => true]);
        $chargeA = RecurringCharge::factory()->create([
            'compound_id' => $compoundA->id,
            'charge_type_id' => $chargeType->id,
        ]);
        $chargeB = RecurringCharge::factory()->create([
            'compound_id' => $compoundB->id,
            'charge_type_id' => $chargeType->id,
        ]);
        $campaignA = CollectionCampaign::factory()->create(['compound_id' => $compoundA->id]);
        $campaignB = CollectionCampaign::factory()->create(['compound_id' => $compoundB->id]);

        Sanctum::actingAs($reviewer);

        $this->getJson('/api/v1/finance/recurring-charges')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $chargeA->id);

        $this->getJson("/api/v1/finance/recurring-charges/{$chargeB->id}")
            ->assertForbidden();

        $this->postJson('/api/v1/finance/recurring-charges', [
            'compound_id' => $compoundB->id,
            'charge_type_id' => $chargeType->id,
            'name' => 'Foreign Recurring Charge',
            'amount' => 750,
            'currency' => 'EGP',
            'frequency' => ChargeFrequency::Monthly->value,
            'billing_day' => 1,
            'target_type' => 'all',
            'starts_at' => now()->startOfMonth()->toDateString(),
        ])->assertForbidden();

        $this->getJson('/api/v1/finance/collection-campaigns')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $campaignA->id);

        $this->getJson("/api/v1/finance/collection-campaigns/{$campaignB->id}")
            ->assertForbidden();

        $this->postJson('/api/v1/finance/collection-campaigns', [
            'compound_id' => $compoundB->id,
            'name' => 'Foreign Campaign',
            'description' => 'Should not be allowed.',
            'target_amount' => 3000,
        ])->assertForbidden();
    }

    // ──────────────────────────────────────────────────────────
    // RBAC
    // ──────────────────────────────────────────────────────────

    public function test_resident_cannot_access_charge_management_routes(): void
    {
        $resident = User::factory()->create(['role' => UserRole::ResidentOwner->value]);
        Sanctum::actingAs($resident);

        $this->getJson('/api/v1/finance/charge-types')->assertForbidden();
        $this->getJson('/api/v1/finance/recurring-charges')->assertForbidden();
        $this->getJson('/api/v1/finance/collection-campaigns')->assertForbidden();
    }

    public function test_unauthenticated_requests_rejected_for_charges(): void
    {
        $this->getJson('/api/v1/finance/charge-types')->assertUnauthorized();
        $this->getJson('/api/v1/finance/recurring-charges')->assertUnauthorized();
        $this->getJson('/api/v1/finance/collection-campaigns')->assertUnauthorized();
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
