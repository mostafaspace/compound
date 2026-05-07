<?php

namespace App\Services\Apartments;

use App\Enums\ApartmentDocumentStatus;
use App\Enums\ApartmentDocumentType;
use App\Enums\ApartmentDocumentVersionStatus;
use App\Models\Apartments\ApartmentDocument;
use App\Models\Apartments\ApartmentDocumentVersion;
use App\Models\Property\Unit;
use App\Models\User;
use Illuminate\Http\UploadedFile;

class ApartmentDocumentService
{
    public function upload(Unit $unit, User $uploader, ApartmentDocumentType $type, UploadedFile $file): ApartmentDocument
    {
        $path = $file->store("apartments/{$unit->id}/documents", 'public');

        return ApartmentDocument::query()->create([
            'unit_id' => $unit->id,
            'uploaded_by_user_id' => $uploader->id,
            'document_type' => $type,
            'file_path' => $path,
            'mime_type' => $file->getMimeType(),
            'size_bytes' => $file->getSize(),
            'status' => ApartmentDocumentStatus::Active,
            'version' => 1,
        ]);
    }

    public function replace(ApartmentDocument $document, User $uploader, UploadedFile $file): ApartmentDocumentVersion
    {
        $path = $file->store("apartments/{$document->unit_id}/documents", 'public');

        return ApartmentDocumentVersion::query()->create([
            'apartment_document_id' => $document->id,
            'uploaded_by' => $uploader->id,
            'file_path' => $path,
            'mime_type' => $file->getMimeType(),
            'size_bytes' => $file->getSize(),
            'status' => ApartmentDocumentVersionStatus::PendingReview,
        ]);
    }

    public function archive(ApartmentDocument $document): void
    {
        $document->update(['status' => ApartmentDocumentStatus::Archived]);
    }
}
