<?php

namespace Tests\Feature\Database;

use App\Enums\VehicleNotificationSenderMode;
use App\Models\Apartments\VehicleNotification;
use App\Models\Apartments\VehicleNotificationRecipient;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class VehicleNotificationModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_factories(): void
    {
        $n = VehicleNotification::factory()->create();
        $this->assertSame(VehicleNotificationSenderMode::Identified, $n->sender_mode);

        $r = VehicleNotificationRecipient::factory()->create(['vehicle_notification_id' => $n->id]);
        $this->assertNotNull($r->user_id);
        $this->assertNull($r->read_at);
    }
}
