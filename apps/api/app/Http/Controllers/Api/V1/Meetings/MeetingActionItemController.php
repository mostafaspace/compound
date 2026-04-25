<?php

namespace App\Http\Controllers\Api\V1\Meetings;

use App\Http\Controllers\Controller;
use App\Models\Meetings\Meeting;
use App\Models\Meetings\MeetingActionItem;
use App\Services\CompoundContextService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// CM-82 / CM-115: Action items – create, update status
class MeetingActionItemController extends Controller
{
    public function __construct(private readonly CompoundContextService $context) {}

    public function index(Request $request): JsonResponse
    {
        $compoundId = $this->context->resolve($request);

        $query = MeetingActionItem::with(['meeting', 'assignee', 'creator'])
            ->join('meetings', 'meetings.id', '=', 'meeting_action_items.meeting_id')
            ->select('meeting_action_items.*')
            ->latest('meeting_action_items.created_at');

        if ($compoundId !== null) {
            $query->where('meetings.compound_id', $compoundId);
        }

        if ($request->has('status') && $request->input('status') !== 'all') {
            $query->where('meeting_action_items.status', $request->input('status'));
        }

        if ($request->has('assigned_to')) {
            $query->where('meeting_action_items.assigned_to', $request->input('assigned_to'));
        }

        return response()->json(['data' => $query->paginate(20)]);
    }

    public function store(Request $request, Meeting $meeting): JsonResponse
    {
        $validated = $request->validate([
            'title'       => ['required', 'string', 'max:200'],
            'description' => ['nullable', 'string', 'max:2000'],
            'assignedTo'  => ['nullable', 'integer', 'exists:users,id'],
            'dueDate'     => ['nullable', 'date'],
        ]);

        /** @var \App\Models\User $user */
        $user = $request->user();

        $item = MeetingActionItem::create([
            'meeting_id'  => $meeting->id,
            'title'       => $validated['title'],
            'description' => $validated['description'] ?? null,
            'assigned_to' => $validated['assignedTo'] ?? null,
            'due_date'    => $validated['dueDate'] ?? null,
            'status'      => 'open',
            'created_by'  => $user->id,
        ]);

        return response()->json(['data' => $item->load(['assignee', 'creator'])], 201);
    }

    public function update(Request $request, Meeting $meeting, MeetingActionItem $actionItem): JsonResponse
    {
        abort_if((string) $actionItem->meeting_id !== (string) $meeting->id, 404);

        $validated = $request->validate([
            'title'       => ['sometimes', 'required', 'string', 'max:200'],
            'description' => ['nullable', 'string', 'max:2000'],
            'assignedTo'  => ['nullable', 'integer', 'exists:users,id'],
            'dueDate'     => ['nullable', 'date'],
            'status'      => ['sometimes', 'required', 'string', 'in:open,in_progress,done,cancelled'],
        ]);

        $changes = [];
        foreach ([
            'title'       => 'title',
            'description' => 'description',
            'assignedTo'  => 'assigned_to',
            'dueDate'     => 'due_date',
            'status'      => 'status',
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
