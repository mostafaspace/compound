<?php

namespace Tests\Feature\Services\Apartments;

use App\Enums\UnitRelationType;
use App\Enums\VerificationStatus;
use App\Models\Apartments\ApartmentResident;
use App\Models\Property\Unit;
use App\Models\User;
use App\Services\Apartments\ResidentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ResidentServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_creates_resident_with_user(): void
    {
        $unit = Unit::factory()->create();
        $actor = User::factory()->create();
        $linked = User::factory()->create();

        $resident = app(ResidentService::class)->create($unit, $actor, [
            'user_id' => $linked->id,
            'relation_type' => UnitRelationType::Resident->value,
            'is_primary' => false,
            'verification_status' => VerificationStatus::Verified->value,
        ]);

        $this->assertSame($linked->id, $resident->user_id);
        $this->assertSame($actor->id, $resident->created_by);
    }

    public function test_creates_user_less_resident(): void
    {
        $unit = Unit::factory()->create();
        $actor = User::factory()->create();

        $resident = app(ResidentService::class)->create($unit, $actor, [
            'relation_type' => UnitRelationType::Resident->value,
            'resident_name' => 'Renter Name',
            'resident_phone' => '+201000000000',
        ]);

        $this->assertNull($resident->user_id);
        $this->assertSame('Renter Name', $resident->resident_name);
    }

    public function test_uploads_photo_to_storage(): void
    {
        Storage::fake('public');
        $unit = Unit::factory()->create();
        $actor = User::factory()->create();
        $file = UploadedFile::fake()->create('photo.jpg', 64, 'image/jpeg');

        $resident = app(ResidentService::class)->create($unit, $actor, [
            'relation_type' => UnitRelationType::Resident->value,
            'resident_name' => 'X',
            'photo' => $file,
        ]);

        $this->assertNotNull($resident->photo_path);
        Storage::disk('public')->assertExists($resident->photo_path);
    }

    public function test_update_modifies_resident(): void
    {
        $resident = ApartmentResident::factory()->create();
        $actor = User::factory()->create();

        $updated = app(ResidentService::class)->update($resident, $actor, [
            'resident_name' => 'New Name',
        ]);

        $this->assertSame('New Name', $updated->resident_name);
    }

    public function test_delete_soft_deletes(): void
    {
        $resident = ApartmentResident::factory()->create();
        app(ResidentService::class)->delete($resident);
        $this->assertSoftDeleted($resident);
    }
}
