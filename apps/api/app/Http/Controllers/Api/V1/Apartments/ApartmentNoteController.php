<?php

namespace App\Http\Controllers\Api\V1\Apartments;

use App\Http\Controllers\Controller;
use App\Http\Requests\Apartments\StoreApartmentNoteRequest;
use App\Http\Resources\Apartments\ApartmentNoteResource;
use App\Models\Apartments\ApartmentNote;
use App\Models\Property\Unit;
use App\Services\Apartments\NoteService;
use Illuminate\Http\Request;

class ApartmentNoteController extends Controller
{
    public function __construct(private readonly NoteService $service) {}

    public function index(Request $request, Unit $unit)
    {
        $this->authorize('view', $unit);

        return ApartmentNoteResource::collection(
            $this->service->paginate($unit)
        );
    }

    public function store(StoreApartmentNoteRequest $request, Unit $unit)
    {
        $this->authorize('manage', $unit);

        $note = $this->service->append($unit, $request->user(), $request->string('body')->toString());

        return (new ApartmentNoteResource($note->load('author:id,name')))->response()->setStatusCode(201);
    }

    public function update(StoreApartmentNoteRequest $request, Unit $unit, ApartmentNote $note)
    {
        abort_if($note->unit_id !== $unit->id, 404);

        $this->authorize('manage', $unit);

        $updated = $this->service->update($note, $request->string('body')->toString());

        return new ApartmentNoteResource($updated->load('author:id,name'));
    }

    public function destroy(Request $request, Unit $unit, ApartmentNote $note)
    {
        abort_if($note->unit_id !== $unit->id, 404);

        $this->authorize('manage', $unit);

        $this->service->delete($note);

        return response()->noContent();
    }
}
