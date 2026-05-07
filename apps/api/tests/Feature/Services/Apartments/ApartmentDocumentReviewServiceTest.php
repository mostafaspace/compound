<?php

namespace Tests\Feature\Services\Apartments;

use App\Enums\ApartmentDocumentVersionStatus;
use App\Models\Apartments\ApartmentDocument;
use App\Models\Apartments\ApartmentDocumentVersion;
use App\Models\User;
use App\Services\Apartments\ApartmentDocumentReviewService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApartmentDocumentReviewServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_approve_swaps_versions(): void
    {
        $doc = ApartmentDocument::factory()->create([
            'file_path' => 'old/path.pdf',
            'version' => 1,
        ]);
        $version = ApartmentDocumentVersion::factory()->create([
            'apartment_document_id' => $doc->id,
            'file_path' => 'new/path.pdf',
        ]);
        $admin = User::factory()->create();

        app(ApartmentDocumentReviewService::class)->approve($version, $admin, 'looks good');

        $version->refresh();
        $doc->refresh();
        $this->assertSame(ApartmentDocumentVersionStatus::Approved, $version->status);
        $this->assertSame('new/path.pdf', $doc->file_path);
        $this->assertSame(2, $doc->version);
    }

    public function test_reject_keeps_active_unchanged(): void
    {
        $doc = ApartmentDocument::factory()->create(['file_path' => 'old.pdf']);
        $version = ApartmentDocumentVersion::factory()->create(['apartment_document_id' => $doc->id]);

        app(ApartmentDocumentReviewService::class)->reject($version, User::factory()->create(), 'blurry');

        $version->refresh();
        $this->assertSame(ApartmentDocumentVersionStatus::Rejected, $version->status);
        $this->assertSame('old.pdf', $doc->fresh()->file_path);
    }
}
