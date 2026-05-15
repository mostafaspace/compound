<?php

namespace App\Http\Controllers\Api\V1\Admin\Apartments;

use App\Enums\LedgerEntryType;
use App\Enums\Permission;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Resources\Apartments\ApartmentResource;
use App\Models\Property\Unit;
use App\Models\User;
use App\Services\CompoundContextService;
use App\Services\FinanceService;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ApartmentController extends Controller
{
    public function __construct(
        private readonly CompoundContextService $compoundContext,
        private readonly FinanceService $financeService,
    ) {}

    public function show(Request $request, Unit $unit): ApartmentResource
    {
        /** @var User|null $actor */
        $actor = $request->user();

        abort_unless($actor !== null, Response::HTTP_UNAUTHORIZED);
        $this->compoundContext->ensureManagedCompoundAccess($actor, $unit->compound_id);
        abort_unless($this->canViewAdminApartment($actor), Response::HTTP_FORBIDDEN);
        $this->financeService->ensureAccountForUnit($unit, $actor);

        $unit->load([
            'building',
            'floor',
            'apartmentResidents' => fn ($query) => $query->with('user'),
            'apartmentVehicles',
            'apartmentParkingSpots',
            'apartmentNotes' => fn ($query) => $query->latest()->limit(20)->with('author:id,name'),
            'apartmentDocuments' => fn ($query) => $query->where('status', 'active'),
            'unitAccount.ledgerEntries' => fn ($query) => $query
                ->whereIn('type', [LedgerEntryType::Charge->value, LedgerEntryType::Penalty->value])
                ->where('amount', '>', 0)
                ->limit(50),
        ]);

        return new ApartmentResource($unit);
    }

    private function canViewAdminApartment(User $user): bool
    {
        if ($user->isEffectiveSuperAdmin() || $user->can(Permission::ApartmentsAdmin->value)) {
            return true;
        }

        return $user->hasAnyEffectiveRole([
            UserRole::CompoundAdmin,
            UserRole::FinanceReviewer,
            UserRole::President,
        ]);
    }
}
