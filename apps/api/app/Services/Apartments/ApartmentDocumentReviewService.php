<?php

namespace App\Services\Apartments;

use App\Enums\ApartmentDocumentVersionStatus;
use App\Models\Apartments\ApartmentDocumentVersion;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class ApartmentDocumentReviewService
{
    public function approve(ApartmentDocumentVersion $version, User $admin, ?string $notes = null): void
    {
        DB::transaction(function () use ($version, $admin, $notes): void {
            $document = $version->document;
            $document->update([
                'file_path' => $version->file_path,
                'mime_type' => $version->mime_type,
                'size_bytes' => $version->size_bytes,
                'version' => $document->version + 1,
            ]);

            $version->update([
                'status' => ApartmentDocumentVersionStatus::Approved,
                'reviewed_by' => $admin->id,
                'reviewed_at' => now(),
                'review_notes' => $notes,
            ]);
        });
    }

    public function reject(ApartmentDocumentVersion $version, User $admin, ?string $notes = null): void
    {
        $version->update([
            'status' => ApartmentDocumentVersionStatus::Rejected,
            'reviewed_by' => $admin->id,
            'reviewed_at' => now(),
            'review_notes' => $notes,
        ]);
    }
}
