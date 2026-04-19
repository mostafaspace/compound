<?php

namespace Tests\Feature\Api\V1;

use App\Enums\CompoundStatus;
use App\Enums\UnitRelationType;
use App\Enums\UnitStatus;
use App\Enums\UserRole;
use App\Enums\VerificationStatus;
use App\Models\Property\Building;
use App\Models\Property\Compound;
use App\Models\Property\Floor;
use App\Models\Property\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PropertyRegistryTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_lists_compounds_with_counts(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => UserRole::CompoundAdmin->value]));

        $compound = Compound::factory()->create(['name' => 'Nile Gardens']);
        $building = Building::factory()->for($compound)->create();
        Floor::factory()->for($building)->create();
        $building->units()->create([
            'compound_id' => $compound->id,
            'unit_number' => '101',
            'type' => 'apartment',
            'status' => 'active',
        ]);

        $this->getJson('/api/v1/compounds')
            ->assertOk()
            ->assertJsonPath('data.0.name', 'Nile Gardens')
            ->assertJsonPath('data.0.buildingsCount', 1)
            ->assertJsonPath('data.0.unitsCount', 1);
    }

    public function test_it_creates_compound_as_draft(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => UserRole::CompoundAdmin->value]));

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
        Sanctum::actingAs(User::factory()->create(['role' => UserRole::CompoundAdmin->value]));

        $compound = Compound::factory()->create();

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
            'areaSqm' => 125.5,
            'bedrooms' => 3,
        ])
            ->assertCreated()
            ->assertJsonPath('data.unitNumber', '001')
            ->assertJsonPath('data.compoundId', $compound->id)
            ->assertJsonPath('data.floorId', $floorId);
    }

    public function test_it_updates_and_archives_property_registry_records(): void
    {
        $admin = User::factory()->create(['role' => UserRole::CompoundAdmin->value]);
        Sanctum::actingAs($admin);

        $compound = Compound::factory()->create(['name' => 'Old Compound', 'code' => 'OLD']);
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
            'areaSqm' => 160.25,
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

    public function test_it_manages_unit_memberships(): void
    {
        $admin = User::factory()->create(['role' => UserRole::CompoundAdmin->value]);
        $resident = User::factory()->create(['role' => UserRole::ResidentOwner->value]);
        Sanctum::actingAs($admin);

        $compound = Compound::factory()->create();
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
            ->assertJsonPath('data.memberships.0.user.email', $resident->email);

        $this->postJson("/api/v1/unit-memberships/{$membershipId}/end")
            ->assertOk()
            ->assertJsonPath('data.verificationStatus', VerificationStatus::Expired->value)
            ->assertJsonPath('data.endsAt', now()->toDateString());
    }
}
