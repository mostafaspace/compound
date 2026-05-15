<?php

namespace Tests\Feature\Api\V1;

use App\Enums\AccountStatus;
use App\Enums\UnitRelationType;
use App\Enums\UserRole;
use App\Enums\VerificationStatus;
use App\Models\Property\Building;
use App\Models\Property\Compound;
use App\Models\Property\Unit;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class OwnerRegistrationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutMiddleware(ThrottleRequests::class);
        app(PermissionRegistrar::class)->forgetCachedPermissions();
        $this->seed(RbacSeeder::class);
        Storage::fake('local');
    }

    public function test_public_next_point_buildings_are_available_before_login(): void
    {
        $compound = Compound::factory()->create([
            'name' => 'Next Point',
            'code' => 'NEXT-POINT',
            'status' => 'active',
        ]);

        Building::factory()->for($compound)->create(['name' => 'Building H', 'code' => 'H', 'sort_order' => 8]);
        Building::factory()->for($compound)->create(['name' => 'Building K', 'code' => 'K', 'sort_order' => 11]);

        $this->getJson('/api/v1/public/owner-registration/buildings')
            ->assertOk()
            ->assertJsonPath('data.0.code', 'H')
            ->assertJsonPath('data.0.label', 'Building H')
            ->assertJsonPath('meta.compound.code', 'NEXT-POINT');
    }

    public function test_owner_can_submit_public_application_with_required_pdfs(): void
    {
        $compound = Compound::factory()->create(['code' => 'NEXT-POINT', 'status' => 'active']);
        $building = Building::factory()->for($compound)->create(['code' => 'H', 'name' => 'Building H']);

        $response = $this->postJson('/api/v1/public/owner-registration-requests', $this->validPayload($building->id))
            ->assertCreated()
            ->assertJsonPath('data.status', 'under_review')
            ->assertJsonPath('data.fullNameArabic', 'مصطفى أحمد محمد علي')
            ->assertJsonPath('data.apartmentCode', 'HR-F01-F02')
            ->assertJsonPath('data.building.code', 'H')
            ->assertJsonStructure(['data' => ['id', 'requestToken', 'documents']]);

        $this->assertDatabaseHas('owner_registration_requests', [
            'id' => $response->json('data.id'),
            'compound_id' => $compound->id,
            'building_id' => $building->id,
            'email' => 'owner@example.com',
            'phone' => '201000000123',
            'status' => 'under_review',
            'owner_acknowledged' => true,
        ]);

        $this->assertDatabaseCount('owner_registration_documents', 3);
    }

    public function test_public_application_requires_owner_acknowledgement_and_pdf_documents(): void
    {
        $compound = Compound::factory()->create(['code' => 'NEXT-POINT', 'status' => 'active']);
        $building = Building::factory()->for($compound)->create(['code' => 'H']);

        $payload = $this->validPayload($building->id);
        unset($payload['ownerAcknowledged'], $payload['idCardPdf']);
        $payload['contractPdf'] = UploadedFile::fake()->create('contract.txt', 12, 'text/plain');

        $this->postJson('/api/v1/public/owner-registration-requests', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['ownerAcknowledged', 'idCardPdf', 'contractPdf']);
    }

    public function test_public_application_requires_arabic_owner_name_and_numeric_phone(): void
    {
        $compound = Compound::factory()->create(['code' => 'NEXT-POINT', 'status' => 'active']);
        $building = Building::factory()->for($compound)->create(['code' => 'H']);

        $payload = $this->validPayload($building->id);
        $payload['fullNameArabic'] = 'Mostafa Ahmed Mohamed Ali';
        $payload['phone'] = '+201000000123';

        $this->postJson('/api/v1/public/owner-registration-requests', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['fullNameArabic', 'phone']);
    }

    public function test_admin_can_deny_application_and_status_is_visible_to_original_device(): void
    {
        $compound = Compound::factory()->create(['code' => 'NEXT-POINT', 'status' => 'active']);
        $building = Building::factory()->for($compound)->create(['code' => 'H']);
        $admin = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => $compound->id,
        ]);
        $admin->assignRole(UserRole::CompoundAdmin->value);

        $application = $this->postJson('/api/v1/public/owner-registration-requests', $this->validPayload($building->id))
            ->assertCreated()
            ->json('data');

        Sanctum::actingAs($admin);

        $this->patchJson("/api/v1/owner-registration-requests/{$application['id']}/deny", [
            'reason' => 'Contract name does not match the submitted owner name.',
        ])
            ->assertOk()
            ->assertJsonPath('data.status', 'denied')
            ->assertJsonPath('data.decisionReason', 'Contract name does not match the submitted owner name.');

        $this->getJson('/api/v1/public/owner-registration-requests/status?deviceId=uat-device-1')
            ->assertOk()
            ->assertJsonPath('data.status', 'denied')
            ->assertJsonPath('data.decisionReason', 'Contract name does not match the submitted owner name.');
    }

    public function test_admin_can_approve_application_create_missing_unit_and_prepare_first_login_reset(): void
    {
        $compound = Compound::factory()->create(['code' => 'NEXT-POINT', 'status' => 'active']);
        $building = Building::factory()->for($compound)->create(['code' => 'H']);
        $admin = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => $compound->id,
        ]);
        $admin->assignRole(UserRole::CompoundAdmin->value);

        $application = $this->postJson('/api/v1/public/owner-registration-requests', $this->validPayload($building->id))
            ->assertCreated()
            ->json('data');

        Sanctum::actingAs($admin);

        $this->patchJson("/api/v1/owner-registration-requests/{$application['id']}/approve", [
            'createUnitIfMissing' => true,
        ])
            ->assertOk()
            ->assertJsonPath('data.status', 'approved')
            ->assertJsonPath('data.login.email', 'owner@example.com')
            ->assertJsonPath('data.login.requiresPasswordReset', true);

        $user = User::query()->where('email', 'owner@example.com')->firstOrFail();
        $unit = Unit::query()->where('building_id', $building->id)->where('unit_number', 'HR-F01-F02')->firstOrFail();

        $this->assertSame(AccountStatus::Active, $user->status);
        $this->assertSame(UserRole::Resident, $user->role);
        $this->assertDatabaseHas('apartment_residents', [
            'unit_id' => $unit->id,
            'user_id' => $user->id,
            'relation_type' => UnitRelationType::Owner->value,
            'verification_status' => VerificationStatus::Verified->value,
        ]);
        $this->assertDatabaseHas('password_reset_tokens', [
            'email' => 'owner@example.com',
        ]);

        $status = $this->getJson('/api/v1/public/owner-registration-requests/status?deviceId=uat-device-1')
            ->assertOk()
            ->assertJsonPath('data.status', 'approved')
            ->assertJsonPath('data.login.email', 'owner@example.com')
            ->json('data');

        $this->assertNotEmpty($status['login']['passwordSetupToken']);
        $this->assertTrue(DB::table('password_reset_tokens')->where('email', 'owner@example.com')->exists());
    }

    public function test_public_forgot_and_reset_password_flow_updates_login_password(): void
    {
        User::factory()->create([
            'email' => 'recover@example.com',
            'password' => Hash::make('OldPassword123!'),
            'status' => AccountStatus::Active->value,
        ]);

        $token = $this->postJson('/api/v1/auth/forgot-password', [
            'email' => 'recover@example.com',
        ])
            ->assertOk()
            ->assertJsonPath('data.status', 'reset_available')
            ->json('meta.resetToken');

        $this->assertNotEmpty($token);

        $this->postJson('/api/v1/auth/reset-password', [
            'email' => 'recover@example.com',
            'token' => $token,
            'password' => 'NewPassword123!',
            'password_confirmation' => 'NewPassword123!',
        ])
            ->assertOk()
            ->assertJsonPath('data.status', 'password_reset');

        RateLimiter::clear('recover@example.com|127.0.0.1');

        $this->postJson('/api/v1/auth/login', [
            'email' => 'recover@example.com',
            'password' => 'NewPassword123!',
            'deviceName' => 'Feature test',
        ])->assertOk();
    }

    /**
     * @return array<string, mixed>
     */
    private function validPayload(string $buildingId): array
    {
        return [
            'fullNameArabic' => 'مصطفى أحمد محمد علي',
            'phone' => '201000000123',
            'email' => 'owner@example.com',
            'apartmentCode' => 'HR-F01-F02',
            'buildingId' => $buildingId,
            'deviceId' => 'uat-device-1',
            'ownerAcknowledged' => true,
            'idCardPdf' => UploadedFile::fake()->create('national-id.pdf', 64, 'application/pdf'),
            'contractPdf' => UploadedFile::fake()->create('contract.pdf', 128, 'application/pdf'),
            'handoverPdf' => UploadedFile::fake()->create('handover.pdf', 64, 'application/pdf'),
        ];
    }
}
