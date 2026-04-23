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
use App\Models\Governance\VoteOption;
use App\Models\Governance\VoteParticipation;
use App\Models\Property\Compound;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class VoteController extends Controller
{
    /**
     * List votes. Admin sees all (with optional status filter); residents see active ones in their compound.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'status'     => ['nullable', 'string', Rule::in(array_column(VoteStatus::cases(), 'value'))],
            'type'       => ['nullable', 'string', Rule::in(array_column(VoteType::cases(), 'value'))],
            'compoundId' => ['nullable', 'string'],
        ]);

        $user = $request->user();
        $isAdmin = in_array($user->role->value ?? $user->role, [
            UserRole::SuperAdmin->value,
            UserRole::CompoundAdmin->value,
            UserRole::BoardMember->value,
            UserRole::FinanceReviewer->value,
            UserRole::SupportAgent->value,
        ]);

        $query = Vote::query()->with('options');

        if (! $isAdmin) {
            // Residents only see active votes in their verified compounds
            $query->where('status', VoteStatus::Active->value);
            $verifiedCompoundIds = $user->unitMemberships()
                ->activeForAccess()
                ->with('unit:id,compound_id')
                ->get()
                ->pluck('unit.compound_id')
                ->unique()
                ->filter()
                ->values();
            $query->whereIn('compound_id', $verifiedCompoundIds);
        } else {
            if (isset($validated['status'])) {
                $query->where('status', $validated['status']);
            }
            if (isset($validated['compoundId'])) {
                $query->where('compound_id', $validated['compoundId']);
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
            'compoundId'            => ['required', 'string', 'exists:compounds,id'],
            'buildingId'            => ['nullable', 'string', 'exists:buildings,id'],
            'type'                  => ['required', 'string', Rule::in(array_column(VoteType::cases(), 'value'))],
            'title'                 => ['required', 'string', 'max:255'],
            'description'           => ['nullable', 'string'],
            'scope'                 => ['nullable', 'string', Rule::in(array_column(VoteScope::cases(), 'value'))],
            'eligibility'           => ['nullable', 'string', Rule::in(array_column(VoteEligibility::cases(), 'value'))],
            'requiresDocCompliance' => ['nullable', 'boolean'],
            'isAnonymous'           => ['nullable', 'boolean'],
            'startsAt'              => ['nullable', 'date', 'before:endsAt'],
            'endsAt'                => ['nullable', 'date', 'after:now'],
            'options'               => ['required', 'array', 'min:2'],
            'options.*.label'       => ['required', 'string', 'max:255'],
        ]);

        $vote = Vote::create([
            'compound_id'             => $validated['compoundId'],
            'building_id'             => $validated['buildingId'] ?? null,
            'type'                    => $validated['type'],
            'title'                   => $validated['title'],
            'description'             => $validated['description'] ?? null,
            'status'                  => VoteStatus::Draft->value,
            'scope'                   => $validated['scope'] ?? VoteScope::Compound->value,
            'eligibility'             => $validated['eligibility'] ?? VoteEligibility::OwnersOnly->value,
            'requires_doc_compliance' => $validated['requiresDocCompliance'] ?? false,
            'is_anonymous'            => $validated['isAnonymous'] ?? false,
            'starts_at'               => $validated['startsAt'] ?? null,
            'ends_at'                 => $validated['endsAt'] ?? null,
            'created_by'              => $request->user()->id,
        ]);

        foreach ($validated['options'] as $index => $optionData) {
            $vote->options()->create([
                'label'      => $optionData['label'],
                'sort_order' => $index,
            ]);
        }

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
        $vote->load(['options', 'participations']);

        return VoteResource::make($vote);
    }

    /**
     * Update a draft vote (admin only).
     */
    public function update(Request $request, Vote $vote): VoteResource
    {
        if ($vote->status !== VoteStatus::Draft->value) {
            abort(422, 'Only draft votes can be edited.');
        }

        $validated = $request->validate([
            'title'                 => ['sometimes', 'required', 'string', 'max:255'],
            'description'           => ['nullable', 'string'],
            'scope'                 => ['sometimes', 'string', Rule::in(array_column(VoteScope::cases(), 'value'))],
            'eligibility'           => ['sometimes', 'string', Rule::in(array_column(VoteEligibility::cases(), 'value'))],
            'requiresDocCompliance' => ['sometimes', 'boolean'],
            'isAnonymous'           => ['sometimes', 'boolean'],
            'startsAt'              => ['nullable', 'date', 'before:endsAt'],
            'endsAt'                => ['nullable', 'date', 'after:now'],
            'options'               => ['sometimes', 'array', 'min:2'],
            'options.*.label'       => ['required_with:options', 'string', 'max:255'],
        ]);

        $vote->update(array_filter([
            'title'                   => $validated['title'] ?? null,
            'description'             => $validated['description'] ?? null,
            'scope'                   => $validated['scope'] ?? null,
            'eligibility'             => $validated['eligibility'] ?? null,
            'requires_doc_compliance' => $validated['requiresDocCompliance'] ?? null,
            'is_anonymous'            => $validated['isAnonymous'] ?? null,
            'starts_at'               => $validated['startsAt'] ?? null,
            'ends_at'                 => $validated['endsAt'] ?? null,
        ], fn ($v) => ! is_null($v)));

        if (isset($validated['options'])) {
            $vote->options()->delete();
            foreach ($validated['options'] as $index => $optionData) {
                $vote->options()->create([
                    'label'      => $optionData['label'],
                    'sort_order' => $index,
                ]);
            }
        }

        return VoteResource::make($vote->load('options'));
    }

    /**
     * Activate (open) a vote.
     */
    public function activate(Vote $vote): VoteResource
    {
        if ($vote->status !== VoteStatus::Draft->value) {
            abort(422, 'Only draft votes can be activated.');
        }

        if ($vote->options()->count() < 2) {
            abort(422, 'A vote must have at least 2 options before it can be activated.');
        }

        $vote->update(['status' => VoteStatus::Active->value]);

        return VoteResource::make($vote->load('options'));
    }

    /**
     * Close a vote (stop accepting new votes).
     */
    public function close(Vote $vote): VoteResource
    {
        if ($vote->status !== VoteStatus::Active->value) {
            abort(422, 'Only active votes can be closed.');
        }

        $vote->update(['status' => VoteStatus::Closed->value]);

        return VoteResource::make($vote->load(['options', 'participations']));
    }

    /**
     * Cancel a vote.
     */
    public function cancel(Vote $vote): VoteResource
    {
        if (in_array($vote->status, [VoteStatus::Closed->value, VoteStatus::Cancelled->value])) {
            abort(422, 'This vote cannot be cancelled.');
        }

        $vote->update(['status' => VoteStatus::Cancelled->value]);

        return VoteResource::make($vote->load('options'));
    }

    /**
     * Cast a vote (resident action).
     */
    public function cast(Request $request, Vote $vote): JsonResponse
    {
        $user = $request->user();

        $eligibility = $this->checkEligibility($vote, $user);
        if (! $eligibility['eligible']) {
            return response()->json([
                'message' => 'You are not eligible to vote.',
                'reason'  => $eligibility['reason'],
            ], 403);
        }

        // Check for duplicate vote
        if (VoteParticipation::query()
            ->where('vote_id', $vote->id)
            ->where('user_id', $user->id)
            ->exists()) {
            return response()->json([
                'message' => 'You have already voted in this election.',
                'reason'  => 'already_voted',
            ], 409);
        }

        $validated = $request->validate([
            'optionId' => ['required', 'integer', Rule::exists('vote_options', 'id')->where('vote_id', $vote->id)],
        ]);

        VoteParticipation::create([
            'vote_id'              => $vote->id,
            'user_id'              => $user->id,
            'option_id'            => $validated['optionId'],
            'eligibility_snapshot' => $eligibility['snapshot'],
        ]);

        return response()->json(['data' => ['message' => 'Vote cast successfully.']]);
    }

    /**
     * Check eligibility for the authenticated user.
     */
    public function eligibility(Request $request, Vote $vote): JsonResponse
    {
        $user = $request->user();
        $result = $this->checkEligibility($vote, $user);
        $hasVoted = VoteParticipation::query()
            ->where('vote_id', $vote->id)
            ->where('user_id', $user->id)
            ->exists();

        return response()->json([
            'data' => [
                'eligible' => $result['eligible'],
                'reason'   => $result['reason'],
                'hasVoted' => $hasVoted,
            ],
        ]);
    }

    /**
     * Check eligibility for a user against this vote's rules.
     *
     * @return array{eligible: bool, reason: string|null, snapshot: array<string, mixed>}
     */
    private function checkEligibility(Vote $vote, \App\Models\User $user): array
    {
        $snapshot = [
            'userId'   => $user->id,
            'role'     => $user->role->value ?? $user->role,
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

        $userRole = $user->role->value ?? $user->role;

        // Eligibility rule check
        switch ($vote->eligibility) {
            case VoteEligibility::OwnersOnly->value:
                if ($userRole !== UserRole::ResidentOwner->value) {
                    return ['eligible' => false, 'reason' => 'owners_only', 'snapshot' => $snapshot];
                }
                break;
            case VoteEligibility::OwnersAndResidents->value:
                if (! in_array($userRole, [UserRole::ResidentOwner->value, UserRole::ResidentTenant->value])) {
                    return ['eligible' => false, 'reason' => 'residents_only', 'snapshot' => $snapshot];
                }
                break;
            case VoteEligibility::AllVerified->value:
                // Any verified user (includes admins / board members)
                break;
        }

        // Building scope check
        if ($vote->scope === VoteScope::Building->value && $vote->building_id) {
            $isInBuilding = $user->unitMemberships()
                ->activeForAccess()
                ->whereHas('unit', fn ($q) => $q->where('building_id', $vote->building_id))
                ->exists();

            if (! $isInBuilding) {
                return ['eligible' => false, 'reason' => 'not_in_building', 'snapshot' => $snapshot];
            }
        }

        // Document compliance check
        if ($vote->requires_doc_compliance) {
            $isVerified = $user->unitMemberships()
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
}
