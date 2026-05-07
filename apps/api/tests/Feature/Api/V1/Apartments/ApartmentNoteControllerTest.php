<?php

namespace Tests\Feature\Api\V1\Apartments;

use App\Enums\VerificationStatus;
use App\Models\Apartments\ApartmentNote;
use App\Models\Apartments\ApartmentResident;
use App\Models\Property\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ApartmentNoteControllerTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private Unit $unit;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->unit = Unit::factory()->create();

        ApartmentResident::factory()->create([
            'unit_id' => $this->unit->id,
            'user_id' => $this->user->id,
            'verification_status' => VerificationStatus::Verified,
        ]);

        Sanctum::actingAs($this->user);
    }

    public function test_member_can_list_notes(): void
    {
        ApartmentNote::factory()->create([
            'unit_id' => $this->unit->id,
            'body' => 'Gate remote battery replaced.',
        ]);

        $this->getJson("/api/v1/apartments/{$this->unit->id}/notes")
            ->assertOk()
            ->assertJsonPath('data.0.body', 'Gate remote battery replaced.');
    }

    public function test_member_can_append_note(): void
    {
        $this->postJson("/api/v1/apartments/{$this->unit->id}/notes", [
            'body' => 'Window seal inspection requested.',
        ])
            ->assertCreated()
            ->assertJsonPath('data.body', 'Window seal inspection requested.')
            ->assertJsonPath('data.authorId', $this->user->id);
    }

    public function test_non_member_blocked(): void
    {
        $unit = Unit::factory()->create();

        $this->postJson("/api/v1/apartments/{$unit->id}/notes", [
            'body' => 'Nope.',
        ])->assertForbidden();
    }
}
