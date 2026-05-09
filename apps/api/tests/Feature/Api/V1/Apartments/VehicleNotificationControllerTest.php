<?php

namespace Tests\Feature\Api\V1\Apartments;

use App\Enums\VerificationStatus;
use App\Models\Apartments\ApartmentResident;
use App\Models\Apartments\ApartmentVehicle;
use App\Models\Property\Compound;
use App\Models\Property\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class VehicleNotificationControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_unverified_user_blocked(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $this->postJson('/api/v1/vehicle-notifications/search', ['plate' => 'X1234'])
            ->assertForbidden();
    }

    public function test_search_returns_count_only(): void
    {
        $compound = Compound::factory()->create();
        $unit = Unit::factory()->create(['compound_id' => $compound->id]);
        ApartmentVehicle::factory()->create([
            'unit_id' => $unit->id,
            'plate_normalized' => 'abg1234',
        ]);
        ApartmentResident::factory()->count(2)->create([
            'unit_id' => $unit->id,
            'verification_status' => VerificationStatus::Verified,
        ]);

        $sender = User::factory()->create();
        ApartmentResident::factory()->create([
            'user_id' => $sender->id,
            'unit_id' => Unit::factory()->create(['compound_id' => $compound->id])->id,
            'verification_status' => VerificationStatus::Verified,
        ]);

        Sanctum::actingAs($sender);
        $this->postJson('/api/v1/vehicle-notifications/search', ['plate' => 'ABG1234'])
            ->assertOk()
            ->assertJsonPath('data.found', true)
            ->assertJsonPath('data.recipientCount', 2)
            ->assertJsonMissing(['name'])
            ->assertJsonMissing(['phone']);
    }

    public function test_send_creates_recipients(): void
    {
        $compound = Compound::factory()->create();
        $unit = Unit::factory()->create(['compound_id' => $compound->id]);
        ApartmentVehicle::factory()->create([
            'unit_id' => $unit->id,
            'plate_normalized' => 'abg1234',
        ]);
        ApartmentResident::factory()->create([
            'unit_id' => $unit->id,
            'verification_status' => VerificationStatus::Verified,
        ]);

        $sender = User::factory()->create();
        ApartmentResident::factory()->create([
            'user_id' => $sender->id,
            'unit_id' => Unit::factory()->create(['compound_id' => $compound->id])->id,
            'verification_status' => VerificationStatus::Verified,
        ]);

        Sanctum::actingAs($sender);
        $this->postJson('/api/v1/vehicle-notifications', [
            'plate' => 'ABG1234',
            'message' => 'You parked in my spot',
            'sender_mode' => 'anonymous',
            'sender_alias' => 'Neighbor',
        ])->assertCreated()
            ->assertJsonPath('data.recipientCount', 1);
    }

    public function test_validation_rejects_empty_plate(): void
    {
        $compound = Compound::factory()->create();
        $sender = User::factory()->create();
        ApartmentResident::factory()->create([
            'user_id' => $sender->id,
            'unit_id' => Unit::factory()->create(['compound_id' => $compound->id])->id,
            'verification_status' => VerificationStatus::Verified,
        ]);

        Sanctum::actingAs($sender);
        $this->postJson('/api/v1/vehicle-notifications/search', ['plate' => ''])
            ->assertUnprocessable();
    }
}
