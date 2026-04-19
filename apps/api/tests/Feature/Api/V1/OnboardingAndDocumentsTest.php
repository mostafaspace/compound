<?php

namespace Tests\Feature\Api\V1;

use App\Enums\AccountStatus;
use App\Enums\DocumentStatus;
use App\Enums\InvitationStatus;
use App\Enums\UnitRelationType;
use App\Enums\UserRole;
use App\Enums\VerificationStatus;
use App\Models\Documents\DocumentType;
use App\Models\Documents\UserDocument;
use App\Models\Property\Building;
use App\Models\Property\Compound;
use App\Models\Property\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OnboardingAndDocumentsTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_invite_and_resident_can_accept(): void
    {
        $admin = User::factory()->create(['role' => UserRole::CompoundAdmin->value]);
        Sanctum::actingAs($admin);

        $compound = Compound::factory()->create();
        $building = Building::factory()->for($compound)->create();
        $unit = Unit::factory()
            ->for($compound)
            ->for($building)
            ->create(['floor_id' => null, 'unit_number' => 'A-101']);

        $response = $this->postJson('/api/v1/resident-invitations', [
            'name' => 'Nora Owner',
            'email' => 'nora.owner@example.com',
            'phone' => '+201000000001',
            'role' => UserRole::ResidentOwner->value,
            'unitId' => $unit->id,
            'relationType' => UnitRelationType::Owner->value,
            'startsAt' => '2026-04-19',
            'isPrimary' => true,
        ])
            ->assertCreated()
            ->assertJsonPath('data.email', 'nora.owner@example.com')
            ->assertJsonPath('data.status', InvitationStatus::Pending->value)
            ->assertJsonPath('data.unit.id', $unit->id);

        $token = $response->json('meta.token');
        $this->assertIsString($token);

        $resident = User::query()->where('email', 'nora.owner@example.com')->firstOrFail();
        $this->assertSame(AccountStatus::Invited, $resident->status);
        $this->assertDatabaseHas('unit_memberships', [
            'unit_id' => $unit->id,
            'user_id' => $resident->id,
            'relation_type' => UnitRelationType::Owner->value,
            'verification_status' => VerificationStatus::Pending->value,
        ]);

        $this->getJson("/api/v1/resident-invitations/{$token}")
            ->assertOk()
            ->assertJsonPath('data.email', 'nora.owner@example.com');

        $this->postJson("/api/v1/resident-invitations/{$token}/accept", [
            'name' => 'Nora Accepted',
            'phone' => '+201000000002',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ])
            ->assertOk()
            ->assertJsonPath('data.status', InvitationStatus::Accepted->value)
            ->assertJsonPath('data.user.name', 'Nora Accepted');

        $this->assertDatabaseHas('users', [
            'id' => $resident->id,
            'name' => 'Nora Accepted',
            'status' => AccountStatus::Active->value,
        ]);
        $this->assertDatabaseHas('resident_invitations', [
            'email' => 'nora.owner@example.com',
            'status' => InvitationStatus::Accepted->value,
        ]);
    }

    public function test_admin_can_upload_and_review_verification_document(): void
    {
        Storage::fake('local');
        config(['filesystems.default' => 'local']);

        $admin = User::factory()->create(['role' => UserRole::CompoundAdmin->value]);
        $resident = User::factory()->create(['role' => UserRole::ResidentOwner->value]);
        $documentType = DocumentType::query()->create([
            'key' => 'ownership_contract',
            'name' => 'Ownership contract',
            'is_required_default' => true,
            'allowed_mime_types' => ['application/pdf'],
            'max_file_size_kb' => 10240,
            'is_active' => true,
        ]);

        Sanctum::actingAs($admin);

        $this->post('/api/v1/documents', [
            'documentTypeId' => $documentType->id,
            'userId' => $resident->id,
            'file' => UploadedFile::fake()->create('ownership.pdf', 256, 'application/pdf'),
        ])
            ->assertCreated()
            ->assertJsonPath('data.userId', $resident->id)
            ->assertJsonPath('data.status', DocumentStatus::Submitted->value)
            ->assertJsonPath('data.originalName', 'ownership.pdf');

        $document = UserDocument::query()->firstOrFail();
        Storage::disk('local')->assertExists($document->storage_path);

        $this->patchJson("/api/v1/documents/{$document->id}/review", [
            'status' => DocumentStatus::Approved->value,
            'reviewNote' => 'Verified against the submitted ownership contract.',
        ])
            ->assertOk()
            ->assertJsonPath('data.status', DocumentStatus::Approved->value)
            ->assertJsonPath('data.reviewNote', 'Verified against the submitted ownership contract.');

        $this->assertDatabaseHas('user_documents', [
            'id' => $document->id,
            'status' => DocumentStatus::Approved->value,
            'reviewed_by' => $admin->id,
        ]);
    }
}
