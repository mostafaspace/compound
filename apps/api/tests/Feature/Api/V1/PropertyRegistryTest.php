<?php

namespace Tests\Feature\Api\V1;

use App\Enums\CompoundStatus;
use App\Enums\UserRole;
use App\Models\Property\Building;
use App\Models\Property\Compound;
use App\Models\Property\Floor;
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
}
