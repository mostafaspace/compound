<?php

namespace Tests\Feature\Api\V1;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Models\Privacy\DataExportRequest;
use App\Models\Privacy\UserPolicyConsent;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

// CM-123: Privacy – consent, export, anonymization, legal hold
class PrivacyTest extends TestCase
{
    use RefreshDatabase;

    private function makeAdmin(array $attrs = []): User
    {
        return User::factory()->create(array_merge([
            'role'   => UserRole::SuperAdmin->value,
            'status' => AccountStatus::Active->value,
        ], $attrs));
    }

    private function makeResident(array $attrs = []): User
    {
        return User::factory()->create(array_merge([
            'role'   => UserRole::ResidentOwner->value,
            'status' => AccountStatus::Active->value,
        ], $attrs));
    }

    // ─── Policy consent ───────────────────────────────────────────────────────

    public function test_unauthenticated_cannot_access_consent(): void
    {
        $this->getJson('/api/v1/privacy/consents')->assertUnauthorized();
    }

    public function test_user_can_accept_policy(): void
    {
        Sanctum::actingAs($this->makeResident());

        $this->postJson('/api/v1/privacy/consents', [
            'policyType'    => 'privacy_policy',
            'policyVersion' => '2026-04-01',
        ])
            ->assertCreated()
            ->assertJsonPath('data.policy_type', 'privacy_policy')
            ->assertJsonPath('data.policy_version', '2026-04-01');
    }

    public function test_accepting_policy_revokes_previous_consent(): void
    {
        $user = $this->makeResident();
        Sanctum::actingAs($user);

        $this->postJson('/api/v1/privacy/consents', [
            'policyType'    => 'privacy_policy',
            'policyVersion' => '2025-01-01',
        ])->assertCreated();

        $this->postJson('/api/v1/privacy/consents', [
            'policyType'    => 'privacy_policy',
            'policyVersion' => '2026-04-01',
        ])->assertCreated();

        // Old one should be revoked
        $this->assertDatabaseHas('user_policy_consents', [
            'user_id'        => $user->id,
            'policy_version' => '2025-01-01',
        ]);
        $old = UserPolicyConsent::where('user_id', $user->id)
            ->where('policy_version', '2025-01-01')
            ->first();
        $this->assertNotNull($old->revoked_at);
    }

    public function test_user_can_list_their_consents(): void
    {
        $user = $this->makeResident();
        UserPolicyConsent::create([
            'user_id'        => $user->id,
            'policy_type'    => 'terms_of_service',
            'policy_version' => '2026-01-01',
            'accepted_at'    => now(),
        ]);

        Sanctum::actingAs($user);

        $response = $this->getJson('/api/v1/privacy/consents');
        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
    }

    public function test_policy_type_must_be_valid(): void
    {
        Sanctum::actingAs($this->makeResident());

        $this->postJson('/api/v1/privacy/consents', [
            'policyType'    => 'invalid_policy',
            'policyVersion' => '2026-04-01',
        ])->assertUnprocessable();
    }

    public function test_admin_can_view_consents_for_any_user(): void
    {
        $user = $this->makeResident();
        UserPolicyConsent::create([
            'user_id'        => $user->id,
            'policy_type'    => 'privacy_policy',
            'policy_version' => '2026-04-01',
            'accepted_at'    => now(),
        ]);

        Sanctum::actingAs($this->makeAdmin());

        $this->getJson("/api/v1/privacy/users/{$user->id}/consents")
            ->assertOk();
    }

    public function test_resident_cannot_view_other_users_consents(): void
    {
        $user1 = $this->makeResident();
        $user2 = $this->makeResident();

        Sanctum::actingAs($user1);

        $this->getJson("/api/v1/privacy/users/{$user2->id}/consents")
            ->assertForbidden();
    }

    // ─── Data export requests ─────────────────────────────────────────────────

    public function test_user_can_request_data_export(): void
    {
        $user = $this->makeResident();
        Sanctum::actingAs($user);

        $this->postJson('/api/v1/privacy/export-requests', [
            'modules' => ['profile', 'finance'],
        ])
            ->assertCreated()
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.user_id', $user->id);
    }

    public function test_user_can_view_their_export_request(): void
    {
        $user = $this->makeResident();
        $req  = DataExportRequest::create([
            'requested_by' => $user->id,
            'user_id'      => $user->id,
            'status'       => 'pending',
            'expires_at'   => now()->addDays(7),
        ]);

        Sanctum::actingAs($user);

        $this->getJson("/api/v1/privacy/export-requests/{$req->id}")
            ->assertOk()
            ->assertJsonPath('data.status', 'pending');
    }

    public function test_admin_can_list_all_export_requests(): void
    {
        $user = $this->makeResident();
        DataExportRequest::create([
            'requested_by' => $user->id,
            'user_id'      => $user->id,
            'status'       => 'pending',
            'expires_at'   => now()->addDays(7),
        ]);

        Sanctum::actingAs($this->makeAdmin());

        $this->getJson('/api/v1/privacy/export-requests')
            ->assertOk();
    }

    public function test_admin_can_process_export_request(): void
    {
        $user = $this->makeResident();
        $req  = DataExportRequest::create([
            'requested_by' => $user->id,
            'user_id'      => $user->id,
            'status'       => 'pending',
            'expires_at'   => now()->addDays(7),
        ]);

        Sanctum::actingAs($this->makeAdmin());

        $this->postJson("/api/v1/privacy/export-requests/{$req->id}/process", [
            'packagePath' => '/exports/user-'.$user->id.'.zip',
        ])
            ->assertOk()
            ->assertJsonPath('data.status', 'ready')
            ->assertJsonPath('data.processed_at', fn ($v) => $v !== null);
    }

    public function test_cannot_process_already_processed_export(): void
    {
        $user = $this->makeResident();
        $req  = DataExportRequest::create([
            'requested_by' => $user->id,
            'user_id'      => $user->id,
            'status'       => 'ready',
            'expires_at'   => now()->addDays(7),
        ]);

        Sanctum::actingAs($this->makeAdmin());

        $this->postJson("/api/v1/privacy/export-requests/{$req->id}/process")
            ->assertStatus(422);
    }

    // ─── Legal hold & anonymization ───────────────────────────────────────────

    public function test_admin_can_set_legal_hold(): void
    {
        $user = $this->makeResident();
        Sanctum::actingAs($this->makeAdmin());

        $this->postJson("/api/v1/privacy/users/{$user->id}/legal-hold", [
            'hold'   => true,
            'reason' => 'Active litigation.',
        ])
            ->assertOk()
            ->assertJsonPath('data.legal_hold', true);
    }

    public function test_resident_cannot_set_legal_hold(): void
    {
        $user = $this->makeResident();
        Sanctum::actingAs($this->makeResident());

        $this->postJson("/api/v1/privacy/users/{$user->id}/legal-hold", [
            'hold'   => true,
            'reason' => 'test',
        ])->assertForbidden();
    }

    public function test_admin_can_anonymize_user(): void
    {
        $user = $this->makeResident();
        Sanctum::actingAs($this->makeAdmin());

        $this->postJson("/api/v1/privacy/users/{$user->id}/anonymize", [
            'reason' => 'User requested account deletion.',
        ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Deleted User')
            ->assertJsonPath('data.anonymized_at', fn ($v) => $v !== null);
    }

    public function test_cannot_anonymize_user_under_legal_hold(): void
    {
        $user = $this->makeResident();
        $user->update(['legal_hold' => true]);

        Sanctum::actingAs($this->makeAdmin());

        $this->postJson("/api/v1/privacy/users/{$user->id}/anonymize", [
            'reason' => 'Test.',
        ])->assertStatus(422);
    }

    public function test_cannot_anonymize_user_twice(): void
    {
        $user = $this->makeResident();
        $user->update(['anonymized_at' => now()]);

        Sanctum::actingAs($this->makeAdmin());

        $this->postJson("/api/v1/privacy/users/{$user->id}/anonymize", [
            'reason' => 'Test.',
        ])->assertStatus(422);
    }
}
