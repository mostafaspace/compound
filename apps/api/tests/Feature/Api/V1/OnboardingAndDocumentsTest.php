<?php

namespace Tests\Feature\Api\V1;

use App\Enums\AccountStatus;
use App\Enums\DocumentStatus;
use App\Enums\InvitationStatus;
use App\Enums\Permission;
use App\Enums\UnitRelationType;
use App\Enums\UserRole;
use App\Enums\VerificationRequestStatus;
use App\Enums\VerificationStatus;
use App\Models\Documents\DocumentType;
use App\Models\Documents\UserDocument;
use App\Models\Property\Building;
use App\Models\Property\Compound;
use App\Models\Property\Unit;
use App\Models\ResidentInvitation;
use App\Models\User;
use App\Models\VerificationRequest;
use App\Notifications\ResidentInvitationNotification;
use App\Notifications\VerificationDecisionNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission as SpatiePermission;
use Spatie\Permission\Models\Role as SpatieRole;
use Tests\TestCase;

class OnboardingAndDocumentsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function test_admin_can_invite_and_resident_can_accept(): void
    {
        Notification::fake();

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
        Notification::assertSentTo(
            $resident,
            ResidentInvitationNotification::class,
            function (ResidentInvitationNotification $notification) use ($resident): bool {
                $payload = $notification->toArray($resident);
                $mail = $notification->toMail($resident);
                $rendered = (string) $mail->render();

                return str_contains($payload['titleAr'], 'دعوة')
                    && str_contains($mail->subject, 'دعوة')
                    && str_contains($rendered, 'أكمل حسابك')
                    && str_contains($rendered, 'هذه الدعوة مرتبطة بالوحدة A-101');
            },
        );
        $this->assertSame(AccountStatus::Invited, $resident->status);
        $this->assertDatabaseHas('resident_invitations', [
            'email' => 'nora.owner@example.com',
            'delivery_count' => 1,
        ]);
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
            'status' => AccountStatus::PendingReview->value,
        ]);
        $this->assertDatabaseHas('resident_invitations', [
            'email' => 'nora.owner@example.com',
            'status' => InvitationStatus::Accepted->value,
        ]);
        $this->assertDatabaseHas('verification_requests', [
            'user_id' => $resident->id,
            'resident_invitation_id' => ResidentInvitation::query()->where('email', 'nora.owner@example.com')->firstOrFail()->id,
            'unit_id' => $unit->id,
            'requested_role' => UserRole::ResidentOwner->value,
            'relation_type' => UnitRelationType::Owner->value,
            'status' => VerificationRequestStatus::PendingReview->value,
        ]);
    }

    public function test_super_admin_can_resend_and_revoke_unitless_invitation(): void
    {
        Notification::fake();

        $admin = User::factory()->create(['role' => UserRole::SuperAdmin->value]);
        Sanctum::actingAs($admin);

        $createResponse = $this->postJson('/api/v1/resident-invitations', [
            'name' => 'Tarek Tenant',
            'email' => 'tarek.tenant@example.com',
            'role' => UserRole::ResidentTenant->value,
        ])->assertCreated();

        $oldToken = $createResponse->json('meta.token');
        $invitation = ResidentInvitation::query()->where('email', 'tarek.tenant@example.com')->firstOrFail();
        $oldTokenHash = $invitation->token_hash;

        $resendResponse = $this->postJson("/api/v1/resident-invitations/{$invitation->id}/resend")
            ->assertOk()
            ->assertJsonPath('data.status', InvitationStatus::Pending->value)
            ->assertJsonPath('data.deliveryCount', 2);

        $newToken = $resendResponse->json('meta.token');
        $this->assertIsString($newToken);
        $this->assertNotSame($oldToken, $newToken);
        $this->assertNotSame($oldTokenHash, $invitation->refresh()->token_hash);

        $resident = User::query()->where('email', 'tarek.tenant@example.com')->firstOrFail();
        Notification::assertSentTo($resident, ResidentInvitationNotification::class);

        $this->getJson("/api/v1/resident-invitations/{$oldToken}")->assertNotFound();
        $this->getJson("/api/v1/resident-invitations/{$newToken}")
            ->assertOk()
            ->assertJsonPath('data.email', 'tarek.tenant@example.com');

        $this->postJson("/api/v1/resident-invitations/{$invitation->id}/revoke")
            ->assertOk()
            ->assertJsonPath('data.status', InvitationStatus::Revoked->value);

        $this->postJson("/api/v1/resident-invitations/{$newToken}/accept", [
            'name' => 'Tarek Tenant',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ])->assertGone();
    }

    public function test_scoped_admin_cannot_create_unitless_or_cross_compound_invitation(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();
        $buildingB = Building::factory()->for($compoundB)->create();
        $unitB = Unit::factory()->for($compoundB)->for($buildingB)->create(['floor_id' => null]);

        $scopedAdmin = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => $compoundA->id,
        ]);

        Sanctum::actingAs($scopedAdmin);

        $this->postJson('/api/v1/resident-invitations', [
            'name' => 'Unitless Invite',
            'email' => 'unitless@example.com',
            'role' => UserRole::ResidentTenant->value,
        ])->assertUnprocessable();

        $this->postJson('/api/v1/resident-invitations', [
            'name' => 'Foreign Unit Invite',
            'email' => 'foreign@example.com',
            'role' => UserRole::ResidentOwner->value,
            'unitId' => $unitB->id,
            'relationType' => UnitRelationType::Owner->value,
        ])->assertForbidden();
    }

    public function test_scoped_admin_cannot_resend_or_revoke_other_compound_invitation(): void
    {
        Notification::fake();

        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();
        $buildingB = Building::factory()->for($compoundB)->create();
        $unitB = Unit::factory()->for($compoundB)->for($buildingB)->create(['floor_id' => null]);

        $adminA = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => $compoundA->id,
        ]);
        $adminB = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => $compoundB->id,
        ]);

        Sanctum::actingAs($adminB);
        $this->postJson('/api/v1/resident-invitations', [
            'name' => 'Scoped Resident',
            'email' => 'scoped.resident@example.com',
            'role' => UserRole::ResidentOwner->value,
            'unitId' => $unitB->id,
            'relationType' => UnitRelationType::Owner->value,
            'isPrimary' => true,
        ])->assertCreated();

        $invitation = ResidentInvitation::query()->where('email', 'scoped.resident@example.com')->firstOrFail();

        Sanctum::actingAs($adminA);
        $this->postJson("/api/v1/resident-invitations/{$invitation->id}/resend")->assertForbidden();
        $this->postJson("/api/v1/resident-invitations/{$invitation->id}/revoke")->assertForbidden();

        $this->assertDatabaseHas('resident_invitations', [
            'id' => $invitation->id,
            'status' => InvitationStatus::Pending->value,
        ]);
    }

    public function test_effective_compound_head_with_membership_scope_can_manage_own_compound_invitations_but_not_foreign_compound_when_compound_id_is_null(): void
    {
        Notification::fake();

        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();
        $buildingA = Building::factory()->for($compoundA)->create();
        $buildingB = Building::factory()->for($compoundB)->create();
        $unitA = Unit::factory()->for($compoundA)->for($buildingA)->create(['floor_id' => null, 'unit_number' => 'A-301']);
        $unitB = Unit::factory()->for($compoundB)->for($buildingB)->create(['floor_id' => null, 'unit_number' => 'B-301']);
        $compoundHeadRole = SpatieRole::findOrCreate('compound_head', 'sanctum');
        $viewUsersPermission = SpatiePermission::findOrCreate(Permission::ViewUsers->value, 'sanctum');
        $compoundHeadRole->givePermissionTo($viewUsersPermission);

        $adminA = User::factory()->create([
            'role' => UserRole::ResidentOwner->value,
            'compound_id' => null,
        ]);
        $adminA->assignRole($compoundHeadRole);
        $adminA->givePermissionTo($viewUsersPermission);
        $unitA->memberships()->create([
            'user_id' => $adminA->id,
            'relation_type' => UnitRelationType::Owner->value,
            'verification_status' => VerificationStatus::Verified->value,
            'starts_at' => now()->subYear(),
        ]);

        $adminB = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => $compoundB->id,
        ]);

        Sanctum::actingAs($adminA);
        $ownInvitationId = $this->postJson('/api/v1/resident-invitations', [
            'name' => 'Scoped Invitee',
            'email' => 'scoped.invitee@example.com',
            'phone' => '+201000000401',
            'role' => UserRole::ResidentOwner->value,
            'unitId' => $unitA->id,
            'relationType' => UnitRelationType::Owner->value,
        ])->assertCreated()->json('data.id');

        Sanctum::actingAs($adminB);
        $foreignInvitationId = $this->postJson('/api/v1/resident-invitations', [
            'name' => 'Foreign Invitee',
            'email' => 'foreign.invitee@example.com',
            'phone' => '+201000000402',
            'role' => UserRole::ResidentOwner->value,
            'unitId' => $unitB->id,
            'relationType' => UnitRelationType::Owner->value,
        ])->assertCreated()->json('data.id');

        Sanctum::actingAs($adminA);
        $this->getJson('/api/v1/resident-invitations')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $ownInvitationId);

        $this->postJson("/api/v1/resident-invitations/{$ownInvitationId}/resend")
            ->assertOk();

        $this->postJson("/api/v1/resident-invitations/{$foreignInvitationId}/resend")
            ->assertForbidden();

        $this->postJson("/api/v1/resident-invitations/{$foreignInvitationId}/revoke")
            ->assertForbidden();
    }

    public function test_admin_can_upload_and_review_verification_document(): void
    {
        Storage::fake('local');
        config(['filesystems.default' => 'local']);

        $compound = Compound::factory()->create();
        $building = Building::factory()->for($compound)->create();
        $unit = Unit::factory()->for($compound)->for($building)->create();

        $admin = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => $compound->id,
        ]);
        $resident = User::factory()->create(['role' => UserRole::ResidentOwner->value]);

        $unit->memberships()->create([
            'user_id' => $resident->id,
            'relation_type' => UnitRelationType::Owner->value,
            'verification_status' => VerificationStatus::Verified->value,
            'starts_at' => now()->subYear(),
        ]);

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
            'unitId' => $unit->id,
            'file' => UploadedFile::fake()->create('ownership.pdf', 256, 'application/pdf'),
        ])
            ->assertCreated()
            ->assertJsonPath('data.userId', $resident->id)
            ->assertJsonPath('data.unitId', $unit->id)
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

    public function test_scoped_admin_cannot_list_review_or_download_other_compound_documents(): void
    {
        Storage::fake('local');
        config(['filesystems.default' => 'local']);

        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();
        $buildingA = Building::factory()->for($compoundA)->create();
        $buildingB = Building::factory()->for($compoundB)->create();
        $unitA = Unit::factory()->for($compoundA)->for($buildingA)->create(['floor_id' => null]);
        $unitB = Unit::factory()->for($compoundB)->for($buildingB)->create(['floor_id' => null]);
        $adminA = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => $compoundA->id,
        ]);
        $residentA = User::factory()->create(['role' => UserRole::ResidentOwner->value]);
        $residentB = User::factory()->create(['role' => UserRole::ResidentOwner->value]);
        $documentType = DocumentType::query()->create([
            'key' => 'national_id',
            'name' => 'National ID',
            'is_required_default' => true,
            'allowed_mime_types' => ['application/pdf'],
            'max_file_size_kb' => 10240,
            'is_active' => true,
        ]);

        $documentA = UserDocument::query()->create([
            'document_type_id' => $documentType->id,
            'user_id' => $residentA->id,
            'unit_id' => $unitA->id,
            'status' => DocumentStatus::Submitted->value,
            'storage_disk' => 'local',
            'storage_path' => 'verification-documents/a.pdf',
            'original_name' => 'a.pdf',
            'mime_type' => 'application/pdf',
            'size_bytes' => 100,
            'checksum_sha256' => str_repeat('a', 64),
        ]);
        $documentB = UserDocument::query()->create([
            'document_type_id' => $documentType->id,
            'user_id' => $residentB->id,
            'unit_id' => $unitB->id,
            'status' => DocumentStatus::Submitted->value,
            'storage_disk' => 'local',
            'storage_path' => 'verification-documents/b.pdf',
            'original_name' => 'b.pdf',
            'mime_type' => 'application/pdf',
            'size_bytes' => 100,
            'checksum_sha256' => str_repeat('b', 64),
        ]);

        Sanctum::actingAs($adminA);

        $this->getJson('/api/v1/documents')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $documentA->id);

        $this->patchJson("/api/v1/documents/{$documentB->id}/review", [
            'status' => DocumentStatus::Approved->value,
        ])->assertForbidden();

        $this->getJson("/api/v1/documents/{$documentB->id}/download")->assertForbidden();
    }

    public function test_effective_compound_head_is_treated_as_document_reviewer_even_when_legacy_role_is_stale(): void
    {
        Storage::fake('local');
        config(['filesystems.default' => 'local']);

        $compound = Compound::factory()->create();
        $building = Building::factory()->for($compound)->create();
        $unit = Unit::factory()->for($compound)->for($building)->create(['floor_id' => null]);
        $documentType = DocumentType::query()->create([
            'key' => 'passport',
            'name' => 'Passport',
            'is_required_default' => true,
            'allowed_mime_types' => ['application/pdf'],
            'max_file_size_kb' => 10240,
            'is_active' => true,
        ]);

        $compoundHeadRole = SpatieRole::findOrCreate('compound_head', 'sanctum');
        $viewUsersPermission = SpatiePermission::findOrCreate(Permission::ViewUsers->value, 'sanctum');
        $compoundHeadRole->givePermissionTo($viewUsersPermission);
        $admin = User::factory()->create([
            'role' => UserRole::ResidentOwner->value,
            'compound_id' => $compound->id,
        ]);
        $admin->assignRole($compoundHeadRole);
        $admin->givePermissionTo($viewUsersPermission);

        $resident = User::factory()->create(['role' => UserRole::ResidentOwner->value]);
        $document = UserDocument::query()->create([
            'document_type_id' => $documentType->id,
            'user_id' => $resident->id,
            'unit_id' => $unit->id,
            'status' => DocumentStatus::Submitted->value,
            'storage_disk' => 'local',
            'storage_path' => 'verification-documents/passport.pdf',
            'original_name' => 'passport.pdf',
            'mime_type' => 'application/pdf',
            'size_bytes' => 100,
            'checksum_sha256' => str_repeat('c', 64),
        ]);

        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/documents')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $document->id);
    }

    public function test_effective_compound_head_with_membership_scope_can_review_own_compound_documents_but_not_foreign_compound_when_compound_id_is_null(): void
    {
        Storage::fake('local');
        config(['filesystems.default' => 'local']);

        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();
        $buildingA = Building::factory()->for($compoundA)->create();
        $buildingB = Building::factory()->for($compoundB)->create();
        $unitA = Unit::factory()->for($compoundA)->for($buildingA)->create(['floor_id' => null]);
        $unitB = Unit::factory()->for($compoundB)->for($buildingB)->create(['floor_id' => null]);
        $documentType = DocumentType::query()->create([
            'key' => 'residency_proof',
            'name' => 'Residency Proof',
            'is_required_default' => true,
            'allowed_mime_types' => ['application/pdf'],
            'max_file_size_kb' => 10240,
            'is_active' => true,
        ]);

        $compoundHeadRole = SpatieRole::findOrCreate('compound_head', 'sanctum');
        $viewUsersPermission = SpatiePermission::findOrCreate(Permission::ViewUsers->value, 'sanctum');
        $compoundHeadRole->givePermissionTo($viewUsersPermission);

        $admin = User::factory()->create([
            'role' => UserRole::ResidentOwner->value,
            'compound_id' => null,
        ]);
        $admin->assignRole($compoundHeadRole);
        $admin->givePermissionTo($viewUsersPermission);
        Unit::query()->findOrFail($unitA->id)->memberships()->create([
            'user_id' => $admin->id,
            'relation_type' => UnitRelationType::Owner->value,
            'verification_status' => VerificationStatus::Verified->value,
            'starts_at' => now()->subYear(),
        ]);

        $residentA = User::factory()->create(['role' => UserRole::ResidentOwner->value]);
        $residentB = User::factory()->create(['role' => UserRole::ResidentOwner->value]);
        $documentA = UserDocument::query()->create([
            'document_type_id' => $documentType->id,
            'user_id' => $residentA->id,
            'unit_id' => $unitA->id,
            'status' => DocumentStatus::Submitted->value,
            'storage_disk' => 'local',
            'storage_path' => 'verification-documents/a-scope.pdf',
            'original_name' => 'a-scope.pdf',
            'mime_type' => 'application/pdf',
            'size_bytes' => 100,
            'checksum_sha256' => str_repeat('d', 64),
        ]);
        $documentB = UserDocument::query()->create([
            'document_type_id' => $documentType->id,
            'user_id' => $residentB->id,
            'unit_id' => $unitB->id,
            'status' => DocumentStatus::Submitted->value,
            'storage_disk' => 'local',
            'storage_path' => 'verification-documents/b-scope.pdf',
            'original_name' => 'b-scope.pdf',
            'mime_type' => 'application/pdf',
            'size_bytes' => 100,
            'checksum_sha256' => str_repeat('e', 64),
        ]);

        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/documents')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $documentA->id);

        $this->patchJson("/api/v1/documents/{$documentA->id}/review", [
            'status' => DocumentStatus::Approved->value,
        ])->assertOk();

        $this->patchJson("/api/v1/documents/{$documentB->id}/review", [
            'status' => DocumentStatus::Approved->value,
        ])->assertForbidden();
    }

    public function test_admin_can_approve_accepted_resident_verification_request(): void
    {
        Notification::fake();

        $compound = Compound::factory()->create();
        $building = Building::factory()->for($compound)->create();
        $admin = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => $compound->id,
        ]);
        $resident = User::factory()->create([
            'role' => UserRole::ResidentOwner->value,
            'status' => AccountStatus::PendingReview->value,
        ]);
        $unit = Unit::factory()
            ->for($compound)
            ->for($building)
            ->create(['floor_id' => null, 'unit_number' => 'B-202']);

        $unit->memberships()->create([
            'user_id' => $resident->id,
            'relation_type' => UnitRelationType::Owner->value,
            'is_primary' => true,
            'verification_status' => VerificationStatus::Pending->value,
            'created_by' => $admin->id,
        ]);

        $verificationRequest = VerificationRequest::query()->create([
            'user_id' => $resident->id,
            'unit_id' => $unit->id,
            'requested_role' => UserRole::ResidentOwner->value,
            'relation_type' => UnitRelationType::Owner->value,
            'status' => VerificationRequestStatus::PendingReview->value,
            'submitted_at' => now(),
        ]);

        Sanctum::actingAs($admin);

        $this->patchJson("/api/v1/verification-requests/{$verificationRequest->id}/approve", [
            'note' => 'Ownership verified against submitted documents.',
        ])
            ->assertOk()
            ->assertJsonPath('data.status', VerificationRequestStatus::Approved->value)
            ->assertJsonPath('data.reviewedBy', $admin->id)
            ->assertJsonPath('data.decisionNote', 'Ownership verified against submitted documents.');

        $this->assertDatabaseHas('users', [
            'id' => $resident->id,
            'status' => AccountStatus::Active->value,
        ]);
        $this->assertDatabaseHas('unit_memberships', [
            'unit_id' => $unit->id,
            'user_id' => $resident->id,
            'verification_status' => VerificationStatus::Verified->value,
        ]);

        Notification::assertSentTo(
            $resident,
            VerificationDecisionNotification::class,
            function (VerificationDecisionNotification $notification, array $channels) use ($resident): bool {
                $payload = $notification->toArray($resident);
                $mail = $notification->toMail($resident);
                $rendered = (string) $mail->render();

                return $payload['status'] === VerificationRequestStatus::Approved->value
                    && $payload['note'] === 'Ownership verified against submitted documents.'
                    && $payload['titleAr'] === 'تمت الموافقة على حسابك في المجمع'
                    && str_contains($payload['bodyAr'], 'تمت الموافقة على وصولك')
                    && str_contains($mail->subject, 'تمت الموافقة')
                    && str_contains($rendered, 'ملاحظة المراجع');
            },
        );
    }

    public function test_scoped_admin_cannot_list_or_decide_other_compound_verification_requests(): void
    {
        Notification::fake();

        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();
        $buildingA = Building::factory()->for($compoundA)->create();
        $buildingB = Building::factory()->for($compoundB)->create();
        $unitA = Unit::factory()->for($compoundA)->for($buildingA)->create(['floor_id' => null]);
        $unitB = Unit::factory()->for($compoundB)->for($buildingB)->create(['floor_id' => null]);
        $adminA = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => $compoundA->id,
        ]);
        $residentA = User::factory()->create([
            'role' => UserRole::ResidentOwner->value,
            'status' => AccountStatus::PendingReview->value,
        ]);
        $residentB = User::factory()->create([
            'role' => UserRole::ResidentOwner->value,
            'status' => AccountStatus::PendingReview->value,
        ]);

        $requestA = VerificationRequest::query()->create([
            'user_id' => $residentA->id,
            'unit_id' => $unitA->id,
            'requested_role' => UserRole::ResidentOwner->value,
            'relation_type' => UnitRelationType::Owner->value,
            'status' => VerificationRequestStatus::PendingReview->value,
            'submitted_at' => now(),
        ]);
        $requestB = VerificationRequest::query()->create([
            'user_id' => $residentB->id,
            'unit_id' => $unitB->id,
            'requested_role' => UserRole::ResidentOwner->value,
            'relation_type' => UnitRelationType::Owner->value,
            'status' => VerificationRequestStatus::PendingReview->value,
            'submitted_at' => now(),
        ]);

        Sanctum::actingAs($adminA);

        $this->getJson('/api/v1/verification-requests')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $requestA->id);

        $this->patchJson("/api/v1/verification-requests/{$requestB->id}/approve", [
            'note' => 'Foreign request should not be reviewable.',
        ])->assertForbidden();

        $this->assertDatabaseHas('verification_requests', [
            'id' => $requestB->id,
            'status' => VerificationRequestStatus::PendingReview->value,
            'reviewed_by' => null,
        ]);
    }

    public function test_effective_compound_head_with_membership_scope_can_manage_own_compound_verification_requests_but_not_foreign_compound_when_compound_id_is_null(): void
    {
        Notification::fake();

        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();
        $buildingA = Building::factory()->for($compoundA)->create();
        $buildingB = Building::factory()->for($compoundB)->create();
        $unitA = Unit::factory()->for($compoundA)->for($buildingA)->create(['floor_id' => null]);
        $unitB = Unit::factory()->for($compoundB)->for($buildingB)->create(['floor_id' => null]);
        $compoundHeadRole = SpatieRole::findOrCreate('compound_head', 'sanctum');
        $viewUsersPermission = SpatiePermission::findOrCreate(Permission::ViewUsers->value, 'sanctum');
        $compoundHeadRole->givePermissionTo($viewUsersPermission);

        $admin = User::factory()->create([
            'role' => UserRole::ResidentOwner->value,
            'compound_id' => null,
        ]);
        $admin->assignRole($compoundHeadRole);
        $admin->givePermissionTo($viewUsersPermission);
        $unitA->memberships()->create([
            'user_id' => $admin->id,
            'relation_type' => UnitRelationType::Owner->value,
            'verification_status' => VerificationStatus::Verified->value,
            'starts_at' => now()->subYear(),
        ]);

        $residentA = User::factory()->create([
            'role' => UserRole::ResidentOwner->value,
            'status' => AccountStatus::PendingReview->value,
        ]);
        $residentB = User::factory()->create([
            'role' => UserRole::ResidentOwner->value,
            'status' => AccountStatus::PendingReview->value,
        ]);

        $unitA->memberships()->create([
            'user_id' => $residentA->id,
            'relation_type' => UnitRelationType::Owner->value,
            'is_primary' => true,
            'verification_status' => VerificationStatus::Pending->value,
            'created_by' => $admin->id,
        ]);
        $unitB->memberships()->create([
            'user_id' => $residentB->id,
            'relation_type' => UnitRelationType::Owner->value,
            'is_primary' => true,
            'verification_status' => VerificationStatus::Pending->value,
            'created_by' => $admin->id,
        ]);

        $requestA = VerificationRequest::query()->create([
            'user_id' => $residentA->id,
            'unit_id' => $unitA->id,
            'requested_role' => UserRole::ResidentOwner->value,
            'relation_type' => UnitRelationType::Owner->value,
            'status' => VerificationRequestStatus::PendingReview->value,
            'submitted_at' => now(),
        ]);
        $requestB = VerificationRequest::query()->create([
            'user_id' => $residentB->id,
            'unit_id' => $unitB->id,
            'requested_role' => UserRole::ResidentOwner->value,
            'relation_type' => UnitRelationType::Owner->value,
            'status' => VerificationRequestStatus::PendingReview->value,
            'submitted_at' => now(),
        ]);

        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/verification-requests')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $requestA->id);

        $this->patchJson("/api/v1/verification-requests/{$requestA->id}/approve", [
            'note' => 'Membership-scoped verification approved.',
        ])->assertOk();

        $this->patchJson("/api/v1/verification-requests/{$requestB->id}/approve", [
            'note' => 'Should be blocked.',
        ])->assertForbidden();
    }

    public function test_admin_can_request_more_info_and_reject_verification_request(): void
    {
        Notification::fake();

        $compound = Compound::factory()->create();
        $building = Building::factory()->for($compound)->create();
        $unit = Unit::factory()->for($compound)->for($building)->create();

        $admin = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => $compound->id,
        ]);
        $resident = User::factory()->create([
            'role' => UserRole::ResidentTenant->value,
            'status' => AccountStatus::PendingReview->value,
        ]);

        $unit->memberships()->create([
            'user_id' => $resident->id,
            'relation_type' => UnitRelationType::Tenant->value,
            'starts_at' => now()->subDay(),
        ]);

        $verificationRequest = VerificationRequest::query()->create([
            'user_id' => $resident->id,
            'unit_id' => $unit->id,
            'requested_role' => UserRole::ResidentTenant->value,
            'relation_type' => UnitRelationType::Tenant->value,
            'status' => VerificationRequestStatus::PendingReview->value,
            'submitted_at' => now(),
        ]);

        Sanctum::actingAs($admin);

        $this->patchJson("/api/v1/verification-requests/{$verificationRequest->id}/request-more-info")
            ->assertUnprocessable();

        $this->patchJson("/api/v1/verification-requests/{$verificationRequest->id}/request-more-info", [
            'note' => 'Please upload the signed lease page.',
        ])
            ->assertOk()
            ->assertJsonPath('data.status', VerificationRequestStatus::MoreInfoRequested->value)
            ->assertJsonPath('data.moreInfoNote', 'Please upload the signed lease page.');

        Notification::assertSentTo(
            $resident,
            VerificationDecisionNotification::class,
            fn (VerificationDecisionNotification $notification, array $channels): bool => $notification->toArray($resident)['status'] === VerificationRequestStatus::MoreInfoRequested->value
                && $notification->toArray($resident)['note'] === 'Please upload the signed lease page.',
        );

        $this->patchJson("/api/v1/verification-requests/{$verificationRequest->id}/reject")
            ->assertUnprocessable();

        $this->patchJson("/api/v1/verification-requests/{$verificationRequest->id}/reject", [
            'note' => 'Lease is not valid for this unit.',
        ])
            ->assertOk()
            ->assertJsonPath('data.status', VerificationRequestStatus::Rejected->value)
            ->assertJsonPath('data.decisionNote', 'Lease is not valid for this unit.');

        $this->assertDatabaseHas('users', [
            'id' => $resident->id,
            'status' => AccountStatus::Suspended->value,
        ]);

        Notification::assertSentTo(
            $resident,
            VerificationDecisionNotification::class,
            fn (VerificationDecisionNotification $notification, array $channels): bool => $notification->toArray($resident)['status'] === VerificationRequestStatus::Rejected->value
                && $notification->toArray($resident)['note'] === 'Lease is not valid for this unit.',
        );
    }

    public function test_pending_resident_can_list_only_own_verification_requests(): void
    {
        $resident = User::factory()->create([
            'role' => UserRole::ResidentOwner->value,
            'status' => AccountStatus::PendingReview->value,
        ]);
        $otherResident = User::factory()->create([
            'role' => UserRole::ResidentTenant->value,
            'status' => AccountStatus::PendingReview->value,
        ]);

        $ownRequest = VerificationRequest::query()->create([
            'user_id' => $resident->id,
            'requested_role' => UserRole::ResidentOwner->value,
            'relation_type' => UnitRelationType::Owner->value,
            'status' => VerificationRequestStatus::MoreInfoRequested->value,
            'submitted_at' => now(),
            'more_info_note' => 'Upload your national ID.',
        ]);

        VerificationRequest::query()->create([
            'user_id' => $otherResident->id,
            'requested_role' => UserRole::ResidentTenant->value,
            'relation_type' => UnitRelationType::Tenant->value,
            'status' => VerificationRequestStatus::PendingReview->value,
            'submitted_at' => now(),
        ]);

        Sanctum::actingAs($resident);

        $this->getJson('/api/v1/my/verification-requests')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $ownRequest->id)
            ->assertJsonPath('data.0.status', VerificationRequestStatus::MoreInfoRequested->value)
            ->assertJsonPath('data.0.moreInfoNote', 'Upload your national ID.');
    }
}
