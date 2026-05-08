<?php

namespace Tests\Feature\Api\V1;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Models\CompoundSetting;
use App\Models\Property\Compound;
use App\Models\User;
use App\Support\SettingsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

// CM-124/CM-126: Localization — /locale endpoint
class LocalizationTest extends TestCase
{
    use RefreshDatabase;

    private function makeAdmin(array $attrs = []): User
    {
        return User::factory()->create(array_merge([
            'role' => UserRole::SuperAdmin->value,
            'status' => AccountStatus::Active->value,
        ], $attrs));
    }

    private function makeResident(array $attrs = []): User
    {
        return User::factory()->create(array_merge([
            'role' => UserRole::ResidentOwner->value,
            'status' => AccountStatus::Active->value,
        ], $attrs));
    }

    // ─── Auth ─────────────────────────────────────────────────────────────────

    public function test_unauthenticated_returns_401(): void
    {
        $this->getJson('/api/v1/locale')->assertUnauthorized();
    }

    // ─── Default values ───────────────────────────────────────────────────────

    public function test_admin_gets_default_locale_settings(): void
    {
        $admin = $this->makeAdmin();
        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/v1/locale')->assertOk();

        $data = $response->json('data');
        $this->assertEquals('ar', $data['locale']);
        $this->assertEquals('Africa/Cairo', $data['timezone']);
        $this->assertEquals('EGP', $data['currency']);
        $this->assertEquals('ج.م', $data['currency_symbol']);
        $this->assertEquals('DD/MM/YYYY', $data['date_format']);
        $this->assertEquals('+20', $data['phone_country_code']);
    }

    public function test_resident_can_also_access_locale(): void
    {
        $resident = $this->makeResident();
        Sanctum::actingAs($resident);

        $this->getJson('/api/v1/locale')->assertOk();
    }

    // ─── Compound scoping ─────────────────────────────────────────────────────

    public function test_compound_admin_gets_their_compound_locale(): void
    {
        $compound = Compound::factory()->create();
        $admin = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'compound_id' => $compound->id,
        ]);
        Sanctum::actingAs($admin);

        // Override locale for this compound
        CompoundSetting::create([
            'compound_id' => $compound->id,
            'namespace' => 'localization',
            'key' => 'locale',
            'value' => 'en',
        ]);

        $response = $this->getJson('/api/v1/locale')->assertOk();

        $this->assertEquals('en', $response->json('data.locale'));
        $this->assertEquals($compound->id, $response->json('data.compoundId'));
    }

    public function test_super_admin_with_compound_header_gets_compound_locale(): void
    {
        $compound = Compound::factory()->create();
        $admin = $this->makeAdmin();
        Sanctum::actingAs($admin);

        CompoundSetting::create([
            'compound_id' => $compound->id,
            'namespace' => 'localization',
            'key' => 'timezone',
            'value' => 'Europe/London',
        ]);

        $response = $this->getJson('/api/v1/locale', ['X-Compound-Id' => $compound->id])->assertOk();

        $this->assertEquals('Europe/London', $response->json('data.timezone'));
        $this->assertEquals($compound->id, $response->json('data.compoundId'));
    }

    public function test_super_admin_without_compound_header_gets_global_defaults(): void
    {
        $admin = $this->makeAdmin();
        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/v1/locale')->assertOk();

        // compoundId is null for global super-admin context
        $this->assertNull($response->json('data.compoundId'));
        // Defaults are present
        $this->assertEquals('ar', $response->json('data.locale'));
    }

    // ─── Global override ──────────────────────────────────────────────────────

    public function test_global_override_is_applied_when_no_compound_id(): void
    {
        $admin = $this->makeAdmin();
        Sanctum::actingAs($admin);

        CompoundSetting::create([
            'compound_id' => null,
            'namespace' => 'localization',
            'key' => 'locale',
            'value' => 'en',
        ]);

        $response = $this->getJson('/api/v1/locale')->assertOk();

        $this->assertEquals('en', $response->json('data.locale'));
    }

    // ─── SettingsService: localization namespace defaults ─────────────────────

    public function test_settings_service_includes_localization_in_namespaces(): void
    {
        $this->assertContains('localization', SettingsService::namespaces());
    }

    public function test_settings_service_returns_all_localization_defaults(): void
    {
        $service = app(SettingsService::class);
        $data = $service->getNamespace('localization');

        $this->assertArrayHasKey('locale', $data);
        $this->assertArrayHasKey('timezone', $data);
        $this->assertArrayHasKey('currency', $data);
        $this->assertArrayHasKey('currency_symbol', $data);
        $this->assertArrayHasKey('date_format', $data);
        $this->assertArrayHasKey('phone_country_code', $data);
    }
}
