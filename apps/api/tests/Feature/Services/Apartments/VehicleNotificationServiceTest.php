<?php

namespace Tests\Feature\Services\Apartments;

use App\Enums\VehicleNotificationSenderMode;
use App\Enums\VerificationStatus;
use App\Models\Apartments\ApartmentResident;
use App\Models\Apartments\ApartmentVehicle;
use App\Models\Property\Compound;
use App\Models\Property\Unit;
use App\Models\User;
use App\Services\Apartments\VehicleNotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class VehicleNotificationServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_search_returns_recipient_count_and_label_without_owner_identity(): void
    {
        $compound = Compound::factory()->create();
        $unit = Unit::factory()->create(['compound_id' => $compound->id]);
        ApartmentVehicle::factory()->create([
            'unit_id' => $unit->id,
            'plate_normalized' => 'abg1234',
            'plate_letters_ar' => 'أ ب ج',
            'plate_digits_normalized' => '1234',
        ]);
        ApartmentResident::factory()->count(3)->create([
            'unit_id' => $unit->id,
            'verification_status' => VerificationStatus::Verified,
        ]);

        $sender = User::factory()->create();
        ApartmentResident::factory()->create([
            'user_id' => $sender->id,
            'unit_id' => Unit::factory()->create(['compound_id' => $compound->id])->id,
            'verification_status' => VerificationStatus::Verified,
        ]);

        $result = app(VehicleNotificationService::class)->search('ABG1234', $sender);
        $this->assertTrue($result->found);
        $this->assertSame(3, $result->recipientCount);
        $this->assertNotNull($result->anonymizedUnitLabel);
        $this->assertObjectNotHasProperty('owner', $result);
    }

    public function test_send_creates_notification_and_recipients(): void
    {
        $compound = Compound::factory()->create();
        $unit = Unit::factory()->create(['compound_id' => $compound->id]);
        $vehicle = ApartmentVehicle::factory()->create([
            'unit_id' => $unit->id,
            'plate_normalized' => 'abg1234',
        ]);
        ApartmentResident::factory()->create([
            'unit_id' => $unit->id,
            'verification_status' => VerificationStatus::Verified,
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

        $n = app(VehicleNotificationService::class)->send(
            'ABG1234',
            'You parked in my spot',
            VehicleNotificationSenderMode::Anonymous,
            'Neighbor',
            $sender,
        );

        $this->assertDatabaseCount('vehicle_notification_recipients', 2);
        $this->assertSame($vehicle->id, $n->target_vehicle_id);
        $this->assertSame('Neighbor', $n->sender_alias);
    }

    public function test_search_returns_not_found_for_unknown_plate(): void
    {
        $compound = Compound::factory()->create();
        $sender = User::factory()->create();
        ApartmentResident::factory()->create([
            'user_id' => $sender->id,
            'unit_id' => Unit::factory()->create(['compound_id' => $compound->id])->id,
            'verification_status' => VerificationStatus::Verified,
        ]);

        $result = app(VehicleNotificationService::class)->search('ZZZZ9999', $sender);
        $this->assertFalse($result->found);
        $this->assertSame(0, $result->recipientCount);
    }
}
