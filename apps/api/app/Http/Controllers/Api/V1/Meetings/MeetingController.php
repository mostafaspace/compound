<?php

namespace App\Http\Controllers\Api\V1\Meetings;

use App\Http\Controllers\Controller;
use App\Models\Meetings\Meeting;
use App\Services\CompoundContextService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// CM-82 / CM-115: Meeting schedule management
class MeetingController extends Controller
{
    public function __construct(private readonly CompoundContextService $context) {}

    public function index(Request $request): JsonResponse
    {
        /** @var \App\Models\User $actor */
        $actor = $request->user();
        $requestedCompoundId = $request->header('X-Compound-Id') ?: $request->query('compoundId');
        $compoundIds = $this->context->resolveRequestedAccessibleCompoundIds($actor, $requestedCompoundId);

        $query = Meeting::with(['creator'])
            ->latest('scheduled_at')
            ->when($compoundIds !== null, fn ($q) => $q->whereIn('compound_id', $compoundIds))
            ->when($request->filled('status') && $request->input('status') !== 'all', fn ($q) => $q->where('status', $request->input('status')))
            ->when($request->filled('scope') && $request->input('scope') !== 'all', fn ($q) => $q->where('scope', $request->input('scope')))
            ->when($request->filled('from'), fn ($q) => $q->where('scheduled_at', '>=', $request->input('from')))
            ->when($request->filled('to'), fn ($q) => $q->where('scheduled_at', '<=', $request->input('to').' 23:59:59'));

        return response()->json(['data' => $query->paginate(20)]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'compoundId'      => ['nullable', 'string', 'max:26'],
            'title'           => ['required', 'string', 'max:200'],
            'description'     => ['nullable', 'string', 'max:5000'],
            'scope'           => ['required', 'string', 'in:association,building,floor,committee'],
            'scopeRefId'      => ['nullable', 'string', 'max:26'],
            'scheduledAt'     => ['nullable', 'date'],
            'durationMinutes' => ['nullable', 'integer', 'min:15', 'max:480'],
            'location'        => ['nullable', 'string', 'max:200'],
            'locationUrl'     => ['nullable', 'url', 'max:500'],
        ]);

        /** @var \App\Models\User $user */
        $user = $request->user();

        $requestedCompoundId = $validated['compoundId'] ?: $request->header('X-Compound-Id') ?: $request->query('compoundId');
        $compoundId = $this->context->resolveRequestedAccessibleCompoundId($user, $requestedCompoundId);

        abort_unless(filled($compoundId), 422, 'A valid compoundId is required to schedule a meeting.');

        $meeting = Meeting::create([
            'compound_id'     => $compoundId,
            'title'           => $validated['title'],
            'description'     => $validated['description'] ?? null,
            'scope'           => $validated['scope'],
            'scope_ref_id'    => $validated['scopeRefId'] ?? null,
            'status'          => 'draft',
            'scheduled_at'    => $validated['scheduledAt'] ?? null,
            'duration_minutes'=> $validated['durationMinutes'] ?? 60,
            'location'        => $validated['location'] ?? null,
            'location_url'    => $validated['locationUrl'] ?? null,
            'created_by'      => $user->id,
        ]);

        return response()->json(['data' => $meeting->load('creator')], 201);
    }

    public function show(Request $request, Meeting $meeting): JsonResponse
    {
        $this->context->ensureUserCanAccessCompound($request->user(), $meeting->compound_id);

        return response()->json([
            'data' => $meeting->load([
                'creator',
                'agendaItems.presenter',
                'participants.user',
                'minutes',
                'decisions',
                'actionItems.assignee',
            ]),
        ]);
    }

    public function update(Request $request, Meeting $meeting): JsonResponse
    {
        $this->context->ensureUserCanAccessCompound($request->user(), $meeting->compound_id);
        abort_if($meeting->status === 'cancelled', 422, 'Cannot update a cancelled meeting.');

        $validated = $request->validate([
            'title'           => ['sometimes', 'required', 'string', 'max:200'],
            'description'     => ['nullable', 'string', 'max:5000'],
            'scope'           => ['sometimes', 'required', 'string', 'in:association,building,floor,committee'],
            'scopeRefId'      => ['nullable', 'string', 'max:26'],
            'scheduledAt'     => ['nullable', 'date'],
            'durationMinutes' => ['nullable', 'integer', 'min:15', 'max:480'],
            'location'        => ['nullable', 'string', 'max:200'],
            'locationUrl'     => ['nullable', 'url', 'max:500'],
            'status'          => ['sometimes', 'string', 'in:draft,scheduled,in_progress,completed'],
        ]);

        $changes = [];
        foreach ([
            'title'           => 'title',
            'description'     => 'description',
            'scope'           => 'scope',
            'scopeRefId'      => 'scope_ref_id',
            'scheduledAt'     => 'scheduled_at',
            'durationMinutes' => 'duration_minutes',
            'location'        => 'location',
            'locationUrl'     => 'location_url',
            'status'          => 'status',
        ] as $inputKey => $dbKey) {
            if (array_key_exists($inputKey, $validated)) {
                $changes[$dbKey] = $validated[$inputKey];
            }
        }

        $meeting->update($changes);

        return response()->json(['data' => $meeting->fresh()->load('creator')]);
    }

    public function cancel(Request $request, Meeting $meeting): JsonResponse
    {
        $this->context->ensureUserCanAccessCompound($request->user(), $meeting->compound_id);
        abort_if(in_array($meeting->status, ['cancelled', 'completed'], true), 422, 'Meeting cannot be cancelled.');

        /** @var \App\Models\User $user */
        $user = $request->user();

        $meeting->update([
            'status'       => 'cancelled',
            'cancelled_by' => $user->id,
            'cancelled_at' => now(),
        ]);

        return response()->json(['data' => $meeting->fresh()->load(['creator', 'cancelledBy'])]);
    }
}
