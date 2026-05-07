<?php

namespace Tests\Feature\Database;

use App\Models\Property\Building;
use App\Models\Property\Compound;
use App\Models\Property\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Tests\TestCase;

class ApartmentDocumentMigrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_migrated_columns_exist(): void
    {
        if (Schema::hasTable('user_documents')) {
            $this->assertTrue(Schema::hasColumn('user_documents', 'migrated_to_apartment_document_id'));
        }

        if (Schema::hasTable('owner_registration_documents')) {
            $this->assertTrue(Schema::hasColumn('owner_registration_documents', 'migrated_to_apartment_document_id'));
        }
    }

    public function test_migrates_user_documents_with_unit_scope(): void
    {
        $unit = Unit::factory()->create();
        $user = User::factory()->create();
        $documentTypeId = DB::table('document_types')->insertGetId([
            'key' => 'lease',
            'name' => 'Lease',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $sourceId = DB::table('user_documents')->insertGetId([
            'document_type_id' => $documentTypeId,
            'user_id' => $user->id,
            'unit_id' => $unit->id,
            'status' => 'submitted',
            'storage_disk' => 'public',
            'storage_path' => 'user-documents/lease.pdf',
            'original_name' => 'lease.pdf',
            'mime_type' => 'application/pdf',
            'size_bytes' => 1234,
            'checksum_sha256' => str_repeat('a', 64),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->rerunDocumentMigration();

        $source = DB::table('user_documents')->where('id', $sourceId)->first();
        $this->assertNotNull($source->migrated_to_apartment_document_id);
        $this->assertDatabaseHas('apartment_documents', [
            'id' => $source->migrated_to_apartment_document_id,
            'unit_id' => $unit->id,
            'uploaded_by_user_id' => $user->id,
            'document_type' => 'lease',
            'file_path' => 'user-documents/lease.pdf',
            'status' => 'active',
            'version' => 1,
        ]);
    }

    public function test_migrates_owner_registration_documents_with_unit_scope(): void
    {
        $compound = Compound::factory()->create();
        $building = Building::factory()->create(['compound_id' => $compound->id]);
        $unit = Unit::factory()->create([
            'compound_id' => $compound->id,
            'building_id' => $building->id,
        ]);
        $user = User::factory()->create();
        $requestId = (string) Str::ulid();
        DB::table('owner_registration_requests')->insert([
            'id' => $requestId,
            'compound_id' => $compound->id,
            'building_id' => $building->id,
            'unit_id' => $unit->id,
            'user_id' => $user->id,
            'full_name_arabic' => 'Resident Name',
            'phone' => '+201000000001',
            'email' => 'resident@example.test',
            'apartment_code' => 'A-101',
            'status' => 'approved',
            'owner_acknowledged' => true,
            'device_id' => 'device-1',
            'request_token_hash' => str_repeat('b', 64),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $sourceId = DB::table('owner_registration_documents')->insertGetId([
            'owner_registration_request_id' => $requestId,
            'type' => 'id_card',
            'original_name' => 'deed.pdf',
            'path' => 'owner-registration/deed.pdf',
            'mime_type' => 'application/pdf',
            'size_bytes' => 4321,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->rerunDocumentMigration();

        $source = DB::table('owner_registration_documents')->where('id', $sourceId)->first();
        $this->assertNotNull($source->migrated_to_apartment_document_id);
        $this->assertDatabaseHas('apartment_documents', [
            'id' => $source->migrated_to_apartment_document_id,
            'unit_id' => $unit->id,
            'uploaded_by_user_id' => $user->id,
            'document_type' => 'id_copy',
            'file_path' => 'owner-registration/deed.pdf',
            'status' => 'active',
            'version' => 1,
        ]);
    }

    private function rerunDocumentMigration(): void
    {
        $migration = require database_path('migrations/2026_05_07_000300_migrate_documents_to_apartment_scope.php');
        $migration->up();
    }
}
