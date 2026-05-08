<?php

namespace Tests\Feature\Api\V1;

use App\Enums\UserRole;
use App\Models\Documents\DocumentType;
use App\Models\Documents\UserDocument;
use App\Models\Property\Building;
use App\Models\Property\Compound;
use App\Models\Property\Unit;
use App\Models\User;
use App\Models\UserScopeAssignment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class DocumentScopingTest extends TestCase
{
    use RefreshDatabase;

    public function test_building_scoped_staff_cannot_access_documents_from_other_buildings(): void
    {
        Storage::fake('local');

        $compound = Compound::factory()->create();
        $buildingA = Building::factory()->create(['compound_id' => $compound->id]);
        $buildingB = Building::factory()->create(['compound_id' => $compound->id]);

        $unitA = Unit::factory()->create(['compound_id' => $compound->id, 'building_id' => $buildingA->id]);
        $unitB = Unit::factory()->create(['compound_id' => $compound->id, 'building_id' => $buildingB->id]);

        $residentB = User::factory()->create();
        $docType = DocumentType::query()->create([
            'key' => 'id_card',
            'name' => 'ID Card',
            'is_active' => true,
        ]);

        // Setup document for Resident B in Building B
        $documentB = UserDocument::query()->create([
            'document_type_id' => $docType->id,
            'user_id' => $residentB->id,
            'unit_id' => $unitB->id,
            'status' => 'submitted',
            'storage_disk' => 'local',
            'storage_path' => 'docs/b.pdf',
            'original_name' => 'b.pdf',
            'mime_type' => 'application/pdf',
            'size_bytes' => 1024,
            'checksum_sha256' => 'fake',
        ]);

        // Setup Staff scoped ONLY to Building A
        $staff = User::factory()->create(['role' => UserRole::CompoundAdmin]);
        UserScopeAssignment::create([
            'user_id' => $staff->id,
            'role_name' => 'compound_admin',
            'scope_type' => 'building',
            'scope_id' => $buildingA->id,
        ]);

        $this->actingAs($staff);

        // 1. Verify index doesn't include Building B document
        $response = $this->getJson('/api/v1/documents');
        $response->assertOk();
        $response->assertJsonMissing(['id' => $documentB->id]);

        // 2. Verify download of Building B document is Forbidden
        $response = $this->getJson("/api/v1/documents/{$documentB->id}/download");
        $response->assertForbidden();
    }
}
