<?php

namespace App\Http\Controllers\Api\V1\Meetings;

use App\Http\Controllers\Controller;
use App\Models\Meetings\Meeting;
use App\Models\Meetings\MeetingActionItem;
use App\Models\User;
use App\Services\CompoundContextService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// CM-82 / CM-115: Action items – create, update status
class MeetingActionItemController extends Controller
{
    public function __construct(private readonly CompoundContextService $context) {}

    public function index(Request $request): JsonResponse
    {
        /** @var User $actor */
        $actor = $request->user();
        $requestedCompoundId = $request->header('X-Compound-Id') ?: $request->query('compoundId');
        $compoundIds = $this->context->resolveRequestedAccessibleCompoundIds($actor, $requestedCompoundId);

        $query = MeetingActionItem::with(['meeting', 'assignee', 'creator'])
            ->join('meetings', 'meetings.id', '=', 'meeting_action_items.meeting_id')
            ->select('meeting_action_items.*')
            ->latest('meeting_action_items.created_at')
            ->when($compoundIds !== null, fn ($q) => $q->whereIn('meetings.compound_id', $compoundIds))
            ->when($request->filled('status') && $request->input('status') !== 'all', fn ($q) => $q->where('meeting_action_items.status', $request->input('status')))
            ->when($request->filled('assigned_to'), fn ($q) => $q->where('meeting_action_items.assigned_to', $request->input('assigned_to')));

        return response()->json(['data' => $query->paginate(20)]);
    }

    public function store(Request $request, Meeting $meeting): JsonResponse
    {
        $this->context->ensureUserCanAccessCompound($request->user(), $meeting->compound_id);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:200'],
            'description' => ['nullable', 'string', 'max:2000'],
            'assignedTo' => ['nullable', 'integer', 'exists:users,id'],
            'dueDate' => ['nullable', 'date'],
        ]);

        /** @var User $user */
        $user = $request->user();

        $item = MeetingActionItem::create([
            'meeting_id' => $meeting->id,
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'assigned_to' => $validated['assignedTo'] ?? null,
            'due_date' => $validated['dueDate'] ?? null,
            'status' => 'open',
            'created_by' => $user->id,
        ]);

        return response()->json(['data' => $item->load(['assignee', 'creator'])], 201);
    }

    public function update(Request $request, Meeting $meeting, MeetingActionItem $actionItem): JsonResponse
    {
        $this->context->ensureUserCanAccessCompound($request->user(), $meeting->compound_id);
        abort_if((string) $actionItem->meeting_id !== (string) $meeting->id, 404);

        $validated = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:200'],
            'description' => ['nullable', 'string', 'max:2000'],
            'assignedTo' => ['nullable', 'integer', 'exists:users,id'],
            'dueDate' => ['nullable', 'date'],
            'status' => ['sometimes', 'required', 'string', 'in:open,in_progress,done,cancelled'],
        ]);

        $changes = [];
        foreach ([
            'title' => 'title',
            'description' => 'description',
            'assignedTo' => 'assigned_to',
            'dueDate' => 'due_date',
            'status' => 'status',
        ] as $in => $db) {
            if (array_key_exists($in, $validated)) {
                $changes[$db] = $validated[$in];
            }
        }

        if (isset($changes['status']) && $changes['status'] === 'done' && $actionItem->completed_at === null) {
            $changes['completed_at'] = now();
        }

        $actionItem->update($changes);

        return response()->json(['data' => $actionItem->fresh()->load(['assignee', 'creator'])]);
    }
}
