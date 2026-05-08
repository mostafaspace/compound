<?php

namespace Tests\Feature\Api\V1\Apartments\Admin;

use App\Enums\Permission;
use App\Models\Apartments\ApartmentResident;
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
        $unit = Unit::factory()->create();
        ApartmentResident::factory()->create(['unit_id' => $unit->id]);
        $admin = User::factory()->create();
        $admin->givePermissionTo(
            SpatiePermission::findOrCreate(Permission::ApartmentsAdmin->value, 'sanctum')
        );

        Sanctum::actingAs($admin);

        $this->getJson("/api/v1/admin/apartments/{$unit->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $unit->id)
            ->assertJsonCount(1, 'data.residents');
    }

    public function test_non_admin_blocked(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->getJson('/api/v1/admin/apartments/'.Unit::factory()->create()->id)
            ->assertForbidden();
    }
}
