<?php

namespace Database\Factories\Apartments;

use App\Enums\ApartmentDocumentStatus;
use App\Enums\ApartmentDocumentType;
use App\Models\Apartments\ApartmentDocument;
use App\Models\Property\Unit;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ApartmentDocument>
 */
class ApartmentDocumentFactory extends Factory
{
    protected $model = ApartmentDocument::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'unit_id' => Unit::factory(),
            'uploaded_by_user_id' => User::factory(),
            'document_type' => ApartmentDocumentType::OwnershipProof,
            'file_path' => 'apartments/documents/'.fake()->uuid().'.pdf',
            'mime_type' => 'application/pdf',
            'size_bytes' => 1024,
            'status' => ApartmentDocumentStatus::Active,
            'version' => 1,
        ];
    }
}
