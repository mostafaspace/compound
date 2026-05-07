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
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ApartmentDocumentController extends Controller
{
    public function __construct(private readonly ApartmentDocumentService $service) {}

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

        $document = $this->service->upload(
            $unit,
            $request->user(),
            ApartmentDocumentType::from($request->string('document_type')->toString()),
            $request->file('file')
        );

        return (new ApartmentDocumentResource($document))->response()->setStatusCode(201);
    }

    public function replace(ReplaceApartmentDocumentRequest $request, Unit $unit, ApartmentDocument $document)
    {
        abort_if($document->unit_id !== $unit->id, 404);

        $this->authorize('manage', $unit);

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
}
