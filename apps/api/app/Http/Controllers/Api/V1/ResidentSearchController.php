<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\CompoundContextService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ResidentSearchController extends Controller
{
    public function __construct(
        private readonly CompoundContextService $compoundContext,
    ) {}

    public function __invoke(Request $request): JsonResponse
    {
        $request->validate([
            'q' => ['required', 'string', 'min:2', 'max:100'],
        ]);

        $query = $request->input('q');

        /** @var User $actor */
        $actor = $request->user();
        $compoundId = $this->compoundContext->resolveManagedCompoundId($actor);

        $users = User::query()
            ->where(function ($q) use ($query): void {
                $q->where('name', 'like', "%{$query}%")
                    ->orWhere('email', 'like', "%{$query}%")
                    ->orWhere('phone', 'like', "%{$query}%");
            })
            ->when($compoundId !== null, fn ($q) => $q->where('compound_id', $compoundId))
            ->orWhereHas('apartmentResidents', function ($q) use ($query, $compoundId): void {
                $q->whereHas('unit', function ($uq) use ($query, $compoundId): void {
                    $uq->where('unit_number', 'like', "%{$query}%")
                        ->when($compoundId !== null, fn ($q2) => $q2->where('compound_id', $compoundId));
                });
            })
            ->select(['id', 'name', 'email', 'phone', 'photo_url'])
            ->with(['units:id,unit_number,building_id', 'units.building:id,name'])
            ->limit(20)
            ->get();

        return response()->json([
            'data' => $users->map(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'phone' => $u->phone,
                'photoUrl' => $u->photo_url,
                'units' => $u->units->map(fn ($unit) => [
                    'id' => $unit->id,
                    'unitNumber' => $unit->unit_number,
                    'buildingName' => $unit->building?->name,
                ]),
            ]),
        ]);
    }
}
