<?php

namespace Database\Seeders;

use App\Models\Documents\DocumentType;
use Illuminate\Database\Seeder;

class DocumentTypeSeeder extends Seeder
{
    /**
     * Seed default verification document types.
     */
    public function run(): void
    {
        collect([
            [
                'key' => 'ownership_contract',
                'name' => 'Ownership contract',
                'description' => 'Proof of unit ownership for owners and association eligibility.',
                'is_required_default' => true,
            ],
            [
                'key' => 'rental_contract',
                'name' => 'Rental contract',
                'description' => 'Proof of rental/occupancy for tenants and residents.',
                'is_required_default' => false,
            ],
            [
                'key' => 'national_id',
                'name' => 'National ID or passport',
                'description' => 'Identity document used by the verification panel.',
                'is_required_default' => true,
            ],
            [
                'key' => 'occupancy_proof',
                'name' => 'Occupancy proof',
                'description' => 'Additional proof that links the applicant to the unit.',
                'is_required_default' => false,
            ],
        ])->each(fn (array $type): DocumentType => DocumentType::query()->firstOrCreate(
            ['key' => $type['key']],
            [
                ...$type,
                'allowed_mime_types' => ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
                'max_file_size_kb' => 10240,
                'is_active' => true,
            ],
        ));
    }
}
