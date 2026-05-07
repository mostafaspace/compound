<?php

namespace Tests\Feature\Services\Apartments;

use App\Enums\ApartmentDocumentStatus;
use App\Enums\ApartmentDocumentType;
use App\Enums\ApartmentDocumentVersionStatus;
use App\Models\Apartments\ApartmentDocument;
use App\Models\Property\Unit;
use App\Models\User;
use App\Services\Apartments\ApartmentDocumentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ApartmentDocumentServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_initial_upload_is_active(): void
    {
        Storage::fake('public');
        $unit = Unit::factory()->create();
        $user = User::factory()->create();
        $file = UploadedFile::fake()->create('lease.pdf', 100, 'application/pdf');

        $doc = app(ApartmentDocumentService::class)->upload(
            $unit,
            $user,
            ApartmentDocumentType::Lease,
            $file,
        );

        $this->assertSame(ApartmentDocumentStatus::Active, $doc->status);
        $this->assertSame(1, $doc->version);
    }

    public function test_replace_creates_pending_version_keeps_active(): void
    {
        Storage::fake('public');
        $doc = ApartmentDocument::factory()->create();
        $user = User::factory()->create();
        $file = UploadedFile::fake()->create('updated.pdf', 100, 'application/pdf');

        $version = app(ApartmentDocumentService::class)->replace($doc, $user, $file);

        $this->assertSame(ApartmentDocumentVersionStatus::PendingReview, $version->status);
        $this->assertSame(ApartmentDocumentStatus::Active, $doc->fresh()->status);
    }
}
