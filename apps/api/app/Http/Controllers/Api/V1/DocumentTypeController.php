<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Documents\DocumentTypeResource;
use App\Models\Documents\DocumentType;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class DocumentTypeController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        $documentTypes = DocumentType::query()
            ->where('is_active', true)
            ->orderByDesc('is_required_default')
            ->orderBy('name')
            ->paginate();

        return DocumentTypeResource::collection($documentTypes);
    }
}
