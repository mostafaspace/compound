<?php

namespace Tests\Feature\Api\V1;

use App\Enums\AccountStatus;
use App\Enums\InvitationStatus;
use App\Enums\UserRole;
use App\Models\Documents\DocumentType;
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
}
