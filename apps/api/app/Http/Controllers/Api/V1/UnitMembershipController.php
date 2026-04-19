<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\VerificationStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Property\StoreUnitMembershipRequest;
use App\Http\Requests\Property\UpdateUnitMembershipRequest;
use App\Http\Resources\UnitMembershipResource;
use App\Models\Property\Unit;
use App\Models\Property\UnitMembership;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\Response;

class UnitMembershipController extends Controller
{
    public function __construct(private readonly AuditLogger $auditLogger) {}

    public function index(Unit $unit): AnonymousResourceCollection
    {
        $memberships = $unit->memberships()
            ->with('user')
            ->orderByRaw('ends_at is null desc')
            ->latest('created_at')
            ->paginate();

        return UnitMembershipResource::collection($memberships);
    }

    public function store(StoreUnitMembershipRequest $request, Unit $unit): JsonResponse
    {
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
        $validated = $request->validated();

        if (($validated['isPrimary'] ?? false) === true) {
            UnitMembership::query()
                ->where('unit_id', $unitMembership->unit_id)
                ->where('user_id', $unitMembership->user_id)
                ->whereKeyNot($unitMembership->id)
                ->update(['is_primary' => false]);
        }

        $unitMembership->fill([
            'relation_type' => $validated['relationType'] ?? $unitMembership->relation_type,
            'starts_at' => array_key_exists('startsAt', $validated) ? $validated['startsAt'] : $unitMembership->starts_at,
            'ends_at' => array_key_exists('endsAt', $validated) ? $validated['endsAt'] : $unitMembership->ends_at,
            'is_primary' => array_key_exists('isPrimary', $validated) ? $validated['isPrimary'] : $unitMembership->is_primary,
            'verification_status' => $validated['verificationStatus'] ?? $unitMembership->verification_status,
        ])->save();

        $this->auditLogger->record('property.unit_membership_updated', actor: $request->user(), request: $request, metadata: [
            'membership_id' => $unitMembership->id,
        ]);

        return UnitMembershipResource::make($unitMembership->refresh()->load('user'));
    }

    public function end(UnitMembership $unitMembership): UnitMembershipResource
    {
        $unitMembership->forceFill([
            'ends_at' => now()->toDateString(),
            'verification_status' => VerificationStatus::Expired->value,
        ])->save();

        $this->auditLogger->record('property.unit_membership_ended', actor: request()->user(), request: request(), metadata: [
            'membership_id' => $unitMembership->id,
        ]);

        return UnitMembershipResource::make($unitMembership->refresh()->load('user'));
    }
}
