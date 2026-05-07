<?php

namespace App\Http\Controllers\Api\V1\Admin\Apartments;

use App\Enums\ApartmentDocumentVersionStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Apartments\ReviewDocumentVersionRequest;
use App\Http\Resources\Apartments\ApartmentDocumentVersionResource;
use App\Models\Apartments\ApartmentDocumentVersion;
use App\Services\Apartments\ApartmentDocumentReviewService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class ApartmentDocumentReviewController extends Controller
{
    public function __construct(private readonly ApartmentDocumentReviewService $service) {}

    public function index(Request $request)
    {
        Gate::authorize('review', ApartmentDocumentVersion::class);

        return ApartmentDocumentVersionResource::collection(
            ApartmentDocumentVersion::query()
                ->where('status', ApartmentDocumentVersionStatus::PendingReview)
                ->with(['document.unit', 'uploader:id,name'])
                ->latest()
                ->paginate(50)
        );
    }

    public function update(ReviewDocumentVersionRequest $request, ApartmentDocumentVersion $version)
    {
        Gate::authorize('review', ApartmentDocumentVersion::class);

        if ($request->validated('decision') === 'approved') {
            $this->service->approve($version, $request->user(), $request->input('notes'));
        } else {
            $this->service->reject($version, $request->user(), $request->input('notes'));
        }

        return response()->noContent();
    }
}
