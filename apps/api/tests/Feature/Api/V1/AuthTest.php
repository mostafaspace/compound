<?php

namespace Tests\Feature\Api\V1;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_active_user_can_login_and_fetch_profile(): void
    {
        $user = User::factory()->create([
            'email' => 'admin@example.com',
            'password' => Hash::make('password'),
            'role' => UserRole::CompoundAdmin->value,
            'status' => AccountStatus::Active->value,
        ]);

        $token = $this->postJson('/api/v1/auth/login', [
            'email' => 'admin@example.com',
            'password' => 'password',
            'deviceName' => 'Feature test',
        ])
            ->assertOk()
            ->assertJsonPath('data.user.id', $user->id)
            ->assertJsonPath('data.tokenType', 'Bearer')
            ->json('data.token');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('data.email', 'admin@example.com');
    }

    public function test_suspended_user_cannot_login(): void
    {
        User::factory()->create([
            'email' => 'suspended@example.com',
            'password' => Hash::make('password'),
            'status' => AccountStatus::Suspended->value,
        ]);

        $this->postJson('/api/v1/auth/login', [
            'email' => 'suspended@example.com',
            'password' => 'password',
            'deviceName' => 'Feature test',
        ])->assertForbidden();
    }

    public function test_pending_review_resident_can_login_with_restricted_access(): void
    {
        User::factory()->create([
            'email' => 'pending@example.com',
            'password' => Hash::make('password'),
            'role' => UserRole::ResidentOwner->value,
            'status' => AccountStatus::PendingReview->value,
        ]);

        $token = $this->postJson('/api/v1/auth/login', [
            'email' => 'pending@example.com',
            'password' => 'password',
            'deviceName' => 'Feature test',
        ])
            ->assertOk()
            ->assertJsonPath('data.user.status', AccountStatus::PendingReview->value)
            ->json('data.token');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/document-types')
            ->assertOk();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/compounds')
            ->assertForbidden();
    }
}
