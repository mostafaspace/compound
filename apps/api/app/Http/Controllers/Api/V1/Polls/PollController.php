<?php

namespace App\Http\Controllers\Api\V1\Polls;

use App\Enums\NotificationCategory;
use App\Enums\PollStatus;
use App\Enums\UserRole;
use App\Enums\VoteEligibility;
use App\Http\Controllers\Controller;
use App\Http\Resources\Polls\PollResource;
use App\Models\Apartments\ApartmentResident;
use App\Models\Polls\Poll;
use App\Models\Polls\PollNotificationLog;
use App\Models\Polls\PollOption;
use App\Models\Polls\PollViewLog;
use App\Models\Polls\PollVote;
use App\Models\User;
use App\Services\CompoundContextService;
use App\Services\NotificationService;
use App\Support\AuditLogger;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;

class PollController extends Controller
{
    public function __construct(
        private readonly CompoundContextService $compoundContext,
        private readonly AuditLogger $auditLogger,
        private readonly NotificationService $notificationService,
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

    public function index(Request $request): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'status' => ['nullable', 'string', Rule::in(array_column(PollStatus::cases(), 'value'))],
            'compoundId' => ['nullable', 'string'],
        ]);

        $user = $request->user();
        $isAdmin = $this->isAdmin($user);

        $query = Poll::query()->with('options');

        if (! $isAdmin) {
            // Residents only see active polls in their verified units/buildings/compounds
            $query->where('status', PollStatus::Active->value);

            $memberships = $user->apartmentResidents()
                ->activeForAccess()
                ->with('unit')
                ->get();

            $verifiedCompoundIds = $memberships->pluck('unit.compound_id')->unique()->filter()->values()->all();
            $verifiedBuildingIds = $memberships->pluck('unit.building_id')->unique()->filter()->values()->all();

            $query->where(function ($q) use ($verifiedCompoundIds, $verifiedBuildingIds) {
                // Polls scoped to compound level
                $q->where(function ($sq) use ($verifiedCompoundIds) {
                    $sq->where('scope', 'compound')
                        ->whereIn('compound_id', $verifiedCompoundIds);
                });

                // Polls scoped to building level
                if (! empty($verifiedBuildingIds)) {
                    $q->orWhere(function ($sq) use ($verifiedBuildingIds) {
                        $sq->where('scope', 'building')
                            ->whereIn('building_id', $verifiedBuildingIds);
                    });
                }
            });
        } else {
            $managedCompoundId = $this->compoundContext->resolveManagedCompoundId($user);

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
            'compoundId' => ['required', 'string', 'exists:compounds,id'],
            'buildingId' => ['nullable', 'string', 'exists:buildings,id'],
            'pollTypeId' => ['nullable', 'string', 'exists:poll_types,id'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'scope' => ['nullable', 'string', Rule::in(['compound', 'building'])],
            'allowMultiple' => ['nullable', 'boolean'],
            'maxChoices' => ['nullable', 'integer', 'min:2'],
            'eligibility' => ['nullable', 'string', Rule::in(array_column(VoteEligibility::cases(), 'value'))],
            'startsAt' => ['nullable', 'date'],
            'endsAt' => ['nullable', 'date', 'after:now'],
            'options' => ['required', 'array', 'min:2', 'max:20'],
            'options.*.label' => ['required', 'string', 'max:255'],
        ]);

        $user = $request->user();
        if (! $user->isEffectiveSuperAdmin()) {
            $managedCompoundId = $this->compoundContext->resolveManagedCompoundId($user);

            abort_unless($managedCompoundId !== null, 403);
            abort_if($validated['compoundId'] !== $managedCompoundId, 403);
        }

        $poll = Poll::create([
            'compound_id' => $validated['compoundId'],
            'building_id' => $validated['buildingId'] ?? null,
            'poll_type_id' => $validated['pollTypeId'] ?? null,
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'status' => PollStatus::Draft->value,
            'scope' => $validated['scope'] ?? 'compound',
            'allow_multiple' => $validated['allowMultiple'] ?? false,
            'max_choices' => $validated['maxChoices'] ?? null,
            'eligibility' => $validated['eligibility'] ?? VoteEligibility::AllVerified->value,
            'starts_at' => $validated['startsAt'] ?? null,
            'ends_at' => $validated['endsAt'] ?? null,
            'created_by' => $user->id,
        ]);

        foreach ($validated['options'] as $index => $optionData) {
            $poll->options()->create([
                'label' => $optionData['label'],
                'sort_order' => $index,
            ]);
        }

        $this->auditLogger->record(
            'polls.created',
            actor: $user,
            request: $request,
            auditableType: Poll::class,
            auditableId: (string) $poll->id,
            metadata: [
                'compound_id' => $poll->compound_id,
                'scope' => $poll->scope,
                'option_count' => count($validated['options']),
            ],
        );

        return response()->json(
            ['data' => PollResource::make($poll->load('options'))->resolve()],
            201,
        );
    }

    public function show(Request $request, Poll $poll): PollResource
    {
        $user = $request->user();
        $this->authorizePollAccess($user, $poll);

        $selection = $this->resolveUnitSelection($request, $poll, $user, false);
        $selectedUnitId = $selection['selectedUnitId'];

        if (! $this->isAdmin($user) && Schema::hasTable('poll_view_logs')) {
            $unitContext = $this->resolveScopedUnitContext($poll, $user, $selectedUnitId);
            $log = PollViewLog::firstOrNew(['poll_id' => $poll->id, 'user_id' => $user->id]);
            if (! $log->exists) {
                $log->first_viewed_at = now();
                $log->view_count = 0;
                if (Schema::hasColumn('poll_view_logs', 'unit_id')) {
                    $log->unit_id = $unitContext['unit_id'];
                }
                if (Schema::hasColumn('poll_view_logs', 'unit_number')) {
                    $log->unit_number = $unitContext['unit_number'];
                }
            }
            $log->last_viewed_at = now();
            $log->view_count++;
            $log->save();
        }

        $eagerLoads = [
            'options',
            'pollType',
            'votes.user',
            'votes.options',
            'viewLogs.user.apartmentResidents.unit',
            'notificationLogs.user.apartmentResidents.unit',
        ];
        if (Schema::hasColumn('poll_votes', 'unit_id')) {
            $eagerLoads[] = 'votes.unit';
        }
        $poll->load($eagerLoads);

        $pollVote = $this->resolveCurrentBallot($poll, $user, $selectedUnitId);

        $poll->setAttribute('selected_unit_id', $selectedUnitId);
        $poll->setAttribute('has_voted', $pollVote !== null);
        $poll->setAttribute(
            'user_vote_option_ids',
            $pollVote?->options->pluck('id')->toArray() ?? []
        );

        return PollResource::make($poll);
    }

    public function update(Request $request, Poll $poll): PollResource
    {
        /** @var User $actor */
        $actor = $request->user();
        $this->authorizePollAccess($actor, $poll);

        if ($poll->status !== PollStatus::Draft->value) {
            abort(422, 'Only draft polls can be edited.');
        }

        $validated = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'pollTypeId' => ['nullable', 'string', 'exists:poll_types,id'],
            'scope' => ['sometimes', 'string', Rule::in(['compound', 'building'])],
            'allowMultiple' => ['sometimes', 'boolean'],
            'maxChoices' => ['nullable', 'integer', 'min:2'],
            'eligibility' => ['sometimes', 'string', Rule::in(array_column(VoteEligibility::cases(), 'value'))],
            'startsAt' => ['nullable', 'date'],
            'endsAt' => ['nullable', 'date', 'after:now'],
            'options' => ['sometimes', 'array', 'min:2', 'max:20'],
            'options.*.label' => ['required_with:options', 'string', 'max:255'],
        ]);

        $updates = array_filter([
            'title' => $validated['title'] ?? null,
            'scope' => $validated['scope'] ?? null,
            'allow_multiple' => $validated['allowMultiple'] ?? null,
            'eligibility' => $validated['eligibility'] ?? null,
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
                    'label' => $optionData['label'],
                    'sort_order' => $index,
                ]);
            }
        }

        $this->auditLogger->record(
            'polls.updated',
            actor: $actor,
            request: $request,
            auditableType: Poll::class,
            auditableId: (string) $poll->id,
            metadata: [
                'compound_id' => $poll->compound_id,
                'updated_fields' => array_keys($validated),
            ],
        );

        return PollResource::make($poll->load('options'));
    }

    public function publish(Request $request, Poll $poll): PollResource
    {
        /** @var User $actor */
        $actor = $request->user();
        $this->authorizePollAccess($actor, $poll);

        if ($poll->status !== PollStatus::Draft->value) {
            abort(422, 'Only draft polls can be published.');
        }
        if ($poll->options()->count() < 2) {
            abort(422, 'A poll must have at least 2 options before publishing.');
        }

        $poll->update([
            'status' => PollStatus::Active->value,
            'published_at' => now(),
        ]);

        if (Schema::hasTable('poll_notification_logs')) {
            $this->dispatchPollNotifications($poll);
        }

        $this->auditLogger->record(
            'polls.published',
            actor: $actor,
            request: $request,
            auditableType: Poll::class,
            auditableId: (string) $poll->id,
            metadata: [
                'compound_id' => $poll->compound_id,
                'status' => $poll->status,
            ],
        );

        return PollResource::make($poll->load('options'));
    }

    public function close(Request $request, Poll $poll): PollResource
    {
        /** @var User $actor */
        $requestUser = $request->user();
        $this->authorizePollAccess($requestUser, $poll);

        if ($poll->status !== PollStatus::Active->value) {
            abort(422, 'Only active polls can be closed.');
        }

        $poll->update([
            'status' => PollStatus::Closed->value,
            'closed_at' => now(),
        ]);

        $this->auditLogger->record(
            'polls.closed',
            actor: $requestUser,
            request: $request,
            auditableType: Poll::class,
            auditableId: (string) $poll->id,
            metadata: [
                'compound_id' => $poll->compound_id,
                'status' => $poll->status,
            ],
        );

        return PollResource::make($poll->load(['options', 'votes']));
    }

    public function archive(Request $request, Poll $poll): PollResource
    {
        /** @var User $actor */
        $actor = $request->user();
        $this->authorizePollAccess($actor, $poll);

        if ($poll->status !== PollStatus::Closed->value) {
            abort(422, 'Only closed polls can be archived.');
        }

        $poll->update(['status' => PollStatus::Archived->value]);

        $this->auditLogger->record(
            'polls.archived',
            actor: $actor,
            request: $request,
            auditableType: Poll::class,
            auditableId: (string) $poll->id,
            metadata: [
                'compound_id' => $poll->compound_id,
                'status' => $poll->status,
            ],
        );

        return PollResource::make($poll->load('options'));
    }

    public function eligibility(Request $request, Poll $poll): JsonResponse
    {
        $user = $request->user();
        $this->authorizePollAccess($user, $poll);

        $selection = $this->resolveUnitSelection($request, $poll, $user, false);
        $hasVoted = $selection['selectedUnitId']
            ? $this->resolveCurrentBallot($poll, $user, $selection['selectedUnitId']) !== null
            : false;
        [$eligible, $reason] = $this->checkEligibility($poll, $user);

        return response()->json([
            'data' => [
                'eligible' => $eligible,
                'reason' => $reason,
                'hasVoted' => $hasVoted,
                'selectedUnitId' => $selection['selectedUnitId'],
                'requiresUnitSelection' => $selection['requiresUnitSelection'],
                'eligibleUnits' => $selection['eligibleUnits'],
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

        if ($poll->starts_at && $poll->starts_at->isFuture()) {
            return response()->json(['message' => 'Voting for this poll has not started yet.'], 422);
        }

        if ($poll->ends_at && $poll->ends_at->isPast()) {
            return response()->json(['message' => 'This poll has ended.'], 422);
        }

        [$eligible, $reason] = $this->checkEligibility($poll, $user);
        if (! $eligible) {
            return response()->json(['message' => 'You are not eligible to vote.', 'reason' => $reason], 403);
        }

        $hasUnitColumn = Schema::hasColumn('poll_votes', 'unit_id');
        $selection = $hasUnitColumn
            ? $this->resolveUnitSelection($request, $poll, $user, true)
            : ['selectedUnitId' => null, 'eligibleUnits' => [], 'requiresUnitSelection' => false, 'invalidRequestedUnit' => false];
        $unitId = $hasUnitColumn ? $selection['selectedUnitId'] : null;

        if (($selection['invalidRequestedUnit'] ?? false) === true) {
            return response()->json([
                'message' => 'Selected apartment is not eligible for this poll.',
                'reason' => 'invalid_unit_selection',
                'eligibleUnits' => $selection['eligibleUnits'],
            ], 422);
        }

        if ($hasUnitColumn && ($selection['requiresUnitSelection'] ?? false) === true && ! $request->filled('unitId')) {
            return response()->json([
                'message' => 'Select which apartment should cast this ballot.',
                'reason' => 'unit_selection_required',
                'selectedUnitId' => $selection['selectedUnitId'],
                'eligibleUnits' => $selection['eligibleUnits'],
            ], 422);
        }

        if ($hasUnitColumn && $unitId === null) {
            return response()->json(['message' => 'No valid unit membership found for this poll.'], 403);
        }

        $validated = $request->validate([
            'unitId' => ['nullable', 'string'],
            'optionIds' => ['required', 'array', 'min:1'],
            'optionIds.*' => ['integer', 'distinct', Rule::exists('poll_options', 'id')->where('poll_id', $poll->id)],
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

        try {
            DB::transaction(function () use ($poll, $user, $unitId, $optionIds, $hasUnitColumn): void {
                Poll::query()->whereKey($poll->id)->lockForUpdate()->first();

                $existingVote = $this->resolveCurrentBallot($poll, $user, $unitId, true);

                if ($existingVote) {
                    $oldOptionIds = $existingVote->options()->pluck('poll_options.id')->toArray();
                    if ($oldOptionIds !== []) {
                        PollOption::whereIn('id', $oldOptionIds)->decrement('votes_count');
                    }
                    $existingVote->options()->detach();
                    $existingVote->delete();
                }

                $voteData = [
                    'poll_id' => $poll->id,
                    'user_id' => $user->id,
                    'voted_at' => now(),
                ];
                if ($hasUnitColumn) {
                    $voteData['unit_id'] = $unitId;
                }

                $pollVote = PollVote::create($voteData);

                $pollVote->options()->attach($optionIds);
                PollOption::whereIn('id', $optionIds)->increment('votes_count');
            });
        } catch (QueryException $exception) {
            if (str_contains(strtolower($exception->getMessage()), 'poll_votes_poll_unit_unique')) {
                return response()->json([
                    'message' => 'Your apartment has already voted in this poll.',
                    'reason' => 'apartment_already_voted',
                ], 409);
            }

            throw $exception;
        }

        $this->auditLogger->record(
            'polls.voted',
            actor: $user,
            request: $request,
            auditableType: Poll::class,
            auditableId: (string) $poll->id,
            metadata: [
                'compound_id' => $poll->compound_id,
                'unit_id' => $unitId,
                'option_ids' => $optionIds,
            ],
        );

        return response()->json(['data' => ['message' => 'Vote recorded successfully.']]);
    }

    public function unvote(Request $request, Poll $poll): JsonResponse
    {
        $user = $request->user();
        $this->authorizePollAccess($user, $poll);

        if ($poll->status !== PollStatus::Active->value) {
            return response()->json(['message' => 'Cannot remove vote after poll is closed.'], 422);
        }

        if ($poll->starts_at && $poll->starts_at->isFuture()) {
            return response()->json(['message' => 'Voting for this poll has not started yet.'], 422);
        }

        if ($poll->ends_at && $poll->ends_at->isPast()) {
            return response()->json(['message' => 'This poll has ended.'], 422);
        }

        $selection = $this->resolveUnitSelection($request, $poll, $user, true);

        if ($selection['invalidRequestedUnit'] === true) {
            return response()->json([
                'message' => 'Selected apartment is not eligible for this poll.',
                'reason' => 'invalid_unit_selection',
                'eligibleUnits' => $selection['eligibleUnits'],
            ], 422);
        }

        if ($selection['requiresUnitSelection'] === true && ! $request->filled('unitId')) {
            return response()->json([
                'message' => 'Select which apartment ballot should be removed.',
                'reason' => 'unit_selection_required',
                'selectedUnitId' => $selection['selectedUnitId'],
                'eligibleUnits' => $selection['eligibleUnits'],
            ], 422);
        }

        $existingVote = $this->resolveCurrentBallot($poll, $user, $selection['selectedUnitId']);

        if (! $existingVote) {
            return response()->json(['message' => 'You have not voted in this poll.'], 404);
        }

        $oldOptionIds = $existingVote->options()->pluck('poll_options.id')->toArray();

        DB::transaction(function () use ($existingVote, $oldOptionIds): void {
            PollOption::whereIn('id', $oldOptionIds)->decrement('votes_count');
            $existingVote->options()->detach();
            $existingVote->delete();
        });

        $this->auditLogger->record(
            'polls.unvoted',
            actor: $user,
            request: $request,
            auditableType: Poll::class,
            auditableId: (string) $poll->id,
            metadata: [
                'compound_id' => $poll->compound_id,
                'option_ids' => $oldOptionIds,
            ],
        );

        return response()->json(['data' => ['message' => 'Vote removed successfully.']]);
    }

    public function voters(Request $request, Poll $poll): JsonResponse
    {
        $user = $request->user();
        $this->authorizePollAccess($user, $poll);

        $eagerLoads = ['user:id,name', 'options:id,label'];
        if (Schema::hasColumn('poll_votes', 'unit_id')) {
            $eagerLoads[] = 'unit:id,unit_number,building_id';
        }

        $votes = PollVote::with($eagerLoads)
            ->where('poll_id', $poll->id)
            ->orderByDesc('voted_at')
            ->get();

        $votersList = $votes->map(fn (PollVote $vote) => [
            'userId' => $vote->user_id,
            'userName' => $vote->user?->name,
            'unitId' => $vote->unit_id ?? null,
            'unitNumber' => $vote->unit?->unit_number ?? null,
            'options' => $vote->options->pluck('label')->toArray(),
            'votedAt' => $vote->voted_at?->toIso8601String(),
        ]);

        return response()->json(['data' => $votersList->toArray()]);
    }

    private function authorizePollAccess(User $user, Poll $poll): void
    {
        if ($this->isAdmin($user)) {
            if ($user->isEffectiveSuperAdmin()) {
                return;
            }

            $this->compoundContext->ensureManagedCompoundAccess($user, $poll->compound_id);

            return;
        }

        abort_if($poll->status === PollStatus::Draft->value, 403);

        $query = $user->apartmentResidents()
            ->activeForAccess()
            ->whereHas('unit', function ($q) use ($poll) {
                $q->where('compound_id', $poll->compound_id);
                if ($poll->scope === 'building' && $poll->building_id) {
                    $q->where('building_id', $poll->building_id);
                }
            });

        abort_unless($query->exists(), 403);
    }

    private function resolveVoterUnitId(Poll $poll, User $user): ?string
    {
        $membership = $this->resolveScopedMembership($poll, $user);

        return $membership?->unit_id;
    }

    private function dispatchPollNotifications(Poll $poll): void
    {
        $memberships = ApartmentResident::query()
            ->activeForAccess()
            ->with('unit:id,unit_number,compound_id,building_id')
            ->whereHas('unit', function ($q) use ($poll) {
                $q->where('compound_id', $poll->compound_id);
                if ($poll->scope === 'building' && $poll->building_id) {
                    $q->where('building_id', $poll->building_id);
                }
            })
            ->orderByDesc('is_primary')
            ->get()
            ->groupBy('user_id')
            ->map(fn ($group) => $group->first());

        $recipients = User::query()
            ->whereIn('id', $memberships->keys()->all())
            ->get(['id']);

        $now = now();
        $logs = [];

        foreach ($recipients as $recipient) {
            $membership = $memberships->get($recipient->id);
            $notification = $this->notificationService->create(
                userId: $recipient->id,
                category: NotificationCategory::Polls,
                title: "New poll: {$poll->title}",
                body: 'A new poll is open for review and voting.',
                metadata: [
                    'pollId' => $poll->id,
                    'actionUrl' => "/polls/{$poll->id}",
                    'titleEn' => "New poll: {$poll->title}",
                    'bodyEn' => 'A new poll is open for review and voting.',
                    'titleAr' => "تصويت جديد: {$poll->title}",
                    'bodyAr' => 'يوجد تصويت جديد متاح للمراجعة والإدلاء بالصوت.',
                ],
                priority: 'high',
                respectPreferences: false,
            );

            $logs[] = [
                'poll_id' => $poll->id,
                'user_id' => $recipient->id,
                'unit_id' => Schema::hasColumn('poll_notification_logs', 'unit_id') ? $membership?->unit_id : null,
                'unit_number' => Schema::hasColumn('poll_notification_logs', 'unit_number') ? $membership?->unit?->unit_number : null,
                'notified_at' => $now,
                'channel' => 'in_app',
                'delivered' => $notification !== null,
                'delivered_at' => $notification ? $now : null,
            ];
        }

        if ($logs !== []) {
            PollNotificationLog::insert($logs);
        }
    }

    /**
     * @return array{unit_id: string|null, unit_number: string|null}
     */
    private function resolveScopedUnitContext(Poll $poll, User $user, ?string $selectedUnitId = null): array
    {
        $membership = $this->resolveScopedMembership($poll, $user, $selectedUnitId);

        return [
            'unit_id' => $membership?->unit_id,
            'unit_number' => $membership?->unit?->unit_number,
        ];
    }

    private function resolveScopedMembership(Poll $poll, User $user, ?string $selectedUnitId = null): ?ApartmentResident
    {
        $memberships = $this->resolveEligibleMemberships($poll, $user);

        if ($selectedUnitId !== null) {
            return $memberships->firstWhere('unit_id', $selectedUnitId);
        }

        return $memberships->first();
    }

    /**
     * @return Collection<int, ApartmentResident>
     */
    private function resolveEligibleMemberships(Poll $poll, User $user): Collection
    {
        $memberships = $user->apartmentResidents()
            ->activeForAccess()
            ->with('unit:id,unit_number,compound_id,building_id')
            ->whereHas('unit', function ($q) use ($poll) {
                $q->where('compound_id', $poll->compound_id);
                if ($poll->scope === 'building' && $poll->building_id) {
                    $q->where('building_id', $poll->building_id);
                }
            })
            ->orderByDesc('is_primary')
            ->get()
            ->unique('unit_id')
            ->values();

        return match ($poll->eligibility) {
            VoteEligibility::OwnersOnly->value => $memberships->filter(
                fn (ApartmentResident $membership) => in_array($membership->relation_type->value, ['owner', 'representative'], true)
            )->values(),
            VoteEligibility::OwnersAndResidents->value => $memberships->filter(
                fn (ApartmentResident $membership) => in_array($membership->relation_type->value, ['owner', 'representative', 'resident'], true)
            )->values(),
            default => $memberships,
        };
    }

    /**
     * @return array{
     *   selectedUnitId: string|null,
     *   requiresUnitSelection: bool,
     *   eligibleUnits: array<int, array{id: string, unitNumber: string|null, isPrimary: bool}>,
     *   invalidRequestedUnit: bool
     * }
     */
    private function resolveUnitSelection(Request $request, Poll $poll, User $user, bool $requireExplicitWhenMultiple): array
    {
        $memberships = $this->isAdmin($user)
            ? collect()
            : $this->resolveEligibleMemberships($poll, $user);

        $eligibleUnits = $memberships->map(fn (ApartmentResident $membership) => [
            'id' => $membership->unit_id,
            'unitNumber' => $membership->unit?->unit_number,
            'isPrimary' => (bool) $membership->is_primary,
        ])->values()->all();

        $requiresUnitSelection = count($eligibleUnits) > 1;
        $requestedUnitId = $request->input('unitId') ?: $request->query('unitId');
        $selectedMembership = null;
        $invalidRequestedUnit = false;

        if ($requestedUnitId !== null && $requestedUnitId !== '') {
            $selectedMembership = $memberships->firstWhere('unit_id', (string) $requestedUnitId);
            $invalidRequestedUnit = $selectedMembership === null;
        } elseif (! $requireExplicitWhenMultiple || count($eligibleUnits) <= 1) {
            $selectedMembership = $memberships->first();
        }

        return [
            'selectedUnitId' => $selectedMembership?->unit_id,
            'requiresUnitSelection' => $requiresUnitSelection,
            'eligibleUnits' => $eligibleUnits,
            'invalidRequestedUnit' => $invalidRequestedUnit,
        ];
    }

    /** @return array{0: bool, 1: string|null} */
    private function checkEligibility(Poll $poll, User $user): array
    {
        if ($poll->scope === 'building' && $poll->building_id !== null) {
            $inBuilding = $user->apartmentResidents()
                ->activeForAccess()
                ->with('unit:id,building_id')
                ->get()
                ->pluck('unit.building_id')
                ->contains($poll->building_id);

            if (! $inBuilding) {
                return [false, 'not_in_building'];
            }
        }

        $memberships = $user->apartmentResidents()
            ->activeForAccess()
            ->with('unit:id,compound_id')
            ->get()
            ->filter(fn ($m) => $m->unit?->compound_id === $poll->compound_id);

        if ($memberships->isEmpty()) {
            return [false, 'not_in_compound'];
        }

        $eligibility = $poll->eligibility;

        if ($eligibility === VoteEligibility::OwnersOnly->value) {
            $isOwner = $memberships->contains(fn ($m) => in_array($m->relation_type->value, ['owner', 'representative']));
            if (! $isOwner) {
                return [false, 'owners_only'];
            }
        } elseif ($eligibility === VoteEligibility::OwnersAndResidents->value) {
            $isEligible = $memberships->contains(fn ($m) => in_array($m->relation_type->value, ['owner', 'representative', 'resident']));
            if (! $isEligible) {
                return [false, 'owners_and_residents_only'];
            }
        }

        return [true, null];
    }

    private function resolveCurrentBallot(
        Poll $poll,
        User $user,
        ?string $resolvedUnitId = null,
        bool $lockForUpdate = false,
    ): ?PollVote {
        $query = PollVote::with('options')->where('poll_id', $poll->id);

        if (Schema::hasColumn('poll_votes', 'unit_id')) {
            $unitId = $resolvedUnitId ?? $this->resolveVoterUnitId($poll, $user);

            if ($unitId === null) {
                return null;
            }

            $query->where('unit_id', $unitId);
        } else {
            $query->where('user_id', $user->id);
        }

        if ($lockForUpdate) {
            $query->lockForUpdate();
        }

        return $query->first();
    }
}
