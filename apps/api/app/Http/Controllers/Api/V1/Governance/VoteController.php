<?php

namespace App\Http\Controllers\Api\V1\Governance;

use App\Enums\UserRole;
use App\Enums\VoteEligibility;
use App\Enums\VoteScope;
use App\Enums\VoteStatus;
use App\Enums\VoteType;
use App\Http\Controllers\Controller;
use App\Http\Resources\Governance\VoteResource;
use App\Models\Governance\Vote;
use App\Models\Governance\VoteParticipation;
use App\Models\User;
use App\Services\CompoundContextService;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class VoteController extends Controller
{
    public function __construct(
        private readonly CompoundContextService $compoundContext,
        private readonly AuditLogger $auditLogger,
    ) {}

    /**
     * @var list<UserRole>
     */
    private const ADMIN_ROLES = [
        UserRole::SuperAdmin,
        UserRole::CompoundAdmin,
        UserRole::BoardMember,
        UserRole::FinanceReviewer,
        UserRole::SupportAgent,
    ];

    private function isAdmin(User $user): bool
    {
        return $user->hasAnyEffectiveRole(self::ADMIN_ROLES);
    }

    /**
     * List votes. Admin sees all (with optional status filter); residents see active ones in their compound.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'status' => ['nullable', 'string', Rule::in(array_column(VoteStatus::cases(), 'value'))],
            'type' => ['nullable', 'string', Rule::in(array_column(VoteType::cases(), 'value'))],
            'compoundId' => ['nullable', 'string'],
        ]);

        $user = $request->user();
        $isAdmin = $this->isAdmin($user);

        $query = Vote::query()->with('options');

        if (! $isAdmin) {
            // Residents only see active votes in their verified compounds
            $query->where('status', VoteStatus::Active->value);
            $verifiedCompoundIds = $user->apartmentResidents()
                ->activeForAccess()
                ->with('unit:id,compound_id')
                ->get()
                ->pluck('unit.compound_id')
                ->unique()
                ->filter()
                ->values();
            $query->whereIn('compound_id', $verifiedCompoundIds);
        } else {
            $managedCompoundId = $this->compoundContext->resolveManagedCompoundId($user);

            if (isset($validated['status'])) {
                $query->where('status', $validated['status']);
            }
            if ($user->isEffectiveSuperAdmin()) {
                if (isset($validated['compoundId'])) {
                    $query->where('compound_id', $validated['compoundId']);
                }
            } else {
                abort_unless($managedCompoundId !== null, 403);
                if (isset($validated['compoundId']) && $validated['compoundId'] !== $managedCompoundId) {
                    abort(403);
                }

                $query->where('compound_id', $managedCompoundId);
            }
        }

        if (isset($validated['type'])) {
            $query->where('type', $validated['type']);
        }

        $votes = $query->orderByDesc('created_at')->paginate(50);

        return VoteResource::collection($votes);
    }

    /**
     * Create a vote (admin only).
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'compoundId' => ['required', 'string', 'exists:compounds,id'],
            'buildingId' => ['nullable', 'string', 'exists:buildings,id'],
            'type' => ['required', 'string', Rule::in(array_column(VoteType::cases(), 'value'))],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'scope' => ['nullable', 'string', Rule::in(array_column(VoteScope::cases(), 'value'))],
            'eligibility' => ['nullable', 'string', Rule::in(array_column(VoteEligibility::cases(), 'value'))],
            'requiresDocCompliance' => ['nullable', 'boolean'],
            'isAnonymous' => ['nullable', 'boolean'],
            'startsAt' => ['nullable', 'date', 'before:endsAt'],
            'endsAt' => ['nullable', 'date', 'after:now'],
            'options' => ['required', 'array', 'min:2'],
            'options.*.label' => ['required', 'string', 'max:255'],
        ]);
        /** @var User $actor */
        $actor = $request->user();
        $this->ensureAdminCanManageCompound($actor, $validated['compoundId']);

        $managedCompoundId = $this->compoundContext->resolveManagedCompoundId($actor);

        if (! $actor->isEffectiveSuperAdmin()) {
            abort_unless($managedCompoundId !== null, 403);
            $validated['compoundId'] = $managedCompoundId;
        }

        $vote = Vote::create([
            'compound_id' => $validated['compoundId'],
            'building_id' => $validated['buildingId'] ?? null,
            'type' => $validated['type'],
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'status' => VoteStatus::Draft->value,
            'scope' => $validated['scope'] ?? VoteScope::Compound->value,
            'eligibility' => $validated['eligibility'] ?? VoteEligibility::OwnersOnly->value,
            'requires_doc_compliance' => $validated['requiresDocCompliance'] ?? false,
            'is_anonymous' => $validated['isAnonymous'] ?? false,
            'starts_at' => $validated['startsAt'] ?? null,
            'ends_at' => $validated['endsAt'] ?? null,
            'created_by' => $actor->id,
        ]);

        foreach ($validated['options'] as $index => $optionData) {
            $vote->options()->create([
                'label' => $optionData['label'],
                'sort_order' => $index,
            ]);
        }

        $this->auditLogger->record(
            'governance.votes.created',
            actor: $actor,
            request: $request,
            auditableType: Vote::class,
            auditableId: (string) $vote->id,
            metadata: [
                'compound_id' => $vote->compound_id,
                'type' => $vote->type,
                'option_count' => count($validated['options']),
            ],
        );

        return response()->json(
            ['data' => VoteResource::make($vote->load('options'))->resolve()],
            201,
        );
    }

    /**
     * Show a single vote. Admins see full tally; anonymous votes hide individual voter data.
     */
    public function show(Request $request, Vote $vote): VoteResource
    {
        $this->ensureViewerCanAccessVote($request, $vote);
        $vote->load(['options', 'participations']);

        return VoteResource::make($vote);
    }

    /**
     * Update a draft vote (admin only).
     */
    public function update(Request $request, Vote $vote): VoteResource
    {
        /** @var User $actor */
        $actor = $request->user();
        $this->ensureAdminCanManageVote($actor, $vote);

        if ($vote->status !== VoteStatus::Draft->value) {
            abort(422, 'Only draft votes can be edited.');
        }

        $validated = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'scope' => ['sometimes', 'string', Rule::in(array_column(VoteScope::cases(), 'value'))],
            'eligibility' => ['sometimes', 'string', Rule::in(array_column(VoteEligibility::cases(), 'value'))],
            'requiresDocCompliance' => ['sometimes', 'boolean'],
            'isAnonymous' => ['sometimes', 'boolean'],
            'startsAt' => ['nullable', 'date', 'before:endsAt'],
            'endsAt' => ['nullable', 'date', 'after:now'],
            'options' => ['sometimes', 'array', 'min:2'],
            'options.*.label' => ['required_with:options', 'string', 'max:255'],
        ]);

        $vote->update(array_filter([
            'title' => $validated['title'] ?? null,
            'description' => $validated['description'] ?? null,
            'scope' => $validated['scope'] ?? null,
            'eligibility' => $validated['eligibility'] ?? null,
            'requires_doc_compliance' => $validated['requiresDocCompliance'] ?? null,
            'is_anonymous' => $validated['isAnonymous'] ?? null,
            'starts_at' => $validated['startsAt'] ?? null,
            'ends_at' => $validated['endsAt'] ?? null,
        ], fn ($v) => ! is_null($v)));

        if (isset($validated['options'])) {
            $vote->options()->delete();
            foreach ($validated['options'] as $index => $optionData) {
                $vote->options()->create([
                    'label' => $optionData['label'],
                    'sort_order' => $index,
                ]);
            }
        }

        $this->auditLogger->record(
            'governance.votes.updated',
            actor: $actor,
            request: $request,
            auditableType: Vote::class,
            auditableId: (string) $vote->id,
            metadata: [
                'compound_id' => $vote->compound_id,
                'updated_fields' => array_keys($validated),
            ],
        );

        return VoteResource::make($vote->load('options'));
    }

    /**
     * Activate (open) a vote.
     */
    public function activate(Request $request, Vote $vote): VoteResource
    {
        /** @var User $actor */
        $actor = $request->user();
        $this->ensureAdminCanManageVote($actor, $vote);

        if ($vote->status !== VoteStatus::Draft->value) {
            abort(422, 'Only draft votes can be activated.');
        }

        if ($vote->options()->count() < 2) {
            abort(422, 'A vote must have at least 2 options before it can be activated.');
        }

        $vote->update(['status' => VoteStatus::Active->value]);

        $this->auditLogger->record(
            'governance.votes.activated',
            actor: $actor,
            request: $request,
            auditableType: Vote::class,
            auditableId: (string) $vote->id,
            metadata: [
                'compound_id' => $vote->compound_id,
                'status' => $vote->status,
            ],
        );

        return VoteResource::make($vote->load('options'));
    }

    /**
     * Close a vote (stop accepting new votes).
     */
    public function close(Request $request, Vote $vote): VoteResource
    {
        /** @var User $actor */
        $actor = $request->user();
        $this->ensureAdminCanManageVote($actor, $vote);

        if ($vote->status !== VoteStatus::Active->value) {
            abort(422, 'Only active votes can be closed.');
        }

        $vote->update(['status' => VoteStatus::Closed->value]);

        $this->auditLogger->record(
            'governance.votes.closed',
            actor: $actor,
            request: $request,
            auditableType: Vote::class,
            auditableId: (string) $vote->id,
            metadata: [
                'compound_id' => $vote->compound_id,
                'status' => $vote->status,
            ],
        );

        return VoteResource::make($vote->load(['options', 'participations']));
    }

    /**
     * Cancel a vote.
     */
    public function cancel(Request $request, Vote $vote): VoteResource
    {
        /** @var User $actor */
        $actor = $request->user();
        $this->ensureAdminCanManageVote($actor, $vote);

        if (in_array($vote->status, [VoteStatus::Closed->value, VoteStatus::Cancelled->value])) {
            abort(422, 'This vote cannot be cancelled.');
        }

        $vote->update(['status' => VoteStatus::Cancelled->value]);

        $this->auditLogger->record(
            'governance.votes.cancelled',
            actor: $actor,
            request: $request,
            auditableType: Vote::class,
            auditableId: (string) $vote->id,
            metadata: [
                'compound_id' => $vote->compound_id,
                'status' => $vote->status,
            ],
        );

        return VoteResource::make($vote->load('options'));
    }

    /**
     * Cast a vote (resident action). One vote per apartment is enforced.
     */
    public function cast(Request $request, Vote $vote): JsonResponse
    {
        $this->ensureViewerCanAccessVote($request, $vote);
        $user = $request->user();

        $eligibility = $this->checkEligibility($vote, $user);
        if (! $eligibility['eligible']) {
            return response()->json([
                'message' => 'You are not eligible to vote.',
                'reason' => $eligibility['reason'],
            ], 403);
        }

        $unitId = $this->resolveVoterUnitId($vote, $user);

        if ($unitId === null) {
            return response()->json([
                'message' => 'No valid unit membership found for this vote.',
                'reason' => 'no_unit_membership',
            ], 403);
        }

        // Check if this user already voted
        if (VoteParticipation::query()->where('vote_id', $vote->id)->where('user_id', $user->id)->exists()) {
            return response()->json([
                'message' => 'You have already voted in this election.',
                'reason' => 'already_voted',
            ], 409);
        }

        // Check if another resident from the same apartment already voted
        if (VoteParticipation::query()->where('vote_id', $vote->id)->where('unit_id', $unitId)->exists()) {
            return response()->json([
                'message' => 'Your apartment has already voted in this election.',
                'reason' => 'apartment_already_voted',
            ], 409);
        }

        $validated = $request->validate([
            'optionId' => ['required', 'integer', Rule::exists('vote_options', 'id')->where('vote_id', $vote->id)],
        ]);

        VoteParticipation::create([
            'vote_id' => $vote->id,
            'user_id' => $user->id,
            'unit_id' => $unitId,
            'option_id' => $validated['optionId'],
            'eligibility_snapshot' => $eligibility['snapshot'],
        ]);

        $this->auditLogger->record(
            'governance.votes.cast',
            actor: $user,
            request: $request,
            auditableType: Vote::class,
            auditableId: (string) $vote->id,
            metadata: [
                'compound_id' => $vote->compound_id,
                'option_id' => $validated['optionId'],
                'unit_id' => $unitId,
            ],
        );

        return response()->json(['data' => ['message' => 'Vote cast successfully.']]);
    }

    /**
     * List voters for a vote (admin only).
     */
    public function voters(Request $request, Vote $vote): JsonResponse
    {
        $user = $request->user();
        $this->ensureAdminCanManageVote($user, $vote);
        abort_if($vote->is_anonymous, 403, 'Individual voters are hidden for anonymous votes.');

        $participations = VoteParticipation::with([
            'user:id,name',
            'option:id,label',
            'unit:id,unit_number',
        ])
            ->where('vote_id', $vote->id)
            ->orderByDesc('created_at')
            ->get();

        $votersList = $participations->map(fn (VoteParticipation $p) => [
            'userId' => $p->user_id,
            'userName' => $p->user?->name,
            'unitId' => $p->unit_id,
            'unitNumber' => $p->unit?->unit_number,
            'optionId' => $p->option_id,
            'option' => $p->option?->label,
            'votedAt' => $p->created_at?->toIso8601String(),
        ]);

        return response()->json(['data' => $votersList->toArray()]);
    }

    /**
     * Check eligibility for the authenticated user.
     */
    public function eligibility(Request $request, Vote $vote): JsonResponse
    {
        $this->ensureViewerCanAccessVote($request, $vote);
        $user = $request->user();
        $result = $this->checkEligibility($vote, $user);
        $hasVoted = VoteParticipation::query()
            ->where('vote_id', $vote->id)
            ->where('user_id', $user->id)
            ->exists();

        return response()->json([
            'data' => [
                'eligible' => $result['eligible'],
                'reason' => $result['reason'],
                'hasVoted' => $hasVoted,
            ],
        ]);
    }

    /**
     * Check eligibility for a user against this vote's rules.
     *
     * @return array{eligible: bool, reason: string|null, snapshot: array<string, mixed>}
     */
    private function checkEligibility(Vote $vote, User $user): array
    {
        $effectiveRoleNames = $user->effectiveRoleNames();
        $isResidentOwner = $user->hasEffectiveRole(UserRole::ResidentOwner);
        $isResidentTenant = $user->hasEffectiveRole(UserRole::ResidentTenant);

        $snapshot = [
            'userId' => $user->id,
            'role' => $isResidentOwner
                ? UserRole::ResidentOwner->value
                : ($isResidentTenant ? UserRole::ResidentTenant->value : ($effectiveRoleNames[0] ?? ($user->role->value ?? $user->role))),
            'effectiveRoles' => $effectiveRoleNames,
            'checkedAt' => now()->toJSON(),
        ];

        // Vote must be active
        if ($vote->status !== VoteStatus::Active->value) {
            return ['eligible' => false, 'reason' => 'vote_not_active', 'snapshot' => $snapshot];
        }

        // Check time window
        $now = now();
        if ($vote->starts_at && $vote->starts_at->gt($now)) {
            return ['eligible' => false, 'reason' => 'vote_not_started', 'snapshot' => $snapshot];
        }
        if ($vote->ends_at && $vote->ends_at->lt($now)) {
            return ['eligible' => false, 'reason' => 'vote_ended', 'snapshot' => $snapshot];
        }

        // Eligibility rule check
        switch ($vote->eligibility) {
            case VoteEligibility::OwnersOnly->value:
                if (! $isResidentOwner) {
                    return ['eligible' => false, 'reason' => 'owners_only', 'snapshot' => $snapshot];
                }
                break;
            case VoteEligibility::OwnersAndResidents->value:
                if (! $isResidentOwner && ! $isResidentTenant) {
                    return ['eligible' => false, 'reason' => 'residents_only', 'snapshot' => $snapshot];
                }
                break;
            case VoteEligibility::AllVerified->value:
                // Any verified user (includes admins / board members)
                break;
        }

        // Building scope check
        if ($vote->scope === VoteScope::Building->value && $vote->building_id) {
            $isInBuilding = $user->apartmentResidents()
                ->activeForAccess()
                ->whereHas('unit', fn ($q) => $q->where('building_id', $vote->building_id))
                ->exists();

            if (! $isInBuilding) {
                return ['eligible' => false, 'reason' => 'not_in_building', 'snapshot' => $snapshot];
            }
        }

        // Document compliance check
        if ($vote->requires_doc_compliance) {
            $isVerified = $user->apartmentResidents()
                ->activeForAccess()
                ->whereHas('unit', fn ($q) => $q->where('compound_id', $vote->compound_id))
                ->exists();

            $snapshot['docComplianceChecked'] = true;
            $snapshot['isVerified'] = $isVerified;

            if (! $isVerified) {
                return ['eligible' => false, 'reason' => 'documents_required', 'snapshot' => $snapshot];
            }
        }

        $snapshot['eligibilityPassed'] = true;

        return ['eligible' => true, 'reason' => null, 'snapshot' => $snapshot];
    }

    private function resolveVoterUnitId(Vote $vote, User $user): ?string
    {
        $membership = $user->apartmentResidents()
            ->activeForAccess()
            ->whereHas('unit', function ($q) use ($vote): void {
                $q->where('compound_id', $vote->compound_id);
                if ($vote->scope === VoteScope::Building->value && $vote->building_id) {
                    $q->where('building_id', $vote->building_id);
                }
            })
            ->first();

        return $membership?->unit_id;
    }

    private function ensureViewerCanAccessVote(Request $request, Vote $vote): void
    {
        /** @var User $user */
        $user = $request->user();

        if ($this->isAdmin($user)) {
            if ($user->isEffectiveSuperAdmin()) {
                return;
            }

            $this->compoundContext->ensureManagedCompoundAccess($user, $vote->compound_id);

            return;
        }

        $hasMembership = $user->apartmentResidents()
            ->activeForAccess()
            ->whereHas('unit', fn ($query) => $query->where('compound_id', $vote->compound_id))
            ->exists();

        abort_unless($hasMembership, 403);
    }

    private function ensureAdminCanManageVote(User $user, Vote $vote): void
    {
        abort_unless($this->isAdmin($user), 403);

        if ($user->isEffectiveSuperAdmin()) {
            return;
        }

        $this->compoundContext->ensureManagedCompoundAccess($user, $vote->compound_id);
    }

    private function ensureAdminCanManageCompound(User $user, string $compoundId): void
    {
        abort_unless($this->isAdmin($user), 403);

        if ($user->isEffectiveSuperAdmin()) {
            return;
        }

        $this->compoundContext->ensureManagedCompoundAccess($user, $compoundId);
    }
}
