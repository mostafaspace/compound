<?php

namespace Tests\Feature\Api\V1;

use App\Enums\AccountStatus;
use App\Enums\InvitationStatus;
use App\Enums\UnitRelationType;
use App\Enums\UserRole;
use App\Enums\VerificationStatus;
use App\Models\Documents\DocumentType;
use App\Models\Finance\UnitAccount;
use App\Models\Property\Building;
use App\Models\Property\Compound;
use App\Models\Property\Unit;
use App\Models\ResidentInvitation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ApiHardeningTest extends TestCase
{
    use RefreshDatabase;

    public function test_invitation_accept_is_rate_limited_per_token_and_ip(): void
    {
        $ip = '203.0.113.'.random_int(20, 120);
        $token = Str::random(48);
        $user = User::factory()->create([
            'email' => 'invitee@example.com',
            'password' => Hash::make(Str::password(24)),
            'status' => AccountStatus::Invited->value,
        ]);

        ResidentInvitation::query()->create([
            'user_id' => $user->id,
            'token_hash' => hash('sha256', $token),
            'email' => $user->email,
            'role' => UserRole::ResidentOwner->value,
            'status' => InvitationStatus::Pending->value,
            'expires_at' => now()->addDays(7),
        ]);

        for ($attempt = 0; $attempt < 10; $attempt++) {
            $this->withServerVariables(['REMOTE_ADDR' => $ip])
                ->postJson("/api/v1/resident-invitations/{$token}/accept", [
                    'name' => 'Invitee',
                    'password' => 'Password1234',
                    'password_confirmation' => 'Password1234-mismatch',
                ])
                ->assertStatus(422);
        }

        $this->withServerVariables(['REMOTE_ADDR' => $ip])
            ->postJson("/api/v1/resident-invitations/{$token}/accept", [
                'name' => 'Invitee',
                'password' => 'Password1234',
                'password_confirmation' => 'Password1234-mismatch',
            ])
            ->assertStatus(429);
    }

    public function test_invitation_lookup_is_rate_limited_per_ip(): void
    {
        $ip = '203.0.113.'.random_int(121, 180);
        $token = Str::random(48);
        $user = User::factory()->create([
            'email' => 'lookup@example.com',
            'password' => Hash::make(Str::password(24)),
            'status' => AccountStatus::Invited->value,
        ]);

        ResidentInvitation::query()->create([
            'user_id' => $user->id,
            'token_hash' => hash('sha256', $token),
            'email' => $user->email,
            'role' => UserRole::ResidentTenant->value,
            'status' => InvitationStatus::Pending->value,
            'expires_at' => now()->addDays(7),
        ]);

        for ($attempt = 0; $attempt < 10; $attempt++) {
            $this->withServerVariables(['REMOTE_ADDR' => $ip])
                ->getJson("/api/v1/resident-invitations/{$token}")
                ->assertOk()
                ->assertJsonPath('data.email', $user->email);
        }

        for ($attempt = 0; $attempt < 20; $attempt++) {
            $response = $this->withServerVariables(['REMOTE_ADDR' => $ip])
                ->getJson("/api/v1/resident-invitations/{$token}");

            if ($response->status() === 429) {
                return;
            }

            $response
                ->assertOk()
                ->assertJsonPath('data.email', $user->email);
        }

        $this->withServerVariables(['REMOTE_ADDR' => $ip])
            ->getJson("/api/v1/resident-invitations/{$token}")
            ->assertStatus(429);
    }

    public function test_document_upload_is_rate_limited_for_authenticated_users(): void
    {
        $ip = '203.0.113.'.random_int(181, 220);
        Storage::fake('local');
        config(['filesystems.default' => 'local']);

        $admin = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'status' => AccountStatus::Active->value,
        ]);
        $documentType = DocumentType::query()->create([
            'key' => 'passport_copy',
            'name' => 'Passport copy',
            'is_required_default' => false,
            'allowed_mime_types' => ['application/pdf'],
            'max_file_size_kb' => 10240,
            'is_active' => true,
        ]);

        Sanctum::actingAs($admin);

        for ($attempt = 0; $attempt < 10; $attempt++) {
            $this->withServerVariables(['REMOTE_ADDR' => $ip])
                ->post('/api/v1/documents', [
                    'documentTypeId' => $documentType->id,
                    'userId' => $admin->id,
                    'file' => UploadedFile::fake()->create("passport-{$attempt}.pdf", 64, 'application/pdf'),
                ])
                ->assertCreated();
        }

        $this->withServerVariables(['REMOTE_ADDR' => $ip])
            ->post('/api/v1/documents', [
                'documentTypeId' => $documentType->id,
                'userId' => $admin->id,
                'file' => UploadedFile::fake()->create('passport-overflow.pdf', 64, 'application/pdf'),
            ])
            ->assertStatus(429);
    }

    public function test_visitor_pass_validation_is_rate_limited_for_gate_staff(): void
    {
        $ip = '203.0.113.'.random_int(221, 250);
        $guard = User::factory()->create([
            'role' => UserRole::SecurityGuard->value,
            'status' => AccountStatus::Active->value,
        ]);

        Sanctum::actingAs($guard);

        for ($attempt = 0; $attempt < 60; $attempt++) {
            $this->withServerVariables(['REMOTE_ADDR' => $ip])
                ->postJson('/api/v1/visitor-requests/validate-pass', [
                    'token' => str_repeat('x', 64),
                ])
                ->assertOk()
                ->assertJsonPath('data.result', 'not_found');
        }

        $this->withServerVariables(['REMOTE_ADDR' => $ip])
            ->postJson('/api/v1/visitor-requests/validate-pass', [
                'token' => str_repeat('x', 64),
            ])
            ->assertStatus(429);
    }

    public function test_visitor_request_creation_is_rate_limited_for_verified_residents(): void
    {
        $ip = '203.0.113.'.random_int(20, 120);
        [$resident, $unit] = $this->createVerifiedResidentWithUnit();

        Sanctum::actingAs($resident);

        for ($attempt = 0; $attempt < 10; $attempt++) {
            $this->withServerVariables(['REMOTE_ADDR' => $ip])
                ->postJson('/api/v1/visitor-requests', [
                    'unitId' => $unit->id,
                    'visitorName' => "Guest {$attempt}",
                    'visitStartsAt' => now()->addMinutes(10 + $attempt)->toIso8601String(),
                    'visitEndsAt' => now()->addHours(2)->toIso8601String(),
                ])
                ->assertCreated();
        }

        $this->withServerVariables(['REMOTE_ADDR' => $ip])
            ->postJson('/api/v1/visitor-requests', [
                'unitId' => $unit->id,
                'visitorName' => 'Guest Overflow',
                'visitStartsAt' => now()->addMinutes(30)->toIso8601String(),
                'visitEndsAt' => now()->addHours(3)->toIso8601String(),
            ])
            ->assertStatus(429);
    }

    public function test_issue_creation_is_rate_limited_for_authenticated_users(): void
    {
        $ip = '203.0.113.'.random_int(121, 180);
        $resident = User::factory()->create([
            'role' => UserRole::ResidentOwner->value,
            'status' => AccountStatus::Active->value,
        ]);
        $unit = $this->createUnit('C-303');

        Sanctum::actingAs($resident);

        for ($attempt = 0; $attempt < 8; $attempt++) {
            $this->withServerVariables(['REMOTE_ADDR' => $ip])
                ->postJson('/api/v1/issues', [
                    'unitId' => $unit->id,
                    'category' => 'maintenance',
                    'title' => "Issue {$attempt}",
                    'description' => 'Water leak reported from the service shaft.',
                    'priority' => 'normal',
                ])
                ->assertCreated();
        }

        $this->withServerVariables(['REMOTE_ADDR' => $ip])
            ->postJson('/api/v1/issues', [
                'unitId' => $unit->id,
                'category' => 'maintenance',
                'title' => 'Issue Overflow',
                'description' => 'Overflow issue submission should now be throttled.',
                'priority' => 'normal',
            ])
            ->assertStatus(429);
    }

    public function test_payment_submission_is_rate_limited_for_residents(): void
    {
        $ip = '203.0.113.'.random_int(181, 220);
        Storage::fake('local');
        config(['filesystems.default' => 'local']);

        [$resident, $unit] = $this->createVerifiedResidentWithUnit('D-404');
        $account = UnitAccount::factory()->for($unit)->create(['balance' => '750.00']);

        Sanctum::actingAs($resident);

        for ($attempt = 0; $attempt < 6; $attempt++) {
            $this->withServerVariables(['REMOTE_ADDR' => $ip])
                ->post("/api/v1/finance/unit-accounts/{$account->id}/payment-submissions", [
                    'amount' => 100 + $attempt,
                    'method' => 'bank_transfer',
                    'reference' => "TRX-{$attempt}",
                    'proof' => UploadedFile::fake()->create("receipt-{$attempt}.pdf", 32, 'application/pdf'),
                ])
                ->assertCreated();
        }

        $this->withServerVariables(['REMOTE_ADDR' => $ip])
            ->post("/api/v1/finance/unit-accounts/{$account->id}/payment-submissions", [
                'amount' => 150,
                'method' => 'bank_transfer',
                'reference' => 'TRX-OVERFLOW',
                'proof' => UploadedFile::fake()->create('receipt-overflow.pdf', 32, 'application/pdf'),
            ])
            ->assertStatus(429);
    }

    private function createVerifiedResidentWithUnit(string $unitNumber = 'A-101'): array
    {
        $admin = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'status' => AccountStatus::Active->value,
        ]);
        $resident = User::factory()->create([
            'role' => UserRole::ResidentOwner->value,
            'status' => AccountStatus::Active->value,
        ]);
        $unit = $this->createUnit($unitNumber);

        $unit->memberships()->create([
            'user_id' => $resident->id,
            'relation_type' => UnitRelationType::Owner->value,
            'starts_at' => now()->toDateString(),
            'is_primary' => true,
            'verification_status' => VerificationStatus::Verified->value,
            'created_by' => $admin->id,
        ]);

        return [$resident, $unit];
    }

    private function createUnit(string $unitNumber = 'A-101'): Unit
    {
        $compound = Compound::factory()->create();
        $building = Building::factory()->for($compound)->create();

        return Unit::factory()
            ->for($compound)
            ->for($building)
            ->create([
                'floor_id' => null,
                'unit_number' => $unitNumber,
            ]);
    }
}
