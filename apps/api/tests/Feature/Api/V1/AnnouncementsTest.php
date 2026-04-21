<?php

namespace Tests\Feature\Api\V1;

use App\Enums\AccountStatus;
use App\Enums\AnnouncementCategory;
use App\Enums\AnnouncementPriority;
use App\Enums\AnnouncementStatus;
use App\Enums\AnnouncementTargetType;
use App\Enums\UnitRelationType;
use App\Enums\UserRole;
use App\Enums\VerificationStatus;
use App\Models\Announcements\Announcement;
use App\Models\Property\Building;
use App\Models\Property\Compound;
use App\Models\Property\Floor;
use App\Models\Property\Unit;
use App\Models\Property\UnitMembership;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AnnouncementsTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_publish_building_announcement_to_targeted_residents_only(): void
    {
        [$admin, $resident, $otherResident, $building] = $this->buildingScenario();

        Sanctum::actingAs($admin);

        $announcementId = $this->postJson('/api/v1/announcements', [
            'titleEn' => 'Water maintenance',
            'titleAr' => 'صيانة المياه',
            'bodyEn' => 'Water will be interrupted tomorrow.',
            'bodyAr' => 'سيتم قطع المياه غدا.',
            'category' => AnnouncementCategory::MaintenanceNotice->value,
            'priority' => AnnouncementPriority::High->value,
            'targetType' => AnnouncementTargetType::Building->value,
            'targetIds' => [$building->id],
            'requiresAcknowledgement' => true,
        ])
            ->assertCreated()
            ->assertJsonPath('data.title.en', 'Water maintenance')
            ->assertJsonPath('data.title.ar', 'صيانة المياه')
            ->assertJsonPath('data.status', AnnouncementStatus::Draft->value)
            ->json('data.id');

        $this->postJson("/api/v1/announcements/{$announcementId}/publish")
            ->assertOk()
            ->assertJsonPath('data.status', AnnouncementStatus::Published->value)
            ->assertJsonPath('data.acknowledgementSummary.required', true)
            ->assertJsonPath('data.acknowledgementSummary.targetedCount', 1);

        $this->assertDatabaseHas('notifications', [
            'user_id' => $resident->id,
            'category' => 'announcements',
            'title' => 'Water maintenance',
        ]);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $resident->id,
            'category' => 'announcements',
            'title' => 'Water maintenance',
            'metadata->titleAr' => 'صيانة المياه',
        ]);
        $this->assertDatabaseMissing('notifications', [
            'user_id' => $otherResident->id,
            'category' => 'announcements',
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'actor_id' => $admin->id,
            'action' => 'announcements.published',
            'auditable_id' => $announcementId,
        ]);

        Sanctum::actingAs($resident);
        $this->getJson('/api/v1/my/announcements')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $announcementId)
            ->assertJsonPath('data.0.title.ar', 'صيانة المياه');

        Sanctum::actingAs($otherResident);
        $this->getJson('/api/v1/my/announcements')
            ->assertOk()
            ->assertJsonCount(0, 'data');
        $this->getJson("/api/v1/announcements/{$announcementId}")
            ->assertForbidden();
    }

    public function test_scheduled_and_archived_lifecycle_controls_feed_visibility(): void
    {
        [$admin, $resident, , $building] = $this->buildingScenario();
        $scheduledAt = now()->addHour();

        Sanctum::actingAs($admin);

        $announcementId = $this->postJson('/api/v1/announcements', [
            'titleEn' => 'Security drill',
            'titleAr' => 'تدريب أمني',
            'bodyEn' => 'A security drill is scheduled.',
            'bodyAr' => 'تم جدولة تدريب أمني.',
            'category' => AnnouncementCategory::SecurityAlert->value,
            'priority' => AnnouncementPriority::Critical->value,
            'targetType' => AnnouncementTargetType::Building->value,
            'targetIds' => [$building->id],
            'scheduledAt' => $scheduledAt->toIso8601String(),
        ])->assertCreated()->json('data.id');

        $this->postJson("/api/v1/announcements/{$announcementId}/publish")
            ->assertOk()
            ->assertJsonPath('data.status', AnnouncementStatus::Scheduled->value);
        $this->assertDatabaseMissing('notifications', [
            'user_id' => $resident->id,
            'category' => 'announcements',
            'title' => 'Security drill',
        ]);

        Sanctum::actingAs($resident);
        $this->getJson('/api/v1/my/announcements')
            ->assertOk()
            ->assertJsonCount(0, 'data');

        $this->travelTo($scheduledAt->addMinute());
        $this->artisan('announcements:publish-due')->assertSuccessful();
        $this->assertDatabaseHas('notifications', [
            'user_id' => $resident->id,
            'category' => 'announcements',
            'title' => 'Security drill',
        ]);

        $this->getJson('/api/v1/my/announcements')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $announcementId);

        Sanctum::actingAs($admin);
        $this->postJson("/api/v1/announcements/{$announcementId}/archive")
            ->assertOk()
            ->assertJsonPath('data.status', AnnouncementStatus::Archived->value);

        Sanctum::actingAs($resident);
        $this->getJson('/api/v1/my/announcements')
            ->assertOk()
            ->assertJsonCount(0, 'data');

        Sanctum::actingAs($admin);
        $this->getJson('/api/v1/announcements?status=archived')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $announcementId);
    }

    public function test_acknowledgement_requires_targeted_user_and_updates_summary(): void
    {
        [$admin, $resident, $otherResident, $building] = $this->buildingScenario();

        Sanctum::actingAs($admin);

        $announcementId = $this->postJson('/api/v1/announcements', [
            'titleEn' => 'Meeting decision',
            'titleAr' => 'قرار الاجتماع',
            'bodyEn' => 'Please acknowledge the association decision.',
            'bodyAr' => 'يرجى تأكيد الاطلاع على قرار الاتحاد.',
            'category' => AnnouncementCategory::AssociationDecision->value,
            'priority' => AnnouncementPriority::Critical->value,
            'targetType' => AnnouncementTargetType::Building->value,
            'targetIds' => [$building->id],
            'requiresAcknowledgement' => true,
        ])->assertCreated()->json('data.id');

        $this->postJson("/api/v1/announcements/{$announcementId}/publish")
            ->assertOk();

        Sanctum::actingAs($otherResident);
        $this->postJson("/api/v1/announcements/{$announcementId}/acknowledge")
            ->assertForbidden();

        Sanctum::actingAs($resident);
        $acknowledgementResponse = $this->postJson("/api/v1/announcements/{$announcementId}/acknowledge")
            ->assertOk()
            ->assertJsonPath('data.announcementId', $announcementId)
            ->assertJsonPath('data.acknowledgedAt', fn (?string $value): bool => $value !== null);
        $firstAcknowledgedAt = $acknowledgementResponse->json('data.acknowledgedAt');

        $this->assertDatabaseHas('announcement_acknowledgements', [
            'announcement_id' => $announcementId,
            'user_id' => $resident->id,
        ]);

        $this->travel(10)->minutes();
        $this->postJson("/api/v1/announcements/{$announcementId}/acknowledge")
            ->assertOk()
            ->assertJsonPath('data.acknowledgedAt', $firstAcknowledgedAt);

        Sanctum::actingAs($admin);
        $this->getJson("/api/v1/announcements/{$announcementId}/acknowledgements")
            ->assertOk()
            ->assertJsonPath('summary.targetedCount', 1)
            ->assertJsonPath('summary.acknowledgedCount', 1)
            ->assertJsonPath('summary.pendingCount', 0)
            ->assertJsonPath('data.0.userId', $resident->id);
    }

    public function test_role_targeting_and_admin_permissions(): void
    {
        $admin = User::factory()->create(['role' => UserRole::CompoundAdmin->value]);
        $security = User::factory()->create(['role' => UserRole::SecurityGuard->value]);
        $resident = User::factory()->create(['role' => UserRole::ResidentOwner->value]);

        Sanctum::actingAs($resident);
        $this->postJson('/api/v1/announcements', [
            'titleEn' => 'Invalid',
            'titleAr' => 'غير صالح',
            'bodyEn' => 'Residents cannot publish notices.',
            'bodyAr' => 'لا يمكن للمقيمين نشر الإعلانات.',
            'category' => AnnouncementCategory::General->value,
            'targetType' => AnnouncementTargetType::All->value,
        ])->assertForbidden();

        Sanctum::actingAs($admin);
        $announcementId = $this->postJson('/api/v1/announcements', [
            'titleEn' => 'Gate protocol',
            'titleAr' => 'إجراءات البوابة',
            'bodyEn' => 'New security gate protocol starts tonight.',
            'bodyAr' => 'تبدأ إجراءات البوابة الجديدة الليلة.',
            'category' => AnnouncementCategory::SecurityAlert->value,
            'priority' => AnnouncementPriority::High->value,
            'targetType' => AnnouncementTargetType::Role->value,
            'targetRole' => UserRole::SecurityGuard->value,
            'requiresAcknowledgement' => true,
        ])->assertCreated()->json('data.id');

        $this->postJson("/api/v1/announcements/{$announcementId}/publish")
            ->assertOk()
            ->assertJsonPath('data.acknowledgementSummary.targetedCount', 1);

        Sanctum::actingAs($security);
        $this->getJson('/api/v1/my/announcements')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $announcementId);

        Sanctum::actingAs($resident);
        $this->getJson('/api/v1/my/announcements')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_published_content_update_creates_revision_and_audit_evidence(): void
    {
        [$admin, , , $building] = $this->buildingScenario();

        Sanctum::actingAs($admin);

        $announcementId = $this->postJson('/api/v1/announcements', [
            'titleEn' => 'Original title',
            'titleAr' => 'العنوان الأصلي',
            'bodyEn' => 'Original body.',
            'bodyAr' => 'النص الأصلي.',
            'category' => AnnouncementCategory::General->value,
            'targetType' => AnnouncementTargetType::Building->value,
            'targetIds' => [$building->id],
        ])->assertCreated()->json('data.id');

        $this->postJson("/api/v1/announcements/{$announcementId}/publish")
            ->assertOk();

        $this->patchJson("/api/v1/announcements/{$announcementId}", [
            'titleEn' => 'Updated title',
            'titleAr' => 'العنوان المحدث',
        ])
            ->assertOk()
            ->assertJsonPath('data.revision', 2)
            ->assertJsonPath('data.title.en', 'Updated title')
            ->assertJsonPath('data.title.ar', 'العنوان المحدث');

        $this->assertDatabaseHas('audit_logs', [
            'actor_id' => $admin->id,
            'action' => 'announcements.updated',
            'auditable_id' => $announcementId,
        ]);
        $this->assertDatabaseHas('announcement_revisions', [
            'announcement_id' => $announcementId,
            'revision' => 1,
        ]);
        $this->assertDatabaseHas('announcement_revisions', [
            'announcement_id' => $announcementId,
            'revision' => 2,
        ]);
        $this->assertSame(2, Announcement::find($announcementId)->revision);
    }

    public function test_expired_announcements_are_marked_and_filterable_in_archive(): void
    {
        [$admin, $resident, , $building] = $this->buildingScenario();

        Sanctum::actingAs($admin);

        $announcementId = $this->postJson('/api/v1/announcements', [
            'titleEn' => 'Pool closure',
            'titleAr' => 'إغلاق المسبح',
            'bodyEn' => 'The pool is closed today only.',
            'bodyAr' => 'المسبح مغلق اليوم فقط.',
            'category' => AnnouncementCategory::General->value,
            'targetType' => AnnouncementTargetType::Building->value,
            'targetIds' => [$building->id],
            'expiresAt' => now()->addMinute()->toIso8601String(),
        ])->assertCreated()->json('data.id');

        $this->postJson("/api/v1/announcements/{$announcementId}/publish")
            ->assertOk();

        Sanctum::actingAs($resident);
        $this->getJson('/api/v1/my/announcements')
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->travel(2)->minutes();
        $this->artisan('announcements:expire-due')->assertSuccessful();

        $this->getJson('/api/v1/my/announcements')
            ->assertOk()
            ->assertJsonCount(0, 'data');

        Sanctum::actingAs($admin);
        $this->getJson('/api/v1/announcements?status=expired')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $announcementId)
            ->assertJsonPath('data.0.status', AnnouncementStatus::Expired->value);
    }

    public function test_archive_filters_by_author_building_and_dates(): void
    {
        [$admin, , , $building] = $this->buildingScenario();
        $otherAdmin = User::factory()->create(['role' => UserRole::CompoundAdmin->value]);
        $otherBuilding = Building::factory()->create();

        Sanctum::actingAs($admin);
        $matchingId = $this->postJson('/api/v1/announcements', [
            'titleEn' => 'Building notice',
            'titleAr' => 'إعلان المبنى',
            'bodyEn' => 'Notice for this building.',
            'bodyAr' => 'إعلان لهذا المبنى.',
            'category' => AnnouncementCategory::General->value,
            'targetType' => AnnouncementTargetType::Building->value,
            'targetIds' => [$building->id],
        ])->assertCreated()->json('data.id');
        $this->postJson("/api/v1/announcements/{$matchingId}/publish")->assertOk();

        Sanctum::actingAs($otherAdmin);
        $otherId = $this->postJson('/api/v1/announcements', [
            'titleEn' => 'Other building notice',
            'titleAr' => 'إعلان مبنى آخر',
            'bodyEn' => 'Notice for another building.',
            'bodyAr' => 'إعلان لمبنى آخر.',
            'category' => AnnouncementCategory::General->value,
            'targetType' => AnnouncementTargetType::Building->value,
            'targetIds' => [$otherBuilding->id],
        ])->assertCreated()->json('data.id');
        $this->postJson("/api/v1/announcements/{$otherId}/publish")->assertOk();

        Sanctum::actingAs($admin);
        $this->getJson('/api/v1/announcements?authorId='.$admin->id.'&buildingId='.$building->id.'&publishedFrom='.now()->subMinute()->toDateString())
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $matchingId);
    }

    public function test_update_validation_prevents_invalid_targeting(): void
    {
        [$admin, , , $building] = $this->buildingScenario();

        Sanctum::actingAs($admin);
        $announcementId = $this->postJson('/api/v1/announcements', [
            'titleEn' => 'Valid notice',
            'titleAr' => 'إعلان صحيح',
            'bodyEn' => 'A valid notice.',
            'bodyAr' => 'إعلان صحيح.',
            'category' => AnnouncementCategory::General->value,
            'targetType' => AnnouncementTargetType::Building->value,
            'targetIds' => [$building->id],
        ])->assertCreated()->json('data.id');

        $this->patchJson("/api/v1/announcements/{$announcementId}", [
            'targetType' => AnnouncementTargetType::Role->value,
            'targetRole' => null,
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['targetRole']);

        $this->patchJson("/api/v1/announcements/{$announcementId}", [
            'targetType' => AnnouncementTargetType::Building->value,
            'targetIds' => [],
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['targetIds']);
    }

    private function buildingScenario(): array
    {
        $admin = User::factory()->create(['role' => UserRole::CompoundAdmin->value]);
        $resident = User::factory()->create(['role' => UserRole::ResidentOwner->value]);
        $otherResident = User::factory()->create(['role' => UserRole::ResidentOwner->value]);

        $compound = Compound::factory()->create();
        $building = Building::factory()->for($compound)->create();
        $otherBuilding = Building::factory()->for($compound)->create();
        $floor = Floor::factory()->for($building)->create();
        $otherFloor = Floor::factory()->for($otherBuilding)->create();
        $unit = Unit::factory()->for($compound)->for($building)->for($floor)->create();
        $otherUnit = Unit::factory()->for($compound)->for($otherBuilding)->for($otherFloor)->create();

        UnitMembership::query()->create([
            'unit_id' => $unit->id,
            'user_id' => $resident->id,
            'relation_type' => UnitRelationType::Owner->value,
            'verification_status' => VerificationStatus::Verified->value,
        ]);
        UnitMembership::query()->create([
            'unit_id' => $otherUnit->id,
            'user_id' => $otherResident->id,
            'relation_type' => UnitRelationType::Owner->value,
            'verification_status' => VerificationStatus::Verified->value,
        ]);

        return [$admin, $resident, $otherResident, $building];
    }
}
