<?php

namespace Tests\Feature\Api\V1;

use App\Enums\ContactVisibility;
use App\Enums\RepresentativeRole;
use App\Enums\UnitRelationType;
use App\Enums\UserRole;
use App\Enums\VerificationStatus;
use App\Models\Apartments\ApartmentResident;
use App\Models\Property\Building;
use App\Models\Property\Compound;
use App\Models\Property\Floor;
use App\Models\Property\Unit;
use App\Models\RepresentativeAssignment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role as SpatieRole;
use Tests\TestCase;

class OrgChartTest extends TestCase
{
    use RefreshDatabase;

    // ── Representative Assignment CRUD ─────────────────────────────────────

    public function test_admin_can_assign_compound_level_president(): void
    {
        $compound = Compound::factory()->create();
        $admin = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => $compound->id,
        ]);
        Sanctum::actingAs($admin);

        $user = User::factory()->create();

        $this->postJson("/api/v1/compounds/{$compound->id}/representatives", [
            'userId' => $user->id,
            'role' => RepresentativeRole::President->value,
            'startsAt' => '2026-04-20',
            'endsAt' => '2026-12-31',
        ])
            ->assertCreated()
            ->assertJsonPath('data.role', 'president')
            ->assertJsonPath('data.isActive', true)
            ->assertJsonPath('data.endsAt', '2026-12-31')
            ->assertJsonPath('data.userId', $user->id);
    }

    public function test_assigning_floor_representative_requires_floor_id(): void
    {
        $compound = Compound::factory()->create();
        $admin = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => $compound->id,
        ]);
        Sanctum::actingAs($admin);

        $user = User::factory()->create();

        $this->postJson("/api/v1/compounds/{$compound->id}/representatives", [
            'userId' => $user->id,
            'role' => RepresentativeRole::FloorRepresentative->value,
            'startsAt' => '2026-04-20',
        ])
            ->assertUnprocessable();
    }

    public function test_assigning_building_representative_requires_building_id(): void
    {
        $compound = Compound::factory()->create();
        $admin = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => $compound->id,
        ]);
        Sanctum::actingAs($admin);

        $user = User::factory()->create();

        $this->postJson("/api/v1/compounds/{$compound->id}/representatives", [
            'userId' => $user->id,
            'role' => RepresentativeRole::BuildingRepresentative->value,
            'startsAt' => '2026-04-20',
        ])
            ->assertUnprocessable();
    }

    public function test_singleton_role_expires_previous_assignment_on_new_store(): void
    {
        $compound = Compound::factory()->create();
        $admin = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => $compound->id,
        ]);
        Sanctum::actingAs($admin);

        $oldUser = User::factory()->create();
        $newUser = User::factory()->create();

        $oldAssignment = RepresentativeAssignment::factory()->create([
            'compound_id' => $compound->id,
            'user_id' => $oldUser->id,
            'role' => RepresentativeRole::President->value,
            'is_active' => true,
            'ends_at' => null,
        ]);

        $this->postJson("/api/v1/compounds/{$compound->id}/representatives", [
            'userId' => $newUser->id,
            'role' => RepresentativeRole::President->value,
            'startsAt' => '2026-04-20',
        ])->assertCreated();

        $this->assertDatabaseHas('representative_assignments', [
            'id' => $oldAssignment->id,
            'is_active' => false,
        ]);
    }

    public function test_non_singleton_role_allows_multiple_active_assignments(): void
    {
        $compound = Compound::factory()->create();
        $admin = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => $compound->id,
        ]);
        Sanctum::actingAs($admin);

        $this->postJson("/api/v1/compounds/{$compound->id}/representatives", [
            'userId' => User::factory()->create()->id,
            'role' => RepresentativeRole::AssociationMember->value,
            'startsAt' => '2026-04-20',
        ])->assertCreated();

        $this->postJson("/api/v1/compounds/{$compound->id}/representatives", [
            'userId' => User::factory()->create()->id,
            'role' => RepresentativeRole::AssociationMember->value,
            'startsAt' => '2026-04-20',
        ])->assertCreated();

        $this->assertDatabaseCount('representative_assignments', 2);
    }

    public function test_admin_can_expire_an_assignment(): void
    {
        $compound = Compound::factory()->create();
        $admin = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => $compound->id,
        ]);
        Sanctum::actingAs($admin);

        $assignment = RepresentativeAssignment::factory()->create([
            'compound_id' => $compound->id,
            'is_active' => true,
            'ends_at' => null,
        ]);

        $this->postJson("/api/v1/representative-assignments/{$assignment->id}/expire")
            ->assertOk()
            ->assertJsonPath('data.isActive', false);

        $this->assertDatabaseHas('representative_assignments', [
            'id' => $assignment->id,
            'is_active' => false,
        ]);
    }

    public function test_expiring_already_expired_assignment_returns_422(): void
    {
        $compound = Compound::factory()->create();
        $admin = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => $compound->id,
        ]);
        Sanctum::actingAs($admin);

        $assignment = RepresentativeAssignment::factory()->expired()->create([
            'compound_id' => $compound->id,
        ]);

        $this->postJson("/api/v1/representative-assignments/{$assignment->id}/expire")
            ->assertUnprocessable();
    }

    // ── Org Chart ──────────────────────────────────────────────────────────

    public function test_org_chart_returns_compound_and_building_representatives(): void
    {
        $compound = Compound::factory()->create();
        $admin = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => $compound->id,
        ]);
        Sanctum::actingAs($admin);

        $building = Building::factory()->for($compound)->create();
        $president = User::factory()->create(['name' => 'Ahmad President']);
        $buildingRep = User::factory()->create(['name' => 'Sara Building Rep']);

        RepresentativeAssignment::factory()->create([
            'compound_id' => $compound->id,
            'user_id' => $president->id,
            'role' => RepresentativeRole::President->value,
        ]);

        RepresentativeAssignment::factory()->forBuilding($building)->create([
            'user_id' => $buildingRep->id,
        ]);

        $response = $this->getJson("/api/v1/compounds/{$compound->id}/org-chart")
            ->assertOk();

        $response->assertJsonPath('data.compound.id', $compound->id);
        $response->assertJsonCount(1, 'data.compound.representatives');
        $response->assertJsonPath('data.compound.representatives.0.role', 'president');
        $response->assertJsonCount(1, 'data.buildings');
        $response->assertJsonCount(1, 'data.buildings.0.representatives');
        $response->assertJsonPath('data.buildings.0.representatives.0.role', 'building_representative');
    }

    public function test_org_chart_cached_payload_stays_plain_json_shape(): void
    {
        $compound = Compound::factory()->create();
        $admin = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => $compound->id,
        ]);
        Sanctum::actingAs($admin);

        $building = Building::factory()->for($compound)->create([
            'name' => 'Building A',
        ]);
        $president = User::factory()->create(['name' => 'Ahmad President']);

        RepresentativeAssignment::factory()->create([
            'compound_id' => $compound->id,
            'user_id' => $president->id,
            'role' => RepresentativeRole::President->value,
        ]);

        $this->getJson("/api/v1/compounds/{$compound->id}/org-chart")
            ->assertOk()
            ->assertJsonPath('data.compound.representatives.0.user.name', 'Ahmad President')
            ->assertJsonPath('data.buildings.0.name', 'Building A');

        $cachedResponse = $this->getJson("/api/v1/compounds/{$compound->id}/org-chart")
            ->assertOk()
            ->assertJsonPath('data.compound.representatives.0.user.name', 'Ahmad President')
            ->assertJsonPath('data.buildings.0.name', 'Building A');

        $cachedResponse->assertJsonMissingPath('data.compound.representatives.__PHP_Incomplete_Class_Name');
        $cachedResponse->assertJsonMissingPath('data.buildings.__PHP_Incomplete_Class_Name');
    }

    public function test_org_chart_preserves_vacant_buildings_and_floors_without_representatives(): void
    {
        $compound = Compound::factory()->create();
        $admin = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => $compound->id,
        ]);
        Sanctum::actingAs($admin);

        $assignedBuilding = Building::factory()->for($compound)->create([
            'name' => 'Assigned Building',
            'sort_order' => 1,
        ]);
        $vacantBuilding = Building::factory()->for($compound)->create([
            'name' => 'Vacant Building',
            'sort_order' => 2,
        ]);
        Floor::factory()->for($assignedBuilding)->create([
            'label' => 'Assigned Building Vacant Floor',
            'sort_order' => 1,
        ]);
        Floor::factory()->for($vacantBuilding)->create([
            'label' => 'Vacant Building Floor',
            'sort_order' => 1,
        ]);
        RepresentativeAssignment::factory()->forBuilding($assignedBuilding)->create();

        $response = $this->getJson("/api/v1/compounds/{$compound->id}/org-chart")
            ->assertOk()
            ->assertJsonCount(2, 'data.buildings')
            ->assertJsonPath('data.buildings.0.name', 'Assigned Building')
            ->assertJsonPath('data.buildings.1.name', 'Vacant Building')
            ->assertJsonCount(1, 'data.buildings.0.representatives')
            ->assertJsonCount(0, 'data.buildings.1.representatives')
            ->assertJsonPath('data.buildings.0.floors.0.label', 'Assigned Building Vacant Floor')
            ->assertJsonPath('data.buildings.1.floors.0.label', 'Vacant Building Floor')
            ->assertJsonCount(0, 'data.buildings.0.floors.0.representatives')
            ->assertJsonCount(0, 'data.buildings.1.floors.0.representatives');

        $this->assertSame(
            ['Assigned Building', 'Vacant Building'],
            collect($response->json('data.buildings'))->pluck('name')->all(),
        );
    }

    public function test_org_chart_excludes_admins_only_contacts_from_residents(): void
    {
        $resident = User::factory()->create(['role' => UserRole::ResidentOwner->value]);
        $compound = Compound::factory()->create();
        Sanctum::actingAs($resident);

        $building = Building::factory()->for($compound)->create();
        $unit = Unit::factory()->create([
            'compound_id' => $compound->id,
            'building_id' => $building->id,
            'floor_id' => null,
        ]);
        User::factory()->create();

        ApartmentResident::query()->create([
            'unit_id' => $unit->id,
            'user_id' => $resident->id,
            'relation_type' => UnitRelationType::Owner->value,
            'starts_at' => now()->subDay()->toDateString(),
            'is_primary' => true,
            'verification_status' => VerificationStatus::Verified->value,
        ]);

        RepresentativeAssignment::factory()->create([
            'compound_id' => $compound->id,
            'role' => RepresentativeRole::AdminContact->value,
            'contact_visibility' => ContactVisibility::AdminsOnly->value,
        ]);

        $this->getJson("/api/v1/compounds/{$compound->id}/org-chart")
            ->assertOk()
            ->assertJsonCount(0, 'data.compound.representatives');
    }

    public function test_org_chart_shows_admins_only_contacts_to_admins(): void
    {
        $compound = Compound::factory()->create();
        $admin = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => $compound->id,
        ]);
        Sanctum::actingAs($admin);

        RepresentativeAssignment::factory()->create([
            'compound_id' => $compound->id,
            'role' => RepresentativeRole::AdminContact->value,
            'contact_visibility' => ContactVisibility::AdminsOnly->value,
        ]);

        $this->getJson("/api/v1/compounds/{$compound->id}/org-chart")
            ->assertOk()
            ->assertJsonCount(1, 'data.compound.representatives');
    }

    public function test_org_chart_resident_visibility_is_scoped_per_viewer_and_not_shared_through_cache(): void
    {
        $compound = Compound::factory()->create();
        $buildingA = Building::factory()->for($compound)->create(['sort_order' => 1]);
        $buildingB = Building::factory()->for($compound)->create(['sort_order' => 2]);

        $unitA = Unit::factory()->create([
            'compound_id' => $compound->id,
            'building_id' => $buildingA->id,
            'floor_id' => null,
        ]);
        $unitB = Unit::factory()->create([
            'compound_id' => $compound->id,
            'building_id' => $buildingB->id,
            'floor_id' => null,
        ]);

        $residentA = User::factory()->create(['role' => UserRole::ResidentOwner->value]);
        $residentB = User::factory()->create(['role' => UserRole::ResidentOwner->value]);

        ApartmentResident::query()->create([
            'unit_id' => $unitA->id,
            'user_id' => $residentA->id,
            'relation_type' => UnitRelationType::Owner->value,
            'starts_at' => now()->subDay()->toDateString(),
            'is_primary' => true,
            'verification_status' => VerificationStatus::Verified->value,
        ]);
        ApartmentResident::query()->create([
            'unit_id' => $unitB->id,
            'user_id' => $residentB->id,
            'relation_type' => UnitRelationType::Owner->value,
            'starts_at' => now()->subDay()->toDateString(),
            'is_primary' => true,
            'verification_status' => VerificationStatus::Verified->value,
        ]);

        RepresentativeAssignment::factory()->forBuilding($buildingA)->create([
            'contact_visibility' => ContactVisibility::BuildingResidents->value,
        ]);

        Sanctum::actingAs($residentA);
        $this->getJson("/api/v1/compounds/{$compound->id}/org-chart")
            ->assertOk()
            ->assertJsonCount(1, 'data.buildings.0.representatives');

        Sanctum::actingAs($residentB);
        $this->getJson("/api/v1/compounds/{$compound->id}/org-chart")
            ->assertOk()
            ->assertJsonCount(0, 'data.buildings.0.representatives');
    }

    public function test_org_chart_treats_compound_head_assignment_as_effective_admin_even_when_legacy_role_is_stale(): void
    {
        $compound = Compound::factory()->create();
        $compoundHeadRole = SpatieRole::findOrCreate('compound_head', 'sanctum');
        $admin = User::factory()->create([
            'role' => UserRole::ResidentOwner->value,
            'compound_id' => $compound->id,
        ]);
        $admin->assignRole($compoundHeadRole);
        Sanctum::actingAs($admin);

        RepresentativeAssignment::factory()->create([
            'compound_id' => $compound->id,
            'role' => RepresentativeRole::AdminContact->value,
            'contact_visibility' => ContactVisibility::AdminsOnly->value,
        ]);

        $this->getJson("/api/v1/compounds/{$compound->id}/org-chart")
            ->assertOk()
            ->assertJsonCount(1, 'data.compound.representatives');
    }

    public function test_org_chart_person_detail_allows_membership_scoped_admin_access_to_same_compound_user(): void
    {
        $compound = Compound::factory()->create();
        $building = Building::factory()->for($compound)->create();
        $unit = Unit::factory()->create([
            'compound_id' => $compound->id,
            'building_id' => $building->id,
            'floor_id' => null,
        ]);

        $admin = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => null,
        ]);
        $target = User::factory()->create([
            'role' => UserRole::ResidentOwner->value,
            'compound_id' => null,
            'email' => 'resident@example.com',
        ]);

        ApartmentResident::factory()->create([
            'user_id' => $admin->id,
            'unit_id' => $unit->id,
            'verification_status' => VerificationStatus::Verified->value,
        ]);
        ApartmentResident::factory()->create([
            'user_id' => $target->id,
            'unit_id' => $unit->id,
            'verification_status' => VerificationStatus::Verified->value,
        ]);

        Sanctum::actingAs($admin);

        $this->getJson("/api/v1/org-chart/person/{$target->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $target->id)
            ->assertJsonPath('data.email', 'resident@example.com');
    }

    // ── Responsible Party ──────────────────────────────────────────────────

    public function test_responsible_party_returns_floor_building_and_association_contacts(): void
    {
        $resident = User::factory()->create(['role' => UserRole::ResidentOwner->value]);
        $compound = Compound::factory()->create();
        Sanctum::actingAs($resident);

        $building = Building::factory()->for($compound)->create();
        $floor = Floor::factory()->for($building)->create();
        $unit = Unit::factory()->create([
            'compound_id' => $compound->id,
            'building_id' => $building->id,
            'floor_id' => $floor->id,
        ]);

        ApartmentResident::query()->create([
            'unit_id' => $unit->id,
            'user_id' => $resident->id,
            'relation_type' => UnitRelationType::Owner->value,
            'starts_at' => now()->subDay()->toDateString(),
            'is_primary' => true,
            'verification_status' => VerificationStatus::Verified->value,
        ]);

        $floorRep = User::factory()->create(['name' => 'Floor Rep']);
        $buildingRep = User::factory()->create(['name' => 'Building Rep']);
        $president = User::factory()->create(['name' => 'President']);

        RepresentativeAssignment::factory()->forFloor($floor)->create(['user_id' => $floorRep->id]);
        RepresentativeAssignment::factory()->forBuilding($building)->create(['user_id' => $buildingRep->id]);
        RepresentativeAssignment::factory()->create([
            'compound_id' => $compound->id,
            'user_id' => $president->id,
            'role' => RepresentativeRole::President->value,
        ]);

        $response = $this->getJson("/api/v1/units/{$unit->id}/responsible-party")
            ->assertOk();

        $response->assertJsonPath('data.unit.id', $unit->id);
        $response->assertJsonPath('data.floorRepresentative.role', 'floor_representative');
        $response->assertJsonPath('data.buildingRepresentative.role', 'building_representative');
        $response->assertJsonCount(1, 'data.associationContacts');
    }

    public function test_responsible_party_returns_null_floor_representative_when_none_assigned(): void
    {
        $resident = User::factory()->create(['role' => UserRole::ResidentOwner->value]);
        $compound = Compound::factory()->create();
        Sanctum::actingAs($resident);

        $building = Building::factory()->for($compound)->create();
        $unit = Unit::factory()->create([
            'compound_id' => $compound->id,
            'building_id' => $building->id,
            'floor_id' => null,
        ]);

        ApartmentResident::query()->create([
            'unit_id' => $unit->id,
            'user_id' => $resident->id,
            'relation_type' => UnitRelationType::Owner->value,
            'starts_at' => now()->subDay()->toDateString(),
            'is_primary' => true,
            'verification_status' => VerificationStatus::Verified->value,
        ]);

        $this->getJson("/api/v1/units/{$unit->id}/responsible-party")
            ->assertOk()
            ->assertJsonPath('data.floorRepresentative', null);
    }

    public function test_listing_representatives_filters_by_active(): void
    {
        $compound = Compound::factory()->create();
        $admin = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => $compound->id,
        ]);
        Sanctum::actingAs($admin);

        RepresentativeAssignment::factory()->create([
            'compound_id' => $compound->id,
            'role' => RepresentativeRole::President->value,
            'is_active' => true,
        ]);
        RepresentativeAssignment::factory()->expired()->create([
            'compound_id' => $compound->id,
            'role' => RepresentativeRole::Treasurer->value,
        ]);

        $this->getJson("/api/v1/compounds/{$compound->id}/representatives?active=true")
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->getJson("/api/v1/compounds/{$compound->id}/representatives?active=false")
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_resident_cannot_manage_representative_assignments(): void
    {
        $resident = User::factory()->create(['role' => UserRole::ResidentOwner->value]);
        Sanctum::actingAs($resident);

        $compound = Compound::factory()->create();

        $this->postJson("/api/v1/compounds/{$compound->id}/representatives", [
            'userId' => $resident->id,
            'role' => RepresentativeRole::President->value,
            'startsAt' => '2026-04-20',
        ])->assertForbidden();
    }

    public function test_compound_admin_cannot_manage_or_view_other_compounds_representatives(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();
        $admin = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => $compoundA->id,
        ]);
        $assignment = RepresentativeAssignment::factory()->create([
            'compound_id' => $compoundB->id,
        ]);
        Sanctum::actingAs($admin);

        $this->getJson("/api/v1/compounds/{$compoundB->id}/representatives")
            ->assertForbidden();

        $this->getJson("/api/v1/representative-assignments/{$assignment->id}")
            ->assertForbidden();

        $this->postJson("/api/v1/representative-assignments/{$assignment->id}/expire")
            ->assertForbidden();
    }

    public function test_compound_admin_cannot_view_other_compounds_org_chart_or_responsible_party(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();
        $admin = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => $compoundA->id,
        ]);
        $buildingB = Building::factory()->for($compoundB)->create();
        $unitB = Unit::factory()->create([
            'compound_id' => $compoundB->id,
            'building_id' => $buildingB->id,
            'floor_id' => null,
        ]);
        Sanctum::actingAs($admin);

        $this->getJson("/api/v1/compounds/{$compoundB->id}/org-chart")
            ->assertForbidden();

        $this->getJson("/api/v1/units/{$unitB->id}/responsible-party")
            ->assertForbidden();
    }
}
