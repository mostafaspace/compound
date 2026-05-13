<?php

namespace App\Http\Controllers\Api\V1\Apartments;

use App\Enums\ApartmentDocumentStatus;
use App\Enums\ApartmentDocumentType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Apartments\ReplaceApartmentDocumentRequest;
use App\Http\Requests\Apartments\StoreApartmentDocumentRequest;
use App\Http\Resources\Apartments\ApartmentDocumentResource;
use App\Models\Apartments\ApartmentDocument;
use App\Models\Property\Unit;
use App\Services\Apartments\ApartmentDocumentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;

class ApartmentDocumentController extends Controller
{
    public function __construct(private readonly ApartmentDocumentService $service) {}

    private const OWNER_REGISTRATION_DOCUMENT_TYPES = [
        ApartmentDocumentType::OwnershipProof,
        ApartmentDocumentType::Lease,
        ApartmentDocumentType::IdCopy,
    ];

    public function index(Request $request, Unit $unit)
    {
        $this->authorize('view', $unit);

        return ApartmentDocumentResource::collection(
            $unit->apartmentDocuments()
                ->where('status', ApartmentDocumentStatus::Active->value)
                ->latest()
                ->get()
        );
    }

    public function store(StoreApartmentDocumentRequest $request, Unit $unit)
    {
        $this->authorize('manage', $unit);

        $type = ApartmentDocumentType::from($request->string('document_type')->toString());

        if ($this->isOwnerRegistrationDocumentType($type)) {
            $exists = $unit->apartmentDocuments()
                ->where('document_type', $type->value)
                ->where('status', ApartmentDocumentStatus::Active->value)
                ->exists();

            abort_if($exists, 422, 'Registration document already exists for this unit.');
        }

        $document = $this->service->upload(
            $unit,
            $request->user(),
            $type,
            $request->file('file')
        );

        return (new ApartmentDocumentResource($document))->response()->setStatusCode(201);
    }

    public function replace(ReplaceApartmentDocumentRequest $request, Unit $unit, ApartmentDocument $document)
    {
        abort_if($document->unit_id !== $unit->id, 404);

        $this->authorize('manage', $unit);

        abort_if(
            $this->isOwnerRegistrationDocumentType($document->document_type),
            422,
            'Registration documents cannot be replaced from the app.'
        );

        $version = $this->service->replace($document, $request->user(), $request->file('file'));

        return response()->json([
            'data' => [
                'versionId' => $version->id,
                'status' => $version->status->value,
            ],
        ], 202);
    }

    public function download(Request $request, Unit $unit, ApartmentDocument $document): mixed
    {
        abort_if($document->unit_id !== $unit->id, 404);

        $this->authorize('view', $unit);

        return Storage::disk('public')->download($document->file_path);
    }

    public function shareLink(Request $request, Unit $unit, ApartmentDocument $document): JsonResponse
    {
        abort_if($document->unit_id !== $unit->id, 404);
        $this->authorize('view', $unit);

        $url = URL::temporarySignedRoute(
            'api.v1.apartments.documents.view',
            now()->addMinutes(15),
            ['document' => $document->id],
        );

        return response()->json(['data' => [
            'url' => $url,
            'mimeType' => $document->mime_type,
            'expiresInSeconds' => 900,
        ]]);
    }

    public function view(ApartmentDocument $document)
    {
        abort_unless(request()->hasValidSignature(), 403);

        $disk = Storage::disk('public');
        if (! $disk->exists($document->file_path)) {
            $disk = Storage::disk();
            abort_unless($disk->exists($document->file_path), 404);
        }

        return $disk->response(
            $document->file_path,
            null,
            ['Content-Type' => $document->mime_type ?? 'application/pdf'],
            'inline',
        );
    }

    private function isOwnerRegistrationDocumentType(ApartmentDocumentType $type): bool
    {
        return in_array($type, self::OWNER_REGISTRATION_DOCUMENT_TYPES, true);
    }
}
