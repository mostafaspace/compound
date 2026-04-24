<?php

namespace Tests\Feature\Api\V1;

use App\Enums\AccountStatus;
use App\Enums\DeliveryStatus;
use App\Enums\DevicePlatform;
use App\Enums\NotificationCategory;
use App\Enums\NotificationChannel;
use App\Enums\UserRole;
use App\Models\DeviceToken;
use App\Models\Notification;
use App\Models\NotificationDeliveryLog;
use App\Models\NotificationTemplate;
use App\Models\Property\Compound;
use App\Models\User;
use App\Services\ExternalNotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ExternalNotificationTest extends TestCase
{
    use RefreshDatabase;

    // ── Helpers ──────────────────────────────────────────────────────────────

    private function makeAdmin(Compound $compound): User
    {
        return User::factory()->create([
            'role'        => UserRole::CompoundAdmin->value,
            'compound_id' => $compound->id,
            'status'      => AccountStatus::Active->value,
        ]);
    }

    private function makeResident(Compound $compound): User
    {
        return User::factory()->create([
            'role'        => UserRole::ResidentOwner->value,
            'compound_id' => $compound->id,
            'status'      => AccountStatus::Active->value,
        ]);
    }

    // ── Device Token Registration ─────────────────────────────────────────────

    public function test_resident_can_register_device_token(): void
    {
        $compound = Compound::factory()->create();
        $resident = $this->makeResident($compound);

        Sanctum::actingAs($resident);

        $this->postJson('/api/v1/device-tokens', [
            'token'       => 'fcm_token_abc123',
            'platform'    => DevicePlatform::Fcm->value,
            'device_name' => 'My Phone',
        ])
            ->assertStatus(201)
            ->assertJsonPath('data.platform', 'fcm');

        $this->assertDatabaseHas('device_tokens', [
            'user_id'  => $resident->id,
            'token'    => 'fcm_token_abc123',
            'platform' => DevicePlatform::Fcm->value,
        ]);
    }

    public function test_registering_same_token_twice_upserts(): void
    {
        $compound = Compound::factory()->create();
        $resident = $this->makeResident($compound);

        Sanctum::actingAs($resident);

        $this->postJson('/api/v1/device-tokens', [
            'token'    => 'fcm_token_dup',
            'platform' => DevicePlatform::Fcm->value,
        ])->assertStatus(201);

        $this->postJson('/api/v1/device-tokens', [
            'token'    => 'fcm_token_dup',
            'platform' => DevicePlatform::Fcm->value,
        ])->assertStatus(201);

        $this->assertDatabaseCount('device_tokens', 1);
    }

    public function test_resident_can_delete_device_token(): void
    {
        $compound = Compound::factory()->create();
        $resident = $this->makeResident($compound);
        $token    = DeviceToken::factory()->create(['user_id' => $resident->id]);

        Sanctum::actingAs($resident);

        $this->deleteJson("/api/v1/device-tokens/{$token->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('device_tokens', ['id' => $token->id]);
    }

    // ── Notification Templates (Admin) ────────────────────────────────────────

    public function test_admin_can_list_templates(): void
    {
        $compound = Compound::factory()->create();
        $admin    = $this->makeAdmin($compound);

        NotificationTemplate::factory()->create([
            'compound_id' => $compound->id,
            'category'    => NotificationCategory::Finance->value,
            'channel'     => NotificationChannel::Email->value,
            'locale'      => 'en',
        ]);

        // Global fallback (no compound)
        NotificationTemplate::factory()->create([
            'compound_id' => null,
            'category'    => NotificationCategory::Announcements->value,
            'channel'     => NotificationChannel::Push->value,
            'locale'      => 'en',
        ]);

        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/notification-templates')
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_admin_can_create_template(): void
    {
        $compound = Compound::factory()->create();
        $admin    = $this->makeAdmin($compound);

        Sanctum::actingAs($admin);

        $this->postJson('/api/v1/notification-templates', [
            'category'       => NotificationCategory::Finance->value,
            'channel'        => NotificationChannel::Email->value,
            'locale'         => 'en',
            'subject'        => 'Finance Update',
            'title_template' => 'Finance update for {{category}}',
            'body_template'  => 'You have a new {{category}} update. Open the app.',
        ])
            ->assertStatus(201)
            ->assertJsonPath('data.category', 'finance')
            ->assertJsonPath('data.channel', 'email');
    }

    public function test_admin_can_update_and_deactivate_template(): void
    {
        $compound = Compound::factory()->create();
        $admin    = $this->makeAdmin($compound);
        $template = NotificationTemplate::factory()->create([
            'compound_id' => $compound->id,
            'category'    => NotificationCategory::Finance->value,
            'channel'     => NotificationChannel::Email->value,
            'locale'      => 'en',
        ]);

        Sanctum::actingAs($admin);

        $this->patchJson("/api/v1/notification-templates/{$template->id}", [
            'category'       => $template->category->value,
            'channel'        => $template->channel->value,
            'locale'         => $template->locale,
            'title_template' => 'Updated title',
            'body_template'  => 'Updated body',
            'is_active'      => false,
        ])
            ->assertOk()
            ->assertJsonPath('data.isActive', false);
    }

    // ── External Dispatch ─────────────────────────────────────────────────────

    public function test_dispatch_sends_email_when_template_exists_and_preference_enabled(): void
    {
        $compound  = Compound::factory()->create();
        $resident  = $this->makeResident($compound);

        // Create email preference (enabled)
        $resident->notificationPreference()->create([
            'email_enabled' => true,
            'push_enabled'  => false,
            'in_app_enabled' => true,
        ]);

        // Create email template
        NotificationTemplate::factory()->create([
            'compound_id'    => null,
            'category'       => NotificationCategory::Finance->value,
            'channel'        => NotificationChannel::Email->value,
            'locale'         => 'en',
            'title_template' => 'Finance update',
            'body_template'  => 'You have a {{category}} update.',
            'subject'        => 'Finance',
        ]);

        $notification = Notification::factory()->for($resident)->create([
            'category' => NotificationCategory::Finance->value,
            'priority' => 'normal',
        ]);

        $service = app(ExternalNotificationService::class);
        $service->dispatch($notification);

        // Email channel should be logged as sent
        $this->assertDatabaseHas('notification_delivery_logs', [
            'notification_id' => $notification->id,
            'channel'         => NotificationChannel::Email->value,
            'status'          => DeliveryStatus::Sent->value,
        ]);

        // Push should be skipped (preference disabled)
        $this->assertDatabaseHas('notification_delivery_logs', [
            'notification_id' => $notification->id,
            'channel'         => NotificationChannel::Push->value,
            'status'          => DeliveryStatus::Skipped->value,
        ]);
    }

    public function test_push_dispatch_fails_gracefully_with_no_device_tokens(): void
    {
        $compound = Compound::factory()->create();
        $resident = $this->makeResident($compound);

        $resident->notificationPreference()->create([
            'push_enabled'  => true,
            'email_enabled' => false,
        ]);

        NotificationTemplate::factory()->create([
            'compound_id'    => null,
            'category'       => NotificationCategory::Finance->value,
            'channel'        => NotificationChannel::Push->value,
            'locale'         => 'en',
            'title_template' => 'Update',
            'body_template'  => 'You have an update.',
        ]);

        $notification = Notification::factory()->for($resident)->create([
            'category' => NotificationCategory::Finance->value,
        ]);

        $service = app(ExternalNotificationService::class);
        $service->dispatch($notification);

        // Should be logged as failed — no device tokens
        $this->assertDatabaseHas('notification_delivery_logs', [
            'notification_id' => $notification->id,
            'channel'         => NotificationChannel::Push->value,
            'status'          => DeliveryStatus::Failed->value,
        ]);
    }

    public function test_dispatch_skips_all_during_quiet_hours(): void
    {
        $compound = Compound::factory()->create();
        $resident = $this->makeResident($compound);

        $resident->notificationPreference()->create([
            'email_enabled'       => true,
            'push_enabled'        => true,
            'quiet_hours_start'   => '00:00',
            'quiet_hours_end'     => '23:59',
            'quiet_hours_timezone' => 'UTC',
        ]);

        $notification = Notification::factory()->for($resident)->create([
            'category' => NotificationCategory::Finance->value,
            'priority' => 'normal',
        ]);

        $service = app(ExternalNotificationService::class);
        $service->dispatch($notification);

        // All channels skipped due to quiet hours
        $this->assertDatabaseHas('notification_delivery_logs', [
            'notification_id' => $notification->id,
            'status'          => DeliveryStatus::Skipped->value,
            'error_message'   => 'quiet_hours',
        ]);
    }

    // ── Delivery Log: admin list + retry ─────────────────────────────────────

    public function test_admin_can_list_delivery_logs(): void
    {
        $compound  = Compound::factory()->create();
        $admin     = $this->makeAdmin($compound);
        $resident  = $this->makeResident($compound);

        $notification = Notification::factory()->for($resident)->create([
            'category' => NotificationCategory::Finance->value,
        ]);

        NotificationDeliveryLog::factory()->create([
            'notification_id' => $notification->id,
            'channel'         => NotificationChannel::Email->value,
            'status'          => DeliveryStatus::Sent->value,
        ]);

        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/notification-delivery-logs')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_admin_can_retry_failed_delivery(): void
    {
        $compound  = Compound::factory()->create();
        $admin     = $this->makeAdmin($compound);
        $resident  = $this->makeResident($compound);

        $resident->notificationPreference()->create(['email_enabled' => true]);

        $notification = Notification::factory()->for($resident)->create([
            'category' => NotificationCategory::Finance->value,
        ]);

        $failedLog = NotificationDeliveryLog::factory()->failed()->create([
            'notification_id' => $notification->id,
            'channel'         => NotificationChannel::Email->value,
            'attempt_number'  => 1,
        ]);

        Sanctum::actingAs($admin);

        $this->postJson("/api/v1/notification-delivery-logs/{$failedLog->id}/retry")
            ->assertStatus(201);

        // Original log should now be marked retried
        $this->assertDatabaseHas('notification_delivery_logs', [
            'id'     => $failedLog->id,
            'status' => DeliveryStatus::Retried->value,
        ]);
    }
}
