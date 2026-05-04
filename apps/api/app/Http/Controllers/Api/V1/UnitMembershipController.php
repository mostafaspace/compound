<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\VerificationStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Property\StoreUnitMembershipRequest;
use App\Http\Requests\Property\UpdateUnitMembershipRequest;
use App\Http\Resources\UnitMembershipResource;
use App\Models\Property\Unit;
use App\Models\Property\UnitMembership;
use App\Models\User;
use App\Services\CompoundContextService;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\Response;

class UnitMembershipController extends Controller
{
    /**
     * @var list<string>
     */
    private const ASSIGNABLE_RESIDENT_ROLES = [
        \App\Enums\UserRole::Resident->value,
        \App\Enums\UserRole::ResidentOwner->value,
        \App\Enums\UserRole::ResidentTenant->value,
    ];

    public function __construct(
        private readonly AuditLogger $auditLogger,
        private readonly CompoundContextService $compoundContext,
    ) {}

    public function index(Request $request, Unit $unit): AnonymousResourceCollection
    {
        $this->ensureCanAccessUnit($request, $unit);

        $memberships = $unit->memberships()
            ->with('user')
            ->orderByRaw('ends_at is null desc')
            ->latest('created_at')
            ->paginate();

        return UnitMembershipResource::collection($memberships);
    }

    public function store(StoreUnitMembershipRequest $request, Unit $unit): JsonResponse
    {
        $this->ensureCanAccessUnit($request, $unit);

        $validated = $request->validated();

        $duplicate = $unit->memberships()
            ->where('user_id', $validated['userId'])
            ->where('relation_type', $validated['relationType'])
            ->whereNull('ends_at')
            ->exists();

        abort_if($duplicate, Response::HTTP_UNPROCESSABLE_ENTITY, 'An active matching membership already exists.');

        if ($validated['isPrimary'] ?? false) {
            $unit->memberships()->where('user_id', $validated['userId'])->update(['is_primary' => false]);
        }

        $membership = $unit->memberships()->create([
            'user_id' => $validated['userId'],
            'relation_type' => $validated['relationType'],
            'starts_at' => $validated['startsAt'] ?? null,
            'ends_at' => $validated['endsAt'] ?? null,
            'is_primary' => $validated['isPrimary'] ?? false,
            'verification_status' => $validated['verificationStatus'] ?? VerificationStatus::Pending->value,
            'created_by' => $request->user()?->id,
            'resident_name' => $validated['residentName'] ?? null,
            'resident_phone' => $validated['residentPhone'] ?? null,
            'phone_public' => $validated['phonePublic'] ?? false,
            'resident_email' => $validated['residentEmail'] ?? null,
            'email_public' => $validated['emailPublic'] ?? false,
            'has_vehicle' => $validated['hasVehicle'] ?? false,
            'vehicle_plate' => $validated['vehiclePlate'] ?? null,
            'parking_spot_code' => $validated['parkingSpotCode'] ?? null,
            'garage_sticker_code' => $validated['garageStickerCode'] ?? null,
        ]);

        $this->auditLogger->record('property.unit_membership_created', actor: $request->user(), request: $request, metadata: [
            'membership_id' => $membership->id,
            'unit_id' => $unit->id,
            'user_id' => $membership->user_id,
        ]);

        return UnitMembershipResource::make($membership->load('user'))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function update(UpdateUnitMembershipRequest $request, UnitMembership $unitMembership): UnitMembershipResource
    {
        $this->ensureCanAccessMembership($request, $unitMembership);

        $validated = $request->validated();

        if (($validated['isPrimary'] ?? false) === true) {
            UnitMembership::query()
                ->where('unit_id', $unitMembership->unit_id)
                ->where('user_id', $unitMembership->user_id)
                ->whereKeyNot($unitMembership->id)
                ->update(['is_primary' => false]);
        }

        $updates = [
            'relation_type' => $validated['relationType'] ?? $unitMembership->relation_type,
            'starts_at' => array_key_exists('startsAt', $validated) ? $validated['startsAt'] : $unitMembership->starts_at,
            'ends_at' => array_key_exists('endsAt', $validated) ? $validated['endsAt'] : $unitMembership->ends_at,
            'is_primary' => array_key_exists('isPrimary', $validated) ? $validated['isPrimary'] : $unitMembership->is_primary,
            'verification_status' => $validated['verificationStatus'] ?? $unitMembership->verification_status,
            'resident_name' => array_key_exists('residentName', $validated) ? $validated['residentName'] : $unitMembership->resident_name,
            'resident_phone' => array_key_exists('residentPhone', $validated) ? $validated['residentPhone'] : $unitMembership->resident_phone,
            'phone_public' => array_key_exists('phonePublic', $validated) ? $validated['phonePublic'] : $unitMembership->phone_public,
            'resident_email' => array_key_exists('residentEmail', $validated) ? $validated['residentEmail'] : $unitMembership->resident_email,
            'email_public' => array_key_exists('emailPublic', $validated) ? $validated['emailPublic'] : $unitMembership->email_public,
            'has_vehicle' => array_key_exists('hasVehicle', $validated) ? $validated['hasVehicle'] : $unitMembership->has_vehicle,
            'vehicle_plate' => array_key_exists('vehiclePlate', $validated) ? $validated['vehiclePlate'] : $unitMembership->vehicle_plate,
            'parking_spot_code' => array_key_exists('parkingSpotCode', $validated) ? $validated['parkingSpotCode'] : $unitMembership->parking_spot_code,
            'garage_sticker_code' => array_key_exists('garageStickerCode', $validated) ? $validated['garageStickerCode'] : $unitMembership->garage_sticker_code,
        ];

        if (($updates['has_vehicle'] ?? false) === false) {
            $updates['vehicle_plate'] = null;
            $updates['parking_spot_code'] = null;
            $updates['garage_sticker_code'] = null;
        }

        $unitMembership->fill($updates)->save();

        $this->auditLogger->record('property.unit_membership_updated', actor: $request->user(), request: $request, metadata: [
            'membership_id' => $unitMembership->id,
        ]);

        return UnitMembershipResource::make($unitMembership->refresh()->load('user'));
    }

    public function end(Request $request, UnitMembership $unitMembership): UnitMembershipResource
    {
        $this->ensureCanAccessMembership($request, $unitMembership);

        $unitMembership->forceFill([
            'ends_at' => now()->toDateString(),
            'verification_status' => VerificationStatus::Expired->value,
        ])->save();

        $this->auditLogger->record('property.unit_membership_ended', actor: $request->user(), request: $request, metadata: [
            'membership_id' => $unitMembership->id,
        ]);

        return UnitMembershipResource::make($unitMembership->refresh()->load('user'));
    }

    public function unassignedUsers(Request $request): JsonResponse
    {
        /** @var User $actor */
        $actor = $request->user();
        $compoundId = $this->compoundContext->resolveManagedCompoundId($actor);

        $users = User::query()
            ->whereDoesntHave('unitMemberships', fn ($q) => $q->whereNull('ends_at'))
            ->when($compoundId !== null, fn ($q) => $q->where('compound_id', $compoundId))
            ->where(function ($query): void {
                $query
                    ->whereIn('role', self::ASSIGNABLE_RESIDENT_ROLES)
                    ->orWhereHas('roles', fn ($roles) => $roles->whereIn('name', self::ASSIGNABLE_RESIDENT_ROLES));
            })
            ->select(['id', 'name', 'email', 'phone', 'photo_url', 'created_at'])
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json(['data' => $users]);
    }

    private function ensureCanAccessMembership(Request $request, UnitMembership $unitMembership): void
    {
        $unitMembership->loadMissing('unit');
        $this->ensureCanAccessUnit($request, $unitMembership->unit);
    }

    private function ensureCanAccessUnit(Request $request, Unit $unit): void
    {
        $this->compoundContext->ensureCompoundAccess($request, $unit->compound_id);
    }
}
