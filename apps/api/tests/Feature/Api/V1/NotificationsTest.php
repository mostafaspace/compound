<?php

namespace Tests\Feature\Api\V1;

use App\Enums\NotificationCategory;
use App\Events\NotificationCreatedEvent;
use App\Models\Notification;
use App\Models\NotificationPreference;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class NotificationsTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_filter_and_mutate_own_notifications(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();

        $documentNotification = Notification::factory()->for($user)->create([
            'category' => NotificationCategory::Documents->value,
            'metadata' => ['documentId' => 'doc-1'],
        ]);
        $readVisitorNotification = Notification::factory()->for($user)->create([
            'category' => NotificationCategory::Visitors->value,
            'read_at' => now(),
        ]);
        Notification::factory()->for($user)->create([
            'category' => NotificationCategory::Documents->value,
            'archived_at' => now(),
        ]);
        Notification::factory()->for($otherUser)->create([
            'category' => NotificationCategory::Documents->value,
        ]);

        Sanctum::actingAs($user);

        $this->getJson('/api/v1/notifications?category=documents&read=unread')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $documentNotification->id)
            ->assertJsonPath('data.0.metadata.documentId', 'doc-1');

        $this->getJson('/api/v1/notifications/unread-count')
            ->assertOk()
            ->assertJsonPath('unreadCount', 1);

        $this->postJson("/api/v1/notifications/{$documentNotification->id}/read")
            ->assertOk()
            ->assertJsonPath('data.id', $documentNotification->id)
            ->assertJsonPath('data.readAt', fn (?string $value): bool => $value !== null);

        $this->postJson("/api/v1/notifications/{$readVisitorNotification->id}/archive")
            ->assertOk()
            ->assertJsonPath('data.id', $readVisitorNotification->id)
            ->assertJsonPath('data.archivedAt', fn (?string $value): bool => $value !== null);

        $this->assertDatabaseHas('audit_logs', [
            'actor_id' => $user->id,
            'action' => 'notifications.marked_read',
            'auditable_id' => $documentNotification->id,
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'actor_id' => $user->id,
            'action' => 'notifications.archived',
            'auditable_id' => $readVisitorNotification->id,
        ]);
    }

    public function test_user_cannot_access_another_users_notification(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        $notification = Notification::factory()->for($otherUser)->create();

        Sanctum::actingAs($user);

        $this->getJson("/api/v1/notifications/{$notification->id}")
            ->assertForbidden();
        $this->postJson("/api/v1/notifications/{$notification->id}/read")
            ->assertForbidden();
        $this->postJson("/api/v1/notifications/{$notification->id}/archive")
            ->assertForbidden();
    }

    public function test_bulk_read_and_archive_affect_only_current_users_unarchived_notifications(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        $first = Notification::factory()->for($user)->create();
        $second = Notification::factory()->for($user)->create();
        $alreadyArchived = Notification::factory()->for($user)->create(['archived_at' => now()]);
        $otherNotification = Notification::factory()->for($otherUser)->create();

        Sanctum::actingAs($user);

        $this->postJson('/api/v1/notifications/read-all')
            ->assertOk()
            ->assertJsonPath('count', 2);

        $this->assertNotNull($first->refresh()->read_at);
        $this->assertNotNull($second->refresh()->read_at);
        $this->assertNull($alreadyArchived->refresh()->read_at);
        $this->assertNull($otherNotification->refresh()->read_at);

        $this->postJson('/api/v1/notifications/archive-all')
            ->assertOk()
            ->assertJsonPath('count', 2);

        $this->assertNotNull($first->refresh()->archived_at);
        $this->assertNotNull($second->refresh()->archived_at);
        $this->assertNull($otherNotification->refresh()->archived_at);
    }

    public function test_user_can_show_and_update_notification_preferences(): void
    {
        $user = User::factory()->create();

        Sanctum::actingAs($user);

        $this->getJson('/api/v1/notification-preferences')
            ->assertOk()
            ->assertJsonPath('data.userId', $user->id)
            ->assertJsonPath('data.emailEnabled', true)
            ->assertJsonPath('data.inAppEnabled', true)
            ->assertJsonPath('data.mutedCategories', []);

        $this->putJson('/api/v1/notification-preferences', [
            'emailEnabled' => false,
            'inAppEnabled' => true,
            'pushEnabled' => true,
            'quietHoursStart' => '22:00',
            'quietHoursEnd' => '06:30',
            'quietHoursTimezone' => 'Africa/Cairo',
            'mutedCategories' => ['finance', 'visitors'],
        ])
            ->assertOk()
            ->assertJsonPath('data.emailEnabled', false)
            ->assertJsonPath('data.pushEnabled', true)
            ->assertJsonPath('data.quietHoursStart', '22:00')
            ->assertJsonPath('data.quietHoursEnd', '06:30')
            ->assertJsonPath('data.quietHoursTimezone', 'Africa/Cairo')
            ->assertJsonPath('data.mutedCategories.0', 'finance')
            ->assertJsonPath('data.mutedCategories.1', 'visitors');

        $this->assertDatabaseHas('audit_logs', [
            'actor_id' => $user->id,
            'action' => 'notification_preferences.updated',
        ]);
    }

    public function test_service_respects_preferences_and_dispatches_created_event(): void
    {
        Event::fake();
        $service = app(NotificationService::class);
        $disabledUser = User::factory()->create();
        $mutedUser = User::factory()->create();
        $enabledUser = User::factory()->create();

        NotificationPreference::query()->create([
            'user_id' => $disabledUser->id,
            'in_app_enabled' => false,
        ]);
        NotificationPreference::query()->create([
            'user_id' => $mutedUser->id,
            'muted_categories' => [NotificationCategory::Documents->value],
        ]);

        $this->assertNull($service->create(
            userId: $disabledUser->id,
            category: NotificationCategory::Documents,
            title: 'Documents reviewed',
            body: 'A document has been reviewed.',
        ));
        $this->assertNull($service->create(
            userId: $mutedUser->id,
            category: NotificationCategory::Documents,
            title: 'Documents reviewed',
            body: 'A document has been reviewed.',
        ));

        $notification = $service->create(
            userId: $enabledUser->id,
            category: NotificationCategory::Visitors,
            title: 'Visitor arrived',
            body: 'A visitor arrived at the gate.',
            metadata: ['visitorRequestId' => 'vr-1'],
            priority: 'high',
        );

        $this->assertNotNull($notification);
        $this->assertDatabaseCount('notifications', 1);
        $this->assertSame('high', $notification->priority);

        Event::assertDispatched(
            NotificationCreatedEvent::class,
            fn (NotificationCreatedEvent $event): bool => $event->notification->is($notification)
        );
    }

    public function test_created_event_broadcasts_private_user_payload(): void
    {
        $notification = Notification::factory()->create([
            'category' => NotificationCategory::System->value,
            'priority' => 'high',
            'title' => 'System notice',
            'body' => 'Maintenance is scheduled.',
            'metadata' => ['actionUrl' => '/notifications'],
        ]);

        $event = new NotificationCreatedEvent($notification);
        $channels = $event->broadcastOn();
        $payload = $event->broadcastWith();

        $this->assertSame('notification.created', $event->broadcastAs());
        $this->assertSame('private-user-'.$notification->user_id, (string) $channels[0]);
        $this->assertSame($notification->id, $payload['id']);
        $this->assertSame($notification->user_id, $payload['userId']);
        $this->assertSame('system', $payload['category']);
        $this->assertSame('high', $payload['priority']);
        $this->assertSame('System notice', $payload['title']);
        $this->assertSame(['actionUrl' => '/notifications'], $payload['metadata']);
    }
}
