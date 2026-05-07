<?php

namespace Tests\Feature\Database;

use App\Enums\ApartmentDocumentStatus;
use App\Enums\ApartmentDocumentVersionStatus;
use App\Models\Apartments\ApartmentDocument;
use App\Models\Apartments\ApartmentDocumentVersion;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApartmentDocumentModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_document_factory(): void
    {
        $doc = ApartmentDocument::factory()->create();

        $this->assertSame(ApartmentDocumentStatus::Active, $doc->status);
        $this->assertSame(1, $doc->version);
    }

    public function test_pending_version(): void
    {
        $doc = ApartmentDocument::factory()->create();
        $version = ApartmentDocumentVersion::factory()->create(['apartment_document_id' => $doc->id]);

        $this->assertSame(ApartmentDocumentVersionStatus::PendingReview, $version->status);
    }
}
