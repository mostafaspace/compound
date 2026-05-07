<?php

namespace Database\Factories\Apartments;

use App\Enums\ApartmentDocumentVersionStatus;
use App\Models\Apartments\ApartmentDocument;
use App\Models\Apartments\ApartmentDocumentVersion;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ApartmentDocumentVersion>
 */
class ApartmentDocumentVersionFactory extends Factory
{
    protected $model = ApartmentDocumentVersion::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'apartment_document_id' => ApartmentDocument::factory(),
            'uploaded_by' => User::factory(),
            'file_path' => 'apartments/documents/'.fake()->uuid().'.pdf',
            'mime_type' => 'application/pdf',
            'size_bytes' => 2048,
            'status' => ApartmentDocumentVersionStatus::PendingReview,
        ];
    }
}
