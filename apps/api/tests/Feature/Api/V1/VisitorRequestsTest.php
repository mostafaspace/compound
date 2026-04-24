<?php

namespace Tests\Feature\Api\V1;

use App\Enums\AccountStatus;
use App\Enums\UnitRelationType;
use App\Enums\UserRole;
use App\Enums\VerificationStatus;
use App\Enums\VisitorPassStatus;
use App\Enums\VisitorRequestStatus;
use App\Enums\VisitorScanResult;
use App\Models\Notification;
use App\Models\Property\Building;
use App\Models\Property\Compound;
use App\Models\Property\Unit;
use App\Models\User;
use App\Models\Visitors\VisitorRequest;
use App\Models\Visitors\VisitorScanLog;
use Carbon\CarbonInterface;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class VisitorRequestsTest extends TestCase
{
    use RefreshDatabase;

    public function test_verified_resident_can_create_visitor_request_and_qr_pass(): void
    {
        [$resident, $unit] = $this->residentWithVerifiedUnit();
        User::factory()->create([
            'role' => UserRole::SecurityGuard->value,
            'status' => AccountStatus::Active->value,
        ]);

        Sanctum::actingAs($resident);

        $response = $this->postJson('/api/v1/visitor-requests', [
            'unitId' => $unit->id,
            'visitorName' => 'Omar Guest',
            'visitorPhone' => '+201000000111',
            'vehiclePlate' => 'ABC-123',
            'visitStartsAt' => now()->addMinutes(10)->toIso8601String(),
            'visitEndsAt' => now()->addHours(2)->toIso8601String(),
            'notes' => 'Expected at the main gate.',
        ])
            ->assertCreated()
            ->assertJsonPath('data.hostUserId', $resident->id)
            ->assertJsonPath('data.unitId', $unit->id)
            ->assertJsonPath('data.visitorName', 'Omar Guest')
            ->assertJsonPath('data.status', VisitorRequestStatus::QrIssued->value)
            ->assertJsonPath('data.pass.status', VisitorPassStatus::Active->value);

        $this->assertIsString($response->json('data.qrToken'));
        $this->assertDatabaseHas('visitor_requests', [
            'host_user_id' => $resident->id,
            'unit_id' => $unit->id,
            'visitor_name' => 'Omar Guest',
            'status' => VisitorRequestStatus::QrIssued->value,
        ]);
        $this->assertDatabaseHas('visitor_passes', [
            'visitor_request_id' => $response->json('data.id'),
            'status' => VisitorPassStatus::Active->value,
            'uses_count' => 0,
        ]);
        $this->assertDatabaseHas('visitor_event_logs', [
            'visitor_request_id' => $response->json('data.id'),
            'event_type' => 'pass_issued',
            'to_status' => VisitorRequestStatus::QrIssued->value,
        ]);
        $this->assertDatabaseHas('notifications', [
            'category' => 'visitors',
            'title' => 'Visitor pass issued',
        ]);
    }

    public function test_visitor_request_notifications_are_limited_to_request_compound_security(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();
        User::factory()->create([
            'role' => UserRole::SecurityGuard->value,
            'compound_id' => $compoundA->id,
            'status' => AccountStatus::Active->value,
        ]);
        $securityB = User::factory()->create([
            'role' => UserRole::SecurityGuard->value,
            'compound_id' => $compoundB->id,
            'status' => AccountStatus::Active->value,
        ]);
        $resident = User::factory()->create([
            'role' => UserRole::ResidentOwner->value,
            'status' => AccountStatus::Active->value,
        ]);
        $buildingB = Building::factory()->for($compoundB)->create();
        $unitB = Unit::factory()->for($compoundB)->for($buildingB)->create(['floor_id' => null]);
        $unitB->memberships()->create([
            'user_id' => $resident->id,
            'relation_type' => UnitRelationType::Owner->value,
            'starts_at' => now()->toDateString(),
            'verification_status' => VerificationStatus::Verified->value,
        ]);

        Sanctum::actingAs($resident);

        $this->postJson('/api/v1/visitor-requests', [
            'unitId' => $unitB->id,
            'visitorName' => 'Scoped Guest',
            'visitStartsAt' => now()->addMinutes(10)->toIso8601String(),
            'visitEndsAt' => now()->addHours(2)->toIso8601String(),
        ])->assertCreated();

        $this->assertDatabaseHas('notifications', [
            'user_id' => $securityB->id,
            'category' => 'visitors',
            'title' => 'Visitor pass issued',
        ]);
        $this->assertSame(1, Notification::query()->where('category', 'visitors')->where('title', 'Visitor pass issued')->count());
    }

    public function test_resident_cannot_create_visitor_request_for_unverified_unit(): void
    {
        $resident = User::factory()->create([
            'role' => UserRole::ResidentOwner->value,
            'status' => AccountStatus::Active->value,
        ]);
        $unit = $this->makeUnit();

        $unit->memberships()->create([
            'user_id' => $resident->id,
            'relation_type' => UnitRelationType::Owner->value,
            'starts_at' => now()->toDateString(),
            'is_primary' => true,
            'verification_status' => VerificationStatus::Pending->value,
            'created_by' => null,
        ]);

        Sanctum::actingAs($resident);

        $this->postJson('/api/v1/visitor-requests', [
            'unitId' => $unit->id,
            'visitorName' => 'Blocked Guest',
            'visitStartsAt' => now()->addMinutes(10)->toIso8601String(),
            'visitEndsAt' => now()->addHours(2)->toIso8601String(),
        ])->assertForbidden();
    }

    public function test_security_can_validate_arrive_allow_and_complete_valid_pass(): void
    {
        [$resident, $unit] = $this->residentWithVerifiedUnit();
        $security = User::factory()->create([
            'role' => UserRole::SecurityGuard->value,
            'status' => AccountStatus::Active->value,
        ]);
        $token = $this->createVisitorPassFor($resident, $unit);
        $visitorRequest = VisitorRequest::query()->firstOrFail();

        Sanctum::actingAs($security);

        $this->postJson('/api/v1/visitor-requests/validate-pass', ['token' => $token])
            ->assertOk()
            ->assertJsonPath('data.result', VisitorScanResult::Valid->value)
            ->assertJsonPath('data.visitorRequest.id', $visitorRequest->id);

        $this->postJson("/api/v1/visitor-requests/{$visitorRequest->id}/arrive")
            ->assertOk()
            ->assertJsonPath('data.status', VisitorRequestStatus::Arrived->value);

        $this->postJson("/api/v1/visitor-requests/{$visitorRequest->id}/allow")
            ->assertOk()
            ->assertJsonPath('data.status', VisitorRequestStatus::Allowed->value)
            ->assertJsonPath('data.pass.status', VisitorPassStatus::Used->value)
            ->assertJsonPath('data.pass.usesCount', 1);

        $this->postJson('/api/v1/visitor-requests/validate-pass', ['token' => $token])
            ->assertOk()
            ->assertJsonPath('data.result', VisitorScanResult::AlreadyUsed->value);

        $this->postJson("/api/v1/visitor-requests/{$visitorRequest->id}/complete")
            ->assertOk()
            ->assertJsonPath('data.status', VisitorRequestStatus::Completed->value);

        $this->assertDatabaseHas('visitor_scan_logs', [
            'visitor_request_id' => $visitorRequest->id,
            'scanned_by' => $security->id,
            'result' => VisitorScanResult::Valid->value,
        ]);
        $this->assertDatabaseHas('visitor_scan_logs', [
            'visitor_request_id' => $visitorRequest->id,
            'result' => VisitorScanResult::AlreadyUsed->value,
        ]);
        $this->assertDatabaseHas('visitor_event_logs', [
            'visitor_request_id' => $visitorRequest->id,
            'event_type' => 'completed',
            'to_status' => VisitorRequestStatus::Completed->value,
        ]);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $resident->id,
            'category' => 'visitors',
            'title' => 'Visitor allowed',
        ]);
    }

    public function test_scoped_security_cannot_scan_or_process_other_compound_visitor_request(): void
    {
        $compoundA = Compound::factory()->create();
        $compoundB = Compound::factory()->create();
        $securityA = User::factory()->create([
            'role' => UserRole::SecurityGuard->value,
            'compound_id' => $compoundA->id,
            'status' => AccountStatus::Active->value,
        ]);
        $resident = User::factory()->create([
            'role' => UserRole::ResidentOwner->value,
            'status' => AccountStatus::Active->value,
        ]);
        $buildingB = Building::factory()->for($compoundB)->create();
        $unitB = Unit::factory()->for($compoundB)->for($buildingB)->create(['floor_id' => null]);
        $unitB->memberships()->create([
            'user_id' => $resident->id,
            'relation_type' => UnitRelationType::Owner->value,
            'starts_at' => now()->toDateString(),
            'verification_status' => VerificationStatus::Verified->value,
        ]);
        $token = $this->createVisitorPassFor($resident, $unitB);
        $visitorRequest = VisitorRequest::query()->firstOrFail();

        Sanctum::actingAs($securityA);

        $this->postJson('/api/v1/visitor-requests/validate-pass', ['token' => $token])->assertForbidden();
        $this->postJson("/api/v1/visitor-requests/{$visitorRequest->id}/arrive")->assertForbidden();
        $this->postJson("/api/v1/visitor-requests/{$visitorRequest->id}/deny", [
            'reason' => 'Should not be allowed cross-compound.',
        ])->assertForbidden();

        $this->assertDatabaseHas('visitor_requests', [
            'id' => $visitorRequest->id,
            'status' => VisitorRequestStatus::QrIssued->value,
        ]);
    }

    public function test_scan_results_cover_expired_cancelled_denied_and_not_found_tokens(): void
    {
        [$resident, $unit] = $this->residentWithVerifiedUnit();
        $security = User::factory()->create([
            'role' => UserRole::SecurityGuard->value,
            'status' => AccountStatus::Active->value,
        ]);

        Sanctum::actingAs($security);

        $expiredToken = $this->createVisitorPassFor($resident, $unit, now()->subHours(3), now()->subHour());
        Sanctum::actingAs($security);
        $this->postJson('/api/v1/visitor-requests/validate-pass', ['token' => $expiredToken])
            ->assertOk()
            ->assertJsonPath('data.result', VisitorScanResult::Expired->value);

        [$cancelledToken, $cancelledRequest] = $this->createVisitorPassPayloadFor($resident, $unit);
        Sanctum::actingAs($security);
        $this->postJson("/api/v1/visitor-requests/{$cancelledRequest->id}/cancel", [
            'reason' => 'Resident cancelled before arrival.',
        ])->assertOk();
        $this->postJson('/api/v1/visitor-requests/validate-pass', ['token' => $cancelledToken])
            ->assertOk()
            ->assertJsonPath('data.result', VisitorScanResult::Cancelled->value);

        [$deniedToken, $deniedRequest] = $this->createVisitorPassPayloadFor($resident, $unit);
        Sanctum::actingAs($security);
        $this->postJson("/api/v1/visitor-requests/{$deniedRequest->id}/deny", [
            'reason' => 'Visitor identity did not match the pass.',
        ])->assertOk();
        $this->postJson('/api/v1/visitor-requests/validate-pass', ['token' => $deniedToken])
            ->assertOk()
            ->assertJsonPath('data.result', VisitorScanResult::Denied->value);

        $this->postJson('/api/v1/visitor-requests/validate-pass', ['token' => str_repeat('x', 64)])
            ->assertOk()
            ->assertJsonPath('data.result', VisitorScanResult::NotFound->value)
            ->assertJsonPath('data.visitorRequest', null);

        $this->assertDatabaseHas('visitor_requests', [
            'id' => $cancelledRequest->id,
            'decision_reason' => 'Resident cancelled before arrival.',
        ]);
        $this->assertDatabaseHas('visitor_requests', [
            'id' => $deniedRequest->id,
            'decision_reason' => 'Visitor identity did not match the pass.',
        ]);
        $this->assertSame(4, VisitorScanLog::query()->count());
    }

    public function test_security_routes_reject_resident_accounts(): void
    {
        [$resident, $unit] = $this->residentWithVerifiedUnit();
        $token = $this->createVisitorPassFor($resident, $unit);
        $visitorRequest = VisitorRequest::query()->firstOrFail();

        Sanctum::actingAs($resident);

        $this->postJson('/api/v1/visitor-requests/validate-pass', ['token' => $token])
            ->assertForbidden();
        $this->postJson("/api/v1/visitor-requests/{$visitorRequest->id}/allow")
            ->assertForbidden();
    }

    /**
     * @return array{0: User, 1: Unit}
     */
    private function residentWithVerifiedUnit(): array
    {
        $admin = User::factory()->create([
            'role' => UserRole::CompoundAdmin->value,
            'status' => AccountStatus::Active->value,
        ]);
        $resident = User::factory()->create([
            'role' => UserRole::ResidentOwner->value,
            'status' => AccountStatus::Active->value,
        ]);
        $unit = $this->makeUnit();

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

    private function makeUnit(): Unit
    {
        $compound = Compound::factory()->create();
        $building = Building::factory()->for($compound)->create();

        return Unit::factory()
            ->for($compound)
            ->for($building)
            ->create([
                'floor_id' => null,
                'unit_number' => 'A-101',
            ]);
    }

    private function createVisitorPassFor(
        User $resident,
        Unit $unit,
        ?CarbonInterface $startsAt = null,
        ?CarbonInterface $endsAt = null,
    ): string {
        return $this->createVisitorPassPayloadFor($resident, $unit, $startsAt, $endsAt)[0];
    }

    /**
     * @return array{0: string, 1: VisitorRequest}
     */
    private function createVisitorPassPayloadFor(
        User $resident,
        Unit $unit,
        ?CarbonInterface $startsAt = null,
        ?CarbonInterface $endsAt = null,
    ): array {
        Sanctum::actingAs($resident);

        $response = $this->postJson('/api/v1/visitor-requests', [
            'unitId' => $unit->id,
            'visitorName' => 'Layla Guest',
            'visitorPhone' => '+201000000222',
            'visitStartsAt' => ($startsAt ?? now()->subMinutes(10))->toIso8601String(),
            'visitEndsAt' => ($endsAt ?? now()->addHours(2))->toIso8601String(),
        ])->assertCreated();

        $token = $response->json('data.qrToken');
        $this->assertIsString($token);

        $visitorRequest = VisitorRequest::query()->findOrFail($response->json('data.id'));

        return [$token, $visitorRequest];
    }
}
