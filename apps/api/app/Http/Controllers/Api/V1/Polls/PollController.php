<?php

namespace App\Http\Controllers\Api\V1\Polls;

use App\Enums\PollStatus;
use App\Enums\UserRole;
use App\Enums\VoteEligibility;
use App\Http\Controllers\Controller;
use App\Http\Resources\Polls\PollResource;
use App\Models\Polls\Poll;
use App\Models\Polls\PollOption;
use App\Models\Polls\PollVote;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class PollController extends Controller
{
    private function isAdmin(User $user): bool
    {
        return in_array($user->role->value ?? $user->role, [
            UserRole::SuperAdmin->value,
            UserRole::CompoundAdmin->value,
            UserRole::BoardMember->value,
            UserRole::FinanceReviewer->value,
            UserRole::SupportAgent->value,
        ]);
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'status'     => ['nullable', 'string', Rule::in(array_column(PollStatus::cases(), 'value'))],
            'compoundId' => ['nullable', 'string'],
        ]);

        $user = $request->user();
        $isAdmin = $this->isAdmin($user);

        $query = Poll::query()->with('options');

        if (! $isAdmin) {
            // Residents only see active polls in their verified compounds
            $query->where('status', PollStatus::Active->value);
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
            if (filled($user->compound_id)) {
                $query->where('compound_id', $user->compound_id);
            } elseif (isset($validated['compoundId'])) {
                $query->where('compound_id', $validated['compoundId']);
            }
            if (isset($validated['status'])) {
                $query->where('status', $validated['status']);
            }
        }

        $polls = $query->orderByDesc('created_at')->paginate(50);

        return PollResource::collection($polls);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'compoundId'      => ['required', 'string', 'exists:compounds,id'],
            'buildingId'      => ['nullable', 'string', 'exists:buildings,id'],
            'pollTypeId'      => ['nullable', 'string', 'exists:poll_types,id'],
            'title'           => ['required', 'string', 'max:255'],
            'description'     => ['nullable', 'string'],
            'scope'           => ['nullable', 'string', Rule::in(['compound', 'building'])],
            'isAnonymous'     => ['nullable', 'boolean'],
            'allowMultiple'   => ['nullable', 'boolean'],
            'maxChoices'      => ['nullable', 'integer', 'min:2'],
            'eligibility'     => ['nullable', 'string', Rule::in(array_column(VoteEligibility::cases(), 'value'))],
            'startsAt'        => ['nullable', 'date'],
            'endsAt'          => ['nullable', 'date', 'after:now'],
            'options'         => ['required', 'array', 'min:2', 'max:20'],
            'options.*.label' => ['required', 'string', 'max:255'],
        ]);

        $user = $request->user();
        if (filled($user->compound_id)) {
            abort_if($validated['compoundId'] !== $user->compound_id, 403);
        }

        $poll = Poll::create([
            'compound_id'    => $validated['compoundId'],
            'building_id'    => $validated['buildingId'] ?? null,
            'poll_type_id'   => $validated['pollTypeId'] ?? null,
            'title'          => $validated['title'],
            'description'    => $validated['description'] ?? null,
            'status'         => PollStatus::Draft->value,
            'scope'          => $validated['scope'] ?? 'compound',
            'is_anonymous'   => $validated['isAnonymous'] ?? false,
            'allow_multiple' => $validated['allowMultiple'] ?? false,
            'max_choices'    => $validated['maxChoices'] ?? null,
            'eligibility'    => $validated['eligibility'] ?? VoteEligibility::AllVerified->value,
            'starts_at'      => $validated['startsAt'] ?? null,
            'ends_at'        => $validated['endsAt'] ?? null,
            'created_by'     => $user->id,
        ]);

        foreach ($validated['options'] as $index => $optionData) {
            $poll->options()->create([
                'label'      => $optionData['label'],
                'sort_order' => $index,
            ]);
        }

        return response()->json(
            ['data' => PollResource::make($poll->load('options'))->resolve()],
            201,
        );
    }

    public function show(Request $request, Poll $poll): PollResource
    {
        $user = $request->user();
        $this->authorizePollAccess($user, $poll);

        $poll->load(['options', 'pollType', 'votes']);

        $pollVote = PollVote::with('options')
            ->where('poll_id', $poll->id)
            ->where('user_id', $user->id)
            ->first();

        $poll->setAttribute('has_voted', $pollVote !== null);
        $poll->setAttribute(
            'user_vote_option_ids',
            $pollVote?->options->pluck('id')->toArray() ?? []
        );

        return PollResource::make($poll);
    }

    public function update(Request $request, Poll $poll): PollResource
    {
        $this->authorizePollAccess($request->user(), $poll);

        if ($poll->status !== PollStatus::Draft->value) {
            abort(422, 'Only draft polls can be edited.');
        }

        $validated = $request->validate([
            'title'           => ['sometimes', 'required', 'string', 'max:255'],
            'description'     => ['nullable', 'string'],
            'pollTypeId'      => ['nullable', 'string', 'exists:poll_types,id'],
            'scope'           => ['sometimes', 'string', Rule::in(['compound', 'building'])],
            'isAnonymous'     => ['sometimes', 'boolean'],
            'allowMultiple'   => ['sometimes', 'boolean'],
            'maxChoices'      => ['nullable', 'integer', 'min:2'],
            'eligibility'     => ['sometimes', 'string', Rule::in(array_column(VoteEligibility::cases(), 'value'))],
            'startsAt'        => ['nullable', 'date'],
            'endsAt'          => ['nullable', 'date', 'after:now'],
            'options'         => ['sometimes', 'array', 'min:2', 'max:20'],
            'options.*.label' => ['required_with:options', 'string', 'max:255'],
        ]);

        $updates = array_filter([
            'title'          => $validated['title'] ?? null,
            'scope'          => $validated['scope'] ?? null,
            'is_anonymous'   => $validated['isAnonymous'] ?? null,
            'allow_multiple' => $validated['allowMultiple'] ?? null,
            'eligibility'    => $validated['eligibility'] ?? null,
        ], fn ($v) => ! is_null($v));

        // These can be set to null explicitly
        if (array_key_exists('description', $validated)) {
            $updates['description'] = $validated['description'];
        }
        if (array_key_exists('pollTypeId', $validated)) {
            $updates['poll_type_id'] = $validated['pollTypeId'];
        }
        if (array_key_exists('maxChoices', $validated)) {
            $updates['max_choices'] = $validated['maxChoices'];
        }
        if (array_key_exists('startsAt', $validated)) {
            $updates['starts_at'] = $validated['startsAt'];
        }
        if (array_key_exists('endsAt', $validated)) {
            $updates['ends_at'] = $validated['endsAt'];
        }

        $poll->update($updates);

        if (isset($validated['options'])) {
            $poll->options()->delete();
            foreach ($validated['options'] as $index => $optionData) {
                $poll->options()->create([
                    'label'      => $optionData['label'],
                    'sort_order' => $index,
                ]);
            }
        }

        return PollResource::make($poll->load('options'));
    }

    public function publish(Request $request, Poll $poll): PollResource
    {
        $this->authorizePollAccess($request->user(), $poll);

        if ($poll->status !== PollStatus::Draft->value) {
            abort(422, 'Only draft polls can be published.');
        }
        if ($poll->options()->count() < 2) {
            abort(422, 'A poll must have at least 2 options before publishing.');
        }

        $poll->update([
            'status'       => PollStatus::Active->value,
            'published_at' => now(),
        ]);

        return PollResource::make($poll->load('options'));
    }

    public function close(Request $request, Poll $poll): PollResource
    {
        $this->authorizePollAccess($request->user(), $poll);

        if ($poll->status !== PollStatus::Active->value) {
            abort(422, 'Only active polls can be closed.');
        }

        $poll->update([
            'status'    => PollStatus::Closed->value,
            'closed_at' => now(),
        ]);

        return PollResource::make($poll->load(['options', 'votes']));
    }

    public function archive(Request $request, Poll $poll): PollResource
    {
        $this->authorizePollAccess($request->user(), $poll);

        if ($poll->status !== PollStatus::Closed->value) {
            abort(422, 'Only closed polls can be archived.');
        }

        $poll->update(['status' => PollStatus::Archived->value]);

        return PollResource::make($poll->load('options'));
    }

    public function eligibility(Request $request, Poll $poll): JsonResponse
    {
        $user = $request->user();
        $this->authorizePollAccess($user, $poll);

        $hasVoted = PollVote::where('poll_id', $poll->id)->where('user_id', $user->id)->exists();
        [$eligible, $reason] = $this->checkEligibility($poll, $user);

        return response()->json([
            'data' => [
                'eligible' => $eligible,
                'reason'   => $reason,
                'hasVoted' => $hasVoted,
            ],
        ]);
    }

    public function vote(Request $request, Poll $poll): JsonResponse
    {
        $user = $request->user();
        $this->authorizePollAccess($user, $poll);

        if ($poll->status !== PollStatus::Active->value) {
            return response()->json(['message' => 'This poll is not currently active.'], 422);
        }

        [$eligible, $reason] = $this->checkEligibility($poll, $user);
        if (! $eligible) {
            return response()->json(['message' => 'You are not eligible to vote.', 'reason' => $reason], 403);
        }

        if (PollVote::where('poll_id', $poll->id)->where('user_id', $user->id)->exists()) {
            return response()->json(['message' => 'You have already voted in this poll.', 'reason' => 'already_voted'], 409);
        }

        $validated = $request->validate([
            'optionIds'   => ['required', 'array', 'min:1'],
            'optionIds.*' => ['integer', Rule::exists('poll_options', 'id')->where('poll_id', $poll->id)],
        ]);

        $optionIds = $validated['optionIds'];

        if (! $poll->allow_multiple && count($optionIds) > 1) {
            return response()->json(['message' => 'This poll only allows one choice.'], 422);
        }

        if ($poll->allow_multiple && $poll->max_choices !== null && count($optionIds) > $poll->max_choices) {
            return response()->json([
                'message' => "You may select at most {$poll->max_choices} options.",
            ], 422);
        }

        DB::transaction(function () use ($poll, $user, $optionIds): void {
            $pollVote = PollVote::create([
                'poll_id'  => $poll->id,
                'user_id'  => $user->id,
                'voted_at' => now(),
            ]);

            $pollVote->options()->attach($optionIds);

            // Atomically increment the denormalized votes_count on each chosen option
            PollOption::whereIn('id', $optionIds)->increment('votes_count');
        });

        return response()->json(['data' => ['message' => 'Vote recorded successfully.']]);
    }

    private function authorizePollAccess(User $user, Poll $poll): void
    {
        if (filled($user->compound_id) && $poll->compound_id !== $user->compound_id) {
            abort(403);
        }
    }

    /** @return array{0: bool, 1: string|null} */
    private function checkEligibility(Poll $poll, User $user): array
    {
        if ($poll->scope === 'building' && $poll->building_id !== null) {
            $inBuilding = $user->unitMemberships()
                ->activeForAccess()
                ->with('unit:id,building_id')
                ->get()
                ->pluck('unit.building_id')
                ->contains($poll->building_id);

            if (! $inBuilding) {
                return [false, 'not_in_building'];
            }
        }

        $memberships = $user->unitMemberships()
            ->activeForAccess()
            ->with('unit:id,compound_id')
            ->get()
            ->filter(fn ($m) => $m->unit?->compound_id === $poll->compound_id);

        if ($memberships->isEmpty()) {
            return [false, 'not_in_compound'];
        }

        $eligibility = $poll->eligibility;

        if ($eligibility === VoteEligibility::OwnersOnly->value) {
            $isOwner = $memberships->contains(fn ($m) => in_array($m->relation_type, ['owner', 'representative']));
            if (! $isOwner) {
                return [false, 'owners_only'];
            }
        } elseif ($eligibility === VoteEligibility::OwnersAndResidents->value) {
            $isEligible = $memberships->contains(fn ($m) => in_array($m->relation_type, ['owner', 'representative', 'resident']));
            if (! $isEligible) {
                return [false, 'owners_and_residents_only'];
            }
        }

        return [true, null];
    }
}
