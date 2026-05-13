<?php

namespace Tests\Feature\Api\V1\Apartments;

use App\Enums\ApartmentDocumentStatus;
use App\Enums\ApartmentDocumentType;
use App\Enums\ApartmentDocumentVersionStatus;
use App\Enums\VerificationStatus;
use App\Models\Apartments\ApartmentDocument;
use App\Models\Apartments\ApartmentResident;
use App\Models\Property\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ApartmentDocumentControllerTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private Unit $unit;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');

        $this->user = User::factory()->create();
        $this->unit = Unit::factory()->create();

        ApartmentResident::factory()->create([
            'unit_id' => $this->unit->id,
            'user_id' => $this->user->id,
            'verification_status' => VerificationStatus::Verified,
        ]);

        Sanctum::actingAs($this->user);
    }

    public function test_member_can_list_active_documents(): void
    {
        ApartmentDocument::factory()->create([
            'unit_id' => $this->unit->id,
            'document_type' => ApartmentDocumentType::Lease,
            'status' => ApartmentDocumentStatus::Active,
        ]);
        ApartmentDocument::factory()->create([
            'unit_id' => $this->unit->id,
            'status' => ApartmentDocumentStatus::Archived,
        ]);

        $this->getJson("/api/v1/apartments/{$this->unit->id}/documents")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.documentType', ApartmentDocumentType::Lease->value);
    }

    public function test_member_can_upload_document(): void
    {
        $this->postJson("/api/v1/apartments/{$this->unit->id}/documents", [
            'document_type' => ApartmentDocumentType::Lease->value,
            'file' => UploadedFile::fake()->create('lease.pdf', 100, 'application/pdf'),
        ])
            ->assertCreated()
            ->assertJsonPath('data.documentType', ApartmentDocumentType::Lease->value)
            ->assertJsonPath('data.status', ApartmentDocumentStatus::Active->value);
    }

    public function test_member_cannot_upload_duplicate_registration_document(): void
    {
        ApartmentDocument::factory()->create([
            'unit_id' => $this->unit->id,
            'document_type' => ApartmentDocumentType::Lease,
            'status' => ApartmentDocumentStatus::Active,
        ]);

        $this->postJson("/api/v1/apartments/{$this->unit->id}/documents", [
            'document_type' => ApartmentDocumentType::Lease->value,
            'file' => UploadedFile::fake()->create('lease.pdf', 100, 'application/pdf'),
        ])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Registration document already exists for this unit.');
    }

    public function test_member_can_replace_document_with_pending_version(): void
    {
        $document = ApartmentDocument::factory()->create([
            'unit_id' => $this->unit->id,
            'document_type' => ApartmentDocumentType::UtilityBill,
            'status' => ApartmentDocumentStatus::Active,
        ]);

        $this->postJson("/api/v1/apartments/{$this->unit->id}/documents/{$document->id}/replace", [
            'file' => UploadedFile::fake()->create('replacement.pdf', 100, 'application/pdf'),
        ])
            ->assertAccepted()
            ->assertJsonPath('data.status', ApartmentDocumentVersionStatus::PendingReview->value);

        $this->assertDatabaseHas('apartment_documents', [
            'id' => $document->id,
            'status' => ApartmentDocumentStatus::Active->value,
        ]);
    }

    public function test_member_cannot_replace_registration_document(): void
    {
        $document = ApartmentDocument::factory()->create([
            'unit_id' => $this->unit->id,
            'document_type' => ApartmentDocumentType::OwnershipProof,
            'status' => ApartmentDocumentStatus::Active,
        ]);

        $this->postJson("/api/v1/apartments/{$this->unit->id}/documents/{$document->id}/replace", [
            'file' => UploadedFile::fake()->create('ownership-proof.pdf', 100, 'application/pdf'),
        ])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Registration documents cannot be replaced from the app.');
    }

    public function test_member_can_download_document(): void
    {
        Storage::disk('public')->put('apartments/test/current.pdf', 'current file');
        $document = ApartmentDocument::factory()->create([
            'unit_id' => $this->unit->id,
            'file_path' => 'apartments/test/current.pdf',
            'mime_type' => 'application/pdf',
        ]);

        $this->getJson("/api/v1/apartments/{$this->unit->id}/documents/{$document->id}/download")
            ->assertOk();
    }

    public function test_non_member_blocked(): void
    {
        $unit = Unit::factory()->create();

        $this->postJson("/api/v1/apartments/{$unit->id}/documents", [
            'document_type' => ApartmentDocumentType::Lease->value,
            'file' => UploadedFile::fake()->create('lease.pdf', 100, 'application/pdf'),
        ])->assertForbidden();
    }
}
