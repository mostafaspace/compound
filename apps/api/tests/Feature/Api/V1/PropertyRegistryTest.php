<?php

namespace Tests\Feature\Api\V1;

use App\Enums\CompoundStatus;
use App\Enums\UnitRelationType;
use App\Enums\UnitStatus;
use App\Enums\UnitType;
use App\Enums\UserRole;
use App\Enums\VerificationStatus;
use App\Models\Apartments\ApartmentResident;
use App\Models\Property\Building;
use App\Models\Property\Compound;
use App\Models\Property\Floor;
use App\Models\Property\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PropertyRegistryTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_lists_compounds_with_counts(): void
    {
        $compound = Compound::factory()->create(['name' => 'Nile Gardens']);
        $building = Building::factory()->for($compound)->create();
        Floor::factory()->for($building)->create();
        $building->units()->create([
            'compound_id' => $compound->id,
            'unit_number' => '101',
            'type' => 'apartment',
            'status' => 'active',
        ]);
        $admin = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => $compound->id,
        ]);

        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/compounds')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Nile Gardens')
            ->assertJsonPath('data.0.buildingsCount', 1)
            ->assertJsonPath('data.0.unitsCount', 1);
    }

    public function test_membership_scoped_compound_admin_sees_only_own_compound_in_compound_index_when_compound_id_is_null(): void
    {
        $compoundA = Compound::factory()->create(['name' => 'Compound A']);
        $compoundB = Compound::factory()->create(['name' => 'Compound B']);
        $buildingA = Building::factory()->for($compoundA)->create();
        $unitA = Unit::factory()->for($compoundA)->for($buildingA)->create(['floor_id' => null]);

        $admin = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => null,
        ]);
        ApartmentResident::query()->create([
            'unit_id' => $unitA->id,
            'user_id' => $admin->id,
            'relation_type' => UnitRelationType::Owner->value,
            'starts_at' => now()->subDay()->toDateString(),
            'is_primary' => true,
            'verification_status' => VerificationStatus::Verified->value,
        ]);

        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/compounds')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $compoundA->id);
    }

    public function test_compound_admin_with_no_direct_or_membership_scope_sees_no_compounds_in_index(): void
    {
        Compound::factory()->create(['name' => 'Compound A']);
        Compound::factory()->create(['name' => 'Compound B']);

        $admin = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => null,
        ]);

        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/compounds')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_effective_compound_admin_compound_index_prefers_membership_scope_over_stale_direct_compound_id(): void
    {
        $compoundA = Compound::factory()->create(['name' => 'Compound A']);
        $compoundB = Compound::factory()->create(['name' => 'Compound B']);
        $buildingA = Building::factory()->for($compoundA)->create();
        $unitA = Unit::factory()->for($compoundA)->for($buildingA)->create(['floor_id' => null]);

        $admin = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => $compoundB->id,
        ]);
        ApartmentResident::query()->create([
            'unit_id' => $unitA->id,
            'user_id' => $admin->id,
            'relation_type' => UnitRelationType::Owner->value,
            'starts_at' => now()->subDay()->toDateString(),
            'is_primary' => true,
            'verification_status' => VerificationStatus::Verified->value,
        ]);

        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/compounds')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $compoundA->id);
    }

    public function test_it_creates_compound_as_draft(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => UserRole::SuperAdmin->value]));

        $this->postJson('/api/v1/compounds', [
            'name' => 'Palm Heights',
            'legalName' => 'Palm Heights Owners Association',
            'code' => 'palm-heights',
            'timezone' => 'Africa/Cairo',
            'currency' => 'egp',
        ])
            ->assertCreated()
            ->assertJsonPath('data.name', 'Palm Heights')
            ->assertJsonPath('data.code', 'PALM-HEIGHTS')
            ->assertJsonPath('data.status', CompoundStatus::Draft->value);
    }

    public function test_it_creates_nested_building_floor_and_unit(): void
    {
        $compound = Compound::factory()->create();
        $admin = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => $compound->id,
        ]);

        Sanctum::actingAs($admin);

        $buildingId = $this->postJson("/api/v1/compounds/{$compound->id}/buildings", [
            'name' => 'Building A',
            'code' => 'A',
            'sortOrder' => 1,
        ])
            ->assertCreated()
            ->assertJsonPath('data.name', 'Building A')
            ->json('data.id');

        $floorId = $this->postJson("/api/v1/buildings/{$buildingId}/floors", [
            'label' => 'Ground',
            'levelNumber' => 0,
            'sortOrder' => 0,
        ])
            ->assertCreated()
            ->assertJsonPath('data.label', 'Ground')
            ->json('data.id');

        $this->postJson("/api/v1/buildings/{$buildingId}/units", [
            'floorId' => $floorId,
            'unitNumber' => '001',
            'type' => 'apartment',
            'bedrooms' => 3,
        ])
            ->assertCreated()
            ->assertJsonPath('data.unitNumber', '001')
            ->assertJsonPath('data.compoundId', $compound->id)
            ->assertJsonPath('data.floorId', $floorId);
    }

    public function test_it_updates_and_archives_property_registry_records(): void
    {
        $compound = Compound::factory()->create(['name' => 'Old Compound', 'code' => 'OLD']);
        $admin = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => $compound->id,
        ]);
        Sanctum::actingAs($admin);

        $building = Building::factory()->for($compound)->create(['name' => 'Old Tower', 'code' => 'A', 'sort_order' => 1]);
        $floor = Floor::factory()->for($building)->create(['label' => 'Old Floor', 'level_number' => 1, 'sort_order' => 1]);
        $unit = Unit::factory()
            ->for($compound)
            ->for($building)
            ->for($floor)
            ->create(['unit_number' => '101', 'status' => UnitStatus::Active->value]);

        $this->patchJson("/api/v1/compounds/{$compound->id}", [
            'name' => 'New Compound',
            'legalName' => 'New Compound Owners Association',
            'code' => 'new',
            'timezone' => 'Africa/Cairo',
            'currency' => 'egp',
            'status' => CompoundStatus::Active->value,
        ])
            ->assertOk()
            ->assertJsonPath('data.name', 'New Compound')
            ->assertJsonPath('data.code', 'NEW');

        $this->patchJson("/api/v1/buildings/{$building->id}", [
            'name' => 'Tower B',
            'code' => 'b',
            'sortOrder' => 2,
        ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Tower B')
            ->assertJsonPath('data.code', 'B');

        $this->patchJson("/api/v1/floors/{$floor->id}", [
            'label' => 'Second',
            'levelNumber' => 2,
            'sortOrder' => 2,
        ])
            ->assertOk()
            ->assertJsonPath('data.label', 'Second')
            ->assertJsonPath('data.levelNumber', 2);

        $this->patchJson("/api/v1/units/{$unit->id}", [
            'unitNumber' => '202',
            'type' => 'duplex',
            'status' => UnitStatus::Vacant->value,
            'bedrooms' => 4,
        ])
            ->assertOk()
            ->assertJsonPath('data.unitNumber', '202')
            ->assertJsonPath('data.status', UnitStatus::Vacant->value);

        $this->postJson("/api/v1/compounds/{$compound->id}/archive", ['reason' => 'Merged into another association'])
            ->assertOk()
            ->assertJsonPath('data.status', CompoundStatus::Archived->value)
            ->assertJsonPath('data.archiveReason', 'Merged into another association');

        $this->postJson("/api/v1/buildings/{$building->id}/archive", ['reason' => 'Building closed'])
            ->assertOk()
            ->assertJsonPath('data.archiveReason', 'Building closed');

        $this->postJson("/api/v1/floors/{$floor->id}/archive", ['reason' => 'Floor closed'])
            ->assertOk()
            ->assertJsonPath('data.archiveReason', 'Floor closed');

        $this->postJson("/api/v1/units/{$unit->id}/archive", ['reason' => 'Unit removed'])
            ->assertOk()
            ->assertJsonPath('data.status', UnitStatus::Archived->value)
            ->assertJsonPath('data.archiveReason', 'Unit removed');

        $this->assertDatabaseHas('buildings', [
            'id' => $building->id,
            'archived_by' => $admin->id,
        ]);
    }

    public function test_building_detail_includes_apartment_residents_for_assignment_views(): void
    {
        $compound = Compound::factory()->create();
        $building = Building::factory()->for($compound)->create();
        $unit = Unit::factory()->for($compound)->for($building)->create(['floor_id' => null, 'unit_number' => '101']);
        $resident = User::factory()->create([
            'role' => UserRole::ResidentOwner->value,
            'compound_id' => $compound->id,
            'email' => 'owner.lookup@example.test',
        ]);
        $admin = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => $compound->id,
        ]);

        ApartmentResident::query()->create([
            'unit_id' => $unit->id,
            'user_id' => $resident->id,
            'relation_type' => UnitRelationType::Owner->value,
            'starts_at' => now()->subDay()->toDateString(),
            'is_primary' => true,
            'verification_status' => VerificationStatus::Verified->value,
        ]);

        Sanctum::actingAs($admin);

        $this->getJson("/api/v1/buildings/{$building->id}")
            ->assertOk()
            ->assertJsonPath('data.units.0.unitNumber', '101')
            ->assertJsonPath('data.units.0.apartmentResidents.0.user.email', 'owner.lookup@example.test');
    }

    public function test_unassigned_users_endpoint_returns_only_resident_candidates(): void
    {
        $compound = Compound::factory()->create();
        $admin = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => $compound->id,
        ]);

        User::factory()->create([
            'role' => UserRole::SecurityGuard->value,
            'compound_id' => $compound->id,
            'email' => 'guard.unassigned@example.test',
        ]);

        $resident = User::factory()->create([
            'role' => UserRole::Resident->value,
            'compound_id' => $compound->id,
            'email' => 'resident.unassigned@example.test',
        ]);

        User::factory()->create([
            'role' => UserRole::ResidentOwner->value,
            'compound_id' => null,
            'email' => 'resident.other@example.test',
        ]);

        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/units/unassigned-users')
            ->assertOk()
            ->assertJsonCount(1, 'data.data')
            ->assertJsonPath('data.data.0.email', $resident->email);
    }

    public function test_it_manages_apartment_residents(): void
    {
        $resident = User::factory()->create(['role' => UserRole::ResidentOwner->value]);
        $compound = Compound::factory()->create();
        $admin = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => $compound->id,
        ]);
        Sanctum::actingAs($admin);

        $building = Building::factory()->for($compound)->create();
        $unit = Unit::factory()
            ->for($compound)
            ->for($building)
            ->create(['floor_id' => null, 'unit_number' => '305']);

        $membershipId = $this->postJson("/api/v1/units/{$unit->id}/memberships", [
            'userId' => $resident->id,
            'relationType' => UnitRelationType::Owner->value,
            'startsAt' => '2026-04-19',
            'isPrimary' => true,
            'verificationStatus' => VerificationStatus::Verified->value,
        ])
            ->assertCreated()
            ->assertJsonPath('data.userId', $resident->id)
            ->assertJsonPath('data.relationType', UnitRelationType::Owner->value)
            ->assertJsonPath('data.verificationStatus', VerificationStatus::Verified->value)
            ->json('data.id');

        $this->getJson("/api/v1/units/{$unit->id}")
            ->assertOk()
            ->assertJsonPath('data.apartmentResidents.0.user.email', $resident->email);

        $this->postJson("/api/v1/unit-memberships/{$membershipId}/end")
            ->assertOk()
            ->assertJsonPath('data.verificationStatus', VerificationStatus::Expired->value)
            ->assertJsonPath('data.endsAt', now()->toDateString());
    }

    public function test_building_units_include_visible_resident_assignment_summary(): void
    {
        $resident = User::factory()->create([
            'role' => UserRole::ResidentOwner->value,
            'name' => 'UAT Resident Owner',
        ]);
        $compound = Compound::factory()->create();
        $admin = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => $compound->id,
        ]);
        $building = Building::factory()->for($compound)->create();
        $unit = Unit::factory()
            ->for($compound)
            ->for($building)
            ->create(['floor_id' => null, 'unit_number' => 'AR-F1-F2']);

        ApartmentResident::query()->create([
            'unit_id' => $unit->id,
            'user_id' => $resident->id,
            'relation_type' => UnitRelationType::Owner->value,
            'starts_at' => now()->subDay(),
            'is_primary' => true,
            'verification_status' => VerificationStatus::Verified->value,
        ]);

        Sanctum::actingAs($admin);

        $this->getJson("/api/v1/buildings/{$building->id}/units")
            ->assertOk()
            ->assertJsonPath('data.0.unitNumber', 'AR-F1-F2')
            ->assertJsonPath('data.0.residentName', 'UAT Resident Owner')
            ->assertJsonPath('data.0.memberships.0.user.name', 'UAT Resident Owner');
    }

    public function test_it_updates_apartment_resident_profile_fields(): void
    {
        $resident = User::factory()->create(['role' => UserRole::ResidentOwner->value]);
        $compound = Compound::factory()->create();
        $admin = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => $compound->id,
        ]);
        Sanctum::actingAs($admin);

        $building = Building::factory()->for($compound)->create();
        $unit = Unit::factory()
            ->for($compound)
            ->for($building)
            ->create(['floor_id' => null, 'unit_number' => '306']);

        $membership = ApartmentResident::query()->create([
            'unit_id' => $unit->id,
            'user_id' => $resident->id,
            'relation_type' => UnitRelationType::Resident->value,
            'starts_at' => '2026-04-19',
            'is_primary' => true,
            'verification_status' => VerificationStatus::Pending->value,
        ]);

        $this->patchJson("/api/v1/unit-memberships/{$membership->id}", [
            'residentName' => 'Ahmed Ali',
            'residentPhone' => '+201001112223',
            'phonePublic' => true,
            'residentEmail' => 'ahmed.ali@example.test',
            'emailPublic' => false,
            'verificationStatus' => VerificationStatus::Verified->value,
        ])
            ->assertOk()
            ->assertJsonPath('data.residentName', 'Ahmed Ali')
            ->assertJsonPath('data.residentPhone', '+201001112223')
            ->assertJsonPath('data.phonePublic', true)
            ->assertJsonPath('data.residentEmail', 'ahmed.ali@example.test')
            ->assertJsonPath('data.emailPublic', false)
            ->assertJsonPath('data.verificationStatus', VerificationStatus::Verified->value);

        $this->assertDatabaseHas('apartment_residents', [
            'id' => $membership->id,
            'resident_name' => 'Ahmed Ali',
            'resident_phone' => '+201001112223',
            'phone_public' => true,
            'resident_email' => 'ahmed.ali@example.test',
            'email_public' => false,
            'verification_status' => VerificationStatus::Verified->value,
        ]);
    }

    public function test_scoped_admin_cannot_manage_other_compound_apartment_residents(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();
        $adminA = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => $compoundA->id,
        ]);
        $resident = User::factory()->create(['role' => UserRole::ResidentOwner->value]);
        $buildingB = Building::factory()->for($compoundB)->create();
        $unitB = Unit::factory()->for($compoundB)->for($buildingB)->create(['floor_id' => null]);
        $membership = ApartmentResident::query()->create([
            'unit_id' => $unitB->id,
            'user_id' => $resident->id,
            'relation_type' => UnitRelationType::Owner->value,
            'starts_at' => now()->toDateString(),
            'verification_status' => VerificationStatus::Verified->value,
        ]);

        Sanctum::actingAs($adminA);

        $this->getJson("/api/v1/units/{$unitB->id}/memberships")->assertForbidden();
        $this->postJson("/api/v1/units/{$unitB->id}/memberships", [
            'userId' => $resident->id,
            'relationType' => UnitRelationType::Tenant->value,
        ])->assertForbidden();
        $this->patchJson("/api/v1/unit-memberships/{$membership->id}", [
            'verificationStatus' => VerificationStatus::Rejected->value,
        ])->assertForbidden();
        $this->postJson("/api/v1/unit-memberships/{$membership->id}/end")->assertForbidden();

        $this->assertDatabaseHas('apartment_residents', [
            'id' => $membership->id,
            'verification_status' => VerificationStatus::Verified->value,
            'ends_at' => null,
        ]);
    }

    public function test_membership_scoped_compound_admin_cannot_manage_other_compound_apartment_residents_when_compound_id_is_null(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();
        $buildingA = Building::factory()->for($compoundA)->create();
        $buildingB = Building::factory()->for($compoundB)->create();
        $adminA = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => null,
        ]);
        $resident = User::factory()->create(['role' => UserRole::ResidentOwner->value]);
        $unitA = Unit::factory()->for($compoundA)->for($buildingA)->create(['floor_id' => null]);
        $unitB = Unit::factory()->for($compoundB)->for($buildingB)->create(['floor_id' => null]);
        $membership = ApartmentResident::query()->create([
            'unit_id' => $unitB->id,
            'user_id' => $resident->id,
            'relation_type' => UnitRelationType::Owner->value,
            'starts_at' => now()->toDateString(),
            'verification_status' => VerificationStatus::Verified->value,
        ]);
        ApartmentResident::query()->create([
            'unit_id' => $unitA->id,
            'user_id' => $adminA->id,
            'relation_type' => UnitRelationType::Owner->value,
            'starts_at' => now()->subDay()->toDateString(),
            'is_primary' => true,
            'verification_status' => VerificationStatus::Verified->value,
        ]);

        Sanctum::actingAs($adminA);

        $this->getJson("/api/v1/units/{$unitB->id}/memberships")->assertForbidden();
        $this->postJson("/api/v1/units/{$unitB->id}/memberships", [
            'userId' => $resident->id,
            'relationType' => UnitRelationType::Tenant->value,
        ])->assertForbidden();
        $this->patchJson("/api/v1/unit-memberships/{$membership->id}", [
            'verificationStatus' => VerificationStatus::Rejected->value,
        ])->assertForbidden();
        $this->postJson("/api/v1/unit-memberships/{$membership->id}/end")->assertForbidden();
    }

    public function test_admin_can_search_and_filter_unit_registry_lookup(): void
    {
        $resident = User::factory()->create([
            'email' => 'owner.lookup@example.test',
            'role' => UserRole::ResidentOwner->value,
        ]);
        $otherResident = User::factory()->create(['role' => UserRole::ResidentTenant->value]);

        $compound = Compound::factory()->create(['name' => 'Lookup Compound', 'code' => 'LOOK']);
        $admin = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => $compound->id,
        ]);
        Sanctum::actingAs($admin);

        $building = Building::factory()->for($compound)->create(['name' => 'Tower Search', 'code' => 'TS']);
        $floor = Floor::factory()->for($building)->create(['label' => 'Fifth', 'level_number' => 5]);
        $matchingUnit = Unit::factory()
            ->for($compound)
            ->for($building)
            ->for($floor)
            ->create([
                'unit_number' => 'A-501',
                'type' => 'apartment',
                'status' => UnitStatus::Active->value,
            ]);
        $nonMatchingUnit = Unit::factory()
            ->for($compound)
            ->for($building)
            ->for($floor)
            ->create([
                'unit_number' => 'A-502',
                'type' => 'retail',
                'status' => UnitStatus::Vacant->value,
            ]);

        ApartmentResident::query()->create([
            'unit_id' => $matchingUnit->id,
            'user_id' => $resident->id,
            'relation_type' => UnitRelationType::Owner->value,
            'starts_at' => now()->subDay()->toDateString(),
            'is_primary' => true,
            'verification_status' => VerificationStatus::Verified->value,
        ]);
        ApartmentResident::query()->create([
            'unit_id' => $nonMatchingUnit->id,
            'user_id' => $otherResident->id,
            'relation_type' => UnitRelationType::Tenant->value,
            'starts_at' => now()->subDay()->toDateString(),
            'is_primary' => true,
            'verification_status' => VerificationStatus::Verified->value,
        ]);

        $this->getJson('/api/v1/units?'.http_build_query([
            'compoundId' => $compound->id,
            'buildingId' => $building->id,
            'floorId' => $floor->id,
            'status' => UnitStatus::Active->value,
            'type' => 'apartment',
            'relationType' => UnitRelationType::Owner->value,
            'verificationStatus' => VerificationStatus::Verified->value,
            'activeMembershipOnly' => true,
            'search' => 'owner.lookup@example.test',
        ]))
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $matchingUnit->id)
            ->assertJsonPath('data.0.compound.id', $compound->id)
            ->assertJsonPath('data.0.building.id', $building->id)
            ->assertJsonPath('data.0.floor.id', $floor->id)
            ->assertJsonPath('data.0.apartmentResidents.0.user.email', 'owner.lookup@example.test');
    }

    public function test_membership_scoped_compound_admin_lookup_is_limited_to_own_compound_when_compound_id_is_null(): void
    {
        $compoundA = Compound::factory()->create(['name' => 'Compound A']);
        $compoundB = Compound::factory()->create(['name' => 'Compound B']);
        $buildingA = Building::factory()->for($compoundA)->create();
        $buildingB = Building::factory()->for($compoundB)->create();
        $unitA = Unit::factory()->for($compoundA)->for($buildingA)->create(['floor_id' => null, 'unit_number' => 'A-101']);
        Unit::factory()->for($compoundB)->for($buildingB)->create(['floor_id' => null, 'unit_number' => 'B-101']);

        $admin = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => null,
        ]);
        ApartmentResident::query()->create([
            'unit_id' => $unitA->id,
            'user_id' => $admin->id,
            'relation_type' => UnitRelationType::Owner->value,
            'starts_at' => now()->subDay()->toDateString(),
            'is_primary' => true,
            'verification_status' => VerificationStatus::Verified->value,
        ]);

        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/units')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $unitA->id);

        $this->getJson('/api/v1/units?compoundId='.$compoundB->id)
            ->assertForbidden();
    }

    public function test_effective_compound_admin_lookup_prefers_membership_scope_over_stale_direct_compound_id(): void
    {
        $compoundA = Compound::factory()->create(['name' => 'Compound A']);
        $compoundB = Compound::factory()->create(['name' => 'Compound B']);
        $buildingA = Building::factory()->for($compoundA)->create();
        $buildingB = Building::factory()->for($compoundB)->create();
        $unitA = Unit::factory()->for($compoundA)->for($buildingA)->create(['floor_id' => null, 'unit_number' => 'A-101']);
        Unit::factory()->for($compoundB)->for($buildingB)->create(['floor_id' => null, 'unit_number' => 'B-101']);

        $admin = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => $compoundB->id,
        ]);
        ApartmentResident::query()->create([
            'unit_id' => $unitA->id,
            'user_id' => $admin->id,
            'relation_type' => UnitRelationType::Owner->value,
            'starts_at' => now()->subDay()->toDateString(),
            'is_primary' => true,
            'verification_status' => VerificationStatus::Verified->value,
        ]);

        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/units')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $unitA->id);

        $this->getJson('/api/v1/units?compoundId='.$compoundB->id)
            ->assertForbidden();
    }

    public function test_resident_unit_scope_uses_only_active_verified_memberships(): void
    {
        $resident = User::factory()->create(['role' => UserRole::ResidentOwner->value]);
        $otherResident = User::factory()->create(['role' => UserRole::ResidentTenant->value]);

        $compound = Compound::factory()->create();
        $building = Building::factory()->for($compound)->create();
        $activeUnit = Unit::factory()->for($compound)->for($building)->create(['unit_number' => '101']);
        $expiredUnit = Unit::factory()->for($compound)->for($building)->create(['unit_number' => '102']);
        $pendingUnit = Unit::factory()->for($compound)->for($building)->create(['unit_number' => '103']);
        $otherUnit = Unit::factory()->for($compound)->for($building)->create(['unit_number' => '104']);
        $archivedUnit = Unit::factory()
            ->for($compound)
            ->for($building)
            ->create([
                'unit_number' => '105',
                'status' => UnitStatus::Archived->value,
                'archived_at' => now(),
            ]);

        ApartmentResident::query()->create([
            'unit_id' => $activeUnit->id,
            'user_id' => $resident->id,
            'relation_type' => UnitRelationType::Owner->value,
            'starts_at' => now()->subDay()->toDateString(),
            'is_primary' => true,
            'verification_status' => VerificationStatus::Verified->value,
        ]);
        ApartmentResident::query()->create([
            'unit_id' => $expiredUnit->id,
            'user_id' => $resident->id,
            'relation_type' => UnitRelationType::Tenant->value,
            'starts_at' => now()->subMonth()->toDateString(),
            'ends_at' => now()->subDay()->toDateString(),
            'verification_status' => VerificationStatus::Verified->value,
        ]);
        ApartmentResident::query()->create([
            'unit_id' => $pendingUnit->id,
            'user_id' => $resident->id,
            'relation_type' => UnitRelationType::Resident->value,
            'starts_at' => now()->subDay()->toDateString(),
            'verification_status' => VerificationStatus::Pending->value,
        ]);
        ApartmentResident::query()->create([
            'unit_id' => $archivedUnit->id,
            'user_id' => $resident->id,
            'relation_type' => UnitRelationType::Owner->value,
            'starts_at' => now()->subDay()->toDateString(),
            'verification_status' => VerificationStatus::Verified->value,
        ]);
        ApartmentResident::query()->create([
            'unit_id' => $otherUnit->id,
            'user_id' => $otherResident->id,
            'relation_type' => UnitRelationType::Owner->value,
            'starts_at' => now()->subDay()->toDateString(),
            'verification_status' => VerificationStatus::Verified->value,
        ]);

        Sanctum::actingAs($resident);

        $this->getJson('/api/v1/my/units')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.unitId', $activeUnit->id)
            ->assertJsonPath('data.0.unit.unitNumber', '101')
            ->assertJsonPath('data.0.unit.compoundId', $compound->id)
            ->assertJsonPath('data.0.verificationStatus', VerificationStatus::Verified->value);

        $this->assertTrue(
            ApartmentResident::query()
                ->where('unit_id', $expiredUnit->id)
                ->where('user_id', $resident->id)
                ->whereDate('ends_at', now()->subDay()->toDateString())
                ->exists(),
        );
    }

    public function test_archived_units_are_hidden_from_lookup_by_default_but_history_is_preserved(): void
    {
        $resident = User::factory()->create(['role' => UserRole::ResidentOwner->value]);
        $compound = Compound::factory()->create();
        $admin = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => $compound->id,
        ]);
        Sanctum::actingAs($admin);

        $building = Building::factory()->for($compound)->create();
        $unit = Unit::factory()->for($compound)->for($building)->create(['unit_number' => '901']);

        ApartmentResident::query()->create([
            'unit_id' => $unit->id,
            'user_id' => $resident->id,
            'relation_type' => UnitRelationType::Owner->value,
            'starts_at' => now()->subDay()->toDateString(),
            'verification_status' => VerificationStatus::Verified->value,
        ]);

        $this->postJson("/api/v1/units/{$unit->id}/archive", ['reason' => 'Merged suite'])
            ->assertOk()
            ->assertJsonPath('data.status', UnitStatus::Archived->value);

        $this->getJson('/api/v1/units?search=901')
            ->assertOk()
            ->assertJsonCount(0, 'data');

        $this->getJson('/api/v1/units?includeArchived=1&search=901')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $unit->id)
            ->assertJsonPath('data.0.apartmentResidents.0.userId', $resident->id);

        $this->assertDatabaseHas('apartment_residents', [
            'unit_id' => $unit->id,
            'user_id' => $resident->id,
            'verification_status' => VerificationStatus::Verified->value,
        ]);
    }

    public function test_admin_can_import_and_export_units_csv(): void
    {
        $compound = Compound::factory()->create();
        $admin = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => $compound->id,
        ]);
        Sanctum::actingAs($admin);

        $building = Building::factory()->for($compound)->create(['code' => 'CSV']);
        $floor = Floor::factory()->for($building)->create(['label' => 'Third', 'level_number' => 3]);

        $csv = UploadedFile::fake()->createWithContent(
            'units.csv',
            implode("\n", [
                'unitNumber,type,status,floorId,bedrooms',
                "301,apartment,active,{$floor->id},3",
                "302,duplex,vacant,{$floor->id},4",
            ])
        );

        $this->post("/api/v1/buildings/{$building->id}/units/import", [
            'file' => $csv,
            'dryRun' => '1',
        ])
            ->assertOk()
            ->assertJsonPath('data.dryRun', true)
            ->assertJsonPath('data.validated', 2)
            ->assertJsonPath('data.created', 0);

        $this->assertDatabaseMissing('units', [
            'building_id' => $building->id,
            'unit_number' => '301',
        ]);

        $csv = UploadedFile::fake()->createWithContent(
            'units.csv',
            implode("\n", [
                'unitNumber,type,status,floorId,bedrooms',
                "301,apartment,active,{$floor->id},3",
                "302,duplex,vacant,{$floor->id},4",
            ])
        );

        $this->post("/api/v1/buildings/{$building->id}/units/import", ['file' => $csv])
            ->assertCreated()
            ->assertJsonPath('data.validated', 2)
            ->assertJsonPath('data.created', 2);

        $this->assertDatabaseHas('units', [
            'building_id' => $building->id,
            'floor_id' => $floor->id,
            'unit_number' => '301',
            'type' => UnitType::Apartment->value,
            'status' => UnitStatus::Active->value,
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'property.units_imported',
        ]);

        $response = $this->get("/api/v1/buildings/{$building->id}/units/export")
            ->assertOk();

        $export = $response->streamedContent();

        $this->assertStringContainsString('unitNumber,type,status,floorId,floorLabel,bedrooms', $export);
        $this->assertStringContainsString('301,apartment,active', $export);
        $this->assertStringContainsString('302,duplex,vacant', $export);
    }

    public function test_unit_import_rejects_invalid_rows_without_partial_creates(): void
    {
        $compound = Compound::factory()->create();
        $admin = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => $compound->id,
        ]);
        Sanctum::actingAs($admin);

        $building = Building::factory()->for($compound)->create();
        $otherBuilding = Building::factory()->for($compound)->create();
        $otherFloor = Floor::factory()->for($otherBuilding)->create(['label' => 'Other', 'level_number' => 7]);

        Unit::factory()->for($compound)->for($building)->create(['unit_number' => '401']);

        $csv = UploadedFile::fake()->createWithContent(
            'units.csv',
            implode("\n", [
                'unitNumber,type,status,floorId,bedrooms',
                '401,apartment,active,,2',
                '402,unknown,active,,2',
                "403,apartment,active,{$otherFloor->id},2",
                '404,apartment,active,,2',
                '404,apartment,active,,2',
            ])
        );

        $this->post("/api/v1/buildings/{$building->id}/units/import", ['file' => $csv])
            ->assertUnprocessable()
            ->assertJsonPath('data.created', 0)
            ->assertJsonPath('data.validated', 1)
            ->assertJsonCount(4, 'data.errors');

        $this->assertDatabaseMissing('units', [
            'building_id' => $building->id,
            'unit_number' => '404',
        ]);
    }

    public function test_compound_admin_cannot_view_other_compound_details_or_checklist(): void
    {
        $compoundA = Compound::factory()->create(['name' => 'Scoped Compound']);
        $compoundB = Compound::factory()->create(['name' => 'Foreign Compound']);
        $admin = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => $compoundA->id,
        ]);

        Sanctum::actingAs($admin);

        $this->getJson("/api/v1/compounds/{$compoundB->id}")
            ->assertForbidden();

        $this->getJson("/api/v1/compounds/{$compoundB->id}/onboarding-checklist")
            ->assertForbidden();
    }

    public function test_compound_admin_cannot_manage_other_compound_buildings_units_or_lookup_scope(): void
    {
        $compoundA = Compound::factory()->create(['name' => 'Admin Compound']);
        $compoundB = Compound::factory()->create(['name' => 'Other Compound']);
        $admin = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => $compoundA->id,
        ]);
        $buildingB = Building::factory()->for($compoundB)->create();
        $unitB = Unit::factory()->for($compoundB)->for($buildingB)->create(['floor_id' => null]);

        Sanctum::actingAs($admin);

        $this->postJson("/api/v1/compounds/{$compoundB->id}/buildings", [
            'name' => 'Blocked Building',
            'code' => 'BB',
            'sortOrder' => 1,
        ])->assertForbidden();

        $this->getJson("/api/v1/buildings/{$buildingB->id}")
            ->assertForbidden();

        $this->getJson('/api/v1/units?compoundId='.$compoundB->id)
            ->assertForbidden();

        $this->getJson("/api/v1/units/{$unitB->id}")
            ->assertForbidden();
    }

    public function test_membership_scoped_compound_admin_can_access_own_building_floor_and_unit_when_compound_id_is_null(): void
    {
        $compound = Compound::factory()->create();
        $building = Building::factory()->for($compound)->create(['name' => 'Managed Building']);
        $floor = Floor::factory()->for($building)->create(['label' => 'Managed Floor']);
        $unit = Unit::factory()->for($compound)->for($building)->for($floor)->create(['unit_number' => 'M-101']);
        $admin = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => null,
        ]);

        ApartmentResident::query()->create([
            'unit_id' => $unit->id,
            'user_id' => $admin->id,
            'relation_type' => UnitRelationType::Owner->value,
            'starts_at' => now()->subDay()->toDateString(),
            'is_primary' => true,
            'verification_status' => VerificationStatus::Verified->value,
        ]);

        Sanctum::actingAs($admin);

        $this->getJson("/api/v1/compounds/{$compound->id}/buildings")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $building->id);

        $this->getJson("/api/v1/buildings/{$building->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $building->id);

        $this->getJson("/api/v1/floors/{$floor->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $floor->id);

        $this->getJson("/api/v1/units/{$unit->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $unit->id);
    }

    public function test_effective_compound_admin_property_detail_access_prefers_membership_scope_over_stale_direct_compound_id(): void
    {
        $compoundA = Compound::factory()->create(['name' => 'Managed Compound']);
        $compoundB = Compound::factory()->create(['name' => 'Stale Compound']);
        $buildingA = Building::factory()->for($compoundA)->create();
        $buildingB = Building::factory()->for($compoundB)->create();
        $floorA = Floor::factory()->for($buildingA)->create();
        $floorB = Floor::factory()->for($buildingB)->create();
        $unitA = Unit::factory()->for($compoundA)->for($buildingA)->for($floorA)->create(['unit_number' => 'A-501']);
        $unitB = Unit::factory()->for($compoundB)->for($buildingB)->for($floorB)->create(['unit_number' => 'B-501']);
        $admin = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => $compoundB->id,
        ]);

        ApartmentResident::query()->create([
            'unit_id' => $unitA->id,
            'user_id' => $admin->id,
            'relation_type' => UnitRelationType::Owner->value,
            'starts_at' => now()->subDay()->toDateString(),
            'is_primary' => true,
            'verification_status' => VerificationStatus::Verified->value,
        ]);

        Sanctum::actingAs($admin);

        $this->getJson("/api/v1/buildings/{$buildingA->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $buildingA->id);

        $this->getJson("/api/v1/floors/{$floorA->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $floorA->id);

        $this->getJson("/api/v1/units/{$unitA->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $unitA->id);

        $this->getJson("/api/v1/buildings/{$buildingB->id}")
            ->assertForbidden();

        $this->getJson("/api/v1/floors/{$floorB->id}")
            ->assertForbidden();

        $this->getJson("/api/v1/units/{$unitB->id}")
            ->assertForbidden();
    }
}
