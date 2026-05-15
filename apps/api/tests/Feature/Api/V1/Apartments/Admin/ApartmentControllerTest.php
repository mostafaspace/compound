<?php

namespace Tests\Feature\Api\V1\Apartments\Admin;

use App\Enums\Permission;
use App\Enums\UserRole;
use App\Models\Apartments\ApartmentResident;
use App\Models\Property\Building;
use App\Models\Property\Compound;
use App\Models\Property\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission as SpatiePermission;
use Tests\TestCase;

class ApartmentControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_view_apartment_detail(): void
    {
        $compound = Compound::factory()->create();
        $building = Building::factory()->create(['compound_id' => $compound->id]);
        $unit = Unit::factory()->create([
            'compound_id' => $compound->id,
            'building_id' => $building->id,
        ]);
        ApartmentResident::factory()->create(['unit_id' => $unit->id]);
        $admin = User::factory()->create(['compound_id' => $compound->id]);
        $admin->givePermissionTo(
            SpatiePermission::findOrCreate(Permission::ApartmentsAdmin->value, 'sanctum')
        );

        Sanctum::actingAs($admin);

        $this->getJson("/api/v1/admin/apartments/{$unit->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $unit->id)
            ->assertJsonCount(1, 'data.residents');
    }

    public function test_legacy_compound_admin_can_view_own_apartment_detail(): void
    {
        $compound = Compound::factory()->create();
        $building = Building::factory()->create(['compound_id' => $compound->id]);
        $unit = Unit::factory()->create([
            'compound_id' => $compound->id,
            'building_id' => $building->id,
        ]);
        $admin = User::factory()->create([
            'compound_id' => $compound->id,
            'role' => UserRole::CompoundAdmin->value,
        ]);

        Sanctum::actingAs($admin);

        $this->getJson("/api/v1/admin/apartments/{$unit->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $unit->id);
    }

    public function test_legacy_compound_admin_cannot_view_other_compounds_apartment_detail(): void
    {
        $ownCompound = Compound::factory()->create();
        $otherCompound = Compound::factory()->create();
        $otherBuilding = Building::factory()->create(['compound_id' => $otherCompound->id]);
        $unit = Unit::factory()->create([
            'compound_id' => $otherCompound->id,
            'building_id' => $otherBuilding->id,
        ]);
        $admin = User::factory()->create([
            'compound_id' => $ownCompound->id,
            'role' => UserRole::CompoundAdmin->value,
        ]);

        Sanctum::actingAs($admin);

        $this->getJson("/api/v1/admin/apartments/{$unit->id}")
            ->assertForbidden();
    }

    public function test_non_admin_blocked(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->getJson('/api/v1/admin/apartments/'.Unit::factory()->create()->id)
            ->assertForbidden();
    }
}
