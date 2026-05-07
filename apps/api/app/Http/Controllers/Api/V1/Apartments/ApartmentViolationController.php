<?php

namespace App\Http\Controllers\Api\V1\Apartments;

use App\Http\Controllers\Controller;
use App\Http\Resources\Apartments\ApartmentViolationResource;
use App\Models\Property\Unit;
use Illuminate\Http\Request;

class ApartmentViolationController extends Controller
{
    public function index(Request $request, Unit $unit)
    {
        $this->authorize('view', $unit);

        return ApartmentViolationResource::collection(
            $unit->apartmentViolations()->with('rule')->latest()->paginate(50)
        );
    }
}
