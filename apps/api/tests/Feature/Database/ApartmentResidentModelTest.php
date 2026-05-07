<?php

namespace Tests\Feature\Database;

use App\Models\Apartments\ApartmentResident;
use App\Models\Property\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApartmentResidentModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_factory_creates_resident_with_user(): void
    {
        $resident = ApartmentResident::factory()->create();

        $this->assertNotNull($resident->unit_id);
        $this->assertNotNull($resident->user_id);
        $this->assertInstanceOf(Unit::class, $resident->unit);
        $this->assertInstanceOf(User::class, $resident->user);
    }

    public function test_supports_user_less_resident(): void
    {
        $resident = ApartmentResident::factory()->withoutUser()->create([
            'resident_name' => 'Renter Sample',
        ]);

        $this->assertNull($resident->user_id);
        $this->assertSame('Renter Sample', $resident->resident_name);
    }

    public function test_active_scope_excludes_expired(): void
    {
        ApartmentResident::factory()->create(['ends_at' => now()->subDay()]);
        $current = ApartmentResident::factory()->create(['ends_at' => null]);

        $this->assertEquals([$current->id], ApartmentResident::query()->active()->pluck('id')->all());
    }
}
