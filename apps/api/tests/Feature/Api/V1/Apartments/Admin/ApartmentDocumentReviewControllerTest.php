<?php

namespace Tests\Feature\Api\V1\Apartments\Admin;

use App\Enums\ApartmentDocumentVersionStatus;
use App\Enums\Permission;
use App\Models\Apartments\ApartmentDocument;
use App\Models\Apartments\ApartmentDocumentVersion;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission as SpatiePermission;
use Tests\TestCase;

class ApartmentDocumentReviewControllerTest extends TestCase
{
    use RefreshDatabase;

    private function reviewAdmin(): User
    {
        $user = User::factory()->create();
        $user->givePermissionTo(
            SpatiePermission::findOrCreate(Permission::ApartmentsAdmin->value, 'sanctum')
        );

        return $user;
    }

    public function test_admin_can_list_pending_versions(): void
    {
        ApartmentDocumentVersion::factory()->create([
            'status' => ApartmentDocumentVersionStatus::PendingReview,
        ]);
        ApartmentDocumentVersion::factory()->create([
            'status' => ApartmentDocumentVersionStatus::Rejected,
        ]);

        Sanctum::actingAs($this->reviewAdmin());

        $this->getJson('/api/v1/admin/document-reviews')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.status', ApartmentDocumentVersionStatus::PendingReview->value);
    }

    public function test_admin_can_approve_pending_version(): void
    {
        $document = ApartmentDocument::factory()->create([
            'file_path' => 'apartments/old.pdf',
            'version' => 1,
        ]);
        $version = ApartmentDocumentVersion::factory()->create([
            'apartment_document_id' => $document->id,
            'file_path' => 'apartments/new.pdf',
            'status' => ApartmentDocumentVersionStatus::PendingReview,
        ]);

        Sanctum::actingAs($this->reviewAdmin());

        $this->patchJson("/api/v1/admin/document-reviews/{$version->id}", [
            'decision' => 'approved',
            'notes' => 'Looks good.',
        ])->assertNoContent();

        $this->assertDatabaseHas('apartment_documents', [
            'id' => $document->id,
            'file_path' => 'apartments/new.pdf',
            'version' => 2,
        ]);
        $this->assertDatabaseHas('apartment_document_versions', [
            'id' => $version->id,
            'status' => ApartmentDocumentVersionStatus::Approved->value,
            'review_notes' => 'Looks good.',
        ]);
    }

    public function test_admin_can_reject_pending_version(): void
    {
        $version = ApartmentDocumentVersion::factory()->create([
            'status' => ApartmentDocumentVersionStatus::PendingReview,
        ]);

        Sanctum::actingAs($this->reviewAdmin());

        $this->patchJson("/api/v1/admin/document-reviews/{$version->id}", [
            'decision' => 'rejected',
            'notes' => 'Blurry.',
        ])->assertNoContent();

        $this->assertDatabaseHas('apartment_document_versions', [
            'id' => $version->id,
            'status' => ApartmentDocumentVersionStatus::Rejected->value,
            'review_notes' => 'Blurry.',
        ]);
    }

    public function test_non_admin_blocked(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->getJson('/api/v1/admin/document-reviews')
            ->assertForbidden();
    }

    public function test_validation_errors_return_unprocessable(): void
    {
        $version = ApartmentDocumentVersion::factory()->create();
        Sanctum::actingAs($this->reviewAdmin());

        $this->patchJson("/api/v1/admin/document-reviews/{$version->id}", [
            'decision' => 'maybe',
        ])->assertUnprocessable();
    }
}
